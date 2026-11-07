import { tokenZeSezeni } from "@/lib/oidc";
import type { components } from "./schema";
import type { Stav } from "@/lib/sprava";

/**
 * Kdo z pořadatelů ročníku pomáhá u startu a u cíle téhle regaty (nález K8,
 * rozhodnuto Filipem 28. 10. 2026).
 *
 * <b>Vedle `lib/prihlasky.ts`, i když se obsluhuje z téže obrazovky.</b>
 * Přihlášky jsou o lodích, tohle o lidech — a hlavně: listina má od
 * 7. 11. 2026 zámek po rozpravě, zaškrtávání ne. Sloučit je do jednoho
 * modulu by znamenalo, že se ty dva zámky potkají v jednom souboru a dřív
 * nebo později si je někdo splete.
 *
 * <b>Token zůstává na serveru.</b> Leží v cookie, kterou prohlížeč jen vozí
 * s sebou; do stránky se nikdy nevypisuje.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

type S = components["schemas"];

export type Pomocnici = S["PomocniciDto"];
export type PoradatelRocniku = S["PoradatelRocnikuDto"];

const token = () => tokenZeSezeni();

const kam = (serie: string, zavod: string, cesta = "") =>
  `${API}/sprava/serie/${encodeURIComponent(serie)}/zastavky/${encodeURIComponent(zavod)}` +
  `/pomocnici${cesta}`;

/** Chybová hláška z API, nebo obecná podle stavu. Nikdy prázdná. */
async function hlaska(odpoved: Response) {
  try {
    const telo = (await odpoved.json()) as { error?: string };
    if (telo?.error) return telo.error;
  } catch {
    // Tělo nemusí být JSON — 401 z ověřování ho nemá vůbec.
  }

  if (odpoved.status === 401) return "Přihlášení vypršelo. Přihlas se prosím znovu.";
  if (odpoved.status === 403) return "Pomocníky u startu a cíle zaškrtává rozhodčí ročníku.";
  if (odpoved.status === 404) return "Regata nebo ročník neexistuje.";
  return `API odpovědělo ${odpoved.status}.`;
}

export async function nactiPomocniky(
  serie: string,
  zavod: string,
): Promise<{ stav: Stav; data?: Pomocnici }> {
  const t = await token();
  if (!t) return { stav: "neprihlasen" };

  let odpoved: Response;
  try {
    odpoved = await fetch(kam(serie, zavod), {
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      // Odpověď závisí na tom, kdo se ptá, a mění se po každém zaškrtnutí.
      cache: "no-store",
    });
  } catch {
    return { stav: "vypadek" };
  }

  if (odpoved.status === 401) return { stav: "odmitnut" };
  if (odpoved.status === 403) return { stav: "nesmi" };
  if (odpoved.status === 404) return { stav: "neni" };
  if (!odpoved.ok) return { stav: "vypadek" };

  return { stav: "ok", data: (await odpoved.json()) as Pomocnici };
}

/** Zaškrtne, nebo odškrtne pomocníka. Vrací chybu k zobrazení, nebo `null`. */
export async function nastavPomoc(
  serie: string,
  zavod: string,
  uzivatelId: string,
  pomaha: boolean,
): Promise<string | null> {
  const t = await token();
  if (!t) return "Přihlášení vypršelo. Přihlas se prosím znovu.";

  try {
    const odpoved = await fetch(kam(serie, zavod, `/${encodeURIComponent(uzivatelId)}`), {
      method: "PUT",
      headers: {
        authorization: `Bearer ${t}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ pomaha }),
      cache: "no-store",
    });

    return odpoved.ok ? null : await hlaska(odpoved);
  } catch {
    return "API se nedaří zavolat.";
  }
}
