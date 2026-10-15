import type { VerejnaTrat, ZavodDetail } from "@/lib/api";
import { naMapu, type PrvekNaMape } from "@/app/mapka-trati";

/**
 * Snímek regaty pro tabuli v hospodě.
 *
 * <b>Jedna projekce pro stránku i pro obnovovací cestu.</b> Kdyby si je
 * psaly zvlášť, první načtení a obnovení by se po čase rozešly a nikdo
 * by nepoznal proč.
 */
export type Snimek = {
  /** Čas zdroje. Stáří si spočítá prohlížeč — viz `tabule/data/route.ts`. */
  kdy: string;
  nazev: string;
  stav: ZavodDetail["stav"];
  vysledkySkryte: boolean;
  rozjizdky: {
    cislo: number;
    stav: ZavodDetail["rozjizdky"][number]["stav"];
    startV: string | null;
    doSerie: boolean;
    poradi: { lod: string; kategorie: string; misto: number | null; kod: string | null }[];
  }[];
  lode: { lod: string; kategorie: string; kormidelnik: string | null; potvrzena: boolean }[];
  /**
   * Pořadí rozdělené na panely karuselu (Filip, 15. 10. 2026: *„rozjeď ty
   * třídy lodí v karuselech, je to podle toho, kolik tříd se jede a když
   * se počítá i celkové pořadí"*).
   *
   * <b>Co je panel, rozhoduje `vyhodnoceni`, ne počet tříd v datech.</b>
   * Celkové pořadí API spočítá vždycky, i když se jede jen po třídách —
   * kdyby tabule brala za vodítko jeho přítomnost, ukazovala by pořadí,
   * které se v tomhle závodě nevyhlašuje.
   */
  tabule: {
    kategorie: string;
    lode: { lod: string; body: number; misto: number }[];
    /**
     * Kolik lodí se do panelu nevešlo. Tabule je plocha na dálku, takže
     * <b>deset řádků je strop</b> — ale divák má vědět, že tabulka
     * pokračuje. Bez toho vypadalo pole dvanácti lodí jako pole deseti
     * (průchod scénáři Izolepy, 15. 10. 2026).
     */
    dalsich: number;
  }[];
  /** Atributy závodu do grafiky nad obsahem. */
  zavod: {
    typ: string | null;
    poradatel: string | null;
    datum: string;
    datumKonce: string | null;
    pocetSkrtu: number;
    koeficientDoSerie: number;
    /** Kolik prvků má trať na řadě. `null`, když žádná není. */
    prvkyTrati: number | null;
  };
  /**
   * Trať, podle které se pluje. <b>Kvůli alertu o schválení</b> (Filip,
   * 15. 10. 2026) — a taky proto, že „čeká se na trať" je na tabuli
   * zpráva sama o sobě: lodě jsou na vodě a nikdo neví proč.
   *
   * `null`, dokud regata přijatou trať nemá. Bere se ta od rozjížďky,
   * která je na řadě (API, `NaRadeAsync`), takže se alert ohlásí o té
   * trati, kterou diváci zrovna sledují.
   */
  trat: {
    /** Kdy ji rozhodčí přijal. Změna = právě schválil. */
    prijatoV: string | null;
    /** Stojí se a přestavuje. */
    prestavba: boolean;
    cisloRozjizdky: number | null;
  } | null;
  /**
   * Prvky trati na mapku (Filip, 15. 10. 2026: *„fajn by bylo tam dát
   * mapku trasy menší"*). Prázdné, když žádná trať není — mapa se pak
   * nekreslí vůbec, místo prázdného rámečku.
   */
  mapa: PrvekNaMape[];
};

/** Kolik řádků se na telku vejde, aniž by se muselo rolovat. */
const NEJVIC = 10;

