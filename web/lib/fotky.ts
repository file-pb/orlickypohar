import { tokenZeSezeni } from "@/lib/oidc";
import type { components } from "./schema";

/**
 * Nahrání a odebrání obrázku — u článku i u medailonku pořadatele. API má
 * pro obojí tentýž tvar, liší se jen cesta.
 *
 * <b>Soubor jde přes server webu, ne z prohlížeče rovnou do úložiště.</b>
 * Přímé nahrání by chtělo podepsané adresy a javascript ve formuláři;
 * takhle stačí obyčejný formulář a API soubor přepočítá dřív, než se
 * cokoliv uloží.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

export type Obrazek = components["schemas"]["ObrazekDto"];
export type DruhObrazku = "clanky" | "poradatele";

/** Stejná hranice jako v API. Hlídá se i tady, ať se 20 MB neposílá dál zbytečně. */
export const NEJVIC_MB = 15;

const cesta = (serie: string, druh: DruhObrazku, klic: string) =>
  `${API}/sprava/serie/${encodeURIComponent(serie)}/${druh}/${encodeURIComponent(klic)}/obrazek`;

async function hlaska(odpoved: Response) {
  try {
    const telo = (await odpoved.json()) as { error?: string };
    if (telo?.error) return telo.error;
  } catch {
    // Tělo nemusí být JSON — 401 z ověřování ho nemá vůbec.
  }

  if (odpoved.status === 401) return "Přihlášení vypršelo. Přihlas se prosím znovu.";
  if (odpoved.status === 403 || odpoved.status === 404) return "K tomuhle obrázku přístup nemáš.";
  if (odpoved.status === 413) return `Fotka může mít nejvýš ${NEJVIC_MB} MB.`;
  return `API odpovědělo ${odpoved.status}.`;
}

/** Vrací chybu k zobrazení, nebo `null`, když se povedlo. */
export async function nahrajObrazek(
  serie: string,
  druh: DruhObrazku,
  klic: string,
  vstup: { soubor: File; autor: string; popis?: string; souhlas: boolean },
): Promise<string | null> {
  const t = await tokenZeSezeni();
  if (!t) return "Přihlášení vypršelo. Přihlas se prosím znovu.";

  // Jména polí podle `FotkaFormular` v API. Souhlas jako „true", ne „on":
  // formulář skládá server, prohlížečová podoba zaškrtávátka tu nic neznamená.
  const telo = new FormData();
  telo.set("soubor", vstup.soubor, vstup.soubor.name);
  telo.set("autor", vstup.autor);
  if (vstup.popis) telo.set("popis", vstup.popis);
  telo.set("souhlas", String(vstup.souhlas));

  try {
    const odpoved = await fetch(cesta(serie, druh, klic), {
      method: "PUT",
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      body: telo,
      cache: "no-store",
    });
    return odpoved.ok ? null : await hlaska(odpoved);
  } catch {
    return "API se nedaří zavolat.";
  }
}

export async function odeberObrazek(serie: string, druh: DruhObrazku, klic: string): Promise<string | null> {
  const t = await tokenZeSezeni();
  if (!t) return "Přihlášení vypršelo. Přihlas se prosím znovu.";

  try {
    const odpoved = await fetch(cesta(serie, druh, klic), {
      method: "DELETE",
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      cache: "no-store",
    });
    return odpoved.ok ? null : await hlaska(odpoved);
  } catch {
    return "API se nedaří zavolat.";
  }
}
