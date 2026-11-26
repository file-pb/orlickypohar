/**
 * Na čem appka jede a jestli se právě aktualizovala.
 *
 * <b>Proč to vzniklo</b> (Filip, 28. 10. 2026: *„Jak Milos pozná ze se mu
 * to samo aktualizovalo?"*). Do té doby nijak. `expo-updates` byl v appce
 * jen jako závislost — aktualizace se tiše stáhla a použila a appka o tom
 * neřekla ani slovo, protože se jí nikde v kódu nikdo nedotkl. Pro
 * rozhodčího, který posílá nálezy z používání, je to slepá skvrna: když mu
 * něco nefunguje, nikdo nepozná, jestli jede na staré verzi, a on nemá jak
 * doložit, na čem jel. Každý jeho nález je tím podmíněný.
 *
 * <b>Jsou to dvě různé otázky.</b> *Na čem jedu* se dá zjistit kdykoliv
 * (sekce v Účtu) a *právě se to změnilo* se musí říct samo (banner).
 * Druhá potřebuje paměť: `Updates.updateId` se mezi spuštěními nemění,
 * takže bez zapamatování by banner svítil při každém otevření appky.
 *
 * <b>Ukládá se poslední viděné ID, ne příznak „banner už byl".</b> Příznak
 * by zhasl navždy po první aktualizaci; ID zhasne jen pro tu jednu a další
 * se ohlásí zas.
 *
 * <b>Z instalačního souboru se nehlásí nic.</b> Kdo právě ručně instaloval
 * APK, ví to — banner by mu říkal, co sám udělal. Hlásí se jen to, co se
 * stalo bez něj.
 */
import { File, Paths } from 'expo-file-system';
import * as Updates from 'expo-updates';

import { datum } from './datum';
import type { components } from './schema';
import { sit } from './sit';

/** Jméno souboru, ve kterém si appka drží poslední ohlášenou aktualizaci. */
const PAMET = 'videna-verze.txt';

/** Co se dá o běžící verzi zjistit. */
export type Puvod = {
  /** Jede appka z aktualizace stažené po síti? Jinak z instalačního souboru. */
  zAktualizace: boolean;
  /** Kdy aktualizace vyšla. `null`, když to nevíme nebo jde o APK. */
  vydano: Date | null;
  /** Otisk nativní části — z něj se pozná, které APK tuhle aktualizaci přijme. */
  otisk: string | null;
  /** Identita běžící aktualizace. */
  id: string | null;
};

/* ---------- čistá část: dá se testovat na Node ---------- */

/**
 * „28. října 2026 v 17:42".
 *
 * Čas se skládá z <b>místních</b> složek, ne z `toISOString()`: ten vrací
 * UTC a v Praze by ukazoval o hodinu až dvě vedle. Název měsíce dodá
 * `datum()`, takže se deset jmen nepíše podruhé a nehrozí, že se obě místa
 * rozejdou.
 */
export function kdy(d: Date): string {
  const dve = (n: number) => String(n).padStart(2, '0');
  const iso = `${d.getFullYear()}-${dve(d.getMonth() + 1)}-${dve(d.getDate())}`;
  return `${datum(iso)} v ${dve(d.getHours())}:${dve(d.getMinutes())}`;
}

/**
 * Otisk zkrácený na osm znaků. Celý je čtyřicet a na obrazovce by k ničemu
 * nebyl; osm stačí k tomu, aby šel porovnat s tím, co hlásí build.
 */
export function kratkyOtisk(otisk: string | null): string | null {
  return otisk ? otisk.slice(0, 8) : null;
}

/**
 * Jedna věta pro laika o tom, na čem appka jede.
 *
 * <b>Datum se nedomýšlí.</b> Když appka jede na aktualizaci, ale `createdAt`
 * je prázdné, řekne se jen to první — vymyšlené datum by vypadalo stejně
 * důvěryhodně jako skutečné (poučení „nevytvářet nepravdu").
 */
export function popisPuvodu(p: Puvod): string {
  if (!p.zAktualizace) {
    return 'Appka jede z instalačního souboru, který jsi stáhl. Aktualizace po síti zatím žádná nepřišla.';
  }
  if (!p.vydano) return 'Appka jede na aktualizaci stažené po síti.';
  return `Appka se naposled sama aktualizovala ${kdy(p.vydano)}.`;
}

/**
 * Má se ohlásit, že appka naběhla na nové verzi?
 *
 * Tři podmínky a každá vyřazuje jiný případ: bez aktualizace není co hlásit
 * (APK), bez `id` by se nedalo zapamatovat, že se ohlásila, a shoda
 * s viděným znamená, že tuhle už appka hlásila.
 */
