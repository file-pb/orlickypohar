/**
 * Cíl: klepání na lodě, jak projíždějí — pravidla zvlášť od vykreslování.
 *
 * <b>Je to tatáž cílová obrazovka, jakou má web</b>
 * (`web/app/sprava/[serie]/vysledky/[zavod]/[cislo]/cil/cil.tsx`), jen
 * druhými dveřmi: na vodě je rozhodčí s telefonem, u stolu s prohlížečem.
 * Pravidla jsou proto přepsaná sem a hlídají je testy obou stran — sdílet
 * by znamenalo nový balíček v buildu appky, a ten musí projít přes EAS
 * (týž důvod jako u `start.ts`).
 *
 * Tři pravidla, která odsud nesmějí zmizet, protože na nich stojí zbytek:
 *
 * <ol>
 *   <li><b>Pořadí dojezdu je pořadí v seznamu</b>, přes všechny kategorie.
 *       Body se počítají po kategoriích z relativního pořadí, takže se
 *       číslovat po kategoriích nemusí — a server to tak i kontroluje
 *       (`Zapis.ProcNejdeUlozit` hlídá jedinečnost uvnitř kategorie,
 *       čemuž průběžné číslování vyhoví samo).</li>
 *   <li><b>Čas patří místu, ne lodi.</b> Klepnutí zachytí okamžik, kdy
 *       něco projelo cílem. Když se ukáže, že se dvě lodě pletly,
 *       prohodí se jména — ale časy zůstanou u míst, protože tak to na
 *       vodě bylo.</li>
 *   <li><b>Loď má buď pořadí, nebo kód</b> — kromě bodového trestu ZFP,
 *       který se k pořadí přičítá (ZPJ 44.3(c)). Loď, která nedokončila,
 *       má DNF, ne ZFP.</li>
 * </ol>
 */

import { File, Paths } from 'expo-file-system';

import type { components } from './schema';

/**
 * Kódy výsledku tak, jak je zná API. Bere se z vygenerovaného kontraktu,
 * ne z vlastního výčtu: kód navíc by se tu jinak objevil o vydání později
 * než na serveru. Je to typ, takže v testech na Node nic nestojí.
 */
export type Kod = NonNullable<components['schemas']['KodVysledku']>;

/** Loď, na kterou se u cíle klepe — jen to, co obrazovka potřebuje. */
export type LodVCili = {
  prihlaskaId: number;
  lod: string;
  cisloPlachty: string | null;
  kategorie: string;
  /** Pořadí, které loď má ze serveru; `null` znamená „ještě nedojela". */
  poradiVCili: number | null;
  /** Kód výsledku ze serveru (DNF, OCS, ZFP…), nebo `null`. */
  kod: Kod | null;
  /** Čas dojezdu ze serveru. */
  dojezdV: string | null;
};

/** Jedno místo v cíli: kolikátá to byla loď a kdy tím místem projela. */
export type Misto = {
  /** Pořadí od jedničky, průběžně přes všechny kategorie. */
  poradi: number;
  prihlaskaId: number;
  /** Okamžik průjezdu (ISO), nebo `null` u zápisu přepsaného z papíru. */
  dojezdV: string | null;
};

/** Řádek zápisu tak, jak ho bere API (`ZapisRadekVstup`). */
export type ZapisRadek = {
  prihlaskaId: number;
  poradiVCili: number | null;
  kod: Kod | null;
  dojezdV: string | null;
};

/**
 * Bodový trest, který <b>pořadí nenahrazuje, ale přičítá se k němu</b>
 * (ZPJ 44.3(c)). Jediný kód, který smí stát vedle pořadí — proto má
 * v kódu jméno a nečte se jako „nějaký řetězec".
 */
export const BODOVY_TREST: Kod = 'Zfp';

/** Průběžné přečíslování od jedničky; mezery po smazaném místě se zavřou. */
function precisluj(mista: readonly Misto[]): Misto[] {
  return mista.map((m, i) => (m.poradi === i + 1 ? m : { ...m, poradi: i + 1 }));
}

/**
 * Pořadí, se kterým obrazovka začíná — z toho, co už je zapsané.
 *
 * Čte se ze serveru, ne z paměti: rozhodčí může pokračovat v zápisu, který
 * začal na webu nebo na jiném telefonu.
 */
export function zeZapisu(lode: readonly LodVCili[]): Misto[] {
  return precisluj(
    lode
      .filter((l) => l.poradiVCili !== null)
      .sort((a, b) => a.poradiVCili! - b.poradiVCili!)
      .map((l) => ({ poradi: l.poradiVCili!, prihlaskaId: l.prihlaskaId, dojezdV: l.dojezdV })),
  );
}

/**
 * Klepnutí: loď projela cílem.
 *
 * <b>Podruhé se nezapíše.</b> Dvojí klepnutí na tutéž loď je na vodě
 * překlep, ne dvojí dojezd — a server by sadu se dvěma řádky téže lodi
 * stejně odmítl.
 */
