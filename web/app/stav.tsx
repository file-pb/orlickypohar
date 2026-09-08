import type { StavZavodu } from "@/lib/api";

// Sdílené schválně, i když jsou kopie zatím jen dvě: nejde o abstrakci, ale
// o slovník. Čtyři stavy jsou dané modelem a když se „vypsáno" na jedné
// stránce jmenuje jinak než na druhé, čtenář hádá, jestli je to totéž.

const POPIS: Record<StavZavodu, string> = {
  Planovany: "plánováno",
  Vypsany: "vypsáno",
  Odjety: "odjeto",
  Zruseny: "zrušeno",
};

/** Stav zastávky jako štítek. Odjetá nese barvu, protože jen za ní jsou výsledky. */
export function Stav({ stav }: { stav: StavZavodu }) {
  return <span className={`stitek stav stav-${stav.toLowerCase()}`}>{POPIS[stav]}</span>;
}

/**
 * Co na stránce zastávky stojí místo výsledků. Prázdná tabulka znamená
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
      return "Zastávka se nekonala. Do poháru se nepočítá.";
    case "Planovany":
      return "Zatím je to jen termín v kalendáři. Vypsání závodu teprve přijde.";
    case "Vypsany":
      return "Závod je vypsaný — přihlásit se dá u pořadatele.";
    default:
      return "Výsledky zatím nejsou zveřejněné.";
  }
}
