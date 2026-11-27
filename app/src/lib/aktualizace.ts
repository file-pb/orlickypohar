/**
 * Samoaktualizace JavaScriptu: kdy se appka sama ptá, co si pamatuje mezi
 * restarty a co o sobě smí tvrdit.
 *
 * <b>Proč to existuje</b> (Filip, 27. 11. 2026: *„musí se aktualizovat sama
 * a to 100% spolehlivě"*). expo-updates se ptá jen při studeném startu
 * a staženou verzi použije až při dalším — na Androidu, kde appka leží dny
 * v paměti, to znamenalo dny na starém kódu. A sekce Verze appky přitom
 * psala „Appka je aktuální.", i když kontrola spadla nebo proběhla před
 * týdnem: věta popisovala stav běžícího procesu, ne pravdu.
 *
 * Tenhle soubor je jen logika. Kdy přesně se restartuje, hlídá `restart.ts`
 * a kdo to celé spouští, je komponenta `Aktualizator`.
 */
import { File, Paths } from 'expo-file-system';
import * as Updates from 'expo-updates';

import { datum } from './datum';

/** Po návratu z pozadí se ptá nejdřív po tolika od poslední kontroly. Volba. */
export const KONTROLA_PO_NAVRATU_MS = 15 * 60_000;
/** V popředí se ptá nejvýš jednou za tolik. Volba; Expo radí nepollovat. */
export const KONTROLA_V_POPREDI_MS = 30 * 60_000;
/** Jak dlouho musí být člověk na domovské obrazovce, než se tam restartuje. */
export const DOMOV_KLID_MS = 2_000;
/** Do kdy je „ověřeno" čerstvé natolik, aby appka napsala „nejnovější". Volba. */
export const CERSTVE_OVERENO_MS = 24 * 3600_000;

/** Jak dopadla poslední kontrola. */
export type VysledekKontroly = 'nic' | 'stazeno' | 'chyba' | 'vadna';

/** Co si appka pamatuje mezi restarty. */
export type Pamet = {
  /** Verze, do které se appka sama restartovala a ještě se neví, jestli se vzala. */
  zkousena: string | null;
  /** Verze, která se po restartu nevzala. Sama ji appka znovu nezkouší. */
  odmitnuta: string | null;
  kontrola: { kdy: number; vysledek: VysledekKontroly; duvod: string | null } | null;
};

export const PRAZDNA_PAMET: Pamet = { zkousena: null, odmitnuta: null, kontrola: null };

/* ---------- čistá část ---------- */

/** Uplynul od poslední kontroly aspoň takový rozestup? */
export function maSeKontrolovat(ted: number, posledni: number | null, rozestupMs: number): boolean {
  return posledni === null || ted - posledni >= rozestupMs;
}

/**
 * Srovná paměť s tím, na čem appka po startu doopravdy běží.
 *
 * Restartovala-li se do verze X a běží X, vzala se. Běží-li cokoliv jiného
 * (nebo nouzově zabudovaný bundle), expo-updates se po pádu vrátil na
 * starší — X se zapíše jako odmítnutá a sama se už nezkouší.
 */
export function poStartu(p: Pamet, bezi: string | null, nouzove: boolean): Pamet {
  if (!p.zkousena) return p;
  if (!nouzove && bezi === p.zkousena) return { ...p, zkousena: null };
  return { ...p, zkousena: null, odmitnuta: p.zkousena };
}

/** Co appka smí říct o svém JavaScriptu. Žádné „aktuální" bez úspěšné kontroly. */
export type StavJs =
  | { druh: 'nejde' }
  | { druh: 'nouzove' }
  | { druh: 'pripravena' }
  | { druh: 'hleda' }
  | { druh: 'neovereno'; chyba: string | null; naposledyOk: number | null }
  | { druh: 'odmitnuta' }
  | { druh: 'overeno'; kdy: number }
  | { druh: 'nikdy' };

export function stavJs(v: {
  zapnute: boolean;
  nouzove: boolean;
  pripravena: boolean;
  hleda: boolean;
  odmitnuta: boolean;
  chyba: string | null;
  kontrola: Pamet['kontrola'];
}): StavJs {
  if (!v.zapnute) return { druh: 'nejde' };
  if (v.nouzove) return { druh: 'nouzove' };
  if (v.pripravena) return { druh: 'pripravena' };
  if (v.hleda) return { druh: 'hleda' };
  const k = v.kontrola;
  // Chyba z běžícího procesu je čerstvější než uložená úspěšná kontrola.
  if (v.chyba || k?.vysledek === 'chyba') {
    return {
      druh: 'neovereno',
      chyba: v.chyba ?? k?.duvod ?? null,
      naposledyOk: k && k.vysledek !== 'chyba' ? k.kdy : null,
    };
  }
  if (v.odmitnuta || k?.vysledek === 'vadna') return { druh: 'odmitnuta' };
  if (k) return { druh: 'overeno', kdy: k.kdy };
  return { druh: 'nikdy' };
}

/** „před 5 min", „dnes v 14:20", „26. listopadu 2026 v 23:02". */
export function predChvili(ted: number, kdy: number): string {
  const min = Math.floor((ted - kdy) / 60_000);
  if (min < 1) return 'právě teď';
  if (min < 60) return `před ${min} min`;
  const d = new Date(kdy);
  const dve = (n: number) => String(n).padStart(2, '0');
  const cas = `${dve(d.getHours())}:${dve(d.getMinutes())}`;
  if (new Date(ted).toDateString() === d.toDateString()) return `dnes v ${cas}`;
  const iso = `${d.getFullYear()}-${dve(d.getMonth() + 1)}-${dve(d.getDate())}`;
  return `${datum(iso)} v ${cas}`;
}

