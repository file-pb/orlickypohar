"use server";

import { redirect } from "next/navigation";
import { NEJHORSI_PRESNOST_M, pipni, seber } from "@/lib/boje";

/**
 * Serverové akce obrazovky bójí.
 *
 * <b>Pípnutí volá javascript</b>, protože polohu umí dát jen prohlížeč —
 * stejně jako u cílové obrazovky. Token zůstává na serveru: akce si ho
 * vezme ze sezení a do prohlížeče se nedostane.
 *
 * <b>Sebrání je obyčejný formulář.</b> Nepotřebuje polohu, takže nemá
 * důvod potřebovat javascript; funguje i na telefonu, kde zlobí.
 *
 * Vstup z prohlížeče je **neověřený**, i když ho tatáž obrazovka
 * vyrobila: akce je POST na stránku a dá se poslat i mimo UI. Hranice
 * jsou proto i tady, ne jen v API.
 */

/** Pípnutí z klientské části. Vrací „povedlo se, nebo proč ne". */
export async function pipniAkce(
  serie: string,
  zavod: string,
  vstup: {
    nazev: string;
    poradi: number;
    sirka: number;
    delka: number;
    presnostM: number | null;
    nahrazujeId: number | null;
  },
): Promise<{ chyba: string | null }> {
  const nazev = vstup.nazev.trim();
  if (!nazev) return { chyba: "Napiš, čím ta bóje je — třeba „bóje 1“." };

  if (!Number.isFinite(vstup.sirka) || !Number.isFinite(vstup.delka))
    return { chyba: "Poloha z telefonu nepřišla celá. Pípni prosím znovu." };

  // Přesnost hlídá i API; tady se chytá dřív, aby se zbytečně neposílala.
  if (vstup.presnostM !== null && vstup.presnostM > NEJHORSI_PRESNOST_M)
    return {
      chyba: `Poloha je přesná jen na ${Math.round(vstup.presnostM)} m. Počkej na lepší signál a pípni znovu.`,
    };

  const poradi = Number.isInteger(vstup.poradi) && vstup.poradi > 0 ? vstup.poradi : 0;
  const nahrazujeId =
    Number.isInteger(vstup.nahrazujeId) && (vstup.nahrazujeId ?? 0) > 0
      ? vstup.nahrazujeId
      : null;

  const chyba = await pipni(serie, zavod, {
    nazev,
    poradi,
    sirka: vstup.sirka,
    delka: vstup.delka,
    presnostM: vstup.presnostM,
    nahrazujeId,
  });

  return { chyba };
}

/**
 * Sebrání bóje z vody.
 *
 * <b>Kam se vrací, skládá akce sama</b> ze série a zastávky, ne z pole
 * formuláře — adresa z formuláře by šla podvrhnout. Id bóje z formuláře
 * jde, protože API ho stejně hledá jen u téhle regaty.
 */
export async function seberAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const kam = (zprava: Record<string, string>) =>
    `/sprava/${encodeURIComponent(serie)}/boje/${encodeURIComponent(zavod)}?${new URLSearchParams(zprava)}`;

  const boje = Number(formular.get("boje") ?? 0);
  if (!Number.isInteger(boje) || boje <= 0) redirect(kam({ chyba: "Která bóje se má sebrat?" }));

  const chyba = await seber(serie, zavod, boje);
  redirect(kam(chyba ? { chyba } : { stav: "sebrano" }));
}
