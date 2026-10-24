/**
 * Operace nad záznamem trasy. Žádná z nich nepotřebuje přihlášení ani
 * server — pilot má nejdřív prokázat, že trasy vůbec vzniknou a přežijí.
 */
import { databaze, noveId } from './db';

export type Zdroj = 'gps' | 'simulace';
/**
 * `pozastaveny` není totéž co `ukonceny`: trasa pokračuje, jen v ní vznikne
 * díra. Je to páka pro posádku — jediná věc kolem záznamu, kterou neřídí
 * pořadatel, ale ten, koho se to týká. Někdy je potřeba soukromí vynutit.
 */
export type Stav = 'bezi' | 'pozastaveny' | 'ukonceny';

export type Zaznam = {
  id: string;
  stav: Stav;
  zdroj: Zdroj;
  lod: string;
  regata: string | null;
  zacatek: number;
  konec: number | null;
  ostrihano_do: number | null;
  nahrano_v: number | null;
  /** Poslední bod, který server potvrdil. Co je za ním, se musí doposlat. */
  potvrzeno_do: number;
  /** Posádka označila nahrávání za dokončené. */
  nahravani_hotovo: number;
  /** Kdy telefon naposledy zkusil odeslat. Nula znamená „nikdy". */
  posledni_pokus: number;
  /** Proč poslední pokus nevyšel, nebo `null`, když vyšel. */
  potiz: Potiz | null;
};

/**
 * Proč se neodeslalo.
 *
 * `mimo-okno` není porucha telefonu: server trasu nepřijme, dokud neběží
 * okno regaty. Posádka s tím nic nenadělá a nemá na to koukat jako na
 * červenou — zapisuje se dál a odešle se, až pořadatel udělá rozpravu.
 */
export type Potiz = 'sit' | 'bez-klice' | 'mimo-okno';

/** Bod tak, jak do zápisu přichází — z GPS i ze simulace stejně. */
export type NovyBod = {
  sirka: number;
  delka: number;
  presnost?: number | null;
  vyska?: number | null;
  rychlost?: number | null;
  kurz?: number | null;
  /** Čas z polohy. U `expo-location` je to `timestamp` objektu polohy. */
  casGps: number;
  /** Příznak `mocked` z Androidu, nebo bod ze simulace. */
  podvrzeny?: boolean;
};

export function bezicZaznam(): Zaznam | null {
  return databaze().getFirstSync<Zaznam>("SELECT * FROM zaznam WHERE stav = 'bezi' LIMIT 1");
}

/**
 * Záznam, který běží **nebo je pozastavený** — tedy ten, ke kterému se posádka
 * ještě vrátí. Úloha na pozadí si naopak hlídá jen `bezicZaznam`, takže se
 * pozastavením sama odmlčí a přestane číst polohu.
 */
export function otevrenyZaznam(): Zaznam | null {
  return databaze().getFirstSync<Zaznam>(
    "SELECT * FROM zaznam WHERE stav IN ('bezi', 'pozastaveny') ORDER BY zacatek DESC LIMIT 1",
  );
}

export function pozastavZaznam(id: string) {
  databaze().runSync("UPDATE zaznam SET stav = 'pozastaveny' WHERE id = ? AND stav = 'bezi'", [id]);
}

export function obnovZaznam(id: string) {
  databaze().runSync("UPDATE zaznam SET stav = 'bezi' WHERE id = ? AND stav = 'pozastaveny'", [id]);
}

export function zaznam(id: string): Zaznam | null {
  return databaze().getFirstSync<Zaznam>('SELECT * FROM zaznam WHERE id = ?', [id]);
}

export function seznamZaznamu(): Zaznam[] {
  return databaze().getAllSync<Zaznam>('SELECT * FROM zaznam ORDER BY zacatek DESC');
}

/**
 * Založí záznam. Jméno lodi je povinné a potvrzuje ho posádka při startu —
 * přejímací podmínka č. 6 je „telefon přiřazený ke špatné lodi". Dokud
 * appka nemá vyzkoušené přihlášení, je to volný text; výběr ze seznamu
 * „mých lodí" ho nahradí, až identita bude.
 */
