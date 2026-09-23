import { tokenZeSezeni } from "@/lib/oidc";
import type { components } from "./schema";
import type { Stav } from "@/lib/sprava";

/**
 * Ročník ve správě: jestli je venku, a přepnutí.
 *
 * <b>Vlastní soubor, ne součást `lib/kalendar.ts`.</b> Kalendář je o
 * termínech jednotlivých regat; tohle je o celém ročníku a visí na jiné
 * cestě API. Obrazovka je stejná, důvod k volání jiný.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

export type SerieSprava = components["schemas"]["SerieSpravaDto"];

const kam = (serie: string, cesta = "") =>
  `${API}/sprava/serie/${encodeURIComponent(serie)}${cesta}`;

/** Chybová hláška z API, nebo obecná podle stavu. Nikdy prázdná. */
async function hlaska(odpoved: Response) {
  try {
    const telo = (await odpoved.json()) as { error?: string };
    if (telo?.error) return telo.error;
  } catch {
    // Tělo nemusí být JSON — 401 z ověřování ho nemá vůbec.
  }

  if (odpoved.status === 401) return "Přihlášení vypršelo. Přihlas se prosím znovu.";
  if (odpoved.status === 403) return "Pustit ročník ven smí správce ročníku.";
  if (odpoved.status === 404) return "Ročník neexistuje.";
  return `API odpovědělo ${odpoved.status}.`;
}

export async function nactiRocnik(serie: string): Promise<{ stav: Stav; rocnik?: SerieSprava }> {
  const t = await tokenZeSezeni();
  if (!t) return { stav: "neprihlasen" };

  let odpoved: Response;
  try {
    odpoved = await fetch(kam(serie), {
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      // Odpověď závisí na tom, kdo se ptá, a mění se po každém zápisu.
      cache: "no-store",
    });
  } catch {
    return { stav: "vypadek" };
  }

  if (odpoved.status === 401) return { stav: "odmitnut" };
  if (odpoved.status === 403) return { stav: "nesmi" };
  if (odpoved.status === 404) return { stav: "neni" };
  if (!odpoved.ok) return { stav: "vypadek" };

  return { stav: "ok", rocnik: (await odpoved.json()) as SerieSprava };
}

/** Pustí ročník ven, nebo ho stáhne. Vrací chybu, nebo `null`. */
export async function publikujRocnik(
  serie: string,
  publikovano: boolean,
): Promise<string | null> {
  const t = await tokenZeSezeni();
  if (!t) return "Přihlášení vypršelo. Přihlas se prosím znovu.";

  try {
    const odpoved = await fetch(kam(serie, "/publikace"), {
      method: "POST",
      headers: {
        authorization: `Bearer ${t}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ publikovano }),
      cache: "no-store",
    });
    return odpoved.ok ? null : await hlaska(odpoved);
  } catch {
    return "API se nedaří zavolat.";
  }
}
