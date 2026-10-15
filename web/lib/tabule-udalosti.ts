import type { Snimek } from "@/lib/tabule";

/**
 * Co se na tabuli mezi dvěma snímky stalo.
 *
 * <b>Z porovnání, ne z API</b> (Filip, 15. 10. 2026: *„alerty, které vyjedou
 * při změnách — typicky starty a dojezdy"*). Tabule se obnovuje po dvaceti
 * vteřinách a drží poslední snímek, takže změnu pozná sama; posílat navíc
 * proud událostí by znamenalo druhou cestu k týmž datům a dvě místa, kde
 * se dá splést, co je nového.
 *
 * <b>Čistá funkce schválně.</b> Je to jediné místo, kde se dá splést, co
 * se považuje za novinku — a na televizi, kterou nikdo neobsluhuje, by
 * falešný alert visel do rána.
 */
export type DruhUdalosti = "start" | "dojezd" | "dokonceno" | "zavod" | "trat" | "ceka";

export type Udalost = {
  /** Klíč pro React a pro rozpoznání téže události podruhé. */
  klic: string;
  druh: DruhUdalosti;
  /** Velký text doprostřed. Krátký — čte se přes místnost. */
  titulek: string;
  /** Jedna řádka pod ním, nebo nic. */
  detail?: string;
};

/**
 * Porovná dva snímky. <b>Bez předchozího snímku nevrací nic</b>: první
 * načtení není změna, a kdo přijde k televizi v půlce závodu, nemá dostat
 * salvu alertů o všem, co se stalo před ním.
 */
export function udalosti(stary: Snimek | null, novy: Snimek): Udalost[] {
  if (!stary) return [];

  const ven: Udalost[] = [];

  // Trať. <b>Nehlásí se změna razítka, ale přechod „nejede se → jede se"</b>
  // (Filip, 15. 10. 2026: *„alerty, typicky schválení trati… čeká se,
  // schváleno"*). Veřejný endpoint vydává trať, která je na řadě, takže po
  // dojezdu rozjížďky se razítko změní samo — a kdyby alert visel na
  // razítku, tabule by vyhlásila „schváleno" ve chvíli, kdy rozhodčí nic
  // neudělal, jen se posunula rozjížďka.
  const jedeSe = (t: Snimek["trat"]) => !!t?.prijatoV && !t.prestavba;

  if (!jedeSe(stary.trat) && jedeSe(novy.trat) && novy.trat)
    ven.push({
      klic: `trat-jede-${novy.trat.prijatoV}`,
      druh: "trat",
      titulek: "Trať schválena",
      detail: novy.trat.cisloRozjizdky
        ? `${novy.trat.cisloRozjizdky}. rozjížďka`
        : "jede se podle ní",
    });

  // Opačná zpráva, stejně důležitá: lodě čekají a bez téhle věty nikdo
  // neví proč. Vlastní druh, protože obrazovka skládá třídu jen z druhu
  // a červená „čeká se" se nesmí splést se zelenou „jede se".
  if (jedeSe(stary.trat) && !jedeSe(novy.trat) && novy.trat)
    ven.push({
      klic: `trat-ceka-${novy.trat.cisloRozjizdky ?? "x"}`,
      druh: "ceka",
      titulek: novy.trat.prestavba ? "Trať se přestavuje" : "Čeká se na trať",
      detail: novy.trat.cisloRozjizdky
        ? `před ${novy.trat.cisloRozjizdky}. rozjížďkou`
        : "rozhodčí ji ještě nepřijal",
    });

  // Stav celé regaty. Nejsilnější zpráva, proto první.
  if (stary.stav !== novy.stav && novy.stav === "Odjety")
    ven.push({ klic: `zavod-${novy.stav}`, druh: "zavod", titulek: "Dojeto", detail: novy.nazev });

  const drive = new Map(stary.rozjizdky.map((r) => [r.cislo, r]));

  for (const r of novy.rozjizdky) {
    const pred = drive.get(r.cislo);

    // Nová rozjížďka rovnou v běhu se počítá jako start: na tabuli je
    // podstatné, že se jede, ne že přibyl řádek.
    if (r.stav === "Probiha" && pred?.stav !== "Probiha")
      ven.push({
        klic: `start-${r.cislo}`,
        druh: "start",
        titulek: `${r.cislo}. rozjížďka startuje`,
        detail: r.doSerie ? undefined : "mimo pohár",
      });

    if (r.stav === "Dokoncena" && pred?.stav !== "Dokoncena")
      ven.push({
        klic: `konec-${r.cislo}`,
        druh: "dokonceno",
        titulek: `${r.cislo}. rozjížďka dojeta`,
      });

    // Dojezdy: lodě, které v předchozím snímku ještě neměly místo.
    const meloMisto = new Set(
      (pred?.poradi ?? []).filter((x) => x.misto !== null).map((x) => x.lod),
    );
    for (const x of r.poradi) {
      if (x.misto === null || meloMisto.has(x.lod)) continue;
      ven.push({
        klic: `dojezd-${r.cislo}-${x.lod}`,
        druh: "dojezd",
        titulek: `${x.misto}. ${x.lod}`,
        detail: `${r.cislo}. rozjížďka · ${x.kategorie}${x.kod ? ` · ${x.kod}` : ""}`,
      });
    }
  }

  return ven;
}
