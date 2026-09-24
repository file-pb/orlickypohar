import { tokenZeSezeni } from "@/lib/oidc";
import type { Stav } from "@/lib/sprava";
import type { components } from "./schema";

/**
 * Co web stojí. Volá se stejně jako zbytek administrace: token ze sezení,
 * žádná cache, tvar odpovědi z API.
 *
 * Typy se negenerují ručně — jsou ze schématu, které vyrábí
 * `packages/api-client/generuj.sh` z OpenAPI dokumentu běžícího API.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

type S = components["schemas"];

export type NakladovaPolozka = S["NakladovaPolozka"];
export type Prace = S["PraceDto"];
export type DenNakladu = S["DenNakladu"];
export type Naklady = S["NakladyDto"];

/**
 * Načte náklady. Kromě stavu vrací i <c>duvod</c>: když čísla nejsou,
 * je rozdíl mezi „přehled je ještě nezapsal" a „tenhle projekt nezná",
 * a obojí se opravuje jinde.
 */
export async function nactiNaklady(): Promise<{
  stav: Stav;
  naklady?: Naklady;
  duvod?: string;
}> {
  const t = await tokenZeSezeni();
  if (!t) return { stav: "neprihlasen" };

  let odpoved: Response;
  try {
    odpoved = await fetch(`${API}/sprava/naklady`, {
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return { stav: "vypadek" };
  }

  if (odpoved.status === 401) return { stav: "odmitnut" };
  if (odpoved.status === 403) return { stav: "nesmi" };

  // 503 znamená „API běží, ale čísla nemá". Důvod umí říct jen ono.
  if (odpoved.status === 503) return { stav: "neni", duvod: await duvod(odpoved) };
  if (!odpoved.ok) return { stav: "vypadek" };

  return { stav: "ok", naklady: (await odpoved.json()) as Naklady };
}

async function duvod(odpoved: Response) {
  try {
    const telo = (await odpoved.json()) as { error?: string };
    return telo?.error || undefined;
  } catch {
    return undefined;
  }
}
