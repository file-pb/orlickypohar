import type { components } from "./schema";

/**
 * Veřejná přihláška lodi na zastávku a našeptávač k ní.
 *
 * <b>Bez přihlášení</b> (Filip, 17. 9. 2026). Formulář odesílá server
 * webu, ne prohlížeč návštěvníka: API pouští přes CORS jen GET, takže
 * z cizí stránky se zapsat nedá.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

type S = components["schemas"];

export type NapovedaLodi = S["NapovedaLodiDto"];
export type PrihlaskaVstup = S["VerejnaPrihlaskaVstup"];

/**
 * Lodě do nabídky prohlížeče, nebo shody pro dotaz. Bez javascriptu se
 * napovídá přes `datalist`, takže stránka potřebuje celý seznam.
 */
export async function napoveda(
  serie: string,
  { q, vse }: { q?: string; vse?: boolean } = {},
): Promise<NapovedaLodi[]> {
  const dotaz = new URLSearchParams({ serie });
  if (q) dotaz.set("q", q);
  if (vse) dotaz.set("vse", "true");

  try {
    const odpoved = await fetch(`${API}/lode/napoveda?${dotaz}`, {
      // Seznam lodí se mění po závodě, ne po vteřinách.
      next: { revalidate: 300 },
      headers: { accept: "application/json" },
    });
    return odpoved.ok ? ((await odpoved.json()) as NapovedaLodi[]) : [];
  } catch {
    // Našeptávač je pohodlí, ne podmínka. Formulář jde vyplnit i bez něj.
    return [];
  }
}

/** Loď, kterou návštěvník vybral: přesná shoda jména, jinak první nález. */
export async function najdiLod(serie: string, nazev: string): Promise<NapovedaLodi | null> {
  const shody = await napoveda(serie, { q: nazev });
  const stejne = (a: string, b: string) =>
    a.localeCompare(b, "cs", { sensitivity: "base" }) === 0;

  return shody.find((l) => stejne(l.lod, nazev.trim())) ?? shody[0] ?? null;
}

/** Vrací chybu k zobrazení, nebo `null`. */
export async function prihlas(
  serie: string,
  zavod: string,
  vstup: PrihlaskaVstup,
): Promise<string | null> {
  let odpoved: Response;
  try {
    odpoved = await fetch(
      `${API}/serie/${encodeURIComponent(serie)}/zavody/${encodeURIComponent(zavod)}/prihlasky`,
      {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(vstup),
        cache: "no-store",
      },
    );
  } catch {
    return "Přihlášku se teď nedaří odeslat. Zkus to prosím za chvíli.";
  }

  if (odpoved.ok) return null;

  try {
    const telo = (await odpoved.json()) as { error?: string };
    if (telo?.error) return telo.error;
  } catch {
    // Tělo nemusí být JSON.
  }

  if (odpoved.status === 404) return "Tahle zastávka neexistuje, nebo ještě není zveřejněná.";
  return `Přihlášku se nepodařilo odeslat (${odpoved.status}).`;
}
