import type { ReactNode } from "react";
import Link from "next/link";
import { ZavriMimo } from "@/app/zavri-mimo";

/**
 * Přepínač sekcí jedné věci — pruh na širokém displeji, rozbalovací řádek
 * na úzkém. Vytažený z hlavy regaty (Filip, 29. 10. 2026), aby správa měla
 * <b>totéž ovládání, ne vlastní</b>: *„uživatelsky na oko je to to samé
 * a uživatel to tak vnímá a učí se to ovládat. Nepochopí, proč to nevypadá
 * stejně, jen s jinou funkcionalitou."*
 *
 * <b>Obě podoby jsou v HTML zároveň</b> a přepíná je CSS (`.taby-sekci`
 * a `.sekce-rozbal` v `globals.css`), takže na to není potřeba javascript
 * ani zjišťování šířky na serveru. Jedna z nich je vždy `display: none`,
 * a tím i mimo strom pro čtečky.
 *
 * <b>Položky jsou vstup, ne obsah komponenty.</b> Veřejná stránka sem posílá
 * sekce regaty se signálními vlajkami, správa svoje úkony — a každá si nese
 * vlastní adresy. Komponenta jen rozhoduje, jak se mezi nimi přepíná.
 */
export type PolozkaPrepinace = {
  /** Jednoznačný klíč, obvykle slug sekce. */
  klic: string;
  nazev: string;
  kam: string;
  /** Vlajka nebo značka vlevo od názvu. Nepovinná — viz `znacky`. */
  znacka?: ReactNode;
  /** Věta, co se tam dělá. Ukáže ji dlaždice; do pruhu se nevejde. */
  popis?: string;
  /** Štítek za názvem, třeba role, ze které právo plyne. */
  stitek?: string;
};

export function PrepinacSekci({
  polozky,
  aktivni,
  popisek,
  znacky = true,
}: {
  polozky: PolozkaPrepinace[];
  /** Klíč otevřené sekce. */
  aktivni: string;
  /** Co to je za výběr, pro čtečku obrazovky. */
  popisek: string;
  /**
   * <b>Vypnuté značky šetří 188 px</b> (změřeno 29. 10. 2026 na šesti
   * sekcích: 935 px s nimi, 747 bez). Hranice, od které se pruh vejde na
   * jeden řádek, tím klesne z 1560 px okna na zhruba 1371 — na 13" to
   * nestačí, na 14" a 15" ano. Proto je to volba volajícího: veřejná
   * stránka vlajky nese, protože jsou to závodní signály a nesou význam,
   * kdežto ve správě by jen zabíraly místo (Filip: „tak to ve správě dej
   * bez obrázků, jestli to pomůže").
   */
  znacky?: boolean;
}) {
  // Jedna sekce není co přepínat — pruh by jen tvrdil, že je kam jít.
  if (polozky.length < 2) return null;

  const otevrena = polozky.find((p) => p.klic === aktivni) ?? polozky[0];

  const odkazy = polozky.map((p) => (
    <Link key={p.klic} href={p.kam} aria-current={p.klic === aktivni ? "page" : undefined}>
      {znacky && p.znacka}
      {p.nazev}
    </Link>
  ));

  return (
    <>
      <nav className="taby taby-sekci" aria-label={popisek}>
        {odkazy}
      </nav>

      <details className="sekce-rozbal">
        <ZavriMimo />
        <summary>
          <span className="sekce-rozbal-tady">
            {znacky && otevrena.znacka}
            {otevrena.nazev}
          </span>
          {/* Zbytek sekcí se počítá, ne vypisuje: „a 4 další" říká, že je kam
              klepnout, i když je seznam zavřený. */}
          <span className="sekce-rozbal-zbytek">
            a {polozky.length - 1} {polozky.length - 1 < 5 ? "další" : "dalších"}
          </span>
        </summary>
        <nav aria-label={popisek}>{odkazy}</nav>
      </details>
    </>
  );
}

/**
 * <b>Tytéž položky jako pruh, jen jako dlaždice</b> (Filip, 29. 10. 2026:
 * *„co udělat dlaždice, co budou vypadat podobně jako tab?"*). Proto je to
 * ve stejném souboru a na stejném typu: kdyby si dlaždice nesly vlastní
 * seznam, rozešla by se jména nebo ikony a uživatel by se učil dvoje
 * ovládání téhož — což je přesně to, oč tu jde.
 *
 * <b>Dlaždice je vstup, pruh navigace.</b> Dlaždice se vypisují tam, kde se
 * teprve vybírá, a unesou `popis` — větu, co se na té obrazovce dělá.
 * Uvnitř vybrané sekce je pak pruh: šest karet nad každou pracovní
 * obrazovkou by obsah odtlačilo o tři řádky.
 *
 * Příbuznost dělá značka: táž vlajka v téže velikosti jako v pruhu
 * (`.taby-sekci .vlajka` a `.dlazdice-sekci .vlajka` jsou jeden předpis).
 */
export function DlazdiceSekci({
  polozky,
  znacky = true,
}: {
  polozky: PolozkaPrepinace[];
  znacky?: boolean;
}) {
  if (polozky.length === 0) return null;

  return (
    <ul className="seznam dlazdice-sekci">
      {polozky.map((p) => (
        <li key={p.klic}>
          <Link className="karta" href={p.kam}>
            <div className="nazev">
              {znacky && p.znacka}
              {p.nazev}
              {p.stitek && <span className="stitek">{p.stitek}</span>}
            </div>
            {p.popis && <div className="detail">{p.popis}</div>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
