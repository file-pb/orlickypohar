import { tokenZeSezeni } from "@/lib/oidc";

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
 *
 * Typy se zatím píšou ručně, ne z `schema.d.ts`: generátor stahuje
 * dokument z běžícího API a endpoint ještě nebyl nasazený, když tohle
 * vznikalo. Až se nasadí, nahradí je `components["schemas"][…]`.
 */
export type StavPolohy = "Cerstva" | "Starne" | "Nedostupna";

export type PolohaLodi = {
  lodId: number;
  lod: string;
  cisloPlachty: string | null;
  kategorie: string | null;
  sirka: number | null;
  delka: number | null;
  kurz: number | null;
  rychlostMS: number | null;
  casGps: string | null;
  stariMs: number | null;
  stav: StavPolohy;
};

export type SnimekPoloh = {
  /** Čas serveru. Stáří se počítá proti němu, ne proti hodinám prohlížeče. */
  ted: string;
  oknoBezi: boolean;
  oknoOd: string | null;
  lode: PolohaLodi[];
};

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