export function klepni(
  mista: readonly Misto[],
  prihlaskaId: number,
  kdy: number,
): Misto[] {
  if (mista.some((m) => m.prihlaskaId === prihlaskaId)) return mista as Misto[];
  return [
    ...mista,
    { poradi: mista.length + 1, prihlaskaId, dojezdV: new Date(kdy).toISOString() },
  ];
}

/** Zpátky o jedno klepnutí — nejčastější oprava hned po překlepu. */
export function vratPosledni(mista: readonly Misto[]): Misto[] {
  return mista.slice(0, -1);
}

/**
 * Smaže jedno místo. Zbytek se přečísluje a <b>časy jdou s místy</b>,
 * ne s loděmi: zmizí ten okamžik, který se zapsal omylem.
 */
export function odeber(mista: readonly Misto[], poradi: number): Misto[] {
  return precisluj(mista.filter((m) => m.poradi !== poradi));
}

/**
 * Prohodí lodě na dvou místech. <b>Časy zůstanou</b>, kde byly — projely
 * cílem v těch okamžicích, jen se pletla jména.
 */
export function prehod(mista: readonly Misto[], a: number, b: number): Misto[] {
  const prvni = mista.find((m) => m.poradi === a);
  const druhy = mista.find((m) => m.poradi === b);
  if (!prvni || !druhy || a === b) return mista as Misto[];
  return mista.map((m) =>
    m.poradi === a
      ? { ...m, prihlaskaId: druhy.prihlaskaId }
      : m.poradi === b
        ? { ...m, prihlaskaId: prvni.prihlaskaId }
        : m,
  );
}

/** Lodě, které ještě nedojely — na ty se klepe. */
export function zbyva(
  lode: readonly LodVCili[],
  mista: readonly Misto[],
): LodVCili[] {
  const dojely = new Set(mista.map((m) => m.prihlaskaId));
  return lode.filter((l) => !dojely.has(l.prihlaskaId));
}

/**
 * Celá sada k uložení. <b>Posílá se vždycky celá</b>, protože co v ní
 * není, výsledek nemá — uložení maže lodě, které v sadě chybí.
 *
 * Loď, na kterou se kleplo, dostane pořadí a čas a <b>ztratí kód</b>:
 * DNF u lodi, která nakonec dojela, by sadu shodilo („má pořadí i kód").
 * Bodový trest je výjimka — ten se k pořadí přičítá, takže zůstává.
 */
export function radky(
  mista: readonly Misto[],
  lode: readonly LodVCili[],
): ZapisRadek[] {
  const poradi = new Map(mista.map((m) => [m.prihlaskaId, m]));
  return lode.map((l) => {
    const m = poradi.get(l.prihlaskaId);
    if (!m) return { prihlaskaId: l.prihlaskaId, poradiVCili: null, kod: l.kod, dojezdV: null };
    return {
      prihlaskaId: l.prihlaskaId,
      poradiVCili: m.poradi,
      kod: l.kod === BODOVY_TREST ? BODOVY_TREST : null,
      dojezdV: m.dojezdV,
    };
  });
}

/**
 * Kód pro lodě, které zbyly, až rozhodčí rozjížďku ukončí.
 *
 * <b>DNF, ne DNS</b>: loď startovala a nedokončila. Rozjížďku ukončuje
 * rozhodčí, ne hodiny — appka sama neukončí nic, ani když mají dojezd
 * všichni (Filip, 29. 10. 2026).
 */
export const KOD_NEDOKONCILA: Kod = 'Dnf';

/**
 * Sada, kterou se rozjížďka uzavírá: kdo nedojel, má DNF.
 *
 * Loď, která už nějaký kód má (OCS, DSQ, odstoupila), si ho nechá — ten
 * řekl rozhodčí, kdežto DNF je jen „nedojela do uzávěrky".
 */
export function radkyPriUkonceni(
  mista: readonly Misto[],
  lode: readonly LodVCili[],
): ZapisRadek[] {
  return radky(mista, lode).map((r) =>
    r.poradiVCili === null && r.kod === null ? { ...r, kod: KOD_NEDOKONCILA } : r,
  );
}

/** Jak dlouho loď plula, ve vteřinách. `null`, když chybí start nebo dojezd. */
export function plula(startV: string | null, dojezdV: string | null): number | null {
  if (!startV || !dojezdV) return null;
  const s = Date.parse(startV);
  const d = Date.parse(dojezdV);
  if (!Number.isFinite(s) || !Number.isFinite(d)) return null;
  return Math.round((d - s) / 1000);
}

/* ---------- co k tomu říká trasování (nález R33) ---------- */

/**
 * Průjezd cílem, jak ho vidí stopa z telefonu lodi. Počítá ho server
 * (`CilZTrasovani`), protože má stopy i trať.
 */
export type PrujezdZTrasovani = {
  prihlaskaId: number;
  lod: string;
  /** Okamžik protnutí cílové čáry (ISO). */
  kdy: string;
};

