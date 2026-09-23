import { tokenZeSezeni } from "@/lib/oidc";
import type { components } from "./schema";
import type { Stav } from "@/lib/sprava";

/**
 * Volání administrace blogu. Vedle `lib/sprava.ts`, ne v něm: ta je
 * o udělování rolí a tahle o psaní. Sdílejí jen typ <c>Stav</c>, protože
 * odpověď „nepřihlášen / odmítnut / nesmí" je u obou tatáž otázka.
 *
 * <b>Token zůstává na serveru.</b> Leží v cookie, kterou prohlížeč jen vozí
 * s sebou; do stránky se nikdy nevypisuje.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

type S = components["schemas"];

export type PrehledClanku = S["PrehledClankuDto"];
export type ClanekRadek = S["ClanekSpravaRadek"];
export type ClanekDetail = S["ClanekDto"];
export type StavClanku = S["StavClanku"];
export type ClanekVstup = S["ClanekVstupSprava"];

/**
 * Stavy článku a co znamenají.
 *
 * <b>Koncept a skryté nejsou totéž</b>, i když veřejnost nevidí ani jedno —
 * a v seznamu se to musí dát rozeznat na první pohled, jinak autor neví,
 * jestli text dopsat, nebo se rozhodnout, že se vrátí.
 */
export const STAVY: { stav: StavClanku; nazev: string; popis: string }[] = [
  { stav: "Draft", nazev: "Koncept", popis: "Rozepsané. Veřejnost ho nevidí." },
  { stav: "Publikovano", nazev: "Publikováno", popis: "Vidí ho veřejnost." },
  { stav: "Skryty", nazev: "Skryté", popis: "Vyšlo a bylo stažené." },
  { stav: "Smazano", nazev: "Smazané", popis: "Z výpisu zmizí. Vrátit jde jen jako koncept." },
];

export const nazevStavu = (stav: StavClanku) =>
  STAVY.find((s) => s.stav === stav)?.nazev ?? stav;

/**
 * Rozsah obecných článků mimo ročník (od 22. 9. 2026). Obrazovky správy
 * jsou tytéž jako u ročníku, jen místo slugu ročníku mají tohle slovo:
 * adresa `/sprava/web/clanky` tak vede na tutéž stránku a API se volá
 * na `/sprava/web/clanky`.
 */
export const WEB = "web";
export const jeWeb = (serie: string) => serie === WEB;

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
  if (odpoved.status === 403) return "Na psaní tady nemáš práva.";
  if (odpoved.status === 404) return "Článek nebo ročník neexistuje.";
  return `API odpovědělo ${odpoved.status}.`;
}

const kam = (serie: string, cesta = "") =>
  jeWeb(serie)
    ? `${API}/sprava/web/clanky${cesta}`
    : `${API}/sprava/serie/${encodeURIComponent(serie)}/clanky${cesta}`;

export async function nactiPrehled(
  serie: string,
): Promise<{ stav: Stav; prehled?: PrehledClanku }> {
  const t = await token();
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

  if (jeWeb(serie)) {
    // Obecné články nemají ročník ani regaty; obrazovka dostane tentýž
    // tvar jako u ročníku, aby se nemusela větvit na každém řádku.
    const { clanky } = (await odpoved.json()) as S["PrehledObecnychClankuDto"];
    return {
      stav: "ok",
      prehled: { serie: WEB, serieNazev: "Obecné články", smiNaRocnik: true, zastavky: [], clanky },
    };
  }

  return { stav: "ok", prehled: (await odpoved.json()) as PrehledClanku };
}

export async function nactiClanek(
  serie: string,
  slug: string,
): Promise<{ stav: Stav; clanek?: ClanekDetail }> {
  const t = await token();
  if (!t) return { stav: "neprihlasen" };

  let odpoved: Response;
  try {
    odpoved = await fetch(kam(serie, `/${encodeURIComponent(slug)}`), {
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

  return { stav: "ok", clanek: (await odpoved.json()) as ClanekDetail };
}

/** Vrací chybu k zobrazení, nebo slug založeného článku. */
export async function zaloz(
  serie: string,
  vstup: ClanekVstup,
): Promise<{ chyba?: string; slug?: string }> {
  const t = await token();
  if (!t) return { chyba: "Přihlášení vypršelo. Přihlas se prosím znovu." };

  try {
    const odpoved = await fetch(kam(serie), {
      method: "POST",
      headers: {
        authorization: `Bearer ${t}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(vstup),
      cache: "no-store",
    });

    if (!odpoved.ok) return { chyba: await hlaska(odpoved) };
    return { slug: ((await odpoved.json()) as ClanekRadek).slug };
  } catch {
    return { chyba: "API se nedaří zavolat." };
  }
}

export async function uloz(
  serie: string,
  slug: string,
  vstup: ClanekVstup,
): Promise<string | null> {
  return zapis(kam(serie, `/${encodeURIComponent(slug)}`), "PUT", vstup);
}

export async function prepniStav(
  serie: string,
  slug: string,
  stav: StavClanku,
): Promise<string | null> {
  return zapis(kam(serie, `/${encodeURIComponent(slug)}/stav`), "POST", { stav });
}

/** Společné pro zápisy, které vracejí jen „povedlo se, nebo proč ne". */
async function zapis(adresa: string, metoda: string, telo: unknown): Promise<string | null> {
  const t = await token();
  if (!t) return "Přihlášení vypršelo. Přihlas se prosím znovu.";

  try {
    const odpoved = await fetch(adresa, {
      method: metoda,
      headers: {
        authorization: `Bearer ${t}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(telo),
      cache: "no-store",
    });

    return odpoved.ok ? null : await hlaska(odpoved);
  } catch {
    return "API se nedaří zavolat.";
  }
}
