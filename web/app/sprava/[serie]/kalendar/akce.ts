"use server";

import { redirect } from "next/navigation";
import { prepniStav, publikuj, uloz, zaloz, type StavZavodu } from "@/lib/kalendar";

/**
 * Zápisy z obrazovky kalendáře. Serverové akce, ne javascript v prohlížeči:
 * formulář odešle prohlížeč sám a token přitom nikam neputuje.
 *
 * Po zápisu se přesměrovává — vzor „POST, pak přesměruj". Bez něj by
 * obnovení stránky poslalo tentýž formulář znovu a zastávka by se založila
 * podruhé.
 */

const kam = (serie: string, zprava: Record<string, string | undefined>) => {
  const dotaz = new URLSearchParams();
  for (const [klic, hodnota] of Object.entries(zprava)) if (hodnota) dotaz.set(klic, hodnota);
  const konec = dotaz.size ? `?${dotaz}` : "";
  return `/sprava/${encodeURIComponent(serie)}/kalendar${konec}`;
};

/** Pole formuláře na vstup pro API. Prázdné je „nevyplněno", ne hodnota. */
function vstupZFormulare(formular: FormData) {
  const text = (klic: string) => String(formular.get(klic) ?? "").trim() || undefined;

  return {
    nazev: String(formular.get("nazev") ?? "").trim(),
    datum: String(formular.get("datum") ?? "").trim(),
    // Prázdný konec znamená jednodenní závod. `undefined`, ne prázdný
    // řetězec — ten by API četlo jako neplatné datum.
    datumKonce: text("datumKonce"),
    typ: text("typ"),
    poradatel: text("poradatel"),
  };
}

export async function zalozAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const vstup = vstupZFormulare(formular);

  if (!vstup.nazev) redirect(kam(serie, { chyba: "Vyplň název zastávky." }));
  if (!vstup.datum) redirect(kam(serie, { chyba: "Vyplň termín." }));

  const chyba = await zaloz(serie, vstup);
  redirect(kam(serie, chyba ? { chyba } : { stav: "zalozeno", co: vstup.nazev }));
}

export async function ulozAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const vstup = vstupZFormulare(formular);

  if (!vstup.datum) redirect(kam(serie, { chyba: "Vyplň termín." }));

  const chyba = await uloz(serie, zavod, vstup);
  redirect(kam(serie, chyba ? { chyba } : { stav: "ulozeno", co: vstup.nazev }));
}

export async function stavAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const stav = String(formular.get("stav") ?? "") as StavZavodu;
  const nazev = String(formular.get("nazev") ?? "");

  const chyba = await prepniStav(serie, zavod, stav);
  redirect(kam(serie, chyba ? { chyba } : { stav: "prepnuto", co: nazev, nastav: stav }));
}

export async function publikaceAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const nazev = String(formular.get("nazev") ?? "");
  const publikovano = String(formular.get("publikovano") ?? "") === "ano";

  const chyba = await publikuj(serie, zavod, publikovano);

  redirect(
    kam(serie, chyba ? { chyba } : { stav: publikovano ? "venku" : "stazeno", co: nazev }),
  );
}
