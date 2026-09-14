import { tokenZeSezeni } from "@/lib/oidc";
import type { components } from "./schema";
import type { Stav } from "@/lib/sprava";

/**
 * Volání přihlášek lodí na zastávku. Vedle `lib/vysledky.ts`: ta je o tom,
 * co se stalo na vodě, tahle o tom, kdo se chystá jet.
 *
 * <b>Token zůstává na serveru.</b> Leží v cookie, kterou prohlížeč jen vozí
 * s sebou; do stránky se nikdy nevypisuje.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

type S = components["schemas"];

export type PrihlaskyZastavky = S["PrihlaskyZastavkyDto"];
export type LodNaZastavce = S["LodNaZastavceDto"];
export type NovaLod = S["NovaLodVstup"];
// Stav lodi je v dokumentu nepovinný — loď ročníku na zastávce být nemusí.
// Jako klíč slovníku ale prázdný být nesmí.
export type StavUcasti = NonNullable<S["StavUcasti"]>;

/**
 * Stav lodi na zastávce: co znamená a co udělá tlačítko, které do něj vede.
 * Štítek popisuje, jak to je; tlačítko, co se stane.
 *
 * <c>Record</c> je naschvál: nový stav v modelu shodí překlad webu, ne až
 * prázdné tlačítko na stránce.
 */
export const STAVY_UCASTI: Record<StavUcasti, { stitek: string; tlacitko: string; popis: string }> = {
  Prihlasena: {
    stitek: "přihlášená",
    tlacitko: "Vrátit mezi nepotvrzené",
    popis: "Pořadatel o lodi ví, účast ještě nepotvrdil. Na webu je s poznámkou.",
  },
  Potvrzena: {
    stitek: "potvrzená",
    tlacitko: "Potvrdit",
    popis: "Loď pojede. Na webu je bez poznámky.",
  },
  Zrusena: {
    stitek: "zrušená",
    tlacitko: "Zrušit",
    popis: "Loď nepojede. Na webu ji nikdo neuvidí.",
  },
};

const token = () => tokenZeSezeni();

/** Chybová hláška z API, nebo obecná podle stavu. Nikdy prázdná. */
async function hlaska(odpoved: Response) {
  try {
    const telo = (await odpoved.json()) as { error?: string };
    if (telo?.error) return telo.error;
  } catch {
    // Tělo nemusí být JSON — 401 z ověřování ho nemá vůbec.
  }

  if (odpoved.status === 401) return "Přihlášení vypršelo. Přihlas se prosím znovu.";
  if (odpoved.status === 403) return "Přihlášky na tuhle zastávku spravuje její pořadatel.";
  if (odpoved.status === 404) return "Loď, zastávka nebo ročník neexistuje.";
  return `API odpovědělo ${odpoved.status}.`;
}

const kam = (serie: string, zavod: string, cesta = "") =>
  `${API}/sprava/serie/${encodeURIComponent(serie)}/zastavky/${encodeURIComponent(zavod)}/lode${cesta}`;

export async function nactiPrihlasky(
  serie: string,
  zavod: string,
): Promise<{ stav: Stav; data?: PrihlaskyZastavky }> {
  const t = await token();
  if (!t) return { stav: "neprihlasen" };

  let odpoved: Response;
  try {
    odpoved = await fetch(kam(serie, zavod), {
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

  return { stav: "ok", data: (await odpoved.json()) as PrihlaskyZastavky };
}

/** Přihlásí loď z ročníku, nebo novou. <c>nova</c> je false, když už přihlášená byla. */
export async function prihlas(
  serie: string,
  zavod: string,
  vstup: { prihlaskaId: number } | { novaLod: NovaLod },
): Promise<{ chyba: string } | { lod: LodNaZastavce; nova: boolean }> {
  const odpoved = await posli(kam(serie, zavod), vstup);
  if (typeof odpoved === "string") return { chyba: odpoved };
  if (!odpoved.ok) return { chyba: await hlaska(odpoved) };

  return { lod: (await odpoved.json()) as LodNaZastavce, nova: odpoved.status === 201 };
}

export async function prepniLod(
  serie: string,
  zavod: string,
  prihlaskaId: number,
  stav: StavUcasti,
): Promise<string | null> {
  const odpoved = await posli(kam(serie, zavod, `/${prihlaskaId}/stav`), { stav });
  if (typeof odpoved === "string") return odpoved;

  return odpoved.ok ? null : await hlaska(odpoved);
}

/** Odpověď API, nebo hláška, když se k němu vůbec nedošlo. */
async function posli(adresa: string, telo: unknown): Promise<Response | string> {
  const t = await token();
  if (!t) return "Přihlášení vypršelo. Přihlas se prosím znovu.";

  try {
    return await fetch(adresa, {
      method: "POST",
      headers: {
        authorization: `Bearer ${t}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(telo),
      cache: "no-store",
    });
  } catch {
    return "API se nedaří zavolat.";
  }
}
