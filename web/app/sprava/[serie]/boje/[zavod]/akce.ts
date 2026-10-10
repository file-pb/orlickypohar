"use server";

import { redirect } from "next/navigation";
import {
  FOTKA_NEJVIC_MB,
  NEJHORSI_PRESNOST_M,
  nahrajFotku,
  odeberFotku,
  pipni,
  seber,
  uklidHistorii,
  type BarvaBoje,
  type DruhZnaceni,
  type TvarBoje,
  type ZdrojPolohy,
} from "@/lib/boje";
import {
  klonujTrat,
  posunTrat,
  priradTrat,
  smazPrvek,
  zalozPrvek,
  type PrvekVstup,
  type StavTrati,
} from "@/lib/trat";
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
    barva?: BarvaBoje;
    tvar?: TvarBoje;
    znaceni?: DruhZnaceni;
    popis?: string;
  },
): Promise<{ chyba: string | null; id: number | null }> {
  const nazev = vstup.nazev.trim();
  if (!nazev) return { chyba: "Napiš, čím ta bóje je — třeba „bóje 1“.", id: null };

  if (!Number.isFinite(vstup.sirka) || !Number.isFinite(vstup.delka))
    return { chyba: "Poloha z telefonu nepřišla celá. Pípni prosím znovu.", id: null };

  const zdroj: ZdrojPolohy = vstup.zdroj ?? "Telefon";
  // Přesnost měří jen telefon. API ji od jiného zdroje odmítne, takže se
  // u polohy z mapy neposílá vůbec — ne aby se „pro jistotu" dopsala nula.
  const presnostM = zdroj === "Telefon" ? vstup.presnostM : null;

  // Přesnost hlídá i API; tady se chytá dřív, aby se zbytečně neposílala.
  if (presnostM !== null && presnostM > NEJHORSI_PRESNOST_M)
    return {
      chyba: `Poloha je přesná jen na ${Math.round(presnostM)} m. Počkej na lepší signál a pípni znovu.`,
      id: null,
    };

  const poradi = Number.isInteger(vstup.poradi) && vstup.poradi > 0 ? vstup.poradi : 0;
  const nahrazujeId =
    Number.isInteger(vstup.nahrazujeId) && (vstup.nahrazujeId ?? 0) > 0
      ? vstup.nahrazujeId
      : null;

  const { chyba, boje } = await pipni(serie, zavod, {
    nazev,
    poradi,
    sirka: vstup.sirka,
    delka: vstup.delka,
    presnostM,
    nahrazujeId,
    zdroj,
    // Barva a tvar se sem dřív nepředávaly: typ je přijímal a `pipni` je
    // zahazoval, takže výběr ve formuláři nic nedělal. Chyba z 9. 10.
    // 2026; prošla proto, že se barvy ověřovaly přímo proti API.
    barva: vstup.barva,
    tvar: vstup.tvar,
    // A značení touž cestou. Kdyby se tu zapomnělo, předvolba z průvodce
    // by se tiše zahodila — přesně jako barva 9. 10. 2026.
    znaceni: vstup.znaceni,
    popis: vstup.popis?.trim() || undefined,
  });

  return { chyba, id: boje?.id ?? null };
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

/**
 * Fotka ke značce z průvodce. <b>Nepřesměrovává</b>, na rozdíl od
 * `nahrajFotkuAkce`: průvodce je klientská obrazovka a přesměrování by
 * uprostřed stavby prvku zahodilo rozdělanou práci.
 */
export async function fotkaKeZnacceAkce(
  serie: string,
  zavod: string,
  boje: number,
  soubor: File,
): Promise<{ chyba: string | null }> {
  if (!Number.isInteger(boje) || boje <= 0) return { chyba: "Ke které značce ta fotka patří?" };
  if (soubor.size === 0) return { chyba: "Fotka je prázdná." };
  if (soubor.size > FOTKA_NEJVIC_MB * 1024 * 1024)
    return { chyba: `Fotka může mít nejvýš ${FOTKA_NEJVIC_MB} MB.` };

  return { chyba: await nahrajFotku(serie, zavod, boje, soubor) };
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

/**
 * Posun stavu trati. Obyčejný formulář, žádný javascript: tyhle kroky
 * nepotřebují polohu, a rozhodčí je může dělat z čehokoliv, co má po ruce.
 *
 * <b>Krok přichází z formuláře, tak se ověřuje.</b> Vstup je neověřený, i
 * když ho vyrobila tatáž obrazovka — akce je POST na stránku.
 */
export async function stavTratiAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const kam = (zprava: Record<string, string>) =>
    `/sprava/${encodeURIComponent(serie)}/boje/${encodeURIComponent(zavod)}?${new URLSearchParams(zprava)}`;

  const krok = String(formular.get("krok") ?? "");
  if (krok !== "hotovo" && krok !== "prijeti" && krok !== "vraceni" && krok !== "prestavba")
    redirect(kam({ chyba: "Neznámý krok se stavem trati." }));

  const duvod = String(formular.get("duvod") ?? "").trim();
  const chyba = await posunTrat(serie, zavod, krok, duvod || undefined);

  redirect(kam(chyba ? { chyba } : { stav: `trat-${krok}` }));
}

/**
 * Založení prvku trati. Obyčejný formulář: prvek nepotřebuje polohu
 * z prohlížeče, skládá se z bójí, které už stojí.
 */
export async function prvekAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const kam = (zprava: Record<string, string>) =>
    `/sprava/${encodeURIComponent(serie)}/boje/${encodeURIComponent(zavod)}?${new URLSearchParams(zprava)}`;

  const cislo = (jmeno: string) => {
    const text = String(formular.get(jmeno) ?? "").trim().replace(",", ".");
    if (!text) return null;
    const hodnota = Number(text);
    return Number.isFinite(hodnota) ? hodnota : null;
  };

  const typ = String(formular.get("typ") ?? "");
  const bojeA = Number(formular.get("bojeA") ?? 0);
  if (!Number.isInteger(bojeA) || bojeA <= 0)
    redirect(kam({ chyba: "Vyber první konec prvku." }));

  // Druhý bod je značka, ne souřadnice: molo i plavidlo komise jsou od
  // #209 plnohodnotné značky, takže se vybírají ze seznamu. Pole
  // `konecB*` tím ztratila posledního pisatele a zruší se dalším krokem.
  const chyba = await zalozPrvek(serie, zavod, {
    typ: typ as PrvekVstup["typ"],
    poradi: Number(formular.get("poradi") ?? 0),
    bojeAId: bojeA,
    bojeBId: Number(formular.get("bojeB") ?? 0) || null,
    strana: (String(formular.get("strana") ?? "") || null) as PrvekVstup["strana"],
    poznamka: String(formular.get("poznamka") ?? "").trim() || null,
    smer: (String(formular.get("smer") ?? "") || null) as PrvekVstup["smer"],
    druhStartu: (String(formular.get("druhStartu") ?? "") || null) as PrvekVstup["druhStartu"],
  });

  redirect(kam(chyba ? { chyba } : { stav: "prvek" }));
}

