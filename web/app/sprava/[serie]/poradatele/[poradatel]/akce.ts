"use server";

import { redirect } from "next/navigation";
import { prectiSouradnice, ulozPoradatele } from "@/lib/poradatele";

/**
 * Zápis medailonku. Serverová akce a „POST, pak přesměruj" jako v kalendáři:
 * obnovení stránky nesmí poslat formulář znovu.
 *
 * <b>Přesměrovává se na klíč z odpovědi</b>, ne na ten z formuláře —
 * přejmenovaný klub má nový klíč a stará adresa by vrátila 404.
 */

const kam = (serie: string, poradatel: string, zprava: Record<string, string>) =>
  `/sprava/${encodeURIComponent(serie)}/poradatele/${encodeURIComponent(poradatel)}?${new URLSearchParams(zprava)}`;

export async function ulozAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const poradatel = String(formular.get("poradatel") ?? "");
  const text = (klic: string) => String(formular.get(klic) ?? "").trim() || undefined;

  const nazev = String(formular.get("nazev") ?? "").trim();
  if (!nazev) redirect(kam(serie, poradatel, { chyba: "Vyplň název." }));

  // Souřadnice se píšou do jednoho pole, protože se tak kopírují z map.
  // Rozdělit je na dvě čísla je věc formuláře; rozsah hlídá API.
  const souradnice = prectiSouradnice(String(formular.get("souradnice") ?? ""));
  if (souradnice === "chyba")
    redirect(
      kam(serie, poradatel, {
        chyba: "Souřadnice se nedají přečíst. Napiš je jako „49.5086, 14.1735“.",
      }),
    );

  const vysledek = await ulozPoradatele(serie, poradatel, {
    nazev,
    web: text("web"),
    popis: text("popis"),
    email: text("email"),
    telefon: text("telefon"),
    kontaktniOsoba: text("kontaktniOsoba"),
    adresa: text("adresa"),
    sirka: souradnice?.sirka,
    delka: souradnice?.delka,
  });

  if ("chyba" in vysledek) redirect(kam(serie, poradatel, { chyba: vysledek.chyba }));
  redirect(kam(serie, vysledek.slug, { stav: "ulozeno" }));
}
