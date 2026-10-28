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

/**
 * Doplní sloupec, pokud v tabulce ještě není.
 *
 * Appka už může mít trasy z dřívějška a ty se nesmí zahodit jen proto, že
 * přibyla vlastnost. `ALTER TABLE` v SQLite chybějící sloupec přidá a data
 * nechá být; kontrola přes `PRAGMA` je tu proto, že druhé spuštění by
 * jinak selhalo.
 */
function doplnSloupec(
  d: SQLite.SQLiteDatabase,
  tabulka: string,
  sloupec: string,
  definice: string,
) {
  const je = d
    .getAllSync<{ name: string }>(`PRAGMA table_info(${tabulka})`)
    .some((s) => s.name === sloupec);
  if (!je) d.execSync(`ALTER TABLE ${tabulka} ADD COLUMN ${sloupec} ${definice}`);
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
      nahrano_v INTEGER,
      -- Poslední bod, který server potvrdil. Do té hranice je trasa venku;
      -- co je za ní, se musí doposlat. Bez toho by po výpadku nešlo poznat,
      -- kde se přestalo, a posílalo by se všechno znovu.
      potvrzeno_do INTEGER NOT NULL DEFAULT 0,
      -- Posádka označila nahrávání za dokončené.
      nahravani_hotovo INTEGER NOT NULL DEFAULT 0,
      -- Kdy telefon naposledy zkusil odeslat. Živý kanál se jím řídí, a je
      -- v databázi ze stejného důvodu jako zbytek: úloha na pozadí se budí
      -- v novém JS kontextu, kde paměť předchozího běhu neexistuje.
      posledni_pokus INTEGER NOT NULL DEFAULT 0,
      -- Proč poslední pokus nevyšel: 'sit', 'bez-klice', 'mimo-okno'.
      -- Posádka to má vidět, ne se to domýšlet z toho, že nic nevidí.
      potiz TEXT
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

  // Trasy zapsané dřívější verzí appky tyhle sloupce nemají.
  doplnSloupec(d, 'zaznam', 'potvrzeno_do', 'INTEGER NOT NULL DEFAULT 0');
  doplnSloupec(d, 'zaznam', 'nahravani_hotovo', 'INTEGER NOT NULL DEFAULT 0');
  doplnSloupec(d, 'zaznam', 'posledni_pokus', 'INTEGER NOT NULL DEFAULT 0');
  doplnSloupec(d, 'zaznam', 'potiz', 'TEXT');
  // Baterie přibyla 28. 10. 2026; trasy zapsané dřív ji nemají a null je
  // správná odpověď — server si drží poslední nenulovou.
  doplnSloupec(d, 'bod', 'baterie', 'INTEGER');
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
