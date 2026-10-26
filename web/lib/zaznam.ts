import { tokenZeSezeni } from "@/lib/oidc";
import type { components } from "./schema";

const API = process.env.API_URL ?? "http://localhost:8080";

/** Jeden bod stopy. Jen kudy a kdy — přehrávka víc nepotřebuje. */
export type BodZaznamu = components["schemas"]["BodZaznamu"];

/** Stopa jedné lodi v dojeté rozjížďce. */
export type LodZaznamu = components["schemas"]["LodZaznamu"];

/**
 * Záznam dojeté rozjížďky pro zrychlenou přehrávku.
 *
 * <b><c>vydava: false</c> není chyba.</b> Znamená „tenhle záznam ne" —
 * rozhodčí nepustil přenos ven, rozjížďka ještě běží, nebo z ní nic
 * nepřišlo. Proč, se ven neříká, stejně jako u živých poloh.
 */
export type ZaznamRozjizdky = components["schemas"]["ZaznamRozjizdky"];

export async function nactiZaznam(
  serie: string,
  zavod: string,
  cislo: number,
): Promise<ZaznamRozjizdky | null> {
  try {
    const odpoved = await fetch(
      `${API}/serie/${encodeURIComponent(serie)}/zavody/${encodeURIComponent(zavod)}` +
        `/rozjizdky/${cislo}/zaznam`,
      {
        headers: { accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );
    return odpoved.ok ? ((await odpoved.json()) as ZaznamRozjizdky) : null;
  } catch {
    return null;
  }
}

/**
 * Záznam rozjížďky pro pořadatele a rozhodčího — <b>na revizi protestu</b>.
 *
 * Proti veřejnému výdeji nezáleží na přepínači *živý přenos ven* a vydá se
 * i běžící rozjížďka: ten, kdo tohle čte, vidí živé polohy stejně, takže by
 * ořez nic nechránil a jen by bral možnost podívat se zpátky během jízdy.
 */
export async function nactiZaznamSpravy(
  serie: string,
  zavod: string,
  cislo: number,
): Promise<ZaznamRozjizdky | null> {
  const token = await tokenZeSezeni();
  if (!token) return null;

  try {
    const odpoved = await fetch(
      `${API}/sprava/serie/${encodeURIComponent(serie)}/zastavky/${encodeURIComponent(zavod)}` +
        `/rozjizdky/${cislo}/zaznam`,
      {
        headers: { accept: "application/json", authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );
    return odpoved.ok ? ((await odpoved.json()) as ZaznamRozjizdky) : null;
  } catch {
    return null;
  }
}
