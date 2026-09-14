"use server";

import { redirect } from "next/navigation";
import { prepniStav, pridejRozjizdku, publikuj, type StavVysledku } from "@/lib/vysledky";

/**
 * Zápisy z obrazovky výsledků. Serverové akce, ne javascript v prohlížeči:
 * formulář odešle prohlížeč sám a token přitom nikam neputuje.
 *
 * Po zápisu se přesměrovává — vzor „POST, pak přesměruj". Bez něj by
 * obnovení stránky poslalo tentýž posun znovu.
 */

const kam = (serie: string, zavod: string, zprava: Record<string, string | undefined>) => {
  const dotaz = new URLSearchParams();
  for (const [klic, hodnota] of Object.entries(zprava)) if (hodnota) dotaz.set(klic, hodnota);
  const konec = dotaz.size ? `?${dotaz}` : "";

  return `/sprava/${encodeURIComponent(serie)}/vysledky/${encodeURIComponent(zavod)}${konec}`;
};

export async function stavAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const cislo = Number(formular.get("cislo") ?? 0);
  const stav = String(formular.get("stav") ?? "") as StavVysledku;
  const duvod = String(formular.get("duvod") ?? "").trim() || undefined;

  // Důvod chce jen vrácení k revizi. Kontroluje to i API, ale bez téhle
  // odbočky by se tlačítko odeslalo a vrátilo hlášku z druhé strany drátu —
  // a rozepsaný důvod by se cestou ztratil.
  if (stav === "KRevizi" && !duvod)
    redirect(kam(serie, zavod, { chyba: "Napiš, co je špatně.", revize: String(cislo) }));

  const chyba = await prepniStav(serie, zavod, cislo, stav, duvod);

  redirect(
    kam(serie, zavod, chyba ? { chyba } : { stav: "prepnuto", cislo: String(cislo), nastav: stav }),
  );
}

/** Nová rozjížďka jde rovnou na svůj zápis — kvůli tomu se přidává. */
export async function pridejRozjizdkuAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");

  const vysledek = await pridejRozjizdku(serie, zavod);

  if ("chyba" in vysledek) redirect(kam(serie, zavod, { chyba: vysledek.chyba }));

  redirect(
    `/sprava/${encodeURIComponent(serie)}/vysledky/${encodeURIComponent(zavod)}/${vysledek.cislo}?stav=nova`,
  );
}

export async function publikaceAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const cislo = Number(formular.get("cislo") ?? 0);
  const publikovano = String(formular.get("publikovano") ?? "") === "ano";

  const chyba = await publikuj(serie, zavod, cislo, publikovano);

  redirect(
    kam(
      serie,
      zavod,
      chyba ? { chyba } : { stav: publikovano ? "venku" : "stazeno", cislo: String(cislo) },
    ),
  );
}
