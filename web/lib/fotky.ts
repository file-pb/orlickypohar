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

// Obecné články mimo ročník mají správu pod `/sprava/web` (viz lib/clanky.ts).
const cesta = (serie: string, druh: DruhObrazku, klic: string) =>
  serie === "web" && druh === "clanky"
    ? `${API}/sprava/web/clanky/${encodeURIComponent(klic)}/obrazek`
    : `${API}/sprava/serie/${encodeURIComponent(serie)}/${druh}/${encodeURIComponent(klic)}/obrazek`;

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

/**
 * Obrázky v těle článku leží pod ročníkem. Obecné články (`/sprava/web`)
 * je zatím nemají — píše je editor webu, kdežto tohle vzniklo kvůli
 * pořadatelům a jejich pozvánkám k regatám.
 */
const cestaDoTela = (serie: string, clanek: string) =>
  `${API}/sprava/serie/${encodeURIComponent(serie)}/clanky/${encodeURIComponent(clanek)}/obrazky`;

/**
 * Nahraje obrázek **do těla článku** a vrátí jeho adresu.
 *
 * Na rozdíl od hlavního obrázku nic nenahrazuje — v textu jich může být víc.
 * Prochází stejným přepočtem, takže i fotka z mobilu skončí jako WebP nejvýš
 * 1600 px. Právě proto smí být v těle jen obrázek nahraný takhle: u cizí
 * adresy velikost neřídíme a zaplatí ji každý, kdo článek otevře.
 */
export async function nahrajObrazekDoTela(
  serie: string,
  clanek: string,
  vstup: { soubor: File; autor: string; popis?: string; souhlas: boolean },
): Promise<{ chyba?: string; adresa?: string }> {
  const t = await tokenZeSezeni();
  if (!t) return { chyba: "Přihlášení vypršelo. Přihlas se prosím znovu." };

  const telo = new FormData();
  telo.set("soubor", vstup.soubor, vstup.soubor.name);
  telo.set("autor", vstup.autor);
  if (vstup.popis) telo.set("popis", vstup.popis);
  telo.set("souhlas", String(vstup.souhlas));

  try {
    const odpoved = await fetch(cestaDoTela(serie, clanek), {
      method: "POST",
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      body: telo,
      cache: "no-store",
    });
    if (!odpoved.ok) return { chyba: await hlaska(odpoved) };

    const obrazek = (await odpoved.json()) as Obrazek;
    return { adresa: obrazek.velky };
  } catch {
    return { chyba: "API se nedaří zavolat." };
  }
}

/** Obrázky nahrané do těla článku, od nejnovějšího. */
export async function obrazkyVTele(serie: string, clanek: string): Promise<Obrazek[]> {
  const t = await tokenZeSezeni();
  if (!t) return [];

  try {
    const odpoved = await fetch(cestaDoTela(serie, clanek), {
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      cache: "no-store",
    });
    return odpoved.ok ? ((await odpoved.json()) as Obrazek[]) : [];
  } catch {
    return [];
  }
}
