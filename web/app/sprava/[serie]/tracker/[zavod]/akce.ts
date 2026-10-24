"use server";

import { redirect } from "next/navigation";
import {
  odeberKlicVRegate,
  prepniSledovaniVRegate,
  procNejde,
  rozprava,
  ulozNastaveni,
  uzavri,
  type CoVidiPosadky,
} from "@/lib/tracker";

/**
 * Zápisy z obrazovky trackeru. Serverové akce, ne javascript v prohlížeči:
 * formulář odešle prohlížeč sám a token přitom nikam neputuje.
 *
 * Po zápisu se přesměrovává — vzor „POST, pak přesměruj". Bez něj by
 * obnovení stránky poslalo tentýž zásah znovu, a u rozpravy to zrovna
 * není nevinné.
 */

const kam = (serie: string, zavod: string, zprava: Record<string, string | undefined>) => {
  const dotaz = new URLSearchParams();
  for (const [klic, hodnota] of Object.entries(zprava)) if (hodnota) dotaz.set(klic, hodnota);
  const konec = dotaz.size ? `?${dotaz}` : "";

  return `/sprava/${encodeURIComponent(serie)}/tracker/${encodeURIComponent(zavod)}${konec}`;
};

/**
 * Rozpravou se otevře okno závodního dne.
 *
 * <b>Je to ten okamžik, od kterého telefony smějí zaznamenávat</b> — bez
 * okna server trasu nevezme a appka hlásí „čeká na rozpravu". Zároveň tím
 * zaklapne nastavení zobrazení, takže co nikdo nenastavil, platí dál.
 */
export async function rozpravaAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const zadane = String(formular.get("trvaniHodin") ?? "").trim();
  const trvani = zadane ? Number(zadane) : null;

  if (trvani !== null && (!Number.isFinite(trvani) || trvani <= 0))
    redirect(kam(serie, zavod, { chyba: "Trvání se zadává v hodinách, číslem." }));

  const { stav, chyba } = await rozprava(serie, zavod, trvani);

  redirect(
    kam(serie, zavod, stav === "ok" ? { stav: "otevreno" } : { chyba: procNejde(stav, chyba) }),
  );
}

/** Konec závodního dne. Mezi dny se nesleduje. */
export async function uzavriAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");

  const { stav, chyba } = await uzavri(serie, zavod);

  redirect(
    kam(serie, zavod, stav === "ok" ? { stav: "zavreno" } : { chyba: procNejde(stav, chyba) }),
  );
}

/**
 * Změna toho, co je vidět.
 *
 * <b>Po rozpravě jde jen zpřísnit</b> a zásah chce důvod — je to doklad ke
 * sporu *„vy jste nás viděli a my vás ne"*. Rozhodnutí drží API; tady se
 * jen posílá, co člověk vybral, a vrací se jeho odpověď.
 */
export async function nastaveniAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const duvod = String(formular.get("duvod") ?? "").trim() || null;

  const { stav, chyba } = await ulozNastaveni(serie, zavod, {
    coVidiPosadky: String(formular.get("coVidiPosadky") ?? "JenSebe") as CoVidiPosadky,
    zivyPrenosVen: formular.get("zivyPrenosVen") === "ano",
    jizdyPoRegateVerejne: formular.get("jizdyPoRegateVerejne") === "ano",
    duvod,
  });

  redirect(
    kam(serie, zavod, stav === "ok" ? { stav: "nastaveno" } : { chyba: procNejde(stav, chyba) }),
  );
}

/** Telefon, který zůstal v autě. Posádka v lodi zůstává. */
export async function sledovaniAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const klic = Number(formular.get("klic") ?? 0);
  const sleduje = formular.get("sleduje") === "ano";

  const { stav, chyba } = await prepniSledovaniVRegate(serie, zavod, klic, sleduje);

  redirect(
    kam(
      serie,
      zavod,
      stav === "ok" ? { stav: sleduje ? "pripnuto" : "odepnuto" } : { chyba: procNejde(stav, chyba) },
    ),
  );
}

/** Odebrání je nevratné — a co telefon nestihl poslat, už nepošle. */
export async function odeberKlicAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const klic = Number(formular.get("klic") ?? 0);

  const { stav, chyba } = await odeberKlicVRegate(serie, zavod, klic);

  redirect(
    kam(serie, zavod, stav === "ok" ? { stav: "odebrano" } : { chyba: procNejde(stav, chyba) }),
  );
}
