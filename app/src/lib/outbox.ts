import * as SQLite from 'expo-sqlite';

import { jeVadaPrvku } from './stavba/odesilani';

/**
 * <b>Co appka dluží serveru.</b> Obecná fronta úkonů, které se nesmějí
 * ztratit, když zrovna není signál.
 *
 * <para>
 * <b>Proč teprve teď.</b> Pravidlo repozitáře zakládá knihovnu až u třetí
 * kopie, a ta je tu od 21. 11. 2026: `cekajici-start.ts` drží úkon
 * procedury, `tracker/nahravani.ts` dávku bodů a `stavba/fronta.ts` prvky
 * trati. Abstrakce ze dvou vzorků trefí špatnou hranici — tenhle tvar
 * stojí na třech.
 * </para>
 *
 * <para>
 * <b>Co se sem vejde a co ne.</b> Patří sem <b>úkon</b>: malé tělo, které
 * jde poslat jedním požadavkem a dvakrát poslané nic nezkazí. Nepatří sem
 * dávka bodů trasy — ta má vlastní tabulku, měří se v tisících řádků a
 * nahrává se po kusech; vtlačit ji sem by znamenalo postavit druhý
 * tracker. Fronta prvků trati se sem přestěhovat může, ale až po vodě:
 * dnes drží i čísla, která server prvku přidělil.
 * </para>
 *
 * <para>
 * <b>Stojí se po druzích, ne globálně</b> — to je jádro věci. U prvků
 * trati určuje pořadí na trati server podle pořadí, v jakém prvky
 * dorazí, takže odmítnutý prvek musí zastavit i všechny za ním. Sebrání
 * jedné bóje ale nemá co blokovat přebarvení druhé. Jedna společná fronta
 * s jedním zámkem by buď ztratila pořadí tam, kde na něm záleží, nebo by
 * kvůli jedné vadě umlčela celou appku.
 * </para>
 */

/** Úkon, který čeká na odeslání. */
export type Ukol = {
  id: number;
  /** Kdo ho umí odeslat. Zároveň jednotka, po které se fronta zastavuje. */
  druh: string;
  /** Klíč proti dvojímu zápisu; opakované zařazení téhož nic nepřidá. */
  klic: string;
  /** Co to je, lidsky — tohle čte člověk ve frontě na obrazovce. */
  popis: string;
  telo: unknown;
  zalozenoV: number;
  pokusu: number;
  /** Server ho odmítl větou pravidla. Opakovat nemá smysl. */
  odmitnuto: boolean;
  potiz: string | null;
};

let db: SQLite.SQLiteDatabase | null = null;

function databaze(): SQLite.SQLiteDatabase {
  if (db) return db;
  db = SQLite.openDatabaseSync('outbox.db');
  db.execSync('PRAGMA journal_mode = WAL');
  db.execSync(`
    CREATE TABLE IF NOT EXISTS outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      druh TEXT NOT NULL,
      klic TEXT NOT NULL UNIQUE,
      popis TEXT NOT NULL,
      telo TEXT NOT NULL,
      zalozenoV INTEGER NOT NULL,
      pokusu INTEGER NOT NULL DEFAULT 0,
      odmitnuto INTEGER NOT NULL DEFAULT 0,
      potiz TEXT
    )
  `);
  return db;
}

/** Jen pro testy: zapomene otevřené spojení. */
export function zapomenOutbox() {
  db = null;
}

type Radek = {
  id: number;
  druh: string;
  klic: string;
  popis: string;
  telo: string;
  zalozenoV: number;
  pokusu: number;
  odmitnuto: number;
  potiz: string | null;
};

const zRadku = (r: Radek): Ukol => ({
  id: r.id,
  druh: r.druh,
  klic: r.klic,
  popis: r.popis,
  telo: JSON.parse(r.telo),
  zalozenoV: r.zalozenoV,
  pokusu: r.pokusu,
  odmitnuto: r.odmitnuto === 1,
  potiz: r.potiz,
});

/**
 * Zařadí úkon. <b>Opakované zařazení téhož klíče nic nepřidá</b> — telefon
 * posílá znovu právě tehdy, když neví, jestli to poprvé prošlo.
 */