/**
 * Jak čerstvý musí být průjezd, aby se nabídl jako návrh.
 *
 * <b>Tři minuty.</b> Návrh má smysl ve chvíli, kdy loď projíždí — tehdy
 * se rozhodčí dívá na vodu a potřebuje jen potvrdit. Starší průjezd by
 * byl buď zapsaný, nebo to nebyl dojezd, ale průjezd brankou: trať se
 * k cíli vrací a server vydává ten poslední.
 */
export const OKNO_NAVRHU_S = 180;

/**
 * Návrhy, které se mají ukázat: loď ještě nemá místo a průjezd je
 * čerstvý. Od nejstaršího, protože v tom pořadí projely cílem.
 */
export function navrhyKZobrazeni(
  prujezdy: readonly PrujezdZTrasovani[],
  mista: readonly Misto[],
  ted: number,
  oknoS: number = OKNO_NAVRHU_S,
): PrujezdZTrasovani[] {
  const zapsane = new Set(mista.map((m) => m.prihlaskaId));
  return prujezdy
    .filter((p) => {
      if (zapsane.has(p.prihlaskaId)) return false;
      const kdy = Date.parse(p.kdy);
      return Number.isFinite(kdy) && ted - kdy <= oknoS * 1000 && kdy <= ted;
    })
    .sort((a, b) => Date.parse(a.kdy) - Date.parse(b.kdy));
}

/**
 * Jak daleko od zapsaného klepnutí smí ležet průjezd, aby šlo o tentýž
 * dojezd.
 *
 * <b>Minuta.</b> Palec přijde pozdě, obzvlášť když projíždí víc lodí za
 * sebou; dál než minutu už je to jiná událost. Loď se přitom shoduje
 * podle přihlášky, takže se nemůže zaměnit za jinou.
 */
export const TOLERANCE_NAVRHU_S = 60;

/**
 * Přesnější čas pro zapsané místo, nebo `null`.
 *
 * <b>Tohle je to „přepsání toho, co určilo trasování"</b> z nálezu R33,
 * jen naopak: rozhodčí určil, <i>kdo</i> dojel, a trasování nabídne
 * <i>kdy</i>. Nabídne se jen čas, který se od zapsaného liší — jinak
 * by obrazovka nabízela změnu, která nic nezmění.
 */
export function presnejsiCas(
  misto: Misto,
  prujezdy: readonly PrujezdZTrasovani[],
  toleranceS: number = TOLERANCE_NAVRHU_S,
): string | null {
  if (!misto.dojezdV) return null;
  const zapsano = Date.parse(misto.dojezdV);
  if (!Number.isFinite(zapsano)) return null;

  const p = prujezdy.find((x) => x.prihlaskaId === misto.prihlaskaId);
  if (!p) return null;

  const kdy = Date.parse(p.kdy);
  if (!Number.isFinite(kdy)) return null;
  if (Math.abs(kdy - zapsano) > toleranceS * 1000) return null;
  return kdy === zapsano ? null : p.kdy;
}

/** Zapíše místu jiný čas — beze změny pořadí i lodi. */
export function prepisCas(
  mista: readonly Misto[],
  poradi: number,
  dojezdV: string,
): Misto[] {
  return mista.map((m) => (m.poradi === poradi ? { ...m, dojezdV } : m));
}

/* ---------- rozepsaný zápis: přežije i konec appky ---------- */

/**
 * Rozepsaný cíl, který ještě není na serveru.
 *
 * <b>Proč se vůbec ukládá.</b> Čas dojezdu je jediný údaj z celé regaty,
 * který se nedá zjistit znovu: závod proběhl jednou. Zabitá appka nebo
 * vybitá baterie u cíle by ho vzala s sebou, a nikdo by ho nedoplnil —
 * na rozdíl od pořadí, které si rozhodčí pamatuje nebo dohledá z papíru.
 */
export type RozepsanyCil = {
  serie: string;
  zavod: string;
  cislo: number;
  mista: Misto[];
};

const PAMET = 'rozepsany-cil.json';

/**
 * Rozepsaný cíl té rozjížďky, nebo `null`.
 *
 * Jiná rozjížďka než ta otevřená se zahodí: soubor je jeden a zápis
 * z předchozí rozjížďky by do téhle natekl jako cizí pořadí.
 */
export function nactiRozepsany(
  serie: string,
  zavod: string,
  cislo: number,
): RozepsanyCil | null {
  try {
    const f = new File(Paths.document, PAMET);
    if (!f.exists) return null;
    const r = JSON.parse(f.textSync()) as RozepsanyCil;
    if (r?.serie !== serie || r?.zavod !== zavod || r?.cislo !== cislo) return null;
    return Array.isArray(r.mista) ? r : null;
  } catch {
    return null;
  }
}

/** Zapamatuje rozepsaný cíl, nebo ho zahodí (`null`), když prošel na server. */
export function ulozRozepsany(r: RozepsanyCil | null): void {
  try {
    const f = new File(Paths.document, PAMET);
    if (f.exists) f.delete();
    if (!r) return;
    f.create();
    f.write(JSON.stringify(r));
  } catch {
    // Neuložený rozepsaný zápis znamená, že se po pádu appky začne od
    // toho, co má server. Za pád obrazovky u cíle to nestojí.
  }
}
