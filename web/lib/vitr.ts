import { unstable_cache } from "next/cache";

/**
 * Vítr ze stanic ČHMÚ kolem Orlíku (Filip, 18. 9. 2026).
 *
 * <b>Zdroj jsou desetiminutová data</b> na opendata.chmi.cz:
 * `meteorology/climate/now/data/10m-<WSI>-<YYYYMMDD>.json`, soubor na stanici
 * a den (UTC), asi 90 kB. Hodnoty chodí se zpožděním kolem 45 minut.
 * Prvky: `F` rychlost (m/s), `Fmax` nejsilnější náraz v intervalu, `D` směr,
 * odkud fouká (stupně), `P` tlak na stanici (hPa), `T` teplota vzduchu (°C).
 *
 * <b>Stanice ověřené 18. 9. 2026</b> z `now/metadata/meta1-*.json`: stanice
 * Orlík nad Vltavou a Kamýk měří jen srážky, vítr nejblíž hlásí Vráž. Ostatní
 * jsou dál a výš — slouží k porovnání, jestli jde o místní poryv, nebo
 * o vítr přes celý kraj.
 */

/**
 * `vyska` (m n. m.) mají jen stanice, ze kterých se bere tlak — bez ní se
 * tlak na stanici nedá přepočíst na hladinu moře.
 */
export type Stanice = { wsi: string; nazev: string; km: number; vyska?: number };

export const STANICE: Stanice[] = [
  { wsi: "0-203-0-11532", nazev: "Vráž", km: 16 },
  { wsi: "0-203-0-11528", nazev: "Nadějkov", km: 21 },
  { wsi: "0-203-0-11485", nazev: "Příbram", km: 21 },
  // Výška z now/metadata/meta1-*.json, ověřeno 18. 9. 2026.
  { wsi: "0-20000-0-11487", nazev: "Kocelovice", km: 25, vyska: 519 },
  { wsi: "0-20000-0-11538", nazev: "Temelín", km: 39 },
];

export const STRANKA_VETRU = "https://opendata.chmi.cz/meteorology/climate/now/data/";

const ADRESAR = "https://opendata.chmi.cz/meteorology/climate/now/data/";

export type Mereni = {
  cas: string;
  rychlost: number;
  naraz: number | null;
  smer: number | null;
  /** `P`: tlak na stanici (hPa), ne přepočtený na hladinu moře. */
  tlak: number | null;
  /** `T`: teplota vzduchu (°C), potřebná k přepočtu tlaku. */
  teplota: number | null;
};

export type VitrStanice = Stanice & { historie: Mereni[] };

/** Stočení se hlídá na posledních 30 minutách. */
export const STOCENI_MINUT = 30;
export const STOCENI_STUPNU = 90;
/** Pod touhle rychlostí je směr jen šum a stočení se nehlásí. */
const SMER_OD = 2;

