import type { components } from "./schema";

/**
 * Povrchová teplota Orlíku ze satelitu Landsat. Počítá ji úloha
 * `jobs/landsat` zhruba jednou za týden, když není zataženo, a API vrací
 * snímky za 14 dní od nejnovějšího (`Features/Vodocet`).
 *
 * <b>Odhad, ne měření.</b> Horní vrstva vody kolem poledne, zatím neověřená
 * teploměrem. Widget to říká nahlas, dokud Filip nezkalibruje ručním měřením.
 *
 * <b>Centra.</b> Úloha počítá deset míst, kde se plachtí. Rozdíly mezi nimi
 * jsou pod přesností metody, takže widget ukazuje tři centra (Filip,
 * 18. 9. 2026): hlavní Radava, menší Trhovky a Žďákov. Každé je medián
 * se sousedními místy, aby mrak nad jedním bodem nevzal celé centrum.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

export type TeplotaHladiny = components["schemas"]["TeplotaHladinyDto"];
type Snimek = components["schemas"]["SnimekHladinyDto"];

export const CENTRA = [
  { klic: "radava", nazev: "Radava", mista: ["vystrkov", "podskali", "radava", "velky-vir"] },
  { klic: "trhovky", nazev: "Trhovky", mista: ["spalenka", "trhovky", "bukovanska"] },
  { klic: "zdakov", nazev: "Žďákov", mista: ["marina-orlik", "zdakov", "husarna"] },
] as const;

/** Změna se počítá jen proti snímku z posledních 14 dní — delší trend jachtaře nezajímá. */
export const OKNO_DNI = 14;

/** Starší poslední snímek už o dnešní vodě nic neříká; widget se schová. */
export const NEJSTARSI_DNI = 30;

export type Centrum = {
  klic: string;
  nazev: string;
  teplota: number;
  /** Čas snímku, ze kterého hodnota je. */
  cas: string;
  /** Změna proti předchozímu snímku v okně 14 dní, °C. */
  zmena: number | null;
  /** Čas předchozího snímku, se kterým se srovnává. */
  predchozi: string | null;
};

const zaokrouhli = (n: number) => Math.round(n * 10) / 10;

export function median(cisla: number[]): number | null {
  if (cisla.length === 0) return null;
  const s = [...cisla].sort((a, b) => a - b);
  const p = Math.floor(s.length / 2);
  return zaokrouhli(s.length % 2 ? s[p] : (s[p - 1] + s[p]) / 2);
}

function hodnota(snimek: Snimek, mista: readonly string[]): number | null {
  return median(snimek.mista.filter((m) => mista.includes(m.misto)).map((m) => Number(m.teplota)));
}

/**
 * Centra z posledních snímků. U každého nejnovější snímek, kde má hodnotu,
 * a změna proti předchozímu nejvýš 14 dní starému. Bez hodnoty centrum chybí.
 */
export function centra(snimky: Snimek[], ted: Date): Centrum[] {
  const serazene = [...snimky].sort((a, b) => Date.parse(b.cas) - Date.parse(a.cas));
  const vysledek: Centrum[] = [];

  for (const c of CENTRA) {
    const sHodnotou = serazene
      .map((s) => ({ cas: s.cas, t: hodnota(s, c.mista) }))
      .filter((x): x is { cas: string; t: number } => x.t !== null);
    const [posledni, ...drive] = sHodnotou;
    if (!posledni) continue;
    if (ted.getTime() - Date.parse(posledni.cas) > NEJSTARSI_DNI * 86_400_000) continue;

    const predchozi = drive.find(
      (x) => Date.parse(posledni.cas) - Date.parse(x.cas) <= OKNO_DNI * 86_400_000,
    );
    vysledek.push({
      klic: c.klic,
      nazev: c.nazev,
      teplota: posledni.t,
      cas: posledni.cas,
      zmena: predchozi ? zaokrouhli(posledni.t - predchozi.t) : null,
      predchozi: predchozi?.cas ?? null,
    });
  }
  return vysledek;
}

/** Úloha počítá jednou denně; častěji se nemá smysl ptát. */
export async function nactiTeplotuHladiny(): Promise<TeplotaHladiny | null> {
  try {
    const odpoved = await fetch(`${API}/vodocet/teplota-hladiny`, {
      next: { revalidate: 3600 },
      headers: { accept: "application/json" },
    });
    return odpoved.ok ? ((await odpoved.json()) as TeplotaHladiny) : null;
  } catch {
    // Doplněk. Kvůli němu nesmí spadnout stránka.
    return null;
  }
}
