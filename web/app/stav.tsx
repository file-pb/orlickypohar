import type { StavZavodu } from "@/lib/api";

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
      return "Závod je vypsaný — přihlásit se dá u pořadatele.";
    default:
      return "Výsledky zatím nejsou zveřejněné.";
  }
}
