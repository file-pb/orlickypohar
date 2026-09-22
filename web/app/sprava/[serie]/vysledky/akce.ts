"use server";

import { redirect } from "next/navigation";
import {
  prepniStav,
  pridejRozjizdku,
  publikuj,
  zaradDoPoharu,
  type StavVysledku,
} from "@/lib/vysledky";

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
  // Zaškrtávátko neodeslané = odškrtnuté. Výchozí je zaškrtnuté.
  const doSerie = formular.get("doSerie") === "ano";
  // Na vodě se jde rovnou do cílové obrazovky, doma na formulář z papíru.
  const cil = formular.get("kam") === "cil";

  const vysledek = await pridejRozjizdku(serie, zavod, doSerie);

  if ("chyba" in vysledek) redirect(kam(serie, zavod, { chyba: vysledek.chyba }));

  const zaklad = `/sprava/${encodeURIComponent(serie)}/vysledky/${encodeURIComponent(zavod)}/${vysledek.cislo}`;
  redirect(cil ? `${zaklad}/cil` : `${zaklad}?stav=nova`);
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

export async function poharAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const cislo = Number(formular.get("cislo") ?? 0);
  const doSerie = String(formular.get("doSerie") ?? "") === "ano";

  const chyba = await zaradDoPoharu(serie, zavod, cislo, doSerie);

  redirect(
    kam(
      serie,
      zavod,
      chyba ? { chyba } : { stav: doSerie ? "vPoharu" : "mimoPohar", cislo: String(cislo) },
    ),
  );
}
