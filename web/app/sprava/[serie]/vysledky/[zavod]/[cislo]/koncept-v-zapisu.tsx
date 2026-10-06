"use client";

import { useEffect, useState } from "react";
import { klicKonceptu, precti, rozdily, zahod, type Koncept } from "./koncept";

/**
 * Neodeslaný zápis z telefonu ve formuláři zápisu — tam, kde se opravuje.
 *
 * <b>Dvě věci, obě o ztraceném dojezdu</b> (oponentura, 6. 10. 2026):
 *
 * 1. <b>Dá se z něj doplnit.</b> Klepnutí, které kvůli konfliktu neprošlo,
 *    nemá na serveru snímek, takže ho porovnání neukáže a ruční oprava
 *    sepsaná jen podle porovnání ho ztratí.
 * 2. <b>Oprava ho vyřeší.</b> Dřív po uložení zůstal v telefonu ležet
 *    a při návratu na cíl se nabídl k odeslání — čímž by přepsal právě
 *    dokončenou opravu. Vyřešit ho znamená buď že ho uložené pokrývá
 *    (pak zmizí), nebo že se o zbytku musí rozhodnout vědomě.
 *
 * Vyplňuje přímo políčka formuláře, protože formulář je serverový a nic
 * jiného sdíleného nemá. Je to zásah do DOM, zato jediný a pojmenovaný.
 */
export function KonceptVZapisu({
  serie,
  zavod,
  cislo,
  jmena,
  ulozene,
  ulozeno,
}: {
  serie: string;
  zavod: string;
  cislo: number;
  jmena: Record<number, string>;
  ulozene: { id: number; poradi: number | null; kod: string | null }[];
  /** Formulář se právě uložil (stránka přišla s `?stav=`). */
  ulozeno: boolean;
}) {
  const klic = klicKonceptu(serie, zavod, cislo);
  const [koncept, setKoncept] = useState<Koncept | null>(null);
  const [vyreseno, setVyreseno] = useState(false);

  useEffect(() => {
    setKoncept(precti(klic));
  }, [klic]);

  const chybejici = koncept ? rozdily(koncept, ulozene) : [];

  // Uložené pokrývá celý koncept: držet ho dál znamená nechat v telefonu
  // nálož, která při návratu na cíl přepíše právě dokončenou opravu.
  useEffect(() => {
    if (!koncept || chybejici.length > 0) return;
    zahod(klic);
    setKoncept(null);
    setVyreseno(true);
  }, [koncept, chybejici.length, klic]);

  if (vyreseno && ulozeno)
    return (
      <p className="hlaska hotovo" role="status">
        Neodeslaný zápis z telefonu je vyřešený — uložený zápis ho obsahuje,
        takže se na cíli už nenabídne.
      </p>
    );

  if (!koncept || chybejici.length === 0) return null;

  const jmeno = (id: number) => jmena[id] ?? `loď ${id}`;

  const doplnDoFormulare = () => {
    for (const r of chybejici) {
      const poradi = document.querySelector<HTMLInputElement>(`input[name="poradi-${r.id}"]`);
      const kod = document.querySelector<HTMLSelectElement>(`select[name="kod-${r.id}"]`);
      if (poradi) poradi.value = r.poradi != null ? String(r.poradi) : "";
      if (kod) kod.value = r.kod ?? "";
    }
    // Zahodí se až po uložení: dokud se formulář neodeslal, je koncept pořád
    // jediná kopie těch klepnutí.
    setVyreseno(false);
  };

  return (
    <div className="hlaska chyba" role="alert">
      <p>
        <b>V telefonu leží neodeslaný zápis</b>, který uložená čísla nemají.
        {ulozeno && " Právě uložená oprava s ním nepočítá."}
      </p>
      <ul>
        {chybejici.map((r) => (
          <li key={r.id}>
            {jmeno(r.id)} — {r.kod ? `kód ${r.kod.toUpperCase()}` : `${r.poradi}. místo`}
            {r.proc === "jinak" && " (uložené má jiné)"}
          </li>
        ))}
      </ul>
      <p>
        <button type="button" className="maly" onClick={doplnDoFormulare}>
          Doplnit do formuláře
        </button>{" "}
        <button
          type="button"
          className="maly"
          onClick={() => {
            zahod(klic);
            setKoncept(null);
            setVyreseno(true);
          }}
        >
          Zahodit zápis z telefonu
        </button>
      </p>
      <p className="poznamka">
        Doplnit znamená vepsat je do formuláře — uloží se, až formulář odešleš.
      </p>
    </div>
  );
}
