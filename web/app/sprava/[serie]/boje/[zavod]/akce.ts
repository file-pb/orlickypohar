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
  zahodZaznam,
  type BarvaBoje,
  type DruhZnaceni,
  type TvarBoje,
  type ZdrojPolohy,
} from "@/lib/boje";
import {
  klonujTrat,
  nactiPrvky,
  nactiTrate,
  zalozDalsiTrat,
  posunTrat,
  priradTrat,
  smazPrvek,
  upravPrvek,
  vstupZPrvku,
  zalozPrvek,
  type Prvek,
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
 * Zahodí jeden záznam z historie bójí (Filip, 12. 10. 2026: *„Historie
 * bude mít možnost záznam smazat"*).
 *
 * <b>Vedle hromadného úklidu, ne místo něj.</b> Úklid bere všechno,
 * na čem nic nevisí; tohle je na jeden konkrétní překlep, který člověk
 * vidí před sebou.
 *
 * <b>Proč se tu nehlídá, že na záznamu nic nevisí:</b> ten rozsudek má
 * server a vrací ho větou. Druhá kopie pravidla v obrazovce by se nutně
 * rozešla — jako se rozešlo pravidlo o směru u cíle.
 */
export async function zahodZaznamAkce(formular: FormData) {
  const { serie, zavod, kam } = zaklad(formular);

  const boje = Number(formular.get("boje") ?? 0);
  if (!Number.isInteger(boje) || boje <= 0)
    redirect(kam({ chyba: "Který záznam se má zahodit?" }));

  const chyba = await zahodZaznam(serie, zavod, boje);
  redirect(kam(chyba ? { chyba } : { uklizeno: "1" }));
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
/**
 * Úprava prvku z jeho detailu v seznamu.
 *
 * <b>Co se smí měnit, je jen předpis</b> — jak to jet, kterým bokem,
 * kterým směrem se startuje. Typ a bóje se berou ze serveru, ne
 * z formuláře: fyzika prvku je daná tím, jak se postavil, a skrytá
 * políčka by z toho udělala něco, co jde podstrčit.
 */
export async function upravPrvekAkce(formular: FormData) {
  const { serie, zavod, kam } = zaklad(formular);
  const id = Number(formular.get("prvek") ?? 0);
  if (!Number.isInteger(id) || id <= 0) redirect(kam({ chyba: "Který prvek se má upravit?" }));

  const prvek = (await nactiPrvky(serie, zavod)).find((p) => p.id === id);
  if (!prvek) redirect(kam({ chyba: "Ten prvek v trati není. Někdo ho mezitím smazal?" }));

  const text = (jmeno: string) => String(formular.get(jmeno) ?? "").trim() || null;
  const chyba = await upravPrvek(serie, zavod, id, {
    ...vstupZPrvku(prvek),
    strana: text("strana") as PrvekVstup["strana"],
    poznamka: text("poznamka"),
    smer: text("smer") as PrvekVstup["smer"],
    druhStartu: text("druhStartu") as PrvekVstup["druhStartu"],
  });

  redirect(kam(chyba ? { chyba } : { stav: "prvekUpraven", otevrit: String(id) }));
}

/**
 * „Projet to znovu jinak" (Filip, 11. 10. 2026): *„fyzika toho prvku už
 * definována byla"*, takže opakovaný průjezd je <b>nový prvek nad týmiž
 * značkami</b>, ne nové pole u starého. Zakládá se bez poznámky — právě
 * ta se u něj dopisuje, protože jiný je jen způsob jetí.
 */
/**
 * Odebere prvek z trati — a značky, které tím zůstanou nikomu, i z vody.
 *
 * <b>Jedno tlačítko místo dvou</b> (Filip, 15. 10. 2026: *„Sebrat z vody
 * a smazat prvek je stejné pro uživatele… uživatel by ten rozdíl
 * nechápal"*). Dřív tu stály vedle sebe „Smazat prvek" a „Sebrat z vody"
 * a nutily stavitele rozmýšlet rozdíl mezi zápisem o trati a zápisem
 * o bóji — rozdíl, který na vodě nikdo neřeší: vytáhl jsem to, tak to
 * tam není.
 *
 * <b>Dvakrát projížděná značka se z vody nebere</b> (Filip tamtéž:
 * *„pokud je prvek dvakrát projížděný, tak smaž jenom ten průjezd, ale
 * neber ho z vody"*). Bóje stojí dál, protože ji používá jiný prvek —
 * sebrat ji by tiše rozbilo trať na jiném místě, než kam člověk klikl.
 *
 * <b>Pořadí je schválně: napřed prvek, potom bóje.</b> Když sebrání
 * selže, zůstane bóje ve vodě bez prvku — a na to obrazovka upozorňuje
 * („stojí mimo trať"), takže se to dá spravit. Opačné pořadí by při chybě
 * nechalo prvek ukazovat na sebranou bóji, a to nehlásí nikdo.
 */
export async function odeberPrvekAkce(formular: FormData) {
  const { serie, zavod, kam } = zaklad(formular);

  const id = Number(formular.get("prvek") ?? 0);
  if (!Number.isInteger(id) || id <= 0) redirect(kam({ chyba: "Který prvek se má odebrat?" }));

  const prvky = await nactiPrvky(serie, zavod);
  const prvek = prvky.find((p) => p.id === id);
  if (!prvek) redirect(kam({ chyba: "Ten prvek v trati není. Někdo ho mezitím smazal?" }));

  // Značky, které po smazání nezůstanou v žádném jiném prvku.
  const jinde = new Set(
    prvky.filter((p) => p.id !== id).flatMap((p) => [p.a.id, ...(p.b ? [p.b.id] : [])]),
  );
  const kSebrani = [prvek.a.id, ...(prvek.b && prvek.b.id !== prvek.a.id ? [prvek.b.id] : [])]
    .filter((b) => !jinde.has(b));

  const chyba = await smazPrvek(serie, zavod, id);
  if (chyba) redirect(kam({ chyba }));

  for (const boje of kSebrani) {
    const potiz = await seber(serie, zavod, boje);
    if (potiz) redirect(kam({ chyba: `Prvek je pryč, ale bóje zůstala ve vodě: ${potiz}` }));
  }

  redirect(kam({ stav: kSebrani.length > 0 ? "prvekPryc" : "prujezdPryc" }));
}

export async function zopakujPrvekAkce(formular: FormData) {
  const { serie, zavod, kam } = zaklad(formular);
  const id = Number(formular.get("prvek") ?? 0);
  if (!Number.isInteger(id) || id <= 0) redirect(kam({ chyba: "Který prvek se má projet znovu?" }));

  const prvky = await nactiPrvky(serie, zavod);
  const prvek = prvky.find((p) => p.id === id);
  if (!prvek) redirect(kam({ chyba: "Ten prvek v trati není. Někdo ho mezitím smazal?" }));

  const chyba = await zalozPrvek(serie, zavod, {
    ...vstupZPrvku(prvek),
    poradi: prvky.length + 1,
    poznamka: null,
  });

  // `posledni` místo čísla: API vrací při zakládání jen chybu, ne id.
  redirect(kam(chyba ? { chyba } : { stav: "prvekZnovu", otevrit: "posledni" }));
}

/**
 * Posun prvku v pořadí.
 *
 * <b>Přečísluje se celá trať</b>, ne jen prohodí dvě čísla. Pořadí se smí
 * opakovat (trať, která jede tutéž bóji dvakrát, to potřebuje) a mezi
 * stejnými čísly rozhoduje id — prohození hodnot by u takové dvojice
 * neudělalo nic a tlačítko by vypadalo rozbitě.
 */
export async function presunPrvekAkce(formular: FormData) {
  const { serie, zavod, kam } = zaklad(formular);
  const id = Number(formular.get("prvek") ?? 0);
  const nahoru = String(formular.get("smer") ?? "") === "nahoru";
  if (!Number.isInteger(id) || id <= 0) redirect(kam({ chyba: "Který prvek se má posunout?" }));

  const prvky = await nactiPrvky(serie, zavod);
  const kde = prvky.findIndex((p) => p.id === id);
  if (kde < 0) redirect(kam({ chyba: "Ten prvek v trati není. Někdo ho mezitím smazal?" }));

  const kam2 = nahoru ? kde - 1 : kde + 1;
  if (kam2 < 0 || kam2 >= prvky.length) redirect(kam({ stav: "prvekUpraven", otevrit: String(id) }));

  const poradi: Prvek[] = [...prvky];
  [poradi[kde], poradi[kam2]] = [poradi[kam2], poradi[kde]];

  for (const [i, p] of poradi.entries()) {
    if (p.poradi === i + 1) continue;
    const chyba = await upravPrvek(serie, zavod, p.id, { ...vstupZPrvku(p), poradi: i + 1 });
    if (chyba) redirect(kam({ chyba }));
  }

  redirect(kam({ stav: "prvekPresunut", otevrit: String(id) }));
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
/**
 * Založí další, prázdnou trať regaty — plus na konci záložek.
 *
 * <b>Po založení se na ni rovnou přepne.</b> Kdo kliknul na plus, chce
 * stavět; nechat ho na staré trati by znamenalo, že první pípnutí půjde
 * do špatné.
 */
export async function dalsiTratAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const kam = (zprava: Record<string, string>) =>
    `/sprava/${encodeURIComponent(serie)}/boje/${encodeURIComponent(zavod)}?${new URLSearchParams(zprava)}`;

  // <b>Rovnou k rozjížďce, kterou si vybral</b> (Filip, 15. 10. 2026:
  // *„plusko jen nabídne výběr z rozjížděk"*). Trať bez vazby by se
  // musela přiřazovat zvlášť a právě to druhé místo bylo zmatečné.
  const rozjizdka = Number(formular.get("rozjizdka") ?? 0);
  if (!Number.isInteger(rozjizdka) || rozjizdka <= 0)
    redirect(kam({ chyba: "Vyber, pro kterou rozjížďku se trať staví." }));

  const chyba = await zalozDalsiTrat(serie, zavod);
  if (chyba) redirect(kam({ chyba }));

  // Která to je, řekne až nové načtení: API vrací tutéž prázdnou trať,
  // když už jedna je, takže se na ni dá spolehnout i při dvojím kliknutí.
  const trate = await nactiTrate(serie, zavod);
  const prazdna = trate.find((t) => t.cisloRozjizdky === null && t.pocetPrvku === 0);
  if (!prazdna) redirect(kam({ stav: "novaTrat" }));

  const chybaPrirazeni = await priradTrat(serie, zavod, prazdna.id, rozjizdka);
  redirect(
    chybaPrirazeni
      ? kam({ trat: String(prazdna.id), chyba: chybaPrirazeni })
      : kam({ trat: String(prazdna.id), stav: "novaTrat" }),
  );
}

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

