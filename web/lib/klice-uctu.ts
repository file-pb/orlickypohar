import { tokenZeSezeni } from "@/lib/oidc";
import type { Stav } from "@/lib/sprava";
import type { components } from "./schema";

/**
 * Napojení telefonu na účet — QR na vlastním profilu, jako WhatsApp.
 *
 * <b>Je to něco jiného než klíč k lodi</b> (`lib/klice.ts`). Ten váže
 * telefon na **loď** a slouží k posílání trasy; tenhle váže telefon na
 * **účet**, takže appka smí všechno, co ten člověk — a nemusí se kvůli
 * tomu přihlašovat u poskytovatele.
 *
 * Filip, 26. 11. 2026: *„na zitadel uživatele tahat nechci… když se člověk
 * dostane do uživatelského profilu v rámci webu, tak tam může být
 * informace moje identifikace s QR kódem."*
 *
 * <b>Tvary jsou ze schématu.</b> Do 27. 11. 2026 tu byly psané ručně, než
 * se snímek OpenAPI přegeneroval; s balíčkem a stavem telefonu by ruční
 * kopie musela hlídat i slova stavů, a ta se mají brát odtud.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

type S = components["schemas"];

export type NapojeniKod = S["NapojeniKodDto"];
export type KlicUctu = S["KlicUctuDto"];
export type StavVerze = S["StavVerzeAppky"];

/**
 * Stav telefonu tak, jak ho čte jeho majitel — <b>jen když je známý</b>.
 * Telefon, který se nehlásil, nemá nic: „neznámý" na profilu by vypadal
 * jako porucha, přitom jen jede na appce, která verzi ještě nehlásí.
 * Správa vidí podrobnosti ve flotile; tady stačí, jestli je co dělat.
 */
export function stavTelefonu(stav: StavVerze): { text: string; trida: string } | null {
  switch (stav) {
    case "aktualni":
      return { text: "aktuální", trida: "stav-verze-aktualni" };
    case "stara-aktualizace":
      return { text: "zastaralý — novinky si stáhne sám při příštím spuštění", trida: "stav-verze-stara-aktualizace" };
    case "stary-balicek":
      return { text: "zastaralý — nová verze je v obchodě", trida: "stav-verze-stary-balicek" };
    case "nouzove":
      return { text: "zastaralý — poslední aktualizace se nespustila", trida: "stav-verze-nouzove" };
    default:
      return null;
  }
}

/**
 * Adresa, která se zabalí do QR.
 *
 * <b>Míří na web, ne rovnou do appky</b> — tatáž úvaha jako u klíče k lodi
 * a u kódů připojení: vlastní schéma `orlickypohar://` by u telefonu bez
 * appky skončilo tím, že se nestane nic. Takhle člověk skončí na stránce,
 * která mu řekne, co dál.
 */
export const adresaNapojeni = (kod: string) =>
  `${(process.env.WEB_URL ?? "https://orlickypohar.klihovka.cz").replace(/\/$/, "")}` +
  `/napojeni?kod=${encodeURIComponent(kod)}`;

async function zavolej<T>(
  cesta: string,
  volby: RequestInit = {},
): Promise<{ stav: Stav; data?: T }> {
  const t = await tokenZeSezeni();
  if (!t) return { stav: "neprihlasen" };

  let odpoved: Response;
  try {
    odpoved = await fetch(`${API}${cesta}`, {
      ...volby,
      headers: { authorization: `Bearer ${t}`, accept: "application/json", ...volby.headers },
      cache: "no-store",
    });
  } catch {
    return { stav: "vypadek" };
  }

  if (odpoved.status === 401 || odpoved.status === 403) return { stav: "odmitnut" };
  if (!odpoved.ok) return { stav: "vypadek" };
  if (odpoved.status === 204) return { stav: "ok" };

  return { stav: "ok", data: (await odpoved.json()) as T };
}

/** Telefony napojené na přihlášený účet. */
export const mojeKlice = () => zavolej<KlicUctu[]>("/ja/klice");

/** Vystaví jednorázový kód. Starý nevyužitý tím propadne. */
export const vystavKod = () =>
  zavolej<NapojeniKod>("/ja/klice/kod", { method: "POST" });

/** Odebere napojený telefon. Cesta ven po ztrátě mobilu. */
export const odeberKlic = (id: number) =>
  zavolej<void>(`/ja/klice/${id}`, { method: "DELETE" });