export function zalozZaznam(vstup: { lod: string; regata?: string | null; zdroj: Zdroj }): string {
  const d = databaze();
  const otevreny = otevrenyZaznam();
  if (otevreny) {
    throw new Error(
      otevreny.stav === 'pozastaveny'
        ? 'Jeden záznam je pozastavený. Ukonči ho, než začneš další.'
        : 'Jeden záznam už běží. Ukonči ho, než začneš další.',
    );
  }

  const id = noveId();
  d.runSync(
    "INSERT INTO zaznam (id, stav, zdroj, lod, regata, zacatek) VALUES (?, 'bezi', ?, ?, ?, ?)",
    [id, vstup.zdroj, vstup.lod.trim(), vstup.regata?.trim() || null, Date.now()],
  );
  return id;
}

/**
 * Zapíše body. Jedna transakce na dávku, synchronně — po návratu je dávka
 * na disku i v případě, že systém proces hned potom zabije.
 *
 * Čas se ukládá dvakrát: `casGps` z polohy a `cas_zarizeni` z hodin
 * telefonu v okamžiku zápisu. Hodiny telefonu se dají přestavit, čas
 * z polohy ne — jejich rozdíl je proto měřitelná diagnostika skoku hodin
 * (viz `prehled`) a při nahrání se podle něj trasa srovná na jednu osu.
 * Žádný bod se kvůli času nezahazuje.
 */
export function zapisBody(zaznamId: string, body: NovyBod[], intervalMs = 0): number {
  if (body.length === 0) return 0;
  const d = databaze();
  const nyni = Date.now();

  // Na iOSu `timeInterval` v `expo-location` nic neznamená — dokumentace ho
  // vede jako Android only —, takže systém dodává polohy, jak uzná za
  // vhodné. Změřeno 21. 10. 2026: při nastavených 5 s chodil bod každé
  // 2,2 s, tedy dvaapůlkrát víc, než jsme chtěli. Vzorkování se proto hlídá
  // tady, při zápisu, a platí na obou platformách stejně.
  const kZapisu = intervalMs > 0 ? proredi(zaznamId, body, intervalMs) : body;
  if (kZapisu.length === 0) return 0;

  let zapsano = 0;
  d.withTransactionSync(() => {
    const vlozit = d.prepareSync(
      `INSERT INTO bod (zaznam_id, sirka, delka, presnost, vyska, rychlost, kurz,
                        cas_gps, cas_zarizeni, podvrzeny)
       VALUES ($zaznam, $sirka, $delka, $presnost, $vyska, $rychlost, $kurz,
               $casGps, $casZarizeni, $podvrzeny)`,
    );
    try {
      for (const b of kZapisu) {
        const r = vlozit.executeSync({
          $zaznam: zaznamId,
          $sirka: b.sirka,
          $delka: b.delka,
          $presnost: b.presnost ?? null,
          $vyska: b.vyska ?? null,
          $rychlost: b.rychlost ?? null,
          $kurz: b.kurz ?? null,
          $casGps: b.casGps,
          $casZarizeni: nyni,
          $podvrzeny: b.podvrzeny ? 1 : 0,
        });
        // Kurzor se musí vrátit, než se stejný dotaz použije podruhé.
        r.resetSync();
        zapsano += 1;
      }
    } finally {
      vlozit.finalizeSync();
    }
  });
  return zapsano;
}

/**
 * Zahodí body, které přišly dřív než `intervalMs` od předchozího zapsaného.
 *
 * Měří se podle <b>času z polohy</b>, ne podle hodin telefonu: ty se dají
 * přestavit a vzorkování by se tím rozsypalo. Bod bez rozumného odstupu
 * nenese nic nového — loď se za dvě sekundy posune o pár metrů, což je pod
 * přesností GPS.
 */
function proredi(zaznamId: string, body: NovyBod[], intervalMs: number): NovyBod[] {
  const posledni = databaze().getFirstSync<{ cas_gps: number }>(
    'SELECT cas_gps FROM bod WHERE zaznam_id = ? ORDER BY id DESC LIMIT 1',
    [zaznamId],
  );

  let hranice = posledni?.cas_gps ?? Number.NEGATIVE_INFINITY;
  const vybrane: NovyBod[] = [];
  // Dávka může přijít přeházená; seřadit ji je levnější než se spolehnout,
  // že systém polohy dodá v pořadí.
  for (const b of [...body].sort((a, c) => a.casGps - c.casGps)) {
    if (b.casGps - hranice < intervalMs) continue;
    vybrane.push(b);
    hranice = b.casGps;
  }
  return vybrane;
}

