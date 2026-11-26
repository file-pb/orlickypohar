import { tokenZeSezeni } from "@/lib/oidc";
import type { Stav } from "@/lib/sprava";

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
 * <b>Tvary jsou psané ručně, ne ze schématu.</b> Snímek OpenAPI se
 * generuje z běžícího serveru a ten tyhle cesty dostane až po nasazení;
 * až se přegeneruje, zmizí to ve prospěch `components["schemas"][…]`.
 * Stejný postup jako u `ZavodnikDnes` v appce.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

export type NapojeniKod = { kod: string; platiDo: string };
export type KlicUctu = {
  id: number;
  zarizeni: string | null;
  vydanV: string;
  ozvalSeV: string | null;
};

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
