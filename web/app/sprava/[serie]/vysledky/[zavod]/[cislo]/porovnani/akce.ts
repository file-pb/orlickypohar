"use server";

import { redirect } from "next/navigation";
import { pouzijNavrh } from "@/lib/vysledky";

/**
 * Výběr verze zápisu, na které se zapisovatelé shodli. Serverová akce, ne
 * javascript — porovnává se na břehu, po dojezdu.
 */
export async function pouzijNavrhAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const cislo = Number(formular.get("cislo") ?? 0);
  const autor = String(formular.get("autor") ?? "");
  const kdo = String(formular.get("kdo") ?? "");

  const zaklad = `/sprava/${encodeURIComponent(serie)}/vysledky/${encodeURIComponent(zavod)}/${cislo}/porovnani`;
  const chyba = await pouzijNavrh(serie, zavod, cislo, autor);

  redirect(
    chyba
      ? `${zaklad}?${new URLSearchParams({ chyba })}`
      : `${zaklad}?${new URLSearchParams({ stav: "pouzito", kdo })}`,
  );
}