export function jePrvniNabeh(videne: string | null, p: Puvod): boolean {
  if (!p.zAktualizace || !p.id) return false;
  return videne !== p.id;
}

/** Co appka zrovna dělá s hledáním novinek, lidsky. */
export function popisHledani(s: {
  hleda: boolean;
  stahuje: boolean;
  cekaRestart: boolean;
  jeNovinka: boolean;
}): string {
  // Pořadí je od nejpozdější fáze: „čeká na restart" je zároveň
  // „je novinka", a kdyby se ptalo odpředu, zůstalo by u mlhavějšího.
  if (s.cekaRestart) return 'Nová verze je připravená. Použije se, až appku zavřeš a znovu otevřeš.';
  if (s.stahuje) return 'Stahuji novou verzi…';
  if (s.hleda) return 'Koukám, jestli je něco nového…';
  if (s.jeNovinka) return 'Je tu nová verze.';
  return 'Appka je aktuální.';
}

/* ---------- balíček v obchodě: čistá část ---------- */

/** Jeden vydaný balíček, jak ho vrací `GET /appka/vydani/android`. */
export type Vydani = components['schemas']['VydaniAppkyDto'];

/** Má telefon poslední balíček z obchodu? */
export type StavBalicku =
  | { druh: 'aktualni'; posledni: Vydani }
  | { druh: 'novejsi'; posledni: Vydani; muj: Vydani }
  | { druh: 'neznamy' };

/**
 * Má telefon poslední balíček z obchodu?
 *
 * <b>Proč to nestačí nechat na aktualizacích po síti</b> (Filip, 26. 11.
 * 2026: *„aby se to nemuselo odhadovat"*). Ty hledají jen pro otisk, na
 * kterém appka běží. Po nativní změně pro starý balíček žádná není, takže
 * by appka hlásila „jsi aktuální" ve chvíli, kdy v Play leží nová verze.
 *
 * <b>Rozhoduje otisk, ne čas.</b> Telefon zná svůj `runtimeVersion` a
 * seznam řekne, kterému balíčku patří. Pořadí dává číslo balíčku — seznam
 * se tu řadí znovu, na pořadí z API se nespoléhá.
 *
 * <b>Neznámý otisk není „novější venku".</b> Telefon může mít balíček,
 * jehož zápis se nepovedl, vývojový build nebo něco novějšího, než API zná.
 * Rada „aktualizuj v Play" by tam byla lež, a falešná rada je horší než
 * žádná — člověk by v obchodě hledal verzi, kterou už má.
 *
 * <b>Jen kanál `production`.</b> To je balíček z Play. APK ze stránky
 * `/appka` jede na `preview` a z Play se aktualizovat nedá; vývojový build
 * a Expo Go kanál nemají vůbec.
 */
export function stavBalicku(
  vydani: readonly Vydani[],
  otisk: string | null,
  kanal: string | null,
): StavBalicku {
  if (kanal !== 'production' || !otisk || vydani.length === 0) return { druh: 'neznamy' };

  const podleCisla = [...vydani].sort((a, b) => b.cisloBalicku - a.cisloBalicku);
  const posledni = podleCisla[0];
  if (posledni.otisk === otisk) return { druh: 'aktualni', posledni };

  // Nejvyšší balíček s mým otiskem: ruční „nahrát znovu" mohl tentýž
  // otisk dát víc číslům.
  const muj = podleCisla.find((v) => v.otisk === otisk);
  if (!muj) return { druh: 'neznamy' };
  return { druh: 'novejsi', posledni, muj };
}

/** Jedna věta o balíčku z obchodu, nebo `null`, když není co říct. */
export function popisBalicku(s: StavBalicku): string | null {
  switch (s.druh) {
    case 'aktualni':
      return `Máš nejnovější balíček z Obchodu Play — č. ${s.posledni.cisloBalicku}, vydaný ${kdy(new Date(s.posledni.vydanoV))}.`;
    case 'novejsi':
      return (
        `V Obchodě Play je novější verze — balíček č. ${s.posledni.cisloBalicku}, ` +
        `vydaný ${kdy(new Date(s.posledni.vydanoV))}. Ty máš č. ${s.muj.cisloBalicku}. ` +
        'Aktualizuj ji v obchodě: sama se nestáhne, protože mění nativní část appky.'
      );
    case 'neznamy':
      return null;
  }
}

