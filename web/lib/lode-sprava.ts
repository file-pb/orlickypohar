import { tokenZeSezeni } from "@/lib/oidc";
import type { Stav } from "@/lib/sprava";
import type { components } from "./schema";

/**
 * Vazby k lodím ročníku očima správce: kdo je kapitán a kdo posádka.
 *
 * <b>Kapitána určuje správce ročníku, ne připojovací kód</b> (oprava
 * z 5. 10. 2026). Pořadí u stolu o pravomoci rozhodovat nemá a loď bez
 * kapitána je normální stav — čeká na jeho určení.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

type S = components["schemas"];

export type LodSpravy = S["LodSpravaDto"];
export type VazbaSpravy = S["VazbaSpravaDto"];
export type LodDetail = S["LodDetailSpravaDto"];
export type ZmenaRole = S["ZmenaRoleDto"];
export type RoleKLodi = S["RoleKLodi"];

const KOREN = (serie: string) => `${API}/sprava/serie/${encodeURIComponent(serie)}/lode`;

/** Jak vazba vznikla, česky. V API je to hodnota výčtu, na obrazovku patří věta. */
export const PUVOD: Record<S["PuvodVazby"], string> = {
  Email: "e-mail na přihlášce",
  Kod: "připojovací kód",
  Narok: "žádost potvrzená kapitánem",
  Rucne: "určil správce",
};

async function hlaska(odpoved: Response) {
  try {
    const telo = (await odpoved.json()) as { error?: string };
    if (telo?.error) return telo.error;
  } catch {
    // Tělo nemusí být JSON — 401 z ověřování ho nemá vůbec.
  }

  if (odpoved.status === 401) return "Přihlášení vypršelo. Přihlas se prosím znovu.";
  if (odpoved.status === 403) return "Na lodě tohohle ročníku nemáš práva správce.";
  if (odpoved.status === 404) return "Taková loď v ročníku není.";
  return `API odpovědělo ${odpoved.status}.`;
}

async function cti<T>(cesta: string): Promise<{ stav: Stav; data?: T }> {
  const t = await tokenZeSezeni();
  if (!t) return { stav: "neprihlasen" };

  let odpoved: Response;
  try {
    odpoved = await fetch(cesta, {
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      // Odpověď závisí na tom, kdo se ptá, a mění se hned po každém určení.
      cache: "no-store",
    });
  } catch {
    return { stav: "vypadek" };
  }

  if (odpoved.status === 401) return { stav: "odmitnut" };
  if (odpoved.status === 403) return { stav: "nesmi" };
  if (odpoved.status === 404) return { stav: "neni" };
  if (!odpoved.ok) return { stav: "vypadek" };

  return { stav: "ok", data: (await odpoved.json()) as T };
}

/** Vrací chybu k zobrazení, nebo `null`, když se povedlo. */
async function zapis(cesta: string, metoda: "PUT" | "DELETE", telo?: unknown) {
  const t = await tokenZeSezeni();
  if (!t) return "Přihlášení vypršelo. Přihlas se prosím znovu.";

  try {
    const odpoved = await fetch(cesta, {
      method: metoda,
      headers: {
        authorization: `Bearer ${t}`,
        accept: "application/json",
        ...(telo === undefined ? {} : { "content-type": "application/json" }),
      },
      body: telo === undefined ? undefined : JSON.stringify(telo),
      cache: "no-store",
    });

    return odpoved.ok ? null : await hlaska(odpoved);
  } catch {
    return "API se nedaří zavolat.";
  }
}

/** Lodě ročníku i s vazbami. Ty, které čekají na správce, jsou první. */
export const nactiLode = (serie: string) => cti<LodSpravy[]>(KOREN(serie));

/** Jedna loď, její vazby a historie změn rolí. */
export const nactiLod = (serie: string, lod: number) =>
  cti<LodDetail>(`${KOREN(serie)}/${lod}`);

/**
 * Určí kapitána lodi. Jeden úkon: nový se povýší a dosavadní kapitán spadne
 * na posádku. Určení téhož člověka podruhé jen potvrdí roli, kterou má.
 */
export const urciKapitana = (serie: string, lod: number, uzivatelId: string) =>
  zapis(`${KOREN(serie)}/${lod}/kapitan`, "PUT", { uzivatelId });

/** Změní roli jedné vazby — snížení, povýšení na posádku, nebo potvrzení. */
export const zmenRoli = (serie: string, lod: number, vazba: number, role: RoleKLodi) =>
  zapis(`${KOREN(serie)}/${lod}/vazby/${vazba}/role`, "PUT", { role });

/** Odebere vazbu k lodi. Posledního kapitána odebrat nejde. */
export const odeberVazbu = (serie: string, lod: number, vazba: number) =>
  zapis(`${KOREN(serie)}/${lod}/vazby/${vazba}`, "DELETE");
