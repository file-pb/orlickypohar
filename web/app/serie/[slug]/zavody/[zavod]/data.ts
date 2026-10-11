import { notFound } from "next/navigation";
import { ApiNedostupne, nactiVerejnouTrat, nactiZavod, type VerejnaTrat, type ZavodDetail } from "@/lib/api";

/**
 * Co potřebuje každá sekce regaty: detail závodu pro hlavičku a taby, trať
 * kvůli pruhu upozornění a tabu „Trať".
 *
 * <b>Trať se čte na každé sekci, i když ji ta sekce nevykresluje.</b>
 * Přestavba je věta, která platí všude — kdo se dívá na seznam lodí, má
 * vědět, že se trať právě mění. Je to jedno volání na naše vlastní API;
 * sekce za to dostane upozornění, které jinak uvidí jen ten, kdo zrovna
 * stojí na úvodu.
 *
 * Výpadek API vrací `null` místo detailu, aby stránka mohla ukázat
 * `Vypadek` místo pádu. Trať si výpadek řeší sama (vrací `null`).
 */
export type Zastavka = { detail: ZavodDetail; trat: VerejnaTrat | null };

export async function nactiZastavku(serie: string, zavod: string): Promise<Zastavka | null> {
  let detail, trat;
  try {
    [detail, trat] = await Promise.all([
      nactiZavod(serie, zavod),
      nactiVerejnouTrat(serie, zavod),
    ]);
  } catch (e) {
    if (e instanceof ApiNedostupne) return null;
    throw e;
  }
  if (!detail) notFound();

  return { detail, trat };
}
