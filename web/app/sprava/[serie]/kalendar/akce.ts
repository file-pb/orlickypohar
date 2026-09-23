"use server";

import { redirect } from "next/navigation";
import { prepniStav, publikuj, uloz, zaloz, type StavZavodu } from "@/lib/kalendar";
import { publikujRocnik } from "@/lib/rocnik";

/**
 * Zápisy z obrazovky kalendáře. Serverové akce, ne javascript v prohlížeči:
 * formulář odešle prohlížeč sám a token přitom nikam neputuje.
 *
 * Po zápisu se přesměrovává — vzor „POST, pak přesměruj". Bez něj by
 * obnovení stránky poslalo tentýž formulář znovu a regata by se založila
 * podruhé.
 *
 * <b>Přesměrování drží tab.</b> Kdo spravuje komunitní akce, nemá se po
 * každém kliknutí ocitnout zpátky mezi koly poháru — formuláře proto nesou
 * pole `zpet`.
 */

const kam = (serie: string, zprava: Record<string, string | undefined>) => {
  const dotaz = new URLSearchParams();
  for (const [klic, hodnota] of Object.entries(zprava)) if (hodnota) dotaz.set(klic, hodnota);
  const konec = dotaz.size ? `?${dotaz}` : "";
  return `/sprava/${encodeURIComponent(serie)}/kalendar${konec}`;
};

/** Tab, na který se po zápisu vrací: `akce`, nebo nic (pohár). */
const tab = (formular: FormData) =>
  String(formular.get("zpet") ?? "") === "akce" ? "akce" : undefined;

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
    // Druh platí jen při založení; úprava ho v API nemění.
    druh: tab(formular) === "akce" ? ("Akce" as const) : ("Pohar" as const),
  };
}

export async function zalozAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const druh = tab(formular);
  const vstup = vstupZFormulare(formular);

  if (!vstup.nazev) redirect(kam(serie, { chyba: "Vyplň název.", druh }));
  if (!vstup.datum) redirect(kam(serie, { chyba: "Vyplň termín.", druh }));

  const chyba = await zaloz(serie, vstup);
  redirect(kam(serie, chyba ? { chyba, druh } : { stav: "zalozeno", co: vstup.nazev, druh }));
}

export async function ulozAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const druh = tab(formular);
  const vstup = vstupZFormulare(formular);

  if (!vstup.datum) redirect(kam(serie, { chyba: "Vyplň termín.", druh }));

  const chyba = await uloz(serie, zavod, vstup);
  redirect(kam(serie, chyba ? { chyba, druh } : { stav: "ulozeno", co: vstup.nazev, druh }));
}

export async function stavAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const stav = String(formular.get("stav") ?? "") as StavZavodu;
  const nazev = String(formular.get("nazev") ?? "");
  const druh = tab(formular);

  const chyba = await prepniStav(serie, zavod, stav);
  redirect(kam(serie, chyba ? { chyba, druh } : { stav: "prepnuto", co: nazev, nastav: stav, druh }));
}

export async function publikaceAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const nazev = String(formular.get("nazev") ?? "");
  const publikovano = String(formular.get("publikovano") ?? "") === "ano";
  const druh = tab(formular);

  const chyba = await publikuj(serie, zavod, publikovano);

  redirect(
    kam(serie, chyba ? { chyba, druh } : { stav: publikovano ? "venku" : "stazeno", co: nazev, druh }),
  );
}

/**
 * Publikace celého ročníku. Nepublikovaný ročník veřejné čtení nevydává
 * vůbec — ani jeho regaty a výsledky — takže je to jedno tlačítko
 * s velkým dosahem a stránka u něj říká, co udělá.
 */
export async function publikaceRocnikuAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const publikovano = String(formular.get("publikovano") ?? "") === "ano";

  const chyba = await publikujRocnik(serie, publikovano);

  redirect(
    kam(serie, chyba ? { chyba } : { stav: publikovano ? "rocnikVenku" : "rocnikSkryty" }),
  );
}
