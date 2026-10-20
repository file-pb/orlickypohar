/**
 * Úložiště záznamu trasy.
 *
 * Proč SQLite a ne stav v Reactu nebo soubor s řádky: přejímací podmínka
 * pilotu č. 2 je „systém zabil appku v půlce závodu — zapsaná část musí
 * přežít a záznam pokračovat". Z toho plyne všechno ostatní v tomhle
 * souboru.
 *
 * - **Stav záznamu je v databázi, ne v paměti.** Když systém proces zabije,
 *   React state je pryč; úloha na pozadí se probudí v jiném JS kontextu,
 *   kde se modul vyhodnotí znovu a žádná paměť předchozího běhu neexistuje.
 *   Jediný zdroj pravdy o tom, že záznam běží, tak musí ležet na disku.
 * - **Zápis je synchronní.** Zabitý proces nedokončí `await`. Úloha na
 *   pozadí proto používá `runSync` a po návratu z handleru je bod na disku.
 * - **WAL** kvůli dvěma připojením naráz: obrazovka čte, úloha na pozadí
 *   zapisuje. Bez něj by si zámky lezly do cesty.
 */
import * as SQLite from 'expo-sqlite';

/** Jedno otevření na JS kontext; úloha na pozadí si otevře vlastní. */
let db: SQLite.SQLiteDatabase | null = null;

export function databaze(): SQLite.SQLiteDatabase {
  if (db) return db;
  db = SQLite.openDatabaseSync('trasy.db');
  db.execSync('PRAGMA journal_mode = WAL');
  db.execSync('PRAGMA foreign_keys = ON');
  pripravSchema(db);
  return db;
}

function pripravSchema(d: SQLite.SQLiteDatabase) {
  d.execSync(`
    CREATE TABLE IF NOT EXISTS zaznam (
      id TEXT PRIMARY KEY NOT NULL,
      stav TEXT NOT NULL,
      zdroj TEXT NOT NULL,
      lod TEXT NOT NULL,
      regata TEXT,
      zacatek INTEGER NOT NULL,
      konec INTEGER,
      ostrihano_do INTEGER,
      nahrano_v INTEGER
    );
    CREATE TABLE IF NOT EXISTS bod (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zaznam_id TEXT NOT NULL REFERENCES zaznam(id) ON DELETE CASCADE,
      sirka REAL NOT NULL,
      delka REAL NOT NULL,
      presnost REAL,
      vyska REAL,
      rychlost REAL,
      kurz REAL,
      cas_gps INTEGER NOT NULL,
      cas_zarizeni INTEGER NOT NULL,
      podvrzeny INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS bod_zaznam ON bod(zaznam_id, id);
  `);
}

/**
 * Identifikátor záznamu je lokální a náhodný, ne serverový.
 *
 * Ročník se podle plánu před sezónou smaže a naimportuje znovu, takže
 * serverová ID regaty a lodě se změní. Trasa zapsaná v telefonu to musí
 * přežít — kontext se proto drží jako text a na server se páruje teprve
 * při nahrání.
 */
export function noveId(): string {
  const n = () => Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0');
  return `${n()}${n()}`;
}
