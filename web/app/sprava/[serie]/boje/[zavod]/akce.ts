"use server";

import { redirect } from "next/navigation";
import {
  FOTKA_NEJVIC_MB,
  NEJHORSI_PRESNOST_M,
  nahrajFotku,
  odeberFotku,
  pipni,
  seber,
  type ZdrojPolohy,
} from "@/lib/boje";
import { prectiISeZkratkou } from "@/lib/zkratky";

/**
 * Serverové akce obrazovky bójí.
 *
 * <b>Pípnutí volá javascript</b>, protože polohu umí dát jen prohlížeč —
 * stejně jako u cílové obrazovky. Token zůstává na serveru: akce si ho
 * vezme ze sezení a do prohlížeče se nedostane.
 *
 * <b>Sebrání je obyčejný formulář.</b> Nepotřebuje polohu, takže nemá
 * důvod potřebovat javascript; funguje i na telefonu, kde zlobí.
 *
 * Vstup z prohlížeče je **neověřený**, i když ho tatáž obrazovka
 * vyrobila: akce je POST na stránku a dá se poslat i mimo UI. Hranice
 * jsou proto i tady, ne jen v API.
 */

/** Pípnutí z klientské části. Vrací „povedlo se, nebo proč ne". */
export async function pipniAkce(
  serie: string,
  zavod: string,
  vstup: {
    nazev: string;
    poradi: number;
    sirka: number;
    delka: number;
    presnostM: number | null;
    nahrazujeId: number | null;
    zdroj?: ZdrojPolohy;
  },
): Promise<{ chyba: string | null }> {
  const nazev = vstup.nazev.trim();
  if (!nazev) return { chyba: "Napiš, čím ta bóje je — třeba „bóje 1“." };

  if (!Number.isFinite(vstup.sirka) || !Number.isFinite(vstup.delka))
    return { chyba: "Poloha z telefonu nepřišla celá. Pípni prosím znovu." };

  const zdroj: ZdrojPolohy = vstup.zdroj ?? "Telefon";
  // Přesnost měří jen telefon. API ji od jiného zdroje odmítne, takže se
  // u polohy z mapy neposílá vůbec — ne aby se „pro jistotu" dopsala nula.
  const presnostM = zdroj === "Telefon" ? vstup.presnostM : null;

  // Přesnost hlídá i API; tady se chytá dřív, aby se zbytečně neposílala.
  if (presnostM !== null && presnostM > NEJHORSI_PRESNOST_M)
    return {
      chyba: `Poloha je přesná jen na ${Math.round(presnostM)} m. Počkej na lepší signál a pípni znovu.`,
    };

  const poradi = Number.isInteger(vstup.poradi) && vstup.poradi > 0 ? vstup.poradi : 0;
  const nahrazujeId =
    Number.isInteger(vstup.nahrazujeId) && (vstup.nahrazujeId ?? 0) > 0
      ? vstup.nahrazujeId
      : null;

  const chyba = await pipni(serie, zavod, {
    nazev,
    poradi,
    sirka: vstup.sirka,
    delka: vstup.delka,
    presnostM,
    nahrazujeId,
    zdroj,
  });

  return { chyba };
}

/**
 * Přečte polohu z toho, co člověk vložil — souřadnic, odkazu do mapy nebo
 * textu z QR kódu. <b>Je to serverová akce, protože zkrácený odkaz musí
 * rozbalit server</b>; prohlížeč na cizí doménu nedosáhne.
 *
 * Nic to nezapisuje. Obrazovka napřed ukáže, čemu rozumí, a teprve pak se
 * staví bóje — špatně přečtená souřadnice posune celou trať a bez téhle
 * mezizastávky by se to poznalo až na vodě.
 */
export async function prectiAkce(vstup: string) {
  // Dlouhý vstup není odkaz ani souřadnice, je to vložená stránka.
  const text = String(vstup ?? "").slice(0, 2000);
  return prectiISeZkratkou(text);
}

/**
 * Fotka k bóji. Obyčejný formulář, žádný javascript — fotit umí
 * `<input type="file" capture>` sám a u stolu se stejně vybírá ze souborů.
 */
export async function nahrajFotkuAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const kam = (zprava: Record<string, string>) =>
    `/sprava/${encodeURIComponent(serie)}/boje/${encodeURIComponent(zavod)}?${new URLSearchParams(zprava)}`;

  const boje = Number(formular.get("boje") ?? 0);
  if (!Number.isInteger(boje) || boje <= 0) redirect(kam({ chyba: "Ke které bóji ta fotka patří?" }));

  const soubor = formular.get("soubor");
  if (!(soubor instanceof File) || soubor.size === 0)
    redirect(kam({ chyba: "Vyber soubor s fotkou." }));
  if (soubor.size > FOTKA_NEJVIC_MB * 1024 * 1024)
    redirect(kam({ chyba: `Fotka může mít nejvýš ${FOTKA_NEJVIC_MB} MB.` }));

  const chyba = await nahrajFotku(serie, zavod, boje, soubor);
  redirect(kam(chyba ? { chyba } : { stav: "fotka" }));
}

/** Odebrání jedné fotky. Smaže i soubory v úložišti. */
export async function odeberFotkuAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const kam = (zprava: Record<string, string>) =>
    `/sprava/${encodeURIComponent(serie)}/boje/${encodeURIComponent(zavod)}?${new URLSearchParams(zprava)}`;

  const boje = Number(formular.get("boje") ?? 0);
  const fotka = String(formular.get("fotka") ?? "");
  if (!Number.isInteger(boje) || boje <= 0 || !fotka)
    redirect(kam({ chyba: "Která fotka se má odebrat?" }));

  const chyba = await odeberFotku(serie, zavod, boje, fotka);
  redirect(kam(chyba ? { chyba } : { stav: "fotkaPryc" }));
}

/**
 * Sebrání bóje z vody.
 *
 * <b>Kam se vrací, skládá akce sama</b> ze série a zastávky, ne z pole
 * formuláře — adresa z formuláře by šla podvrhnout. Id bóje z formuláře
 * jde, protože API ho stejně hledá jen u téhle regaty.
 */
export async function seberAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const kam = (zprava: Record<string, string>) =>
    `/sprava/${encodeURIComponent(serie)}/boje/${encodeURIComponent(zavod)}?${new URLSearchParams(zprava)}`;

  const boje = Number(formular.get("boje") ?? 0);
  if (!Number.isInteger(boje) || boje <= 0) redirect(kam({ chyba: "Která bóje se má sebrat?" }));

  const chyba = await seber(serie, zavod, boje);
  redirect(kam(chyba ? { chyba } : { stav: "sebrano" }));
}