export function ukonciZaznam(id: string, konec = Date.now()) {
  // Ukončit jde i pozastavený záznam — proto bez podmínky na stav.
  databaze().runSync("UPDATE zaznam SET stav = 'ukonceny', konec = ? WHERE id = ?", [konec, id]);
}

/**
 * Ostříhá trasu na okno závodu — přejímací podmínka č. 5.
 *
 * Posádka zapomene záznam ukončit a trasa jinak pokračuje přes hospodu domů;
 * appka by zaznamenala, kde kdo bydlí. Je to věc soukromí, ne pohodlí, takže
 * se body **mažou**, ne skrývají.
 */
export function ostrihej(id: string, do_: number): number {
  const d = databaze();
  const r = d.runSync('DELETE FROM bod WHERE zaznam_id = ? AND cas_gps > ?', [id, do_]);
  d.runSync('UPDATE zaznam SET ostrihano_do = ? WHERE id = ?', [do_, id]);
  return r.changes;
}

export function smazZaznam(id: string) {
  databaze().runSync('DELETE FROM zaznam WHERE id = ?', [id]);
}

/** Body, které server ještě nepotvrdil, v pořadí, v jakém vznikly. */
export function bodyKOdeslani(zaznamId: string, kolik: number): Bod[] {
  const z = zaznam(zaznamId);
  if (!z) return [];
  return databaze().getAllSync<Bod>(
    'SELECT * FROM bod WHERE zaznam_id = ? AND id > ? ORDER BY id LIMIT ?',
    [zaznamId, z.potvrzeno_do, kolik],
  );
}

/** Kolik bodů čeká na odeslání. */
export function kolikCeka(zaznamId: string): number {
  const z = zaznam(zaznamId);
  if (!z) return 0;
  const r = databaze().getFirstSync<{ pocet: number }>(
    'SELECT COUNT(*) AS pocet FROM bod WHERE zaznam_id = ? AND id > ?',
    [zaznamId, z.potvrzeno_do],
  );
  return r?.pocet ?? 0;
}

/**
 * Posune hranici potvrzeného.
 *
 * <b>Nikdy zpátky.</b> Odpovědi ze serveru můžou dorazit přeházeně a starší
 * potvrzení by jinak zahodilo novější — a body by se posílaly znovu.
 */
export function potvrzeno(zaznamId: string, doBodu: number) {
  databaze().runSync(
    'UPDATE zaznam SET potvrzeno_do = ? WHERE id = ? AND potvrzeno_do < ?',
    [doBodu, zaznamId, doBodu],
  );
}

/**
 * Zapíše, že se právě zkoušelo odeslat, a jak to dopadlo.
 *
 * Čas pokusu se zapisuje **před** samotným odesíláním, ne po něm: kdyby se
 * zapisoval až po, zabitý proces by ho ztratil a živý kanál by po probuzení
 * poslal dávku hned znovu.
 */
export function zapisPokus(zaznamId: string, kdy: number) {
  databaze().runSync('UPDATE zaznam SET posledni_pokus = ? WHERE id = ?', [kdy, zaznamId]);
}

export function zapisPotiz(zaznamId: string, potiz: Potiz | null) {
  databaze().runSync('UPDATE zaznam SET potiz = ? WHERE id = ?', [potiz, zaznamId]);
}

export function nahravaniHotovo(zaznamId: string) {
  databaze().runSync(
    'UPDATE zaznam SET nahravani_hotovo = 1, potiz = NULL WHERE id = ?', [zaznamId]);
}

export type Bod = {
  id: number;
  sirka: number;
  delka: number;
  presnost: number | null;
  rychlost: number | null;
  kurz: number | null;
  cas_gps: number;
  cas_zarizeni: number;
  podvrzeny: number;
};

export function body(zaznamId: string): Bod[] {
  return databaze().getAllSync<Bod>(
    'SELECT * FROM bod WHERE zaznam_id = ? ORDER BY id',
    [zaznamId],
  );
}

