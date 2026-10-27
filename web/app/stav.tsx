import type { StavRozjizdky, StavZavodu } from "@/lib/api";

// Sdílené schválně, i když jsou kopie zatím jen dvě: nejde o abstrakci, ale
// o slovník. Stavy jsou dané modelem a když se „vypsáno" na jedné stránce
// jmenuje jinak než na druhé, čtenář hádá, jestli je to totéž.
//
// `Record` je tu naschvál místo volnějšího zápisu: nový stav v modelu tak
// shodí překlad webu, ne až štítek bez textu na stránce. Přesně to se stalo
// se stavem `Potvrzeny` — v API přibyl, ve slovníku chyběl.

const POPIS: Record<StavZavodu, string> = {
  Planovany: "plánováno",
  Potvrzeny: "termín platí",
  Vypsany: "vypsáno",
  Odjety: "odjeto",
  Zruseny: "zrušeno",
};

// Komunitní akce má tytéž stavy, ale setkání se nevypisuje a neodjíždí.
// Ostatní štítky platí beze změny.
const POPIS_AKCE: Partial<Record<StavZavodu, string>> = {
  Vypsany: "oznámeno",
  Odjety: "proběhlo",
};

/** Stav regaty jako štítek. Odjetá nese barvu, protože jen za ní jsou výsledky. */
export function Stav({ stav, akce }: { stav: StavZavodu; akce?: boolean }) {
  return (
    <span className={`stitek stav stav-${stav.toLowerCase()}`}>
      {(akce && POPIS_AKCE[stav]) || POPIS[stav]}
    </span>
  );
}

/**
 * Stav regaty <b>rámečkem karty</b>, ne štítkem vedle názvu (Filip,
 * 27. 10. 2026, nad ukázkou karet: *„člověk je tvor emotivně reagující na
 * barvy, takže s nimi můžeme lépe intuitivně vyjádřit status… ušetří nám to
 * zobrazení prvku co to indikuje nebo zbytečného textu v řádku co se nikomu
 * nechce číst."*).
 *
 * Barva jde do okraje celé karty a popis se posadí do jeho horní hrany.
 * Význam barev je týž, co projekt má u štítků i u stavů trati: tlumeně, co
 * nikdo nevidí; zelená, s čím se dá něco dělat; vodní modrá, co je venku;
 * červená „počkej".
 *
 * <b>Popis zůstává textem</b>, a není to zdvojení: barvoslepost se týká
 * zhruba osmi procent mužů a rozdíl „tlumená versus základní barva textu"
 * (plánováno versus potvrzeno) je jemný i pro zdravé oko. Pravidlo z té
 * série zní každá informace dvěma kanály — projekt ho jednou udělal na
 * tabuli, kde panýlek rozjížďky svítí výplní, ne jen barvou číslice.
 *
 * Používá se tak, že karta dostane {@link tridaRamu} a tuhle značku jako
 * první dítě; `position: relative` si řeší CSS.
 */
export function StavVRamu({ stav, akce }: { stav: StavZavodu; akce?: boolean }) {
  return <span className="stav-v-ramu">{(akce && POPIS_AKCE[stav]) || POPIS[stav]}</span>;
}

/** Třídy, které ke {@link StavVRamu} patří na samotnou kartu. */
export const tridaRamu = (stav: StavZavodu) => `ram-stavu stav-${stav.toLowerCase()}`;

/**
 * Jak se rozjížďce říká podle toho, co se s ní zrovna děje.
 *
 * <b>Plánovaná je bez slova schválně.</b> Je to výchozí stav, ve kterém
 * většina rozjížděk v seznamu stojí, a napsat ho ke každé znamená řádek,
 * který se nečte. Tabule to má stejně: panýlek plánované rozjížďky je jen
 * tlumené číslo a nic nedodává.
 */
const POPIS_ROZJIZDKY: Partial<Record<StavRozjizdky, string>> = {
  Probiha: "jede se",
  Dokoncena: "odjetá",
  Zrusena: "zrušená",
};

/**
 * Číslo rozjížďky, které nese i její stav — <b>vzor přenesený z tabule</b>
 * (zapsáno 27. 10. 2026 jako devátá osa: *„že něco probíhá a jak to
 * dopadlo"*).
 *
 * Tabule to umí dvěma kanály naráz: panýlek *„svítí výplní, ne jen barvou
 * číslice — odjetá vedle něj je jen obtažená"*, a k tomu semafor. Ve správě
 * z toho nebylo nic: `StavRozjizdky` sice v řádku přišel, ale nevykreslil
 * se vůbec a seznam mlčel i o tom, že se zrovna jedna jede. Štítek vedle
 * názvu mluví o něčem jiném — o stavu zápisu, tedy kdo za čísla ručí,
 * kdežto tohle je o tom, co se děje na vodě.
 *
 * <b>Výplň, ne jen barva.</b> Probíhající rozjížďka má plnou oranžovou
 * plochu, odjetá je obtažená zeleně, zrušená si drží přeškrtnuté číslo —
 * *„ať je po ní stopa"*. Plná plocha je zároveň ten kanál, který přežije
 * ostré slunce na vodě; rozhodčí se na tohle kouká na telefonu u břehu.
 */
export function CisloRozjizdky({ cislo, stav }: { cislo: number; stav: StavRozjizdky }) {
  const slovo = POPIS_ROZJIZDKY[stav];
  return (
    <span className={`rozjizdka-stav rozjizdka-${stav.toLowerCase()}`}>
      <i className="panylek-stavu">{cislo}</i> rozjížďka
      {slovo && <b className="slovy">{slovo}</b>}
    </span>
  );
}

/**
 * Co na stránce regaty stojí místo výsledků. Prázdná tabulka znamená
 * u každého stavu něco jiného a „zatím nejsou zveřejněné" je u zrušeného
 * závodu lež — nikdy nebudou.
 *
 * U vypsaného závodu je to zároveň jediná informace, kvůli které tam
 * závodník v tu chvíli chodí: že se už může hlásit. Vypsání znamená přesně
 * tohle — pořadatel vydal vypsání závodu a plachetní směrnice. Není to
 * příznak navíc, jen se to musí říct nahlas.
 */
export function ProcNejsouVysledky(stav: StavZavodu) {
  switch (stav) {
    case "Zruseny":
      return "Regata se nekonala. Do poháru se nepočítá.";
    case "Planovany":
      return "Zatím je to jen termín v kalendáři. Vypsání závodu teprve přijde.";
    case "Potvrzeny":
      return "Termín platí. Pořadatel závod ještě nevypsal.";
    case "Vypsany":
      // Dřív tu stálo „přihlásit se dá u pořadatele". Ta věta je starší
      // než veřejná přihláška (17. 9. 2026) a od té doby mate: posílá
      // člověka shánět pořadatele ve chvíli, kdy hned pod ní svítí
      // tlačítko „Přihlásit loď" a může se přihlásit sám.
      return "Závod je vypsaný — přihlásit loď můžeš rovnou tady.";
    default:
      return "Výsledky zatím nejsou zveřejněné.";
  }
}
