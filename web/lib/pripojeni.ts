import { tokenZeSezeni } from "@/lib/oidc";
import type { Stav } from "@/lib/sprava";
import type { components } from "./schema";

/**
 * Připojení účtu k lodi kódem nebo QR.
 *
 * <b>Kód a QR jsou jedna věc ve dvou podobách.</b> API vydává jen řetězec;
 * adresu pro QR skládá web, protože svou veřejnou adresu zná — a kdyby ji
 * měl skládat server, přibyla by kvůli obrázku další proměnná prostředí.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

export type Kod = components["schemas"]["KodDto"];
export type Pripojeni = components["schemas"]["PripojeniDto"];
export type Pripojeny = components["schemas"]["PripojenyDto"];
export type RoleKLodi = components["schemas"]["RoleKLodi"];

export const NAZEV_ROLE: Record<RoleKLodi, string> = {
  Majitel: "majitel",
  Kapitan: "kapitán",
  Posadka: "posádka",
  Fanousek: "fanoušek",
};

/** Adresa, která se zabalí do QR. Otevře připojení i v obyčejném prohlížeči. */
export const adresaKodu = (kod: string) =>
  `${(process.env.WEB_URL ?? "https://orlickypohar.klihovka.cz").replace(/\/$/, "")}` +
  `/pripojeni?kod=${encodeURIComponent(kod)}`;

async function hlaska(odpoved: Response) {
  try {
    const telo = (await odpoved.json()) as { error?: string };
    if (telo?.error) return telo.error;
  } catch {
    // Tělo nemusí být JSON — 401 z ověřování ho nemá vůbec.
  }

  if (odpoved.status === 401) return "Přihlášení vypršelo. Přihlas se prosím znovu.";
  if (odpoved.status === 403) return "Kód smí vystavit kapitán nebo majitel lodi.";
  if (odpoved.status === 404) return "Taková loď tu není.";
  return `API odpovědělo ${odpoved.status}.`;
}

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

/** Lodě, ke kterým přihlášený patří, i s rolí. */
export const mojeLode = () =>
  zavolej<components["schemas"]["MojeLodDto"][]>("/ja/lode");

/** Vystaví kód k lodi. Smí kapitán nebo majitel. */
export const vystavKod = (lod: number) =>
  zavolej<Kod>(`/ja/lode/${lod}/kod`, { method: "POST" });

/** Kdo je k lodi připojený. */
export const pripojeniLodi = (lod: number) =>
  zavolej<Pripojeny[]>(`/ja/lode/${lod}/pripojeni`);

/** Odebere připojení. Vrací chybu k zobrazení, nebo `null`. */
export async function odeberPripojeni(lod: number, vazba: number): Promise<string | null> {
  const t = await tokenZeSezeni();
  if (!t) return "Přihlášení vypršelo. Přihlas se prosím znovu.";

  try {
    const odpoved = await fetch(`${API}/ja/lode/${lod}/pripojeni/${vazba}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      cache: "no-store",
    });
    return odpoved.ok ? null : await hlaska(odpoved);
  } catch {
    return "API se nedaří zavolat.";
  }
}

/** Uplatní kód. Vrací připojení, nebo chybu k zobrazení. */
export async function pripoj(
  kod: string,
): Promise<{ pripojeni?: Pripojeni; chyba?: string; neprihlasen?: boolean }> {
  const t = await tokenZeSezeni();
  if (!t) return { neprihlasen: true };

  try {
    const odpoved = await fetch(`${API}/ja/pripojeni`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${t}`,
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ kod }),
      cache: "no-store",
    });

    if (odpoved.ok) return { pripojeni: (await odpoved.json()) as Pripojeni };
    return { chyba: await hlaska(odpoved) };
  } catch {
    return { chyba: "API se nedaří zavolat." };
  }
}
