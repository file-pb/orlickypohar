/**
 * Fronta prvků, které stavitel pípnul a které ještě nedošly na server.
 *
 * <b>Proč to existuje.</b> Prvek se po krocích skládá ze serverových id:
 * pípni bóji, přečti id, pípni druhou, přečti id, pošli prvek. Taková
 * sekvence se podržet nedá, protože každý krok čeká na odpověď toho
 * předchozího — a na vodě signál není. Od 13. 11. 2026 proto API umí
 * postavit celý prvek jedním požadavkem
 * (`POST …/trat/prvky/postav`), a tenhle soubor je druhá polovina téže
 * věci: místo, kde ten požadavek počká.
 *
 * <para>
 * <b>SQLite, ne stav v Reactu ani soubor s řádky.</b> Tentýž důvod jako
 * u záznamu trasy (`lib/tracker/db.ts`): když systém appku zabije,
 * React state je pryč a stavitel by nepoznal, že o prvek přišel. Zápis
 * je synchronní, takže po návratu z funkce je prvek na disku.
 * </para>
 *
 * <para>
 * <b>Vlastní soubor, ne tabulka v `trasy.db`.</b> Trasy a stavba spolu
 * nesouvisí a mažou se každá jindy — trasa po nahrání, prvek po
 * potvrzení serverem.
 * </para>
 *
 * <para>
 * <b>Tabulky jsou dvě.</b> `fronta` drží, co ještě neodešlo, a řádek z ní
 * po potvrzení mizí. `postavene` je naopak to, co zůstane: čísla, která
 * server prvku přidělil. Bez nich nemá fotka pořízená na vodě kam přijít
 * (17. 11. 2026; podrobně u `zapisPostaveny`).
 * </para>
 */
import * as SQLite from 'expo-sqlite';

/** Co se posílá na server. Tvar je z OpenAPI, viz `lib/api.ts`. */
export type PrvekKPostaveni = {
  klic: string;
  typ: string;
  body: {
    nazev: string;
    sirka: number;
    delka: number;
    presnostM?: number | null;
    zdroj?: string | null;
    barva?: string | null;
    tvar?: string | null;
    znaceni?: string | null;
    postavenaV?: string | null;
  }[];
  strana?: string | null;
  poznamka?: string | null;
  smer?: string | null;
  druhStartu?: string | null;
};

/** Řádek fronty, jak ho vidí obrazovka. */
export type CekajiciPrvek = {
  id: number;
  klic: string;
  serie: string;
  zavod: string;
  popis: string;
  vstup: PrvekKPostaveni;
  zalozenoV: number;
  pokusu: number;
  /** Server ho odmítl — opakovat nemá smysl, rozhodnout musí člověk. */
  odmitnuto: boolean;
  /** Poslední důvod: věta od serveru, nebo proč se nepovedlo odeslat. */
  potiz: string | null;
};

let db: SQLite.SQLiteDatabase | null = null;

function databaze(): SQLite.SQLiteDatabase {
  if (db) return db;
  db = SQLite.openDatabaseSync('stavba.db');
  db.execSync('PRAGMA journal_mode = WAL');
  db.execSync(`
    CREATE TABLE IF NOT EXISTS fronta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      klic TEXT NOT NULL UNIQUE,
      serie TEXT NOT NULL,
      zavod TEXT NOT NULL,
      popis TEXT NOT NULL,
      vstup TEXT NOT NULL,
      zalozenoV INTEGER NOT NULL,
      pokusu INTEGER NOT NULL DEFAULT 0,
      odmitnuto INTEGER NOT NULL DEFAULT 0,
      potiz TEXT
    )
  `);
  // Druhá tabulka přibyla později. `IF NOT EXISTS` ji doplní i na telefonu,
  // kde `stavba.db` už existuje s jedinou tabulkou — migrace netřeba.
  db.execSync(`
    CREATE TABLE IF NOT EXISTS postavene (
      klic TEXT PRIMARY KEY,
      serie TEXT NOT NULL,
      zavod TEXT NOT NULL,
      popis TEXT NOT NULL,
      prvekId INTEGER NOT NULL,
      bojeAId INTEGER NOT NULL,
      bojeANazev TEXT NOT NULL,
      bojeBId INTEGER,
      bojeBNazev TEXT,
      potvrzenoV INTEGER NOT NULL
    )
  `);
  return db;
}

/** Jen pro testy: zapomene otevřené spojení. */
export function zapomenDatabazi() {
  db = null;
}

