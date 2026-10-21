/**
 * Operace nad záznamem trasy. Žádná z nich nepotřebuje přihlášení ani
 * server — pilot má nejdřív prokázat, že trasy vůbec vzniknou a přežijí.
 */
import { databaze, noveId } from './db';

export type Zdroj = 'gps' | 'simulace';
export type Stav = 'bezi' | 'ukonceny';

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
};

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
  const bezi = bezicZaznam();
  if (bezi) throw new Error('Jeden záznam už běží. Ukonči ho, než začneš další.');

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
export function zapisBody(zaznamId: string, body: NovyBod[]): number {
  if (body.length === 0) return 0;
  const d = databaze();
  const nyni = Date.now();

  let zapsano = 0;
  d.withTransactionSync(() => {
    const vlozit = d.prepareSync(
      `INSERT INTO bod (zaznam_id, sirka, delka, presnost, vyska, rychlost, kurz,
                        cas_gps, cas_zarizeni, podvrzeny)
       VALUES ($zaznam, $sirka, $delka, $presnost, $vyska, $rychlost, $kurz,
               $casGps, $casZarizeni, $podvrzeny)`,
    );
    try {
      for (const b of body) {
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

export function ukonciZaznam(id: string, konec = Date.now()) {
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