/** Rozdíl dvou směrů po kružnici, 0–180°. */
export function rozdilSmeru(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Stočení za posledních 30 minut: nejnovější směr proti tomu před půl
 * hodinou, obojí při větru aspoň 2 m/s. Vrací úhel, nebo null.
 */
export function stoceni(historie: Mereni[]): number | null {
  const ted = historie.at(-1);
  if (!ted || ted.smer === null || ted.rychlost < SMER_OD) return null;
  const hranice = Date.parse(ted.cas) - STOCENI_MINUT * 60_000;
  const tehdy = historie.find((m) => Date.parse(m.cas) >= hranice);
  if (!tehdy || tehdy === ted || tehdy.smer === null || tehdy.rychlost < SMER_OD) return null;
  const uhel = rozdilSmeru(ted.smer, tehdy.smer);
  return uhel > STOCENI_STUPNU ? uhel : null;
}

const PRVKY = ["F", "Fmax", "D", "P", "T"] as const;
type Prvek = (typeof PRVKY)[number];

/** Hodnoty jednoho dne a stanice seřazené podle času. */
export function mereniZeSouboru(json: unknown): Mereni[] {
  const values = (json as { data?: { data?: { values?: unknown[][] } } })?.data?.data?.values ?? [];
  const podleCasu = new Map<string, Partial<Record<Prvek, number>>>();
  for (const [, prvek, cas, hodnota] of values) {
    if (!PRVKY.includes(prvek as Prvek)) continue;
    if (typeof cas !== "string" || typeof hodnota !== "number") continue;
    const radek = podleCasu.get(cas) ?? {};
    radek[prvek as Prvek] = hodnota;
    podleCasu.set(cas, radek);
  }
  return [...podleCasu.entries()]
    .filter(([, r]) => r.F !== undefined)
    .map(([cas, r]) => ({
      cas,
      rychlost: r.F!,
      naraz: r.Fmax ?? null,
      smer: r.D ?? null,
      tlak: r.P ?? null,
      teplota: r.T ?? null,
    }))
    .sort((a, b) => a.cas.localeCompare(b.cas));
}

/**
 * Tlak přepočtený na hladinu moře (hPa), jak ho ukazuje barometr na lodi
 * i synoptická mapa. Barometrická rovnice s teplotním gradientem
 * 0,65 °C na 100 m; bez teploty počítá s 15 °C.
 */
export function tlakNaHladine(tlak: number, vyska: number, teplota: number | null) {
  const gradient = 0.0065 * vyska;
  return tlak * Math.pow(1 - gradient / ((teplota ?? 15) + gradient + 273.15), -5.257);
}

/**
 * Slovní popis změny za 3 hodiny podle stupnice Met Office v námořní
 * předpovědi (shipping forecast): pod 0,1 hPa stálý, do 1,5 pomalu,
 * do 3,5 bez příslovce, do 6 rychle, nad 6 velmi rychle.
 */
export function popisTrendu(zmena: number) {
  const a = Math.abs(zmena);
  if (a < 0.1) return "stálý";
  const smer = zmena > 0 ? "roste" : "klesá";
  if (a <= 1.5) return `pomalu ${smer}`;
  if (a <= 3.5) return smer;
  if (a <= 6) return `rychle ${smer}`;
  return `velmi rychle ${smer}`;
}

/** Od jakého poklesu za 3 h widget varuje: „rychle klesá" u Met Office. */
export const TLAK_VAROVANI = -3.6;
export const TLAK_HODIN = 3;

export type TlakTrend = {
  nazev: string;
  tlak: number;
  zmena: number;
  cas: string;
  /**
   * Tlak na stanici za posledních 24 hodin, od nejstaršího. Pro graf.
   *
   * <b>Na stanici, ne přepočtený na hladinu.</b> Přepočet kolísá
   * s teplotou, takže by graf ukazoval i denní chod teploty — a tvar
   * křivky je přesně to, co se na něm čte. Absolutní hodnotu říká číslo
   * vedle, to přepočtené je.
   *
   * <b>Proč to jde bez vlastního sbírání dat.</b> Plán u grafu tlaku
   * stál, že „chce vlastní sbírání dat z ČHMÚ v čase" — neplatí to od
   * chvíle, kdy widget větru stahuje včerejší i dnešní soubor stanice
   * (18. 9. 2026). Změřeno 20. 10. 2026: Kocelovice dávají 144 měření
   * tlaku za celý den po deseti minutách.
   */
  prubeh: { cas: string; tlak: number }[];
};

/**
 * Tlak a jeho změna za 3 hodiny z první stanice, která má výšku.
 * Změna se počítá z tlaku na stanici, ne z přepočtu — ten kolísá
 * s teplotou a trend by kazil. Srovnávací měření musí být do 20 minut
 * od hranice 3 hodin, jinak (díra v datech) trend chybí.
 */
export function tlakovyTrend(stanice: VitrStanice[]): TlakTrend | null {
  const s = stanice.find((x) => x.vyska !== undefined);
  if (!s) return null;
  const sTlakem = s.historie.filter((m) => m.tlak !== null);
  const ted = sTlakem.at(-1);
  if (!ted) return null;
  const hranice = Date.parse(ted.cas) - TLAK_HODIN * 3_600_000;
  const tehdy = sTlakem.findLast((m) => Date.parse(m.cas) <= hranice);
  if (!tehdy || hranice - Date.parse(tehdy.cas) > 20 * 60_000) return null;
  return {
    nazev: s.nazev,
    tlak: tlakNaHladine(ted.tlak!, s.vyska!, ted.teplota),
    zmena: ted.tlak! - tehdy.tlak!,
    cas: ted.cas,
    prubeh: sTlakem.map((m) => ({ cas: m.cas, tlak: m.tlak! })),
  };
}

const denUtc = (d: Date) => d.toISOString().slice(0, 10).replaceAll("-", "");

async function stahni(adresa: string): Promise<unknown | null> {
  const odpoved = await fetch(adresa, {
    headers: { "user-agent": "OrlickyPohar/1.0 (+https://orlickypohar.klihovka.cz)" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  // Soubor dnešního dne ráno ještě nemusí existovat.
  if (odpoved.status === 404) return null;
  if (!odpoved.ok) throw new Error(`ČHMÚ odpovědělo ${odpoved.status}`);
  return odpoved.json();
}

/** Posledních 24 hodin jedné stanice: včerejší a dnešní soubor. */
async function stanice(s: Stanice, ted: Date): Promise<VitrStanice> {
  const vcera = new Date(ted.getTime() - 86_400_000);
  const soubory = await Promise.all(
    [vcera, ted].map((d) => stahni(`${ADRESAR}10m-${s.wsi}-${denUtc(d)}.json`)),
  );
  const od = ted.getTime() - 86_400_000;
  const historie = soubory
    .flatMap((j) => (j ? mereniZeSouboru(j) : []))
    .filter((m) => Date.parse(m.cas) >= od);
  return { ...s, historie };
}

/**
 * Stažení v cache Next na deset minut, stejně často jako ČHMÚ měří.
 * V cache leží jen vybraných pět prvků, ne celé soubory. Stanice, která
 * nepřijde, chybí; chyba všech se do cache neuloží.
 */
const nactiDoCache = unstable_cache(
  async (): Promise<VitrStanice[]> => {
    const ted = new Date();
    const vysledky = await Promise.allSettled(STANICE.map((s) => stanice(s, ted)));
    const ok = vysledky
      .filter((v): v is PromiseFulfilledResult<VitrStanice> => v.status === "fulfilled")
      .map((v) => v.value)
      .filter((s) => s.historie.length > 0);
    if (ok.length === 0) throw new Error("ČHMÚ: žádná stanice nevrátila vítr");
    return ok;
  },
  ["vitr-chmi-orlik-tlak"],
  { revalidate: 600 },
);

export async function nactiVitr(): Promise<VitrStanice[]> {
  try {
    return await nactiDoCache();
  } catch {
    return [];
  }
}
