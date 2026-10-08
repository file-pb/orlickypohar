"use client";

import { useEffect, useState } from "react";
import {
  klicKonceptu,
  podleRizika,
  precti,
  rozdily,
  zahod,
  type Koncept,
  type Rozdil,
} from "./koncept";

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
 * <b>Doplnit a přepsat nejsou totéž</b> (reprodukce C12, 8. 10. 2026). Dřív
 * tu stálo „zápis, který uložená čísla nemají" a jediné tlačítko vepsalo
 * do formuláře všechno — i řádky, kde uložené mělo jinou hodnotu. Jenže ta
 * hodnota mohla být čerstvá oprava druhého zapisovatele a jedno klepnutí ji
 * vrátilo zpátky. Chybějící se proto doplňují zvlášť od rozdílných a každé
 * tlačítko říká, co udělá.
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

  const vsechny = koncept ? rozdily(koncept, ulozene) : [];
  const { chybi, jinak } = podleRizika(vsechny);

  // Uložené pokrývá celý koncept: držet ho dál znamená nechat v telefonu
  // nálož, která při návratu na cíl přepíše právě dokončenou opravu.
  useEffect(() => {
    if (!koncept || vsechny.length > 0) return;
    zahod(klic);
    setKoncept(null);
    setVyreseno(true);
  }, [koncept, vsechny.length, klic]);

  if (vyreseno && ulozeno)
    return (
      <p className="hlaska hotovo" role="status">
        Neodeslaný zápis z telefonu je vyřešený — uložený zápis ho obsahuje,
        takže se na cíli už nenabídne.
      </p>
    );

  if (!koncept || vsechny.length === 0) return null;

  const jmeno = (id: number) => jmena[id] ?? `loď ${id}`;
  const vypis = (r: Rozdil) =>
    `${jmeno(r.id)} — ${r.kod ? `kód ${r.kod.toUpperCase()}` : `${r.poradi}. místo`}`;

  const vepis = (radky: Rozdil[]) => {
    for (const r of radky) {
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
        <b>V telefonu leží neodeslaný zápis z cíle.</b>
        {ulozeno && " Právě uložená oprava s ním nepočítá."}
      </p>

      {chybi.length > 0 && (
        <>
          <p>Tohle uložená čísla vůbec nemají — bez doplnění se to ztratí:</p>
          <ul>
            {chybi.map((r) => (
              <li key={r.id}>{vypis(r)}</li>
            ))}
          </ul>
        </>
      )}

      {jinak.length > 0 && (
        <>
          <p>
            Tady mají uložená čísla něco jiného. Neztrácí se tím nic;{" "}
            <b>mohl to být druhý zapisovatel, který tvůj zápis opravil</b> —
            přepsat je má smysl jen tehdy, když víš, že platí tvoje.
          </p>
          <ul>
            {jinak.map((r) => (
              <li key={r.id}>{vypis(r)} — uložené má jiné</li>
            ))}
          </ul>
        </>
      )}

      <p>
        {chybi.length > 0 && (
          <>
            <button type="button" className="maly" onClick={() => vepis(chybi)}>
              Doplnit chybějící
            </button>{" "}
          </>
        )}
        {jinak.length > 0 && (
          <>
            <button type="button" className="maly" onClick={() => vepis(jinak)}>
              Přepsat rozdílná čísly z telefonu
            </button>{" "}
          </>
        )}
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
        Obojí jen vepíše čísla do formuláře — uloží se, až ho odešleš.
      </p>
    </div>
  );
}