/** Smazání prvku. Prvek je rozhodnutí, ne měření — maže se doopravdy. */
export async function smazPrvekAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const kam = (zprava: Record<string, string>) =>
    `/sprava/${encodeURIComponent(serie)}/boje/${encodeURIComponent(zavod)}?${new URLSearchParams(zprava)}`;

  const prvek = Number(formular.get("prvek") ?? 0);
  if (!Number.isInteger(prvek) || prvek <= 0)
    redirect(kam({ chyba: "Který prvek se má smazat?" }));

  const chyba = await smazPrvek(serie, zavod, prvek);
  redirect(kam(chyba ? { chyba } : { stav: "prvekPryc" }));
}

/**
 * Úklid historie bójí (Filip, 10. 10. 2026: „vymaž tu historii bójí, ať
 * tam nestraší"). <b>Maže doopravdy</b>, takže se počet napíše zpátky do
 * hlášky — ať je vidět, co se stalo, a ne jen že se něco stalo.
 */
export async function uklidAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const kam = (zprava: Record<string, string>) =>
    `/sprava/${encodeURIComponent(serie)}/boje/${encodeURIComponent(zavod)}?${new URLSearchParams(zprava)}`;

  const vysledek = await uklidHistorii(serie, zavod);
  redirect(
    typeof vysledek === "string"
      ? kam({ chyba: vysledek })
      : kam({ uklizeno: String(vysledek) }),
  );
}

/** Přiřadí volnou trať rozjížďce. */
export async function priradTratAkce(formular: FormData) {
  const { serie, zavod, kam } = zaklad(formular);
  const trat = Number(formular.get("trat") ?? 0);
  const rozjizdka = Number(formular.get("rozjizdka") ?? 0);

  if (!Number.isInteger(rozjizdka) || rozjizdka <= 0)
    redirect(kam({ chyba: "Napiš číslo rozjížďky." }));

  const chyba = await priradTrat(serie, zavod, trat, rozjizdka);
  redirect(kam(chyba ? { chyba } : { stav: "trat-prirazena" }));
}

/**
 * Naklonuje trať pro další rozjížďku. Prázdné číslo znamená kopii „na
 * stůl" — rozjížďka se přiřadí potom.
 */
export async function klonujTratAkce(formular: FormData) {
  const { serie, zavod, kam } = zaklad(formular);
  const trat = Number(formular.get("trat") ?? 0);
  const cislo = Number(formular.get("rozjizdka") ?? 0);
  const stav = String(formular.get("stav") ?? "") || null;

  const chyba = await klonujTrat(
    serie,
    zavod,
    trat,
    cislo > 0 ? cislo : null,
    stav as StavTrati,
  );
  redirect(kam(chyba ? { chyba } : { stav: "trat-klon" }));
}

/** Společný začátek akcí obrazovky bójí: odkud a kam. */
function zaklad(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  return {
    serie,
    zavod,
    kam: (zprava: Record<string, string>) =>
      `/sprava/${encodeURIComponent(serie)}/boje/${encodeURIComponent(zavod)}?${new URLSearchParams(zprava)}`,
  };
}

/**
 * Založí prvek a vrátí chybu místo přesměrování.
 *
 * <b>Pro stavbu prvku na vodě</b> (Filip, 10. 10. 2026): průvodce pípne
 * body a hned z nich složí prvek, takže potřebuje odpověď, ne odskok na
 * jinou adresu. `prvekAkce` přesměrovává, protože ji volá formulář.
 */
export async function slozPrvekAkce(
  serie: string,
  zavod: string,
  vstup: PrvekVstup,
): Promise<{ chyba: string | null }> {
  return { chyba: await zalozPrvek(serie, zavod, vstup) };
}

