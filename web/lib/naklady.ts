import { tokenZeSezeni } from "@/lib/oidc";
import type { Stav } from "@/lib/sprava";

/**
 * Co web stojí. Volá se stejně jako zbytek administrace: token ze sezení,
 * žádná cache, tvar odpovědi z API.
 *
 * <b>Typy jsou tu psané ručně, a je to dočasné.</b> `lib/schema.d.ts` se
 * generuje z OpenAPI dokumentu <i>běžícího</i> API (packages/api-client),
 * takže nový endpoint se do něj dostane až po nasazení. Po něm stačí pustit
 * `packages/api-client/generuj.sh` a tenhle blok nahradit odkazem do schématu.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

export type NakladovaPolozka = {
  polozka: string;
  kcMesicne: number;
  kcRocne: number;
  poznamka: string | null;
  /** Z čeho se položka skládá. Sčítá se do svého řádku, ne do součtu tabulky. */
  slozky?: NakladovaPolozka[] | null;
};

/** Kolik práce projekt spotřeboval. Peníze ne — hodinová sazba nikde není. */
export type Prace = {
  stavbaH: number;
  udrzba30H: number;
  ciMinut: number;
};

/** Jeden den vývoje provozu: kolik by stál měsíc, kdyby byl celý takový. */
export type DenNakladu = {
  den: string;
  provozKcMesicne: number;
};

export type Naklady = {
  /** Kdy čísla spočítala platforma — ne kdy se na ně kouká. */
  kdy: string;
  prirazkaProcent: number;
  provoz: NakladovaPolozka[];
  servis: NakladovaPolozka[];
  provozKcMesicne: number;
  provozKcRocne: number;
  servisKcMesicne: number;
  servisKcRocne: number;
  celkemKcMesicne: number;
  celkemKcRocne: number;
  prace: Prace | null;
  historie: DenNakladu[];
};

/**
 * Načte náklady. Kromě stavu vrací i <c>duvod</c>: když čísla nejsou,
 * je rozdíl mezi „přehled je ještě nezapsal" a „tenhle projekt nezná",
 * a obojí se opravuje jinde.
 */
export async function nactiNaklady(): Promise<{
  stav: Stav;
  naklady?: Naklady;
  duvod?: string;
}> {
  const t = await tokenZeSezeni();
  if (!t) return { stav: "neprihlasen" };

  let odpoved: Response;
  try {
    odpoved = await fetch(`${API}/sprava/naklady`, {
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return { stav: "vypadek" };
  }

  if (odpoved.status === 401) return { stav: "odmitnut" };
  if (odpoved.status === 403) return { stav: "nesmi" };

  // 503 znamená „API běží, ale čísla nemá". Důvod umí říct jen ono.
  if (odpoved.status === 503) return { stav: "neni", duvod: await duvod(odpoved) };
  if (!odpoved.ok) return { stav: "vypadek" };

  return { stav: "ok", naklady: (await odpoved.json()) as Naklady };
}

async function duvod(odpoved: Response) {
  try {
    const telo = (await odpoved.json()) as { error?: string };
    return telo?.error || undefined;
  } catch {
    return undefined;
  }
}
