/**
 * Které ročníky mají vymyšlené výsledky.
 *
 * **Čte se na serveru a do pruhu jde v props.** `process.env` v klientském
 * balíku neexistuje, takže by ze seznamu zbylo prázdno — tedy pruh, který
 * nikdy není. Proměnná se nastavuje až za běhu (compose), ne při buildu.
 *
 * Až ukázková data dorazí nahradit skutečná, stačí proměnnou smazat
 * z compose; do kódu ani do databáze kvůli tomu není potřeba sahat.
 */
export const UKAZKOVE_SERIE = (process.env.UKAZKOVE_SERIE ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