export type Prehled = {
  pocetBodu: number;
  prvni: number | null;
  posledni: number | null;
  /** Metry po povrchu, posčítané mezi sousedními body. */
  delkaM: number;
  maxRychlostMS: number | null;
  /** Nejhorší přesnost v metrech — ukáže, jestli signál na vodě držel. */
  nejhorsiPresnostM: number | null;
  podvrzenych: number;
  /** Body s časem v budoucnosti proti hodinám telefonu při dotazu. */
  vBudoucnosti: number;
  /**
   * Rozptyl rozdílu mezi hodinami telefonu a časem z polohy. Pár sekund je
   * normální, skok v řádu minut znamená přestavené hodiny.
   */
  rozptylHodinMs: number | null;
};

/**
 * Souhrn, kvůli kterému pilot vůbec má smysl: „vzorkování je moc hrubé"
 * nebo „baterka umřela v šesté hodině" se dá říct jen nad čísly. Plán to
 * žádá výslovně — bez toho vzniknou soubory, které nikdo neotevře.
 */
export function prehled(zaznamId: string): Prehled {
  const d = databaze();
  const z = d.getFirstSync<{
    pocet: number;
    prvni: number | null;
    posledni: number | null;
    maxRychlost: number | null;
    nejhorsiPresnost: number | null;
    podvrzenych: number;
    vBudoucnosti: number;
    minOdchylka: number | null;
    maxOdchylka: number | null;
  }>(
    `SELECT COUNT(*) AS pocet,
            MIN(cas_gps) AS prvni,
            MAX(cas_gps) AS posledni,
            MAX(rychlost) AS maxRychlost,
            MAX(presnost) AS nejhorsiPresnost,
            SUM(podvrzeny) AS podvrzenych,
            SUM(CASE WHEN cas_gps > ? THEN 1 ELSE 0 END) AS vBudoucnosti,
            MIN(cas_zarizeni - cas_gps) AS minOdchylka,
            MAX(cas_zarizeni - cas_gps) AS maxOdchylka
       FROM bod WHERE zaznam_id = ?`,
    [Date.now(), zaznamId],
  );

  return {
    pocetBodu: z?.pocet ?? 0,
    prvni: z?.prvni ?? null,
    posledni: z?.posledni ?? null,
    delkaM: delkaTrasy(zaznamId),
    maxRychlostMS: z?.maxRychlost ?? null,
    nejhorsiPresnostM: z?.nejhorsiPresnost ?? null,
    podvrzenych: z?.podvrzenych ?? 0,
    vBudoucnosti: z?.vBudoucnosti ?? 0,
    rozptylHodinMs:
      z?.minOdchylka == null || z?.maxOdchylka == null ? null : z.maxOdchylka - z.minOdchylka,
  };
}

/** Haversine. Na jedné přehradě by stačila i rovina, ale tohle je bez pastí. */
function delkaTrasy(zaznamId: string): number {
  const b = databaze().getAllSync<{ sirka: number; delka: number }>(
    'SELECT sirka, delka FROM bod WHERE zaznam_id = ? ORDER BY id',
    [zaznamId],
  );
  const R = 6371000;
  let m = 0;
  for (let i = 1; i < b.length; i += 1) {
    const f1 = (b[i - 1].sirka * Math.PI) / 180;
    const f2 = (b[i].sirka * Math.PI) / 180;
    const df = f2 - f1;
    const dl = ((b[i].delka - b[i - 1].delka) * Math.PI) / 180;
    const a =
      Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
    m += 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  }
  return m;
}

/**
 * Kolik bodů by ostříhání smazalo — **než se zeptáme**.
 *
 * Bez toho je stříhání slepé: posádka vidí „−15 min" a netuší, čeho se to
 * dotkne. Na houpající se lodi po závodě je to knoflík, kterým si někdo
 * ustřihne poslední rozjížďku.
 */
export function kolikByZmizelo(zaznamId: string, do_: number): number {
  const r = databaze().getFirstSync<{ pocet: number }>(
    'SELECT COUNT(*) AS pocet FROM bod WHERE zaznam_id = ? AND cas_gps > ?',
    [zaznamId, do_],
  );
  return r?.pocet ?? 0;
}
