/**
 * Výběr termínů do kalendáře v boku (Filip, 16. 9. 2026).
 *
 * Tři termíny. Přednost mají nadcházející; když jich do konce sezóny zbývá
 * méně, doplní se nejbližšími odjetými — bok nemá zůstat prázdný jen proto,
 * že sezóna končí. Zrušené se nepočítají ani do jednoho.
 *
 * Čistá funkce bez Reactu, ať jde vyzkoušet i stav, který ukázková data
 * nemají (konec sezóny, prázdný ročník).
 */

export type TerminKalendare = {
  datum: string;
  datumKonce?: string | null;
  stav: string;
};

export const TERMINU_V_BOKU = 3;

/** Dnešek v pražském pásmu jako YYYY-MM-DD — zastávky se jedou na Orlíku. */
export const dnesVPraze = () =>
  new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Prague" });

export function vyberTerminu<T extends TerminKalendare>(
  vse: T[],
  dnes: string,
  pocet = TERMINU_V_BOKU,
): T[] {
  const platne = [...vse]
    .filter((z) => z.stav !== "Zruseny")
    .sort((a, b) => a.datum.localeCompare(b.datum));

  const nadchazi = (z: T) => z.stav !== "Odjety" && (z.datumKonce ?? z.datum) >= dnes;
  const budou = platne.filter(nadchazi);
  const probehly = platne.filter((z) => !nadchazi(z));

  if (budou.length >= pocet) return budou.slice(0, pocet);

  // Doplní se nejbližší odjeté, v pořadí podle data, před nadcházející.
  return [...probehly.slice(Math.max(0, probehly.length - (pocet - budou.length))), ...budou];
}
