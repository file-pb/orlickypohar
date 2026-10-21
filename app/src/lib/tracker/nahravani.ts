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
import { posliKlicem } from '../api';
import {
  bodyKOdeslani,
  kolikCeka,
  nahravaniHotovo,
  potvrzeno,
  zaznam,
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

export type StavNahravani = {
  ceka: number;
  potvrzenoDo: number;
  hotovo: boolean;
};

export function stavNahravani(zaznamId: string): StavNahravani | null {
  const z = zaznam(zaznamId);
  if (!z) return null;
  return {
    ceka: kolikCeka(zaznamId),
    potvrzenoDo: z.potvrzeno_do,
    hotovo: z.nahravani_hotovo === 1,
  };
}

type TrasaOdpoved = { lokalniId: string; posledniBod: number | null };
type DavkaOdpoved = { prijato: number; preskoceno: number; posledniBod: number | null };

/** Založí trasu na serveru. Opakované volání druhou trasu nezaloží. */
async function zalozAsync(z: Zaznam): Promise<TrasaOdpoved | null> {
  return posliKlicem<TrasaOdpoved>('/trasy', {
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
};

/**
 * Pošle, co čeká. Vrací se po vyprázdnění fronty, nebo při první chybě —
 * co se nepotvrdilo, zůstává ve frontě na příště.
 */
export async function nahrajAsync(zaznamId: string): Promise<VysledekNahrani> {
  const z = zaznam(zaznamId);
  if (!z) return { odeslano: 0, zbyva: 0, klicPlati: true };

  const zalozena = await zalozAsync(z);
  if (zalozena === null) return { odeslano: 0, zbyva: kolikCeka(zaznamId), klicPlati: false };

  // Server může mít víc, než si telefon pamatuje — třeba když se ztratila
  // odpověď na poslední dávku. Hranici proto nejdřív srovnáme podle něj.
  if (zalozena.posledniBod != null) potvrzeno(zaznamId, zalozena.posledniBod);

  let odeslano = 0;
  for (;;) {
    const davka = bodyKOdeslani(zaznamId, DAVKA);
    if (davka.length === 0) break;

    const odpoved = await posliKlicem<DavkaOdpoved>(`/trasy/${z.id}/body`, davka.map(toVstup));
    if (odpoved === null) return { odeslano, zbyva: kolikCeka(zaznamId), klicPlati: false };

    // Potvrzuje se podle odpovědi serveru, ne podle toho, co jsme poslali.
    if (odpoved.posledniBod != null) potvrzeno(zaznamId, odpoved.posledniBod);
    odeslano += odpoved.prijato;

    // Pojistka proti nekonečné smyčce: když server nepotvrdil nic nového,
    // další kolo by poslalo totéž.
    if (odpoved.posledniBod == null || odpoved.posledniBod < davka[davka.length - 1].id) break;
  }

  return { odeslano, zbyva: kolikCeka(zaznamId), klicPlati: true };
}

/**
 * Uzavře nahrávání — až po tom, co fronta doběhne. Dokud něco čeká, trasa
 * zůstává rozdělaná, protože „dokončeno" s nedoslanými body by lhalo.
 */
export async function dokonciNahraniAsync(
  zaznamId: string,
): Promise<{ hotovo: boolean; zbyva: number }> {
  const vysledek = await nahrajAsync(zaznamId);
  if (vysledek.zbyva > 0 || !vysledek.klicPlati) {
    return { hotovo: false, zbyva: vysledek.zbyva };
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
