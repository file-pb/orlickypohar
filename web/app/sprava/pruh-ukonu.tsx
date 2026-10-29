import type { ReactNode } from "react";
import { nactiJa } from "@/lib/ja";
import { polozkyZastavky, prava } from "@/lib/co-smim";
import { DlazdiceSekci } from "@/app/prepinac-sekci";

/** Úsek z adresy úkonu: `/sprava/{ročník}/{úsek}/{regata}`. */
export const usekZAdresy = (kam: string) => kam.split("/")[3] ?? "";

/**
 * Dlaždice úkonů jedné regaty — <b>na rozcestníku i nad každou pracovní
 * obrazovkou</b> (Filip, 29. 10. 2026: *„když budou opravdu fungovat podobně
 * jako tab, že se pod nimi přepne ten cíl… budou vždy pod drobečkovou
 * navigací vidět a tím pádem můžeme i rychle přepínat"*).
 *
 * Do teď se z výsledků do přihlášek chodilo přes drobeček regaty, tedy o dvě
 * kliknutí; jediný odkaz napříč úkony byl „přihlášené lodě →" v podtitulku
 * výsledků, ručně dopsaný právě proto, že cesta jinudy nevedla.
 *
 * <b>Seznam je jeden a týž na všech obrazovkách</b>, protože ho vždycky
 * skládá `polozkyZastavky` z udělených práv. Kdyby si ho každá stránka
 * sestavovala sama, rozešly by se názvy, vlajky nebo rozsah — a pořadatel
 * by se na dvou obrazovkách učil dvojí ovládání.
 *
 * `aktivni` je úsek v adrese (`vysledky`, `prihlasky`, `smernice`, `boje`,
 * `tracker`). Na rozcestníku se nevyplňuje — tam se teprve vybírá.
 *
 * <b>Dlaždice tu nenesou vlajky</b>, ale barvu u levé hrany (Filip, 29. 10.
 * 2026). Pět vlajek vedle sebe nad pracovní obrazovkou byla pětice obrázků,
 * které je potřeba přečíst; barva drží řádek pohromadě a nic po čtenáři
 * nechce. Veřejné sekce vlajky nesou dál — tam jsou obsahem stránky, ne
 * navigací nad ní.
 */
export async function PruhUkonuRegaty({
  serie,
  zavod,
  aktivni,
}: {
  serie: string;
  zavod: string;
  aktivni?: string;
}) {
  // `nactiJa` je cache na požadavek, takže tohle nestojí další volání API —
  // stránka se na přihlášeného stejně ptá kvůli oprávněním.
  const { ja } = await nactiJa();
  if (!ja) return null;

  const ukony = polozkyZastavky(prava(ja), serie, zavod);
  if (ukony.length === 0) return null;

  return (
    <DlazdiceSekci
      aktivni={aktivni}
      polozky={ukony.map((u) => ({
        klic: usekZAdresy(u.kam),
        nazev: u.nazev,
        nazevKratky: u.uzky,
        kam: u.kam,
        popis: u.popis,
      }))}
    />
  );
}

/**
 * Nadpis pracovní obrazovky: <b>regata tučně, agenda za pomlčkou normálně</b>
 * (Filip, 29. 10. 2026: *„jak tam máme Jarní vítr, tak to spojme přes
 * pomlčku do nadpisu — ten název regaty silně, ten název agendy normálně"*).
 *
 * <b>Jméno agendy si bere z týchž položek jako dlaždice</b>, ne z řetězce
 * na stránce. Kdyby si ho každá obrazovka psala sama, rozešlo by se
 * s dlaždicí nad ní — a přesně tomu se tu celou dobu vyhýbáme. Když právo
 * na ten úkon chybí (na obrazovku by se ale člověk vůbec nedostal), zbude
 * samotný název regaty.
 */
export async function NadpisUkonu({
  serie,
  zavod,
  ukon,
  regata,
  children,
}: {
  serie: string;
  zavod: string;
  /** Úsek v adrese: `vysledky`, `prihlasky`, `smernice`, `boje`, `tracker`. */
  ukon: string;
  regata: string | null;
  /** Co patří za nadpis — třeba štítek stavu. */
  children?: ReactNode;
}) {
  const { ja } = await nactiJa();
  const nazev = ja
    ? polozkyZastavky(prava(ja), serie, zavod).find((u) => usekZAdresy(u.kam) === ukon)?.nazev
    : undefined;

  return (
    <h1>
      {/* Všechno v jednom prvku: `h1` je ve správě mřížka s lanem, takže
          každý samostatný kus textu by se stal vlastním sloupcem a mezery
          kolem pomlčky by se roztáhly na `gap`. */}
      <span className="nadpis-ukonu">
        <strong>{regata ?? "Regata"}</strong>
        {nazev && <span className="agenda"> — {nazev}</span>}
      </span>
      {children}
    </h1>
  );
}
