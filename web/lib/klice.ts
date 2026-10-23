import { tokenZeSezeni } from "@/lib/oidc";
import type { Stav } from "@/lib/sprava";
import type { components } from "./schema";

/**
 * Mobilní klíče k lodi očima kapitána — a posádky.
 *
 * <b>Klíč je něco jiného než připojení k lodi</b> (`lib/pripojeni.ts`).
 * Připojení váže **účet** na loď a dává role; klíč váže **telefon** a slouží
 * k jedinému: posílat trasu. Posádka kvůli němu nemusí mít účet, což je celý
 * jeho smysl.
 *
 * Vydat klíč smí i posádka (Filip, 23. 10. 2026), ale odebrat ho nebo vypnout
 * sledování jen kapitán a majitel: je to zásah do cizího telefonu.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

export type Klic = components["schemas"]["KlicDto"];
export type Pozvanka = components["schemas"]["PozvankaDto"];

/**
 * Adresa, která se zabalí do QR.
 *
 * <b>Míří na web, ne rovnou do appky.</b> Vlastní schéma `orlickypohar://`
 * by u telefonu bez appky skončilo tím, že se nestane nic; takhle posádka
 * skončí na stránce, která ji buď přehodí do appky, nebo jí řekne, kde ji
 * vzít. Je to stejná úvaha jako u kódů připojení.
 */
export const adresaKlice = (kod: string) =>
  `${(process.env.WEB_URL ?? "https://orlickypohar.klihovka.cz").replace(/\/$/, "")}` +
  `/klic?kod=${encodeURIComponent(kod)}`;

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

  if (odpoved.status === 401) return { stav: "odmitnut" };
  if (odpoved.status === 403) return { stav: "nesmi" };
  if (odpoved.status === 404) return { stav: "neni" };
  if (!odpoved.ok) return { stav: "vypadek" };

  const prazdna = odpoved.status === 204;
  return { stav: "ok", data: prazdna ? undefined : ((await odpoved.json()) as T) };
}

/** Telefony spárované s lodí. */
export const kliceLodi = (lod: number) => zavolej<Klic[]>(`/ja/lode/${lod}/klice`);

/**
 * Vystaví pozvánku. <b>Kód se vrací jednou</b> — server drží jen otisk,
 * takže co zmizí z obrazovky, to už nikdo nezjistí.
 */
export const pozviKlicem = (lod: number, jmeno: string | null) =>
  zavolej<Pozvanka>(`/ja/lode/${lod}/klice`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jmeno }),
  });

/** Zapne nebo vypne sledování. Vratné — na rozdíl od odebrání. */
export const prepniSledovani = (lod: number, klic: number, sleduje: boolean) =>
  zavolej<void>(`/ja/lode/${lod}/klice/${klic}/sledovani`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sleduje }),
  });

/** Odebere klíč natrvalo. Telefon se bude muset spárovat znovu. */
export const odeberKlic = (lod: number, klic: number) =>
  zavolej<void>(`/ja/lode/${lod}/klice/${klic}`, { method: "DELETE" });

/** Hláška k stavu, ať ji nemusí skládat každá stránka zvlášť. */
export function procNejde(stav: Stav): string {
  switch (stav) {
    case "neprihlasen":
    case "odmitnut":
      return "Přihlášení vypršelo. Přihlas se prosím znovu.";
    case "nesmi":
      return "Klíč smí vydat jen někdo z lodi.";
    case "neni":
      return "Taková loď tu není.";
    default:
      return "Nepovedlo se spojit s API.";
  }
}
