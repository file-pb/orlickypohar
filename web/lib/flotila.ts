import { tokenZeSezeni } from "@/lib/oidc";
import type { Stav } from "@/lib/sprava";
import type { components } from "./schema";

/**
 * Na čem jede flotila. Volá se stejně jako zbytek administrace: token ze
 * sezení, žádná cache, tvar odpovědi z API.
 *
 * Typy se negenerují ručně — jsou ze schématu, které vyrábí
 * `packages/api-client/generuj.sh` z OpenAPI dokumentu API.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

type S = components["schemas"];

export type Flotila = S["FlotilaDto"];
export type RadekFlotily = S["FlotilaRadekDto"];
export type SouhrnFlotily = S["FlotilaSouhrnDto"];
export type DruhIdentity = S["DruhIdentityFlotily"];
export type StavVerze = S["StavVerzeAppky"];
export type Spusteni = NonNullable<S["SpusteniAppky"]>;
export type Publikace = S["PublikaceAppkyDto"];

/** Jak se stavy čtou nahlas. Klíče jsou slova z API, ne jména výčtu. */
export const STAVY: Record<StavVerze, string> = {
  aktualni: "aktuální",
  "stary-balicek": "starý balíček",
  "stara-aktualizace": "stará aktualizace",
  nouzove: "nouzové spuštění",
  "bez-hlaseni": "bez hlášení",
};

export const SPUSTENI: Record<Spusteni, string> = {
  vestavena: "vestavěná",
  stazena: "stažená",
  nouzova: "nouzová",
};

/** Nadpisy druhů. Druhy se nesčítají — jeden telefon může mít víc identit. */
export const DRUHY: Record<DruhIdentity, { nazev: string; prazdno: string }> = {
  ucet: { nazev: "Telefony napojené na účet", prazdno: "Žádný telefon napojený na účet." },
  lod: { nazev: "Mobilní klíče k lodím", prazdno: "Žádný klíč k lodi." },
  zarizeni: { nazev: "Zařízení k upozorněním", prazdno: "Žádné zařízení zapsané k upozorněním." },
};

/** Přehled flotily. Kromě stavu i `duvod`, když API řekne, proč ne. */
export async function nactiFlotilu(): Promise<{ stav: Stav; flotila?: Flotila; duvod?: string }> {
  const { stav, data, duvod } = await zavolej<Flotila>("/sprava/flotila");
  return { stav, flotila: data, duvod };
}

/** Poslední publikované aktualizace — odpověď na otázku „vyšla ta poslední?". */
export async function nactiPublikace(): Promise<{ stav: Stav; publikace?: Publikace[] }> {
  const { stav, data } = await zavolej<Publikace[]>("/sprava/flotila/publikace");
  return { stav, publikace: data };
}

async function zavolej<T>(cesta: string): Promise<{ stav: Stav; data?: T; duvod?: string }> {
  const t = await tokenZeSezeni();
  if (!t) return { stav: "neprihlasen" };

  let odpoved: Response;
  try {
    odpoved = await fetch(`${API}${cesta}`, {
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return { stav: "vypadek" };
  }

  if (odpoved.status === 401) return { stav: "odmitnut" };
  if (odpoved.status === 403) return { stav: "nesmi", duvod: await duvod(odpoved) };
  if (!odpoved.ok) return { stav: "vypadek" };

  return { stav: "ok", data: (await odpoved.json()) as T };
}

async function duvod(odpoved: Response) {
  try {
    const telo = (await odpoved.json()) as { error?: string };
    return telo?.error || undefined;
  } catch {
    return undefined;
  }
}
