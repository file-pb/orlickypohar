"use server";

import { redirect } from "next/navigation";
import { stahniSmernici } from "@/lib/smernice";

/**
 * Stáhne verzi z vývěsky. Soubor zmizí z úložiště, záznam i důvod zůstanou.
 *
 * Verze se bere z formuláře, ale je to číslo v rámci zastávky, kterou si
 * akce skládá sama — podvržené číslo tedy nedosáhne na cizí regatu.
 */
export async function stahniAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const kam = (zprava: Record<string, string>) =>
    `/sprava/${encodeURIComponent(serie)}/smernice/${encodeURIComponent(zavod)}?${new URLSearchParams(zprava)}`;

  const verze = Number(formular.get("verze") ?? 0);
  const duvod = String(formular.get("duvod") ?? "").trim();

  if (!duvod)
    redirect(kam({ chyba: "Napiš, proč se směrnice stahuje. Bez důvodu to API nepustí." }));

  const chyba = await stahniSmernici(serie, zavod, verze, duvod);
  redirect(kam(chyba ? { chyba } : { stav: "stazeno" }));
}
