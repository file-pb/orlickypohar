"use client";

import { ZnakTridy } from "@/app/tridy";

type Radek = {
  id: number;
  nazev: string;
  kategorie: string;
  stariS: number | null;
  dojela: boolean;
  /**
   * Co stojí za jménem místo stáří polohy. Používá se, když pás neveze
   * pořadí z vody, ale ze série — tam je údajem počet bodů, ne to, jak
   * dávno se loď ozvala.
   */
  popisek?: string | null;
};

/**
 * Pořadí po třídách dole na tabuli (Filip, 24. 10. 2026: *„dole udělej pro
 * každou kategorii kromě celkového pořadí karusel, kde bude vidět pořadí
 * v kategorii, tak jako to máme na webu u malého rozměru"*).
 *
 * <b>Co třída, to řádek</b>, jako `PoradiRadky` na úvodní stránce: znak
 * a název stojí vlevo pevně a lodě plynou doleva. Použité jsou tytéž třídy
 * `karusel karusel-vodorovny` i `--pocet`, takže se rychlost pásu řídí
 * počtem lodí stejně jako jinde na webu — a když se jízda někdy zpomalí,
 * zpomalí se všude.
 *
 * <b>Proč vedle celkového pole, a ne místo něj:</b> vpravo stojí celé pole
 * pořád, takže divák vidí, jak si jeho loď vede mezi všemi; tady se ukazují
 * třídy, protože boduje se po nich.
 *
 * <b>Počítá se to jednou.</b> Pořadí sem posílá mapa trackeru — tatáž
 * čísla jako vpravo, jen rozdělená. Druhý výpočet by byl druhá pravda.
 */
export function PoradiTrid({
  radky,
  nadpis,
  ref,
}: {
  radky: Radek[];
  /**
   * Co pásy vezou, když to není pořadí z vody. <b>Bez něj si to divák
   * splete</b> (Filip, 26. 10. 2026) — tytéž pruhy na tomtéž místě jednou
   * ukazují pořadí v regatě a podruhé v celé sérii.
   */
  nadpis?: string;
  /** Pořadí je z ukázkových plaveb — pás to musí říct u sebe. */
  /** Mapa pod karuselem potřebuje znát jeho výšku, aby pole nekreslila pod něj. */
  ref?: React.Ref<HTMLElement>;
}) {
  // Pořadí v pásu drží to, v jakém jsou řádky poslané — na vodě je to
  // pořadí na trati, v sérii pořadí po škrtu. Třídit se smí jen seznam
  // tříd, ne lodě v něm.
  const tridy = [...new Set(radky.map((r) => r.kategorie))].sort();
  if (tridy.length === 0) return null;

  return (
    <section className="tabule-tridy" ref={ref}>
      {nadpis && <p className="tabule-tridy-nadpis">{nadpis}</p>}
      {tridy.map((t) => {
        const vTride = radky.filter((r) => r.kategorie === t);
        return (
          <div key={t} className="poradi-radek">
            <span className="poradi-radek-trida">
              <ZnakTridy nazev={t} />
              {t}
            </span>
            <div
              className="karusel karusel-vodorovny jede"
              style={{ "--pocet": vTride.length } as React.CSSProperties}
            >
              <ol className="karusel-pas">
                <Lode lode={vTride} />
                <Lode lode={vTride} kopie />
              </ol>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function Lode({ lode, kopie }: { lode: Radek[]; kopie?: boolean }) {
  return lode.map((l, i) => (
    <li key={`${kopie ? "kopie-" : ""}${l.id}`} aria-hidden={kopie || undefined}>
      <span className="poradi-cislo">{i + 1}.</span>
      <span className="bok-lod">{l.nazev}</span>
      {/* Tytéž údaje jako v pořadí vpravo (Filip, 24. 10. 2026) — pás,
          který by jen jmenoval, by nutil dívat se jinam. */}
      {l.popisek != null ? (
        <span className="pas-stari">{l.popisek}</span>
      ) : l.dojela ? (
        <span className="pas-stitek">v cíli</span>
      ) : (
        <span className="pas-stari">
          {l.stariS === null
            ? "nehlásí"
            : l.stariS < 60
              ? `${l.stariS} s`
              : `${Math.round(l.stariS / 60)} min`}
        </span>
      )}
    </li>
  ));
}
