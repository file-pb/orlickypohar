"use server";

import { redirect } from "next/navigation";
import { prepniStav, uloz, zaloz, type StavClanku } from "@/lib/clanky";

/**
 * Zápisy z obrazovky blogu. Serverové akce, ne javascript v prohlížeči:
 * formulář odešle prohlížeč sám a token přitom nikam neputuje.
 *
 * Po zápisu se přesměrovává — vzor „POST, pak přesměruj". Bez něj by
 * obnovení stránky poslalo tentýž formulář znovu a článek by se založil
 * podruhé.
 */

const kam = (serie: string, cesta: string, zprava: Record<string, string | undefined>) => {
  const dotaz = new URLSearchParams();
  for (const [klic, hodnota] of Object.entries(zprava)) if (hodnota) dotaz.set(klic, hodnota);
  const konec = dotaz.size ? `?${dotaz}` : "";
  return `/sprava/${encodeURIComponent(serie)}/clanky${cesta}${konec}`;
};

/** Pole formuláře na vstup pro API. Prázdné je „nevyplněno", ne hodnota. */
function vstupZFormulare(formular: FormData) {
  const text = (klic: string) => String(formular.get(klic) ?? "").trim() || undefined;

  return {
    titulek: String(formular.get("titulek") ?? "").trim(),
    telo: String(formular.get("telo") ?? "").trim(),
    perex: text("perex"),
    autor: text("autor"),
    // Prázdná volba znamená celý ročník. `undefined`, ne prázdný řetězec —
    // ten by API přeložilo na regatu se jménem "" a nenašlo ji.
    zavod: text("zavod"),
    // Zaškrtnuté políčko znamená „vložil jsem to odjinud" — server text
    // vyčistí a uloží jako bloky. Nezaškrtnuté je prostý text jako doteď.
    format: formular.get("vlozene") ? ("Html" as const) : ("Text" as const),
  };
}

export async function zalozAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const vstup = vstupZFormulare(formular);

  if (!vstup.titulek) redirect(kam(serie, "", { chyba: "Vyplň titulek." }));
  if (!vstup.telo) redirect(kam(serie, "", { chyba: "Vyplň text článku." }));

  const { chyba, slug } = await zaloz(serie, vstup);
  if (chyba) redirect(kam(serie, "", { chyba }));

  // Rovnou do úprav: po založení chce člověk psát dál, ne koukat na seznam.
  redirect(kam(serie, `/${slug}`, { stav: "zalozeno" }));
}

export async function ulozAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const slug = String(formular.get("slug") ?? "");

  const chyba = await uloz(serie, slug, vstupZFormulare(formular));
  redirect(kam(serie, `/${slug}`, chyba ? { chyba } : { stav: "ulozeno" }));
}

export async function stavAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const slug = String(formular.get("slug") ?? "");
  const stav = String(formular.get("stav") ?? "") as StavClanku;
  // Odkud se klikalo: ze seznamu zpátky na seznam, z článku na článek.
  const zpet = String(formular.get("zpet") ?? "") === "clanek";

  const chyba = await prepniStav(serie, slug, stav);

  redirect(
    kam(serie, zpet ? `/${slug}` : "", chyba ? { chyba } : { stav: "prepnuto", nastav: stav }),
  );
}
