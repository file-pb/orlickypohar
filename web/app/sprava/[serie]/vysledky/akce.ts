"use server";

import { redirect } from "next/navigation";
import {
  prepniStav,
  pridejRozjizdku,
  publikuj,
  zaradDoPoharu,
  type StavVysledku,
} from "@/lib/vysledky";
import { klonujTrat, nactiTrate, odvazTrat, posunTrat, priradTrat, zalozDalsiTrat } from "@/lib/trat";

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

/**
 * Přiřadí rozjížďce postavenou trať.
 *
 * <b>Patří to sem, ne k bójím</b> (Filip, 15. 10. 2026: *„tady bych
 * umožnil rozjížďce možnost vybrat z postavených tratí, nebo se
 * prokliknout na editor nové trati"*). Rozjížďka vzniká pod výsledky,
 * takže i vazba na trať patří k ní; obrazovka stavby o ní jen říká.
 *
 * <b>Přiřadit, nebo naklonovat, rozhoduje server.</b> Volná trať se
 * přiřadí; trať, která už nějaké rozjížďce patří, se naklonuje —
 * odebrat ji té původní by přepsalo, podle čeho se jelo. Obrazovka to
 * nehádá, posílá jen id a číslo.
 */
export async function tratRozjizdceAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const cislo = Number(formular.get("cislo") ?? 0);
  const trat = Number(formular.get("trat") ?? 0);

  if (!Number.isInteger(cislo) || cislo <= 0 || !Number.isInteger(trat) || trat <= 0)
    redirect(kam(serie, zavod, { chyba: "Vyber, která trať se pojede." }));

  const trate = await nactiTrate(serie, zavod);
  // Výpadek čtení není „taková trať tu není" — ta hláška by poslala
  // pořadatele hledat chybu v tom, co vybral.
  if (trate === null)
    redirect(kam(serie, zavod, { chyba: "Seznam tratí se teď nepodařilo načíst. Zkus to prosím znovu." }));

  const vybrana = trate.find((t) => t.id === trat);
  if (!vybrana) redirect(kam(serie, zavod, { chyba: "Taková trať u téhle regaty není." }));

  // Klon začíná jako hotová: je to tvrzení stavitele, že stojí totéž co
  // minule. Přijmout ji smí jen rozhodčí, a to na obrazovce trati.
  const chyba = vybrana.jdePriradit
    ? await priradTrat(serie, zavod, trat, cislo)
    : await klonujTrat(serie, zavod, trat, cislo, "Hotovo");

  redirect(kam(serie, zavod, chyba ? { chyba } : { stav: "trat-prirazena" }));
}

/**
 * Odpojí trať od rozjížďky (Filip, 15. 10. 2026: *„take možnost ji
 * odepnout z rozjížďky… jakmile je rozjížďka odjetá, trať nepůjde
 * odepnout"*).
 *
 * <b>Odjetou hlídá server</b>, obrazovka ji jen nenabízí. Dvě místa,
 * která o témže rozhodují zvlášť, se dřív nebo později rozejdou.
 */
export async function odpojTratAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const trat = Number(formular.get("trat") ?? 0);
  const potvrzeno = String(formular.get("potvrzeno") ?? "") === "ano";
  if (!trat) redirect(kam(serie, zavod, { chyba: "Kterou trať odpojit?" }));

  const { chyba, potvrdit } = await odvazTrat(serie, zavod, trat, potvrzeno);
  if (!chyba) redirect(kam(serie, zavod, { stav: "trat-odpojena" }));

  // Server se ptá, ne odmítá: dřív to obrazovka hlásila jako chybu
  // a uživatel neměl jak odpovědět.
  redirect(kam(serie, zavod, potvrdit ? { potvrdit: String(trat), chyba } : { chyba }));
}

/**
 * Založí rozjížďce novou prázdnou trať a odejde ji stavět.
 *
 * <b>Založit a přiřadit v jednom</b>: trať bez vazby by se musela
 * přiřazovat zvlášť a právě ten krok navíc byl na přiřazování
 * matoucí.
 */
export async function novaTratAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const cislo = Number(formular.get("cislo") ?? 0);
  if (!cislo) redirect(kam(serie, zavod, { chyba: "Pro kterou rozjížďku?" }));

  const chyba = await zalozDalsiTrat(serie, zavod);
  if (chyba) redirect(kam(serie, zavod, { chyba }));

  // `null` je výpadek čtení, ne „žádné tratě" — rozlišuje to `nactiTrate`.
  const trate = await nactiTrate(serie, zavod);
  if (!trate) redirect(kam(serie, zavod, { chyba: "Tratě se teď nedaří načíst. Zkus to za chvíli." }));

  const prazdna = trate.find((t) => t.cisloRozjizdky === null && t.pocetPrvku === 0);
  if (!prazdna) redirect(kam(serie, zavod, { chyba: "Prázdná trať se nenašla." }));

  const potiz = await priradTrat(serie, zavod, prazdna.id, cislo);
  if (potiz) redirect(kam(serie, zavod, { chyba: potiz }));

  // Rovnou na stavbu: kdo zakládá trať, jde ji postavit.
  redirect(`/sprava/${encodeURIComponent(serie)}/boje/${encodeURIComponent(zavod)}?trat=${prazdna.id}`);
}

/**
 * Rozhodčí přijme trať rozjížďky, nebo ji vrátí stavitelům — <b>rovnou
 * od rozjížďky</b> (Filip, 15. 10. 2026: *„je-li vybrána a připojena,
 * tak musí umožnit její schválení nebo zadání k přepracování"*).
 * Chodit kvůli tomu na obrazovku bójí znamenalo odejít od zápisu.
 */
export async function stavTratiURozjizdkyAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const trat = Number(formular.get("trat") ?? 0);
  const krok = String(formular.get("krok") ?? "");
  const duvod = String(formular.get("duvod") ?? "").trim();

  if (!trat) redirect(kam(serie, zavod, { chyba: "Které trati?" }));
  if (krok !== "prijeti" && krok !== "vraceni")
    redirect(kam(serie, zavod, { chyba: "Neznámý krok se stavem trati." }));

  // Novou trať tudy založit nejde: odsud se jen přijímá a vrací.
  const { chyba } = await posunTrat(serie, zavod, krok, duvod || undefined, trat);
  redirect(kam(serie, zavod, chyba ? { chyba } : { stav: `trat-${krok}` }));
}
