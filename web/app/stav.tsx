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
 */
export function ProcNejsouVysledky(stav: StavZavodu) {
  switch (stav) {
    case "Zruseny":
      return "Zastávka se nekonala. Do poháru se nepočítá.";
    case "Planovany":
      return "Zastávka se teprve pojede.";
    case "Vypsany":
      return "Zastávka je vypsaná, ale ještě se nejela.";
    default:
      return "Výsledky zatím nejsou zveřejněné.";
  }
}
