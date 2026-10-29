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
  /**
   * Vlajka nebo značka vlevo od názvu. Nese ji pruh sekcí na veřejné
   * stránce; dlaždice ve správě mají místo ní barvu u levé hrany.
   */
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
}: {
  polozky: PolozkaPrepinace[];
  /** Klíč otevřené sekce. */
  aktivni: string;
  /** Co to je za výběr, pro čtečku obrazovky. */
  popisek: string;
}) {
  // Jedna sekce není co přepínat — pruh by jen tvrdil, že je kam jít.
  if (polozky.length < 2) return null;

  const otevrena = polozky.find((p) => p.klic === aktivni) ?? polozky[0];

  const odkazy = polozky.map((p) => (
    <Link key={p.klic} href={p.kam} aria-current={p.klic === aktivni ? "page" : undefined}>
      {p.znacka}
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
            {otevrena.znacka}
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
 * <b>Dlaždice nese jméno, nic víc.</b> Popis je bublina pod myší
 * a role se nevypisuje vůbec — co se smí, rozhoduje `polozkyZastavky`
 * podle udělených práv, takže štítek „rozhodčí" u každé z nich jen
 * opakoval totéž (Filip, 29. 10. 2026: *„ten tab kdo to může bych taky
 * nedával… mají se zobrazit dlaždice podle toho, kdo na ně má práva"*).
 *
 * Příbuznost s pruhem drží barva: klíč položky jde do `data-polozka`,
 * odkud si ji CSS vyzvedne (`--ukon-*` v `globals.css`) na levou hranu
 * dlaždice, na nadpis i na lano za ním.
 */
export function DlazdiceSekci({
  polozky,
  aktivni,
  popisek,
}: {
  polozky: PolozkaPrepinace[];
  /** Klíč otevřené položky. Prázdný tam, kde se teprve vybírá. */
  aktivni?: string;
  /**
   * Co to je za výběr, pro čtečku obrazovky. Kde se vyplní, obalí se
   * dlaždice do `nav` — na rozcestníku jsou obsahem stránky, kdežto nad
   * pracovní obrazovkou nebo sekcí jsou navigací a patří do orientačního
   * bodu, kterým čtečka umí skákat.
   */
  popisek?: string;
}) {
  if (polozky.length === 0) return null;

  const Obal = popisek
    ? ({ children }: { children: React.ReactNode }) => (
        <nav aria-label={popisek}>{children}</nav>
      )
    : ({ children }: { children: React.ReactNode }) => <>{children}</>;

  return (
    <Obal>
      <ul className="seznam dlazdice-sekci">
        {polozky.map((p) => (
          <li key={p.klic} data-polozka={p.klic}>
            <Link
              className="karta"
              href={p.kam}
              aria-describedby={p.popis ? `popis-${p.klic}` : undefined}
              aria-current={p.klic === aktivni ? "page" : undefined}
            >
              <div className="nazev">
                {p.znacka}
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
            {/* <b>Vlastní bublina místo `title`.</b> Nativní má tři vady,
                kvůli kterým se popis skoro nikdy neukázal: naskakuje až po
                vteřině, nejde ji stylovat, a hlavně se vůbec neobjeví, když
                myš dojede na dlaždici a stojí — prohlížeč ji váže na pohyb.
                Tahle drží tón webu a je vidět po třech desetinách.

                Stojí mimo odkaz schválně: uvnitř by ji čtečka přečetla jako
                část jeho jména. Takhle na ni ukazuje `aria-describedby`,
                tedy jako na popis, kterým ve skutečnosti je. */}
            {p.popis && (
              <span className="bublina" id={`popis-${p.klic}`} role="tooltip">
                {p.popis}
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* <b>Klíč vybrané položky ven z pruhu.</b> Podle něj si `body`
          vyzvedne její barvu (`--ukon-strany` v `globals.css`) a obarví
          se jí nadpis i lano, které z nadpisu pokračuje doprava — obojí
          je jinde na stránce a samo o sobě by o vybrané položce nevědělo.

          Je to prázdný `span`, ne `hr`: lano už není samostatný předěl pod
          pruhem (jak vzniklo 29. 10. 2026), ale součást nadpisu, takže by
          `hr` oznamovala čtečce předěl, který v obsahu není. */}
      {aktivni && <span className="vybrany-ukon" data-ukon={aktivni} hidden />}
    </Obal>
  );
}