/** Jedna věta pro sekci Verze appky. */
export function popisStavuJs(s: StavJs, ted: number): string {
  switch (s.druh) {
    case 'nejde':
      return 'Aktualizace po síti v téhle verzi nejdou — appka běží z Expo Go nebo z vývojového buildu.';
    case 'nouzove':
      return 'Stažená verze se nepodařila načíst, appka nouzově jede na verzi z instalace. Oprava přijde další aktualizací sama.';
    case 'pripravena':
      return 'Nová verze je stažená. Použije se sama, až appka nebude nic držet — start, cíl ani stavbu trati.';
    case 'hleda':
      return 'Koukám, jestli je něco nového…';
    case 'neovereno':
      return s.naposledyOk
        ? `Teď se nepodařilo ověřit, jestli je něco nového. Naposledy ověřeno ${predChvili(ted, s.naposledyOk)}.`
        : 'Nepodařilo se ověřit, jestli je něco nového.';
    case 'odmitnuta':
      return 'Poslední nová verze se po spuštění nevzala a appka jede na předchozí. Sama ji znovu zkoušet nebude; oprava přijde další aktualizací.';
    case 'overeno':
      return `Ověřeno ${predChvili(ted, s.kdy)}, nic nového.`;
    case 'nikdy':
      return 'Zatím se neověřovalo, jestli je něco nového.';
  }
}

/** Kratší podoba do patičky nabídky. `null`, když není co dodat. */
export function stavJsKratce(s: StavJs, ted: number): string | null {
  switch (s.druh) {
    case 'overeno':
      return `ověřeno ${predChvili(ted, s.kdy)}`;
    case 'pripravena':
      return 'nová verze čeká';
    case 'neovereno':
      return 'neověřeno';
    case 'odmitnuta':
      return 'poslední verze se nevzala';
    case 'nouzove':
      return 'nouzový režim';
    default:
      return null;
  }
}

/** Smí patička napsat „nejnovější"? Jen po čerstvé úspěšné kontrole. */
export function jsOverenoCerstve(s: StavJs, ted: number): boolean {
  return s.druh === 'overeno' && ted - s.kdy < CERSTVE_OVERENO_MS;
}

/* ---------- část, která mluví s telefonem ---------- */

const SOUBOR = 'aktualizace.json';

/** Paměť z trvalého adresáře. Nikdy nevyhodí: nevědět znamená začít znovu. */
export function nactiPamet(): Pamet {
  try {
    const f = new File(Paths.document, SOUBOR);
    if (!f.exists) return PRAZDNA_PAMET;
    const p = JSON.parse(f.textSync()) as Partial<Pamet>;
    return {
      zkousena: typeof p.zkousena === 'string' ? p.zkousena : null,
      odmitnuta: typeof p.odmitnuta === 'string' ? p.odmitnuta : null,
      kontrola: p.kontrola && typeof p.kontrola.kdy === 'number' ? p.kontrola : null,
    };
  } catch {
    return PRAZDNA_PAMET;
  }
}

export function ulozPamet(p: Pamet): void {
  try {
    const f = new File(Paths.document, SOUBOR);
    if (f.exists) f.delete();
    f.create();
    f.write(JSON.stringify(p));
  } catch {
    // Nezapamatovaná kontrola se příště zopakuje. To je vše.
  }
}

/**
 * Zeptá se na novou verzi a stáhne ji. Výsledek zapíše do paměti, aby
 * obrazovka mohla říct pravdu i po dnech: kdy se naposledy ověřilo a jak.
 */
export async function zkontrolujTed(): Promise<VysledekKontroly> {
  if (!Updates.isEnabled) return 'chyba';
  const zapis = (vysledek: VysledekKontroly, duvod: string | null) => {
    const p = nactiPamet();
    // Odmítnutá verze přestává být zpráva, jakmile server nabídne něco
    // jiného (stazeno), nebo nic nad tím, na čem appka běží (nic). Kdyby
    // byla pořád nejnovější, kontrola by vrátila `vadna`, ne `nic`.
    const odmitnuta = vysledek === 'nic' || vysledek === 'stazeno' ? null : p.odmitnuta;
    ulozPamet({ ...p, odmitnuta, kontrola: { kdy: Date.now(), vysledek, duvod } });
    return vysledek;
  };
  try {
    const v = await Updates.checkForUpdateAsync();
    if (v.isAvailable || ('isRollBackToEmbedded' in v && v.isRollBackToEmbedded)) {
      await Updates.fetchUpdateAsync();
      return zapis('stazeno', null);
    }
    // Hodnota výčtu UpdateCheckResultNotAvailableReason.UPDATE_PREVIOUSLY_FAILED:
    // nová verze na serveru je, ale v tomhle telefonu už jednou spadla.
    const duvod = 'reason' in v && typeof v.reason === 'string' ? v.reason : null;
    if (duvod === 'updatePreviouslyFailed') return zapis('vadna', duvod);
    return zapis('nic', duvod);
  } catch (e) {
    return zapis('chyba', e instanceof Error ? e.message : 'Nedaří se spojit se serverem aktualizací.');
  }
}

/**
 * Restartuje do připravené verze a zapamatuje si ji jako zkoušenou —
 * po startu `poStartu` pozná, jestli se vzala.
 */
export async function pouzijVerzi(id: string, pozadi: string): Promise<void> {
  ulozPamet({ ...nactiPamet(), zkousena: id });
  await Updates.reloadAsync({ reloadScreenOptions: { backgroundColor: pozadi, fade: true } });
}
