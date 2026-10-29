/**
 * Úkon procedury, který appka drží, dokud ho nemá kam odeslat.
 *
 * <b>Proč to vzniklo.</b> Pyramida autority (`docs/SOUPIS-A-PLAN-START.md`)
 * má dvě pravidla, která se bez tohohle dodržet nedají:
 *
 * <ol>
 *   <li><i>Odpočet nikdy nečeká na odpověď serveru.</i> Dosud čekal: čas
 *       startu se bral z dat, která vrátil server, takže bez signálu se
 *       po zmáčknutí neobjevilo nic.</li>
 *   <li><i>Žádná obrazovka startéra se nesmí zablokovat kvůli systému.</i>
 *       Nejvýš „zatím neodeslané", nikdy „nelze, nejsem online".</li>
 * </ol>
 *
 * <b>Co se drží, je okamžik stisku — ne čas startu.</b> Čas startu z něj
 * plyne podle pravidla (ZPJ 26, resp. 29.2), a to je tatáž funkce, jakou
 * počítá server (`Procedura.NovyStart`). Kdyby se posílal rovnou čas
 * startu, obcházelo by se pravidlo; takhle se posílá jen ten „teď", na
 * který se použije, a server ho ještě zváží (`CasKlienta`).
 *
 * Pravidla zvlášť od ukládání: horní půlka se dá ověřit na Node
 * (`app/testy/cekajici-start.test.ts`), spodní potřebuje telefon.
 */
import { File, Paths } from 'expo-file-system';

import { NEJDELSI_JIZDA_S, type RozjizdkaProOdpocet, type UkonStartu } from './start';

/** Úkony procedury: spuštění a obě přerušení. */
export type UkonProcedury = 'Spustit' | UkonStartu;

/** Co appka drží, dokud to neprojde na server. */
export type CekajiciUkon = {
  serie: string;
  zavod: string;
  cislo: number;
  druh: UkonProcedury;
  /** Kdy to startér zmáčkl, podle hodin telefonu (ms). */
  kdy: number;
};

/* ---------- čistá část: dá se testovat na Node ---------- */

/**
 * Jak dlouho po spuštění prvního opakovače padne vyzývací znamení nového
 * startu — ZPJ 29.2 doslova *„jednu minutu poté"*. Totéž číslo má server
 * jako `Procedura.PoOdvolani`.
 */
export const PO_ODVOLANI_S = 60;

/**
 * Čas startu, který z úkonu plyne. `null` znamená „žádný" — tedy
 * odložení, po kterém se čas volí znovu (ZPJ 27.3).
 *
 * <b>Je to kopie serverového pravidla</b> (`Procedura.NovyStart`), a to
 * schválně: appka musí odpočítávat dřív, než se server vůbec doví, že se
 * startuje. Kdyby se obě strany rozešly, pozná se to v testech obou —
 * ne až u vody.
 */
export function startZUkonu(druh: UkonProcedury, kdy: number, delkaS: number): string | null {
  if (druh === 'Odlozit') return null;
  const zaS = druh === 'Odvolat' ? PO_ODVOLANI_S + delkaS : delkaS;
  return new Date(kdy + zaS * 1000).toISOString();
}

/**
 * Patří ten úkon téhle regatě a má ještě smysl?
 *
 * <b>Stáří je mez, ne ozdoba.</b> Server bere čas z telefonu jen v okně
 * kolem svého (`CasKlienta`); co je starší, zapíše vlastním časem — a tím
 * by z podrženého startu udělal start v okamžiku doručení. Mez je nejdelší
 * rozumná jízda: déle než ta už rozjížďka neběží ani na vodě.
 */
export function platnyUkon(
  u: CekajiciUkon | null,
  serie: string,
  zavod: string,
  ted: number,
): CekajiciUkon | null {
  if (!u) return null;
  if (u.serie !== serie || u.zavod !== zavod) return null;
  if (ted - u.kdy > NEJDELSI_JIZDA_S * 1000) return null;
  return u;
}

/**
 * Rozjížďky s dosazeným čekajícím úkonem — odpočet z nich pak běží
 * z hodin telefonu, ne z toho, co stihl potvrdit server.
 *
 * <b>Stav se vrací mezi plánované</b>, protože to dělají všechny tři
 * úkony (`Procedura.StavPo`). U odvolání na tom záleží: rozjížďka je na
 * serveru pořád „probíhá" a bez téhle opravy by appka ukazovala, že se
 * jede, zatímco pole stojí na startu.
 */
export function sCekajicim(
  rozjizdky: readonly RozjizdkaProOdpocet[],
  u: CekajiciUkon | null,
  delkaS: number,
): readonly RozjizdkaProOdpocet[] {
  if (!u) return rozjizdky;
  return rozjizdky.map((r) =>
    r.cislo === u.cislo
      ? { ...r, startV: startZUkonu(u.druh, u.kdy, delkaS), stav: 'Planovana' as const }
      : r,
  );
}

/* ---------- uložení: přežije i konec appky ---------- */

/**
 * Jméno souboru s čekajícím úkonem.
 *
 * Do `document`, ne do cache: cache systém kdykoliv smaže, a s ní by
 * zmizel i start, který se ještě nikam nedoručil.
 */
const PAMET = 'cekajici-start.json';

/**
 * Co appka drží, nebo `null`.
 *
 * Nikdy nevyhodí výjimku: nepřečtený soubor znamená nejvýš start, který
 * se odešle až při dalším stisku. Shodit kvůli tomu obrazovku startéra by
 * bylo přesně to, čemu se tu brání.
 */
export function nactiCekajici(): CekajiciUkon | null {
  try {
    const f = new File(Paths.document, PAMET);
    if (!f.exists) return null;
    // `textSync`, ne `text()`: to druhé vrací `Promise` z `Blob`, takže by
    // se odpočet rozjížděl z nevyhodnoceného slibu.
    const u = JSON.parse(f.textSync()) as CekajiciUkon;
    return typeof u?.kdy === 'number' && typeof u?.cislo === 'number' ? u : null;
  } catch {
    return null;
  }
}

/** Zapamatuje úkon, nebo ho zahodí (`null`), když prošel. */
export function ulozCekajici(u: CekajiciUkon | null): void {
  try {
    const f = new File(Paths.document, PAMET);
    if (f.exists) f.delete();
    if (!u) return;
    f.create();
    f.write(JSON.stringify(u));
  } catch {
    // Neuložený úkon se odešle hned a nepřežije konec appky. Víc se
    // s tím dělat nedá a za pád obrazovky to nestojí.
  }
}
