"use server";

import { redirect } from "next/navigation";
import { NEJVIC_MB, vyvesSmernici } from "@/lib/smernice";

/**
 * Vyvěšení plachetní směrnice.
 *
 * <b>Kam se vrací, skládá akce sama</b> ze série a zastávky, ne z pole
 * formuláře — adresa z formuláře by šla podvrhnout.
 *
 * Mazání tu není schválně: appka je oficiální vývěska, oprava je nová verze.
 */
export async function vyvesAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const kam = (zprava: Record<string, string>) =>
    `/sprava/${encodeURIComponent(serie)}/smernice/${encodeURIComponent(zavod)}?${new URLSearchParams(zprava)}`;

  const soubor = formular.get("soubor");
  const poznamka = String(formular.get("poznamka") ?? "").trim() || undefined;

  if (!(soubor instanceof File) || soubor.size === 0)
    redirect(kam({ chyba: "Vyber soubor se směrnicí." }));
  if (soubor.size > NEJVIC_MB * 1024 * 1024)
    redirect(kam({ chyba: `Směrnice může mít nejvýš ${NEJVIC_MB} MB.` }));

  const chyba = await vyvesSmernici(serie, zavod, { soubor, poznamka });
  redirect(kam(chyba ? { chyba } : { stav: "vyveseno" }));
}
