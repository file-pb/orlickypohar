import { tokenZeSezeni } from "@/lib/oidc";
import type { components } from "./schema";

const API = process.env.API_URL ?? "http://localhost:8080";

/** Jak dlouho se čeká na API. Táž mez jako u trati. */
const CEKAT_MS = 10_000;

export type Ukon = components["schemas"]["UkonDto"];
export type DruhUkonu = components["schemas"]["DruhUkonu"];
export type ZmenaDelky = components["schemas"]["ZmenaDelky"];

const cesta = (serie: string, zavod: string, cislo: number) =>
  `${API}/sprava/serie/${encodeURIComponent(serie)}/zastavky/${encodeURIComponent(zavod)}` +
  `/rozjizdky/${cislo}/ukony`;

/**
 * Co komise v rozjížďce vyhlásila za jízdy. <b><c>null</c> je výpadek</b>,
 * prázdné pole znamená „nic se nevyhlásilo" — mezi tím se musí dát
 * rozlišit, jinak obrazovka při výpadku tiše tvrdí, že se nic nestalo.
 */
export async function nactiUkony(
  serie: string,
  zavod: string,
  cislo: number,
): Promise<Ukon[] | null> {
  const t = await tokenZeSezeni();
  if (!t) return [];

  try {
    const odpoved = await fetch(cesta(serie, zavod, cislo), {
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(CEKAT_MS),
    });
    return odpoved.ok ? ((await odpoved.json()) as Ukon[]) : null;
  } catch {
    return null;
  }
}

/** Vyhlásí úkon. Vrací text chyby, nebo `null`. Meze hlídá server. */
export async function vyhlasUkon(
  serie: string,
  zavod: string,
  cislo: number,
  telo: {
    druh: DruhUkonu;
    prvek: number;
    kurz?: number | null;
    delka?: ZmenaDelky;
    nahradniSirka?: number | null;
    nahradniDelka?: number | null;
    poznamka?: string | null;
  },
): Promise<string | null> {
  return posli(cesta(serie, zavod, cislo), "POST", telo);
}

/** Odvolá úkon. Jde to, dokud se rozjížďka jede. */
export async function odvolejUkon(
  serie: string,
  zavod: string,
  cislo: number,
  ukon: number,
): Promise<string | null> {
  return posli(`${cesta(serie, zavod, cislo)}/${ukon}`, "DELETE");
}

async function posli(adresa: string, metoda: string, telo?: unknown): Promise<string | null> {
  const t = await tokenZeSezeni();
  if (!t) return "Přihlášení vypršelo. Přihlas se prosím znovu.";

  let odpoved: Response;
  try {
    odpoved = await fetch(adresa, {
      method: metoda,
      headers: {
        authorization: `Bearer ${t}`,
        accept: "application/json",
        ...(telo ? { "content-type": "application/json" } : {}),
      },
      body: telo ? JSON.stringify(telo) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(CEKAT_MS),
    });
  } catch {
    return "Nedaří se spojit s API. Zkus to za chvíli.";
  }

  if (odpoved.ok) return null;
  if (odpoved.status === 403) return "Tohle smí vyhlásit jen rozhodčí.";

  try {
    const telo = (await odpoved.json()) as { error?: string };
    return telo.error ?? "Nepovedlo se to uložit.";
  } catch {
    return "Nepovedlo se to uložit.";
  }
}