/**
 * Klíč k prvku. <b>Nemusí být kryptografický</b> — není to tajemství,
 * ale pojistka proti tomu, aby opakované odeslání téhož prvku postavilo
 * dva. `expo-crypto` by byl nativní modul, tedy posunutý otisk a ruční
 * přeinstalace APK u všech; na pár set prvků za sezónu je `Math.random`
 * víc než dost.
 */
export function novyKlic(): string {
  const h = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  // Tvar verze 4, protože server to čte jako `Guid` a jiný tvar nepřijme.
  return `${h(8)}-${h(4)}-4${h(3)}-${'89ab'[Math.floor(Math.random() * 4)]}${h(3)}-${h(12)}`;
}

function naRadek(r: Record<string, unknown>): CekajiciPrvek {
  return {
    id: Number(r.id),
    klic: String(r.klic),
    serie: String(r.serie),
    zavod: String(r.zavod),
    popis: String(r.popis),
    vstup: JSON.parse(String(r.vstup)) as PrvekKPostaveni,
    zalozenoV: Number(r.zalozenoV),
    pokusu: Number(r.pokusu),
    odmitnuto: Number(r.odmitnuto) === 1,
    potiz: r.potiz == null ? null : String(r.potiz),
  };
}

/** Zařadí prvek a vrátí jeho řádek. Pořadí ve frontě je pořadí stavby. */
export function zarad(
  serie: string,
  zavod: string,
  popis: string,
  vstup: PrvekKPostaveni,
  kdy: number = Date.now(),
): CekajiciPrvek {
  const d = databaze();
  d.runSync(
    `INSERT INTO fronta (klic, serie, zavod, popis, vstup, zalozenoV)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [vstup.klic, serie, zavod, popis, JSON.stringify(vstup), kdy],
  );
  return naRadek(d.getFirstSync('SELECT * FROM fronta WHERE klic = ?', [vstup.klic])!);
}

/** Co u téhle regaty čeká, v pořadí stavby. */
export function cekajici(serie: string, zavod: string): CekajiciPrvek[] {
  return databaze()
    .getAllSync<Record<string, unknown>>(
      'SELECT * FROM fronta WHERE serie = ? AND zavod = ? ORDER BY id',
      [serie, zavod],
    )
    .map(naRadek);
}

/**
 * První prvek k odeslání, nebo <c>null</c>.
 *
 * <b>Odmítnutý frontu zastaví</b>, a je to tak schválně: pořadí prvku na
 * trati určuje server podle pořadí, v jakém požadavky dorazí. Kdyby se
 * zaseknutý prvek přeskočil, trať by se poskládala jinak, než jak ji
 * stavitel postavil — a to je horší než čekat. Ven z toho vede zahození
 * toho prvku, což je rozhodnutí člověka.
 */
export function prvniKOdeslani(serie: string, zavod: string): CekajiciPrvek | null {
  const r = databaze().getFirstSync<Record<string, unknown>>(
    'SELECT * FROM fronta WHERE serie = ? AND zavod = ? ORDER BY id LIMIT 1',
    [serie, zavod],
  );
  if (!r) return null;
  const prvni = naRadek(r);
  return prvni.odmitnuto ? null : prvni;
}

/** Prvek došel na server. Ze fronty mizí až tady, ne při odeslání. */
export function hotovo(id: number) {
  databaze().runSync('DELETE FROM fronta WHERE id = ?', [id]);
}

/**
 * Pokus se nepovedl. <b>Rozdíl mezi „nedoletělo" a „server odmítl" je
 * celý smysl téhle funkce:</b> první se zkusí znovu, druhý ne — bušil by
 * donekonečna do věty, kterou musí přečíst člověk.
 */
export function zapisPotiz(id: number, potiz: string, odmitnuto: boolean) {
  databaze().runSync(
    'UPDATE fronta SET pokusu = pokusu + 1, potiz = ?, odmitnuto = ? WHERE id = ?',
    [potiz, odmitnuto ? 1 : 0, id],
  );
}

/** Stavitel zahodil prvek, který server odmítl. Fronta se tím rozjede. */
export function zahod(id: number) {
  databaze().runSync('DELETE FROM fronta WHERE id = ?', [id]);
}

/** Kolik u téhle regaty čeká a kolik z toho stojí na odmítnutí. */
export function stav(serie: string, zavod: string): { ceka: number; odmitnuto: number } {
  const r = databaze().getFirstSync<{ ceka: number; odmitnuto: number }>(
    `SELECT COUNT(*) AS ceka, SUM(odmitnuto) AS odmitnuto
     FROM fronta WHERE serie = ? AND zavod = ?`,
    [serie, zavod],
  );
  return { ceka: Number(r?.ceka ?? 0), odmitnuto: Number(r?.odmitnuto ?? 0) };
}

/**
 * Prvek, který server přijal, i s čísly, která mu přidělil.
 *
 * `bojeAId` a `bojeBId` jsou čísla bójí na serveru — to, co appce chybělo
 * k tomu, aby šlo cokoliv k bóji přiložit.
 */
export type PostavenyPrvek = {
  /** Místní klíč prvku. Týž, pod kterým šel na server. */
  klic: string;
  serie: string;
  zavod: string;
  /** Jak se prvek jmenoval ve frontě — aby bylo co ukázat bez dotazu na server. */
  popis: string;
  prvekId: number;
  bojeAId: number;
  bojeANazev: string;
  /** Druhý konec, nebo <c>null</c> u jednobodového prvku. */
  bojeBId: number | null;
  bojeBNazev: string | null;
  potvrzenoV: number;
};

function naPostaveny(r: Record<string, unknown>): PostavenyPrvek {
  return {
    klic: String(r.klic),
    serie: String(r.serie),
    zavod: String(r.zavod),
    popis: String(r.popis),
    prvekId: Number(r.prvekId),
    bojeAId: Number(r.bojeAId),
    bojeANazev: String(r.bojeANazev),
    bojeBId: r.bojeBId == null ? null : Number(r.bojeBId),
    bojeBNazev: r.bojeBNazev == null ? null : String(r.bojeBNazev),
    potvrzenoV: Number(r.potvrzenoV),
  };
}

/**
 * Zapíše, co server o postaveném prvku vrátil.
 *
 * <b>Proč to vůbec existuje.</b> Fotka se k bóji přikládá na
 * `POST …/boje/{boje}/fotky` a `{boje}` je číslo, které přiděluje server.
 * V odpovědi na `postav` přijde (`PrvekDto.a.id`, `b.id`), jenže appka ji
 * do 17. 11. 2026 zahazovala: řádek fronty se po potvrzení smazal a čísla
 * s ním. Dokud se nepamatují, nemá fotka pořízená u značky kam přijít —
 * a pořídit se dá jen z vody.
 *
 * <para>
 * <b>Přepisuje se podle klíče.</b> Opakované odeslání téhož prvku vrací
 * týž prvek (200 místo 201), takže druhý zápis není duplicita, ale tatáž
 * věc znovu.
 * </para>
 *
 * <para>
 * <b>Řádky se nemažou.</b> Je to místní doklad o tom, co tenhle telefon
 * postavil; při jednotkách prvků na regatu je levnější ho nechat být než
 * vymýšlet, kdy je bezpečné ho zahodit.
 * </para>
 */
export function zapisPostaveny(p: PostavenyPrvek) {
  databaze().runSync(
    `INSERT OR REPLACE INTO postavene
       (klic, serie, zavod, popis, prvekId, bojeAId, bojeANazev, bojeBId, bojeBNazev, potvrzenoV)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      p.klic,
      p.serie,
      p.zavod,
      p.popis,
      p.prvekId,
      p.bojeAId,
      p.bojeANazev,
      p.bojeBId,
      p.bojeBNazev,
      p.potvrzenoV,
    ],
  );
}

/**
 * Co tenhle telefon u téhle regaty postavil, <b>v pořadí na trati</b>.
 *
 * Řadí se podle `prvekId`, ne podle času potvrzení: pořadí na trati určuje
 * server a jen ono platí, až se k prvkům budou přikládat fotky.
 */
export function postavene(serie: string, zavod: string): PostavenyPrvek[] {
  return databaze()
    .getAllSync<Record<string, unknown>>(
      'SELECT * FROM postavene WHERE serie = ? AND zavod = ? ORDER BY prvekId',
      [serie, zavod],
    )
    .map(naPostaveny);
}

/** Jeden postavený prvek podle místního klíče, nebo <c>null</c>. */
export function postavenyPodleKlice(klic: string): PostavenyPrvek | null {
  const r = databaze().getFirstSync<Record<string, unknown>>(
    'SELECT * FROM postavene WHERE klic = ?',
    [klic],
  );
  return r ? naPostaveny(r) : null;
}
