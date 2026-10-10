/**
 * Převod mezi souřadnicemi a pixely mapy.
 *
 * <b>Web Mercator (EPSG:3857)</b>, tedy tatáž projekce, ve které jsou
 * dlaždice — bez toho by body nad podkladem seděly jen náhodou.
 *
 * <b>Čistý modul bez Reactu a DOM</b>, stejně jako `stavba-prvku.ts`:
 * kreslí z něj mapka trati i výběr bodu, a až bude appka ukazovat trať,
 * bude počítat totéž. Matematika se nesmí rozejít na dvou místech.
 */

/** Hrana dlaždice v pixelech, jak je vydává OSM. */
export const DLAZDICE = 256;

/** Rozsah přiblížení, který pouští i obslužná cesta dlaždic. */
export const Z_NEJMENE = 10;
export const Z_NEJVIC = 17;

/** Souřadnice → pixely světa při daném přiblížení (slippy map). */
export function doPixelu(sirka: number, delka: number, z: number) {
  const n = DLAZDICE * 2 ** z;
  const x = ((delka + 180) / 360) * n;
  const radiany = (sirka * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(radiany) + 1 / Math.cos(radiany)) / Math.PI) / 2) * n;
  return { x, y };
}

/** Pixely světa → souřadnice. Opak `doPixelu`, pro čtení z mapy. */
export function zPixelu(x: number, y: number, z: number) {
  const n = DLAZDICE * 2 ** z;
  const delka = (x / n) * 360 - 180;
  const radiany = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  return { sirka: (radiany * 180) / Math.PI, delka };
}

/** Kolik metrů připadá na pixel v dané šířce a přiblížení. */
export function metruNaPixel(sirka: number, z: number) {
  return (156_543.03 * Math.cos((sirka * Math.PI) / 180)) / 2 ** z;
}