/**
 * Na čem appka jede, na jeden řádek — pro patičku nabídky pod tečkami.
 *
 * <b>Proč i tam</b> (Filip, 26. 11. 2026: *„není možné tam někde pod
 * tečkami udělat info o verzi"*). Celá sekce je v *Účet a nastavení*, ale
 * kdo ověřuje, jestli mu dorazila oprava, nemá ji hledat o dvě obrazovky
 * hloub. Bez balíčku z obchodu zbude otisk: je to aspoň něco, co jde
 * přečíst do telefonu a porovnat.
 */
export function verzeKratce(stav: StavBalicku | null, otisk: string | null): string | null {
  if (stav?.druh === 'aktualni') return `Nejnovější verze · balíček č. ${stav.posledni.cisloBalicku}`;
  if (stav?.druh === 'novejsi') {
    return `Máš balíček č. ${stav.muj.cisloBalicku} · v obchodě je č. ${stav.posledni.cisloBalicku}`;
  }
  const k = kratkyOtisk(otisk);
  return k ? `Otisk ${k}` : null;
}

/** Obchod Play na stránce appky. `market:` otevře aplikaci obchodu. */
export const OBCHOD = 'market://details?id=cz.klihovka.orlickypohar';
/** Totéž v prohlížeči — pro telefon, na kterém aplikace obchodu není. */
export const OBCHOD_WEB = 'https://play.google.com/store/apps/details?id=cz.klihovka.orlickypohar';

/* ---------- část, která mluví s telefonem ---------- */

/** Jsou aktualizace po síti vůbec v téhle verzi appky zapnuté? */
export const aktualizaceJdou = Updates.isEnabled;

/** Co appka ví o sobě. */
export function puvod(): Puvod {
  return {
    // `isEmbeddedLaunch` je true, když se spustil balík zabalený v APK.
    zAktualizace: Updates.isEnabled && !Updates.isEmbeddedLaunch,
    vydano: Updates.createdAt,
    otisk: Updates.runtimeVersion ?? null,
    id: Updates.updateId ?? null,
  };
}

/**
 * Poslední ohlášená aktualizace. Čte se ze souboru v trvalém adresáři —
 * ne z cache, kterou systém kdykoliv smaže a banner by se vrátil.
 *
 * Nikdy nevyhodí výjimku: nevědět, co už bylo ohlášeno, znamená nejvýš
 * banner navíc. Shodit kvůli tomu appku by bylo nepoměrné.
 */
export function videnaVerze(): string | null {
  try {
    const f = new File(Paths.document, PAMET);
    // `textSync`, ne `text()`: to druhé přichází z `Blob` a vrací
    // `Promise`, takže by se banner rozhodoval z nevyhodnoceného slibu.
    return f.exists ? f.textSync() : null;
  } catch {
    return null;
  }
}

/** Zapamatuje, že tahle aktualizace už se ohlásila. Chyba se ignoruje — viz výš. */
export function zapamatuj(id: string): void {
  try {
    const f = new File(Paths.document, PAMET);
    if (f.exists) f.delete();
    f.create();
    f.write(id);
  } catch {
    // Nezapamatovaný banner se ukáže ještě jednou. To je vše.
  }
}

/**
 * Podívá se, jestli je něco nového, a stáhne to. Vrací text chyby, nebo
 * `null`, když se nic nepokazilo — stejný tvar jako `prihlas()` v
 * `identita.ts`, aby se s tím na obrazovce zacházelo pořád stejně.
 */
export async function zkusAktualizaci(): Promise<string | null> {
  if (!Updates.isEnabled) {
    return 'Aktualizace po síti nejsou v téhle verzi appky zapnuté.';
  }
  try {
    const vysledek = await Updates.checkForUpdateAsync();
    if (!vysledek.isAvailable) return null;
    await Updates.fetchUpdateAsync();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Nedaří se zjistit, jestli je něco nového.';
  }
}

/** Použije připravenou verzi hned. Appka se při tom překreslí od začátku. */
export async function pouzijHned(): Promise<void> {
  await Updates.reloadAsync();
}

/**
 * Má tenhle telefon poslední balíček z obchodu? `null`, když se to nedá
 * zjistit — bez signálu, nebo když API neodpoví.
 *
 * <b>Chyba není „aktuální".</b> Mlčet by vypadalo stejně jako shoda, a právě
 * tenhle rozdíl je důvod, proč to celé vzniklo.
 */
export async function zjistiStavBalicku(): Promise<StavBalicku | null> {
  try {
    const odpoved = await sit('/appka/vydani/android', { headers: { accept: 'application/json' } });
    if (!odpoved.ok) return null;
    const vydani = (await odpoved.json()) as Vydani[];
    return stavBalicku(vydani, Updates.runtimeVersion ?? null, Updates.channel ?? null);
  } catch {
    return null;
  }
}
