import { tokenZeSezeni } from "@/lib/oidc";
import type { Stav } from "@/lib/sprava";
import type { components } from "./schema";

/**
 * Plachetní směrnice u zastávky — vyvěšení a seznam verzí.
 *
 * <b>Soubor jde přes server webu, ne z prohlížeče rovnou do úložiště.</b>
 * Stejně jako u fotek: obyčejný formulář bez javascriptu a API si obsah
 * zkontroluje dřív, než se cokoliv uloží.
 *
 * <b>Vyvěšené se nemaže.</b> Appka je oficiální vývěska, takže oprava je
 * nová verze — proto tu není žádná funkce na mazání a ani nebude.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

export type Smernice = components["schemas"]["SmerniceDto"];

/** Stejná hranice jako v API. Hlídá se i tady, ať se nic velkého neposílá dál. */
export const NEJVIC_MB = 20;

const cesta = (serie: string, zavod: string) =>
  `${API}/sprava/serie/${encodeURIComponent(serie)}/zastavky/${encodeURIComponent(zavod)}/smernice`;

async function hlaska(odpoved: Response) {
  try {
    const telo = (await odpoved.json()) as { error?: string };
    if (telo?.error) return telo.error;
  } catch {
    // Tělo nemusí být JSON — 401 z ověřování ho nemá vůbec.
  }

  if (odpoved.status === 401) return "Přihlášení vypršelo. Přihlas se prosím znovu.";
  if (odpoved.status === 403) return "Směrnici smí vyvěsit pořadatel regaty nebo rozhodčí.";
  if (odpoved.status === 404) return "Tahle regata neexistuje.";
  if (odpoved.status === 413) return `Směrnice může mít nejvýš ${NEJVIC_MB} MB.`;
  return `API odpovědělo ${odpoved.status}.`;
}

/**
 * Vyvěšené verze, od nejnovější. Stavy jsou tytéž jako u zbytku správy —
 * „nepřihlášen" a „nemáš právo" nejsou výpadek a nesmí se tak tvářit.
 */
export async function nactiSmernice(
  serie: string,
  zavod: string,
): Promise<{ stav: Stav; data?: Smernice[] }> {
  const t = await tokenZeSezeni();
  if (!t) return { stav: "neprihlasen" };

  let odpoved: Response;
  try {
    odpoved = await fetch(cesta(serie, zavod), {
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

  return { stav: "ok", data: (await odpoved.json()) as Smernice[] };
}

/** Vrací chybu k zobrazení, nebo `null`, když se povedlo. */
export async function vyvesSmernici(
  serie: string,
  zavod: string,
  vstup: { soubor: File; poznamka?: string },
): Promise<string | null> {
  const t = await tokenZeSezeni();
  if (!t) return "Přihlášení vypršelo. Přihlas se prosím znovu.";

  // Jména polí podle `SmerniceFormular` v API.
  const telo = new FormData();
  telo.set("soubor", vstup.soubor, vstup.soubor.name);
  if (vstup.poznamka) telo.set("poznamka", vstup.poznamka);

  try {
    const odpoved = await fetch(cesta(serie, zavod), {
      method: "POST",
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      body: telo,
      cache: "no-store",
    });
    return odpoved.ok ? null : await hlaska(odpoved);
  } catch {
    return "API se nedaří zavolat.";
  }
}
