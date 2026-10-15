import type { VerejnaTrat, ZavodDetail } from "@/lib/api";

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
  poradi: { lod: string; kategorie: string; body: number; misto: number }[];
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
      poradi: [...r.vysledky]
        .sort((a, b) => (a.poradiVCili ?? 999) - (b.poradiVCili ?? 999))
        .slice(0, NEJVIC)
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
    poradi: detail.poradi.slice(0, NEJVIC).map((p, i) => ({
      lod: p.lod,
      kategorie: p.kategorie,
      body: p.body,
      misto: i + 1,
    })),
  };
}