export function zarad(druh: string, klic: string, popis: string, telo: unknown): void {
  databaze().runSync(
    `INSERT OR IGNORE INTO outbox (druh, klic, popis, telo, zalozenoV)
     VALUES (?, ?, ?, ?, ?)`,
    [druh, klic, popis, JSON.stringify(telo), Date.now()],
  );
}

/** Co čeká, v pořadí zařazení. Volitelně jen jeden druh. */
export function cekajici(druh?: string): Ukol[] {
  const r = druh
    ? databaze().getAllSync<Radek>('SELECT * FROM outbox WHERE druh = ? ORDER BY id', [druh])
    : databaze().getAllSync<Radek>('SELECT * FROM outbox ORDER BY id');
  return r.map(zRadku);
}

export function hotovo(id: number): void {
  databaze().runSync('DELETE FROM outbox WHERE id = ?', [id]);
}

export function zahod(id: number): void {
  hotovo(id);
}

export function zapisPotiz(id: number, potiz: string, odmitnuto: boolean): void {
  databaze().runSync(
    'UPDATE outbox SET pokusu = pokusu + 1, potiz = ?, odmitnuto = ? WHERE id = ?',
    [potiz, odmitnuto ? 1 : 0, id],
  );
}

/** Kolik čeká a kolik z toho stojí na odmítnutí. */
export function stav(): { ceka: number; odmitnuto: number } {
  const r = databaze().getFirstSync<{ ceka: number; odmitnuto: number | null }>(
    'SELECT COUNT(*) AS ceka, SUM(odmitnuto) AS odmitnuto FROM outbox',
  );
  return { ceka: r?.ceka ?? 0, odmitnuto: r?.odmitnuto ?? 0 };
}

/** Kdo umí odeslat který druh. Vrací cokoliv; hodnota se zahazuje. */
export type Odesilatele = Record<string, (telo: never) => Promise<unknown>>;

export type VysledekVyprazdneni = {
  odeslano: number;
  /** Druhy, které se zastavily, a proč. */
  stoji: { druh: string; popis: string; proc: string; odmitnuto: boolean }[];
};

/**
 * Pošle, co jde. <b>Zastaví se po druzích</b>: vada u jednoho druhu
 * nechá ostatní běžet dál, ale v rámci druhu se nepokračuje — za
 * odmítnutým prvkem trati čeká pořadí.
 *
 * <para>
 * <b>Co je vada a co okolnost</b>, rozhoduje `jeVadaPrvku`: 400 je věta
 * pravidla a opakováním se nespraví, všechno ostatní je okolnost a zkusí
 * se znovu. Chyba padá na stranu opakování schválně — nejhorší, co udělá
 * špatně zařazená okolnost, je další pokus.
 * </para>
 */
export async function vyprazdni(odesilatele: Odesilatele): Promise<VysledekVyprazdneni> {
  const vysledek: VysledekVyprazdneni = { odeslano: 0, stoji: [] };
  const zablokovane = new Set<string>();

  for (const u of cekajici()) {
    if (zablokovane.has(u.druh)) continue;

    const posli = odesilatele[u.druh];
    if (!posli) {
      // Neznámý druh není chyba fronty: appka se mezitím mohla
      // aktualizovat a úkon zná jiná obrazovka. Nechá se ležet.
      zablokovane.add(u.druh);
      continue;
    }

    try {
      await posli(u.telo as never);
      hotovo(u.id);
      vysledek.odeslano += 1;
    } catch (e) {
      const stav = (e as { stav?: number }).stav;
      const odmitnuto = typeof stav === 'number' ? jeVadaPrvku(stav) : false;
      const proc =
        (e as { duvod?: string }).duvod ??
        (odmitnuto ? 'Server úkon odmítl.' : 'Zatím se nepodařilo odeslat — není signál.');

      zapisPotiz(u.id, proc, odmitnuto);
      zablokovane.add(u.druh);
      vysledek.stoji.push({ druh: u.druh, popis: u.popis, proc, odmitnuto });
    }
  }

  return vysledek;
}
