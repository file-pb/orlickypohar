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
  /**
   * Zkrácené jméno pro úzkou dlaždici. Vykreslují se obě podoby a vybírá
   * mezi nimi CSS podle šířky dlaždice — na serveru se šířka zjistit nedá
   * a javascript by to uměl až po načtení, takže by jméno po otevření
   * stránky poskočilo.
   */
  nazevKratky?: string;
  /** Vlajka nebo značka vlevo od názvu. Nepovinná — viz `znacky`. */
  znacka?: ReactNode;
  /**
   * Věta, co se tam dělá. <b>Jen jako bublina pod myší</b> (Filip, 29. 10.
   * 2026: *„ten popis je asi nadbytečný u tohoto typu komponenty, můžeš ho
   * dát jako tooltip pro «myšaře»"*) — v dlaždici zabírala druhý řádek
   * a řádek dlaždic se tím zkrátil na tři.
   */
  popis?: string;
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
 * <b>Dlaždice jsou vstup i navigace.</b> Od 29. 10. 2026 stojí i nad
 * otevřenou obrazovkou a vybranou označují podtržením — Filip: *„když budou
 * opravdu fungovat podobně jako tab, že se pod nimi přepne ten cíl…"*.
 * Odtlačit obsah si můžou dovolit, protože po zrušení popisu jsou vysoké
 * jako řádek, ne jako karta.
 *
 * <b>Dlaždice nese jméno a značku, nic víc.</b> Popis je bublina pod myší
 * a role se nevypisuje vůbec — co se smí, rozhoduje `polozkyZastavky`
 * podle udělených práv, takže štítek „rozhodčí" u každé z nich jen
 * opakoval totéž (Filip, 29. 10. 2026: *„ten tab kdo to může bych taky
 * nedával… mají se zobrazit dlaždice podle toho, kdo na ně má práva"*).
 *
 * Příbuznost dělá značka: táž vlajka v téže velikosti jako v pruhu
 * (`.taby-sekci .vlajka` a `.dlazdice-sekci .vlajka` jsou jeden předpis).
 */
export function DlazdiceSekci({
  polozky,
  aktivni,
  znacky = true,
}: {
  polozky: PolozkaPrepinace[];
  /** Klíč otevřené položky. Prázdný tam, kde se teprve vybírá. */
  aktivni?: string;
  znacky?: boolean;
}) {
  if (polozky.length === 0) return null;

  return (
    <>
      <ul className="seznam dlazdice-sekci">
        {polozky.map((p) => (
          <li key={p.klic}>
            {/* `title` je bublina pro myš a zároveň to jediné, co se z popisu
                dostane ke čtečce obrazovky — na dotykovém displeji ho nikdo
                neuvidí, a tak to Filip chce. */}
            <Link
              className="karta"
              href={p.kam}
              title={p.popis}
              aria-current={p.klic === aktivni ? "page" : undefined}
            >
              <div className="nazev">
                {znacky && p.znacka}
                {p.nazevKratky ? (
                  <>
                    <span className="jmeno-dlouhe">{p.nazev}</span>
                    <span className="jmeno-uzke">{p.nazevKratky}</span>
                  </>
                ) : (
                  p.nazev
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Hranice vybraného (Filip, 29. 10. 2026): šrafa pod pruhem místo
          panelu nebo karty kolem obsahu — „aby to vypadalo jako boundary
          toho, co jsem v dlaždici vybral, ale nebralo to tolik prostoru".
          Jen tam, kde je co vybráno; na rozcestníku pod dlaždicemi nic
          nezačíná, takže by ohraničovala prázdno.

          `aria-hidden`, protože oddělení už říká `aria-current` na dlaždici
          — čtečce by `hr` navíc jen oznámila předěl bez obsahu. */}
      {aktivni && <hr className="hranice-vyberu" aria-hidden />}
    </>
  );
}
