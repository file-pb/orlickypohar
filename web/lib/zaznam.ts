const API = process.env.API_URL ?? "http://localhost:8080";

/**
 * <b>Tvar je tu psaný ručně, ne generovaný</b> — a je to výjimka, ne
 * nový zvyk. `packages/api-client/generuj.sh` stahuje OpenAPI
 * z <i>běžícího</i> API, jenže to na pracovním stroji nenaběhne
 * (*„Chybí connection string"* — databáze tu nejede). Typy se dotáhnou,
 * jakmile bude endpoint nasazený: `API=https://orlickypohar-api.klihovka.cz
 * packages/api-client/generuj.sh`, a tenhle soubor pak bude brát
 * `components["schemas"]["ZaznamRozjizdky"]` jako `lib/polohy.ts`.
 */

/** Jeden bod stopy. Jen kudy a kdy — přehrávka víc nepotřebuje. */
export type BodZaznamu = { cas: string; sirka: number; delka: number };

/** Stopa jedné lodi v dojeté rozjížďce. */
export type LodZaznamu = {
  lodId: number;
  nazev: string;
  kategorie: string | null;
  body: BodZaznamu[];
};

/**
 * Záznam dojeté rozjížďky pro zrychlenou přehrávku.
 *
 * <b><c>vydava: false</c> není chyba.</b> Znamená „tenhle záznam ne" —
 * rozhodčí nepustil přenos ven, rozjížďka ještě běží, nebo z ní nic
 * nepřišlo. Proč, se ven neříká, stejně jako u živých poloh.
 */
export type ZaznamRozjizdky = {
  vydava: boolean;
  od: string | null;
  do: string | null;
  lode: LodZaznamu[];
};

/**
 * Záznam rozjížďky, nebo `null`, když se nepodařilo zavolat API.
 *
 * Rozdíl proti `vydava: false` je podstatný: tabule si poslední dobrý
 * záznam drží a výpadek jí ho nesmí smazat, kdežto „nevydává se" je
 * odpověď, kterou má poslechnout.
 */
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
