import { unstable_cache } from "next/cache";

/**
 * Vítr ze stanic ČHMÚ kolem Orlíku (Filip, 18. 9. 2026).
 *
 * <b>Zdroj jsou desetiminutová data</b> na opendata.chmi.cz:
 * `meteorology/climate/now/data/10m-<WSI>-<YYYYMMDD>.json`, soubor na stanici
 * a den (UTC), asi 90 kB. Hodnoty chodí se zpožděním kolem 45 minut.
 * Prvky: `F` rychlost (m/s), `Fmax` nejsilnější náraz v intervalu, `D` směr,
 * odkud fouká (stupně).
 *
 * <b>Stanice ověřené 18. 9. 2026</b> z `now/metadata/meta1-*.json`: stanice
 * Orlík nad Vltavou a Kamýk měří jen srážky, vítr nejblíž hlásí Vráž. Ostatní
 * jsou dál a výš — slouží k porovnání, jestli jde o místní poryv, nebo
 * o vítr přes celý kraj.
 */

export type Stanice = { wsi: string; nazev: string; km: number };

export const STANICE: Stanice[] = [
  { wsi: "0-203-0-11532", nazev: "Vráž", km: 16 },
  { wsi: "0-203-0-11528", nazev: "Nadějkov", km: 21 },
  { wsi: "0-203-0-11485", nazev: "Příbram", km: 21 },
  { wsi: "0-20000-0-11487", nazev: "Kocelovice", km: 25 },
  { wsi: "0-20000-0-11538", nazev: "Temelín", km: 39 },
];

export const STRANKA_VETRU = "https://opendata.chmi.cz/meteorology/climate/now/data/";

const ADRESAR = "https://opendata.chmi.cz/meteorology/climate/now/data/";

export type Mereni = { cas: string; rychlost: number; naraz: number | null; smer: number | null };

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

/** Hodnoty jednoho dne a stanice seřazené podle času. */
export function mereniZeSouboru(json: unknown): Mereni[] {
  const values = (json as { data?: { data?: { values?: unknown[][] } } })?.data?.data?.values ?? [];
  const podleCasu = new Map<string, Partial<Record<"F" | "Fmax" | "D", number>>>();
  for (const [, prvek, cas, hodnota] of values) {
    if (prvek !== "F" && prvek !== "Fmax" && prvek !== "D") continue;
    if (typeof cas !== "string" || typeof hodnota !== "number") continue;
    const radek = podleCasu.get(cas) ?? {};
    radek[prvek] = hodnota;
    podleCasu.set(cas, radek);
  }
  return [...podleCasu.entries()]
    .filter(([, r]) => r.F !== undefined)
    .map(([cas, r]) => ({ cas, rychlost: r.F!, naraz: r.Fmax ?? null, smer: r.D ?? null }))
    .sort((a, b) => a.cas.localeCompare(b.cas));
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
 * V cache leží jen vybrané tři prvky, ne celé soubory. Stanice, která
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
  ["vitr-chmi-orlik"],
  { revalidate: 600 },
);

export async function nactiVitr(): Promise<VitrStanice[]> {
  try {
    return await nactiDoCache();
  } catch {
    return [];
  }
}
