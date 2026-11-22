/**
 * Dvě fáze u zahození prvku z fronty — <b>bez dialogu a bez pohybu
 * terče</b> (rozhodnutí 6 prvního konzilia nad stavitelem trati).
 *
 * <para>
 * Hlasování skončilo 2 : 1 pro nepohnutý terč, ale na <b>prodlevě</b> se
 * shodli všichni tři: druhá fáze je totéž tlačítko na témž místě a
 * klepnutí přijme teprve po chvíli. Prodleva zabrání dvojklepu
 * z houpnutí lodi, aniž by někoho nutila mířit jinam — a mířit se na
 * vodě mokrou rukou nedá.
 * </para>
 *
 * <para>
 * <b>Po pěti vteřinách se to vrátí zpátky.</b> Otevřené potvrzení, které
 * čeká donekonečna, je past: stavitel se mezitím dívá na vodu a palec
 * dopadne na terč, o kterém už neví, že je v druhé fázi.
 * </para>
 */

/** Jak dlouho po otevření se klepnutí ignoruje. */
export const PRODLEVA_MS = 400;

/** Jak dlouho potvrzení platí, než se samo zavře. */
export const PLATNOST_MS = 5000;

/**
 * Přijme se teď to klepnutí? <c>null</c> znamená, že potvrzení není
 * otevřené.
 */
export function lzePotvrdit(otevrenoV: number | null, ted: number): boolean {
  if (otevrenoV === null) return false;
  const od = ted - otevrenoV;
  return od >= PRODLEVA_MS && od < PLATNOST_MS;
}

/** Vypršelo potvrzení, a má se tedy zavřít? */
export function vyprselo(otevrenoV: number | null, ted: number): boolean {
  return otevrenoV !== null && ted - otevrenoV >= PLATNOST_MS;
}
