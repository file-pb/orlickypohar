import { tokenZeSezeni } from "@/lib/oidc";
import type { components } from "./schema";

/**
 * Živé polohy lodí pro pořadatelskou mapu.
 *
 * <b>Čte se za přihlášeného, ne veřejně.</b> Rozhodčí a pořadatel vidí
 * celý blok na vodě; veřejnosti se zatím nevydává nic — to patří
 * k přepínači *živý přenos ven*, který zamyká rozprava.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

/**
 * Jak dlouho se čeká na API. Stejná mez jako u bójí: na mapu, která se
 * ptá každých pár vteřin, je delší čekání k ničemu.
 */
export const CEKAT_MS = 15_000;

/**
 * Jak je poloha stará. <b>Tři stavy, ne dva</b> — mezi „jede" a „nehlásí
 * se" je stav, kdy loď tam je, jen zrovna nemá signál.
 */
export type StavPolohy = components["schemas"]["StavPolohy"];

export type PolohaLodi = components["schemas"]["PolohaLodi"];

/**
 * Snímek pole v jednom okamžiku. Nese i <b>čas serveru</b>: stáří se
 * počítá proti němu, ne proti hodinám prohlížeče.
 */
export type SnimekPoloh = components["schemas"]["SnimekPoloh"];

/** Snímek poloh regaty, nebo `null`, když se nepodařilo zavolat API. */
export async function nactiPolohy(
  serie: string,
  zavod: string,
): Promise<SnimekPoloh | null> {
  const token = await tokenZeSezeni();
  if (!token) return null;

  try {
    const odpoved = await fetch(
      `${API}/sprava/serie/${serie}/zastavky/${zavod}/polohy`,
      {
        headers: { accept: "application/json", authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(CEKAT_MS),
      },
    );
    return odpoved.ok ? ((await odpoved.json()) as SnimekPoloh) : null;
  } catch {
    // Výpadek API nesmí shodit mapu: obrazovka drží poslední dobrý snímek
    // a napíše u něj, jak je starý. Visí na ní rozhodnutí o odkladu startu.
    return null;
  }
}

/**
 * Co z poloh jde ven.
 *
 * <b>Vysílá se, jen když to rozhodčí povolil a zrovna běží rozjížďka.</b>
 * Mimo ni se vydávání vypíná — kde se kdo mezi rozjížďkami koupal, do
 * přenosu nepatří, a ořez zezadu se dopředu udělat nedá. `vysila: false`
 * znamená „teď ne"; proč, se ven neříká.
 *
 * Tvar se píše ručně jen zčásti: řádky lodí jsou generované z OpenAPI.
 */
export type VerejnePolohy = {
  vysila: boolean;
  ted: string;
  lode: PolohaLodi[];
};

/**
 * Veřejné polohy regaty. Bez tokenu — tohle vidí každý, komu to rozhodčí
 * pustil. `null` znamená „nepodařilo se zavolat", ne „nevysílá se".
 */
export async function nactiVerejnePolohy(
  serie: string,
  zavod: string,
): Promise<VerejnePolohy | null> {
  try {
    const odpoved = await fetch(`${API}/serie/${serie}/zavody/${zavod}/polohy`, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(CEKAT_MS),
    });
    return odpoved.ok ? ((await odpoved.json()) as VerejnePolohy) : null;
  } catch {
    // Tabule drží, co má: výpadek API jí nesmí smazat obrazovku.
    return null;
  }
}
