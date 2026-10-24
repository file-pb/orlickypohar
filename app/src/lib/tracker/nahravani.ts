/**
 * Odesílání trasy na server.
 *
 * Telefon se prokazuje <b>mobilním klíčem k lodi</b>, ne účtem posádky —
 * trasa patří lodi. Viz `lib/klic.ts`.
 *
 * <b>Nic se nemaže, dokud to server nepotvrdí.</b> Na vodě signál padá
 * uprostřed dávky a odpověď se ztratí; telefon pak neví, jestli body došly.
 * Proto se posílá znovu — a protože je server idempotentní, druhé poslání
 * nic nezdvojí. Hranice potvrzeného se posouvá jen podle toho, co server
 * skutečně odpověděl, nikdy podle toho, co jsme odeslali.
 *
 * Z toho plynou obě přejímací podmínky: **č. 3** (výpadek a doposlání bez
 * duplicit) i **č. 4** (přerušené nahrání se dá dokončit, i po restartu
 * appky — stav je v databázi, ne v paměti).
 */
import { posliKlicem, posliKlicemPodrobne } from '../api';
import {
  bodyKOdeslani,
  kolikCeka,
  nahravaniHotovo,
  potvrzeno,
  zapisPokus,
  zapisPotiz,
  zaznam,
  type Potiz,
  type Zaznam,
} from './zaznam';

/**
 * Kolik bodů jde v jedné dávce.
 *
 * Dávkování šetří baterku víc než filtrování: rádio se zapne jednou místo
 * stokrát. Dvě stě bodů je při vzorkování po pěti sekundách zhruba čtvrt
 * hodiny záznamu — dost velká dávka, aby se vyplatila, a dost malá, aby se
 * při výpadku neopakovalo moc práce.
 */
export const DAVKA = 200;

/**
 * Jak často se odesílá za jízdy.
 *
 * <b>Dávka po minutě, ne po dvou stech bodech.</b> Dvě stě bodů je čtvrt
 * hodiny záznamu — správné pro nahrání po dojezdu, ale pro přehled
 * pořadatele k ničemu: *„kde je LUNA?"* a *„čekáme, nebo startujeme?"* jsou
 * otázky, na které čtvrt hodiny stará poloha neodpovídá. Zelená v seznamu
 * trackerů je navíc definovaná jako poslední bod mladší než minuta.
 *
 * Minuta je zároveň mez, pod kterou se kvůli baterce nejde: co žere energii,
 * je zapínání rádia, ne velikost dávky. Jednou za minutu poslat dvanáct
 * poloh je mnohem levnější než dvanáctkrát poslat jednu.
 */
export const ZIVE_MS = 60_000;

export type StavNahravani = {
  ceka: number;
  potvrzenoDo: number;
  hotovo: boolean;
  /** Kdy telefon naposledy zkusil odeslat, nebo `null`, když ještě nikdy. */
  posledniPokus: number | null;
  /** Proč poslední pokus nevyšel. `null` znamená, že vyšel. */
  potiz: Potiz | null;
};

export function stavNahravani(zaznamId: string): StavNahravani | null {
  const z = zaznam(zaznamId);
  if (!z) return null;
  return {
    ceka: kolikCeka(zaznamId),
    potvrzenoDo: z.potvrzeno_do,
    hotovo: z.nahravani_hotovo === 1,
    posledniPokus: z.posledni_pokus > 0 ? z.posledni_pokus : null,
    potiz: z.potiz,
  };
}

type TrasaOdpoved = { lokalniId: string; posledniBod: number | null };
type DavkaOdpoved = { prijato: number; preskoceno: number; posledniBod: number | null };

/** Založí trasu na serveru. Opakované volání druhou trasu nezaloží. */
async function zalozAsync(z: Zaznam) {
  return posliKlicemPodrobne<TrasaOdpoved>('/trasy', {
    lokalniId: z.id,
    lod: z.lod,
    regata: z.regata,
    zdroj: z.zdroj === 'simulace' ? 'Simulace' : 'Gps',
    zacatek: new Date(z.zacatek).toISOString(),
  });
}

export type VysledekNahrani = {
  odeslano: number;
  zbyva: number;
  /** `false` znamená, že telefon není spárovaný s lodí — ne chybu. */
  klicPlati: boolean;
  /**
   * Proč se neodeslalo. `mimo-okno` není porucha: server trasu nevezme,
   * dokud pořadatel neudělal rozpravu. Zapisuje se dál a pošle se potom.
   */
  potiz?: Potiz;
};

/**
 * Pošle, co čeká. Vrací se po vyprázdnění fronty, nebo při první chybě —
 * co se nepotvrdilo, zůstává ve frontě na příště.
 */