export function snimekZavodu(
  detail: ZavodDetail,
  /** Veřejná trať. Nepovinná: výpadek jejího čtení nesmí shodit celý snímek. */
  trat?: VerejnaTrat | null,
): Snimek {
  return {
    trat: trat
      ? {
          prijatoV: trat.prijatoV,
          prestavba: trat.prestavba,
          cisloRozjizdky: trat.cisloRozjizdky,
        }
      : null,
    kdy: new Date().toISOString(),
    nazev: detail.nazev,
    stav: detail.stav,
    // Skryté výsledky se nevydávají ani sem. Tabule je veřejná plocha,
    // ne obcházka workflow.
    vysledkySkryte: detail.vysledkySkryte,
    rozjizdky: detail.rozjizdky.map((r) => ({
      cislo: r.cislo,
      stav: r.stav,
      startV: r.startV,
      doSerie: r.doSerie,
      // Bez ořezu: desátým místem dojezdy nekončí a utnout je tady by
      // znamenalo, že o pozdějších lodích se nedozví ani alert, ani
      // widget „právě dojeli".
      poradi: [...r.vysledky]
        .sort((a, b) => (a.poradiVCili ?? 999) - (b.poradiVCili ?? 999))
        .map((v) => ({
          lod: v.lod,
          kategorie: v.kategorie,
          misto: v.poradiVCili ?? null,
          kod: v.kod ?? null,
        })),
    })),
    lode: detail.lode.map((u) => ({
      lod: u.lod,
      kategorie: u.kategorie,
      kormidelnik: u.kormidelnik,
      potvrzena: u.potvrzena,
    })),
    tabule: panely(detail),
    zavod: {
      typ: detail.typ,
      poradatel: detail.poradatel,
      datum: detail.datum,
      datumKonce: detail.datumKonce,
      pocetSkrtu: detail.pocetSkrtu,
      koeficientDoSerie: detail.koeficientDoSerie,
      prvkyTrati: trat ? trat.prvky.length : null,
    },
    mapa: trat ? trat.prvky.map(naMapu) : [],
  };
}

/** Pseudo-třída pro pořadí celého pole. Totéž jméno jako `app/tridy.tsx`. */
const CELKEM = "Celkem";

/**
 * Panely karuselu. Třídy v pořadí, v jakém je posílá API — abecedně by
 * Nad7m předběhlo Race bez důvodu, a to pořadí si drží série.
 */
function panely(detail: ZavodDetail): Snimek["tabule"] {
  const radek = (p: { lod: string; body: number }, i: number) => ({
    lod: p.lod,
    body: p.body,
    misto: i + 1,
  });

  const tridy: Snimek["tabule"] = [];
  if (detail.vyhodnoceni !== "CelePole")
    for (const p of detail.poradi) {
      let panel = tridy.find((t) => t.kategorie === p.kategorie);
      if (!panel) tridy.push((panel = { kategorie: p.kategorie, lode: [], dalsich: 0 }));
      if (panel.lode.length < NEJVIC) panel.lode.push(radek(p, panel.lode.length));
      else panel.dalsich++;
    }

  if (detail.vyhodnoceni !== "PoKategoriich") {
    const celkem = detail.poradiCelkem ?? [];
    tridy.push({
      kategorie: CELKEM,
      lode: celkem.slice(0, NEJVIC).map(radek),
      dalsich: Math.max(celkem.length - NEJVIC, 0),
    });
  }

  // Prázdný panel není co ukazovat; jeden prázdný ale zůstane, aby tabule
  // uměla říct „zatím se nejelo" místo prázdného místa. <b>Bez něj zmizel
  // celý prostřední sloupec</b> a obrazovka vypadala rozbitě: závod před
  // prvním startem nemá v pořadí nikoho, takže panelů bylo nula.
  const neprazdne = tridy.filter((t) => t.lode.length > 0);
  if (neprazdne.length > 0) return neprazdne;
  return tridy.length > 0 ? tridy.slice(0, 1) : [{ kategorie: "Pořadí", lode: [], dalsich: 0 }];
}
