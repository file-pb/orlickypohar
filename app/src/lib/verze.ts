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

import { jsOverenoCerstve, stavJsKratce, type StavJs } from './aktualizace';
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

/* ---------- aktualizace přímo v appce: čistá část ---------- */

/**
 * Co o aktualizaci řekl Google Play přímo v telefonu.
 *
 * `nejde` znamená, že se Play zeptat nedá — iPhone, instalace mimo Play
 * (APK z webu, vývojový build) nebo chyba rozhraní. Není to „nic nového":
 * o tom, jestli je venku novější verze, pak rozhoduje náš seznam vydání.
 */
export type OdpovedPlay =
  | { druh: 'nejde' }
  | { druh: 'nic' }
  | { druh: 'nabizi'; cisloBalicku: number | null; okamzita: boolean }
  | { druh: 'probiha' };

/** Syrová odpověď nativního modulu `PlayAktualizace` (`modules/play-aktualizace`). */
export type OdpovedModulu = { druh: string; cisloBalicku: number | null; okamzita: boolean };

/**
 * Odpověď nativního modulu jako `OdpovedPlay`.
 *
 * <b>Cokoliv nečekaného je `nejde`, ne „nic nového".</b> Kontrakt mezi
 * Kotlinem a TypeScriptem nehlídá žádný překladač; kdyby se jméno stavu
 * rozešlo, „nic" by znamenalo „jsi aktuální" — přesně ta lež, kvůli které
 * to celé vzniklo. `nejde` nechá rozhodnout náš seznam vydání.
 */
export function zOdpovediModulu(o: OdpovedModulu | null | undefined): OdpovedPlay {
  if (!o) return { druh: 'nejde' };
  switch (o.druh) {
    case 'nabizi':
      return {
        druh: 'nabizi',
        cisloBalicku: typeof o.cisloBalicku === 'number' ? o.cisloBalicku : null,
        okamzita: o.okamzita === true,
      };
    case 'probiha':
      return { druh: 'probiha' };
    case 'nic':
      return { druh: 'nic' };
    default:
      return { druh: 'nejde' };
  }
}

/** Co appka nabídne v nabídce pod tečkami a v sekci Verze appky. */
export type Nabidka =
  | { druh: 'aktualizovat'; cisloBalicku: number | null }
  | { druh: 'dokoncit' }
  | { druh: 'obchod'; cisloBalicku: number | null; playNenabizi: boolean }
  | { druh: 'nic' };

/**
 * Co nabídnout, když se sejde odpověď Play s naším seznamem vydání.
 *
 * <b>Play má přednost</b> (Filip, 26. 11. 2026: *„proč se to neaktualizuje
 * samo?"*). Jen on umí aktualizaci spustit, a co nabízí, to telefon
 * opravdu dostane. Náš seznam se ptá, jestli je venku něco novějšího —
 * Play, jestli to tenhle telefon už smí stáhnout. Mezi tím bývá prodleva:
 * 26. 11. 2026 byl balíček 18 v interním testu hodinu `completed`, a
 * Filipův telefon ho přesto nenabízel.
 *
 * <b>Proto i ta prodleva dostane vlastní větu</b> (`playNenabizi`). Tvrdit
 * „aktuální" by byla lež, posílat do obchodu bez vysvětlení zase zbytečné
 * klepání na stránku, kde tlačítko *Aktualizovat* ještě není.
 *
 * <b>Spustit se smí jen okamžitá aktualizace</b> — celá obrazovka od Play,
 * který appku sám restartuje. Když ji Play nepovolí, zbývá obchod. A nikdy
 * sama od sebe: appka běží na vodě během startu a blokující obrazovka by
 * tam byla horší než stará verze.
 */
export function coNabidnout(play: OdpovedPlay, nase: StavBalicku | null): Nabidka {
  if (play.druh === 'probiha') return { druh: 'dokoncit' };
  if (play.druh === 'nabizi' && play.okamzita) {
    return { druh: 'aktualizovat', cisloBalicku: play.cisloBalicku };
  }
  if (play.druh === 'nabizi') {
    return { druh: 'obchod', cisloBalicku: play.cisloBalicku, playNenabizi: false };
  }
  if (nase?.druh === 'novejsi') {
    return {
      druh: 'obchod',
      cisloBalicku: nase.posledni.cisloBalicku,
      // Play odpověděl a nic nenabízí, přestože balíček venku je.
      playNenabizi: play.druh === 'nic',
    };
  }
  return { druh: 'nic' };
}

/** Věta k nabídce, nebo `null`, když není co nabízet. */
export function popisNabidky(n: Nabidka): string | null {
  const cislo = (c: number | null) => (c ? ` č. ${c}` : '');
  switch (n.druh) {
    case 'aktualizovat':
      return `Nová verze${cislo(n.cisloBalicku)} je připravená. Aktualizace proběhne přímo tady a appka se pak sama restartuje.`;
    case 'dokoncit':
      return 'Aktualizace se nedokončila. Dokonči ji, ať nejedeš napůl na staré verzi.';
    case 'obchod':
      return n.playNenabizi
        ? `V Obchodě Play je novější verze${cislo(n.cisloBalicku)}, ale tomuhle telefonu ji Play ještě nenabídl. Bývá to otázka hodin; v obchodě se dá zkusit hned.`
        : `V Obchodě Play je novější verze${cislo(n.cisloBalicku)}. Aktualizuj ji tam: sama se nestáhne, protože mění nativní část appky.`;
    case 'nic':
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
export function verzeKratce(
  stav: StavBalicku | null,
  otisk: string | null,
  js: StavJs | null = null,
  ted: number = Date.now(),
): string | null {
  const k = kratkyOtisk(otisk);
  const balicek =
    stav?.druh === 'aktualni'
      ? `balíček č. ${stav.posledni.cisloBalicku}`
      : stav?.druh === 'novejsi'
        ? `máš balíček č. ${stav.muj.cisloBalicku} · v obchodě je č. ${stav.posledni.cisloBalicku}`
        : k
          ? `otisk ${k}`
          : null;
  // „Nejnovější" jen když sedí obojí: balíček z obchodu i čerstvě ověřený
  // JavaScript. Samotný balíček to neříká — JS mohl zamrznout (26. 11. 2026).
  if (stav?.druh === 'aktualni' && js && jsOverenoCerstve(js, ted)) return `Nejnovější verze · ${balicek}`;
  const casti = [balicek, js ? stavJsKratce(js, ted) : null].filter((x): x is string => Boolean(x));
  if (casti.length === 0) return null;
  const v = casti.join(' · ');
  return v.charAt(0).toUpperCase() + v.slice(1);
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