export async function nahrajAsync(zaznamId: string): Promise<VysledekNahrani> {
  const z = zaznam(zaznamId);
  if (!z) return { odeslano: 0, zbyva: 0, klicPlati: true };

  const zalozena = await zalozAsync(z);
  if (zalozena.stav !== 'ok') {
    const potiz: Potiz = zalozena.stav === 'mimo-okno' ? 'mimo-okno' : 'bez-klice';
    zapisPotiz(zaznamId, potiz);
    return { odeslano: 0, zbyva: kolikCeka(zaznamId), klicPlati: potiz === 'mimo-okno', potiz };
  }

  // Server může mít víc, než si telefon pamatuje — třeba když se ztratila
  // odpověď na poslední dávku. Hranici proto nejdřív srovnáme podle něj.
  if (zalozena.data.posledniBod != null) potvrzeno(zaznamId, zalozena.data.posledniBod);

  let odeslano = 0;
  for (;;) {
    const davka = bodyKOdeslani(zaznamId, DAVKA);
    if (davka.length === 0) break;

    const odpoved = await posliKlicem<DavkaOdpoved>(`/trasy/${z.id}/body`, davka.map(toVstup));
    if (odpoved === null) {
      zapisPotiz(zaznamId, 'bez-klice');
      return {
        odeslano, zbyva: kolikCeka(zaznamId), klicPlati: false, potiz: 'bez-klice',
      };
    }

    // Potvrzuje se podle odpovědi serveru, ne podle toho, co jsme poslali.
    if (odpoved.posledniBod != null) potvrzeno(zaznamId, odpoved.posledniBod);
    odeslano += odpoved.prijato;

    // Pojistka proti nekonečné smyčce: když server nepotvrdil nic nového,
    // další kolo by poslalo totéž.
    if (odpoved.posledniBod == null || odpoved.posledniBod < davka[davka.length - 1].id) break;
  }

  zapisPotiz(zaznamId, null);
  return { odeslano, zbyva: kolikCeka(zaznamId), klicPlati: true };
}

/**
 * Odeslání za jízdy: pošle, co čeká, nejvýš jednou za {@link ZIVE_MS}.
 *
 * <b>Volá ji úloha na pozadí, ne ruka posádky.</b> Na posádce nesmí viset
 * nic než spuštění záznamu — kdo neťukne „nahrát", chyběl by v přehledu pro
 * rozhodčího i v podkladu k protestu.
 *
 * <b>Chyba sítě se spolkne.</b> Na vodě signál padá a každý výpadek by jinak
 * byl výjimka v handleru úlohy; systém by úlohu odregistroval a záznam by
 * skončil bez varování v půlce závodu. Co se nepotvrdilo, zůstává ve frontě
 * a pošle se příště — přesně jako při nahrávání po dojezdu.
 */
export async function zkusZiveAsync(
  zaznamId: string,
  ted: number = Date.now(),
): Promise<VysledekNahrani & { preskoceno?: true }> {
  const z = zaznam(zaznamId);
  if (!z || z.stav !== 'bezi') return { odeslano: 0, zbyva: 0, klicPlati: true };

  if (ted - z.posledni_pokus < ZIVE_MS) {
    return { odeslano: 0, zbyva: kolikCeka(zaznamId), klicPlati: true, preskoceno: true };
  }

  // Čas pokusu se zapisuje předem: kdyby se zapsal až po odeslání, zabitý
  // proces by ho ztratil a po probuzení by se posílalo hned znovu.
  zapisPokus(zaznamId, ted);

  try {
    return await nahrajAsync(zaznamId);
  } catch {
    zapisPotiz(zaznamId, 'sit');
    return { odeslano: 0, zbyva: kolikCeka(zaznamId), klicPlati: true, potiz: 'sit' };
  }
}

/**
 * Uzavře nahrávání — až po tom, co fronta doběhne. Dokud něco čeká, trasa
 * zůstává rozdělaná, protože „dokončeno" s nedoslanými body by lhalo.
 */
export async function dokonciNahraniAsync(
  zaznamId: string,
): Promise<{ hotovo: boolean; zbyva: number; potiz?: Potiz }> {
  const vysledek = await nahrajAsync(zaznamId);
  if (vysledek.zbyva > 0 || !vysledek.klicPlati) {
    return { hotovo: false, zbyva: vysledek.zbyva, potiz: vysledek.potiz };
  }

  const z = zaznam(zaznamId);
  if (!z) return { hotovo: false, zbyva: 0 };

  const odpoved = await posliKlicem<TrasaOdpoved>(`/trasy/${z.id}/dokonceno`, {
    konec: z.konec ? new Date(z.konec).toISOString() : null,
  });
  if (odpoved === null) return { hotovo: false, zbyva: 0 };

  nahravaniHotovo(zaznamId);
  return { hotovo: true, zbyva: 0 };
}

function toVstup(b: {
  id: number;
  sirka: number;
  delka: number;
  presnost: number | null;
  rychlost: number | null;
  kurz: number | null;
  cas_gps: number;
  cas_zarizeni: number;
  podvrzeny: number;
}) {
  return {
    lokalniId: b.id,
    sirka: b.sirka,
    delka: b.delka,
    presnostM: b.presnost,
    rychlostMS: b.rychlost,
    kurz: b.kurz,
    vyskaM: null,
    casGps: new Date(b.cas_gps).toISOString(),
    casZarizeni: new Date(b.cas_zarizeni).toISOString(),
    podvrzeny: b.podvrzeny === 1,
  };
}
