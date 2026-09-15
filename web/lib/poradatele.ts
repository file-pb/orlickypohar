import { tokenZeSezeni } from "@/lib/oidc";
import type { components } from "./schema";
import type { Stav } from "@/lib/sprava";

/**
 * Volání správy medailonku pořadatele. Vedle `lib/kalendar.ts` ze stejného
 * důvodu, z jakého jsou oddělené ostatní: tohle je o klubu, ne o termínech.
 *
 * <b>Token zůstává na serveru.</b> Leží v cookie, kterou prohlížeč jen vozí
 * s sebou; do stránky se nikdy nevypisuje.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

type S = components["schemas"];

export type Poradatel = S["PoradatelDto"];
export type PoradatelSprava = S["PoradatelSpravaDto"];
export type PoradatelVstup = S["PoradatelVstup"];

const kam = (serie: string, poradatel: string) =>
  `${API}/sprava/serie/${encodeURIComponent(serie)}/poradatele/${encodeURIComponent(poradatel)}`;

export async function nactiPoradatele(
  serie: string,
  poradatel: string,
): Promise<{ stav: Stav; detail?: PoradatelSprava }> {
  const t = await tokenZeSezeni();
  if (!t) return { stav: "neprihlasen" };

  let odpoved: Response;
  try {
    odpoved = await fetch(kam(serie, poradatel), {
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return { stav: "vypadek" };
  }

  if (odpoved.status === 401) return { stav: "odmitnut" };
  if (odpoved.status === 403) return { stav: "nesmi" };
  if (odpoved.status === 404) return { stav: "neni" };
  if (!odpoved.ok) return { stav: "vypadek" };

  return { stav: "ok", detail: (await odpoved.json()) as PoradatelSprava };
}

/**
 * Uloží medailonek. Vrací chybu, nebo nový klíč — <b>přejmenováním se
 * klíč mění</b>, takže přesměrování po zápisu musí jít na ten z odpovědi.
 */
export async function ulozPoradatele(
  serie: string,
  poradatel: string,
  vstup: PoradatelVstup,
): Promise<{ chyba: string } | { slug: string }> {
  const t = await tokenZeSezeni();
  if (!t) return { chyba: "Přihlášení vypršelo. Přihlas se prosím znovu." };

  let odpoved: Response;
  try {
    odpoved = await fetch(kam(serie, poradatel), {
      method: "PUT",
      headers: {
        authorization: `Bearer ${t}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(vstup),
      cache: "no-store",
    });
  } catch {
    return { chyba: "API se nedaří zavolat." };
  }

  if (odpoved.ok) return { slug: ((await odpoved.json()) as PoradatelSprava).poradatel.slug };

  try {
    const telo = (await odpoved.json()) as { error?: string };
    if (telo?.error) return { chyba: telo.error };
  } catch {
    // Tělo nemusí být JSON — 401 z ověřování ho nemá vůbec.
  }

  if (odpoved.status === 401) return { chyba: "Přihlášení vypršelo. Přihlas se prosím znovu." };
  if (odpoved.status === 403) return { chyba: "Medailonek tohohle pořadatele upravovat nemůžeš." };
  if (odpoved.status === 404) return { chyba: "Pořadatel v tomhle ročníku nic nepořádá." };
  return { chyba: `API odpovědělo ${odpoved.status}.` };
}

/**
 * Souřadnice z jednoho pole. Přijímá, co se kopíruje z map: „49.5086, 14.1735",
 * „49.5086N, 14.1735E", i desetinnou čárku oddělenou mezerou nebo středníkem.
 * Vrací <c>null</c> u prázdného pole, <c>"chyba"</c>, když se to přečíst nedá.
 */
export function prectiSouradnice(text: string): { sirka: number; delka: number } | null | "chyba" {
  const t = text.trim();
  if (!t) return null;

  const cast = String.raw`(-?\d{1,3}(?:[.,]\d+)?)\s*°?\s*([NSEW])?`;
  const m = t.match(new RegExp(`^${cast}\\s*[,;\\s]\\s*${cast}$`, "i"));
  if (!m) return "chyba";

  const cislo = (hodnota: string, smer?: string) => {
    const n = Number(hodnota.replace(",", "."));
    return smer && /[SW]/i.test(smer) ? -Math.abs(n) : n;
  };

  const sirka = cislo(m[1], m[2]);
  const delka = cislo(m[3], m[4]);
  return Number.isFinite(sirka) && Number.isFinite(delka) ? { sirka, delka } : "chyba";
}

export const souradniceTextem = (p: Pick<Poradatel, "sirka" | "delka">) =>
  p.sirka != null && p.delka != null ? `${p.sirka}, ${p.delka}` : "";
