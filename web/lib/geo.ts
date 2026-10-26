/**
 * Geometrie na vodě bez jakýchkoli závislostí.
 *
 * <b>Proč vlastní soubor:</b> vzdálenost potřebuje jak stavba prvků, tak
 * režie tabule, a ta se musí dát spustit v holém Node (`web/testy/`).
 * Kdyby seděla ve `stavba-prvku.ts`, přitáhl by si test celý řetěz
 * importů až k barvám bójí.
 */

/**
 * Jak daleko od sebe ty dva body jsou, v metrech. Rovinná aproximace —
 * na linii dlouhé desítky až stovky metrů bohatě stačí.
 */
export function vzdalenostM(
  a: { sirka: number; delka: number },
  b: { sirka: number; delka: number },
): number {
  const stred = ((a.sirka + b.sirka) / 2) * (Math.PI / 180);
  const dx = (b.delka - a.delka) * Math.cos(stred) * 111_320;
  const dy = (b.sirka - a.sirka) * 111_320;
  return Math.hypot(dx, dy);
}
