/**
 * Přesun lodi o místo v zápisu rozjížďky.
 *
 * Šipka v řádku nahradila ruční přepisování čísel u čtyřiceti lodí, takže
 * se o ni opírá zápis z papíru. Proklikat se to na obrazovce dá, ale
 * okrajové případy — díry v číslování, shoda v cíli, kraj řady — by se
 * musely vyklikat pokaždé znovu.
 */
import assert from 'node:assert/strict';

import { prohodVRade } from '../lib/presun.ts';
import type { ZapisRadek } from '../lib/vysledky.ts';

let prosly = 0;
function zkus(nazev: string, f: () => void) {
  try { f(); prosly += 1; console.log('  ok   ' + nazev); }
  catch (e) { console.log('  CHYBA ' + nazev + ': ' + (e as Error).message); process.exitCode = 1; }
}

/** Řádek zápisu: id, pořadí, případně kód. */
const r = (prihlaskaId: number, poradiVCili: number | null, kod: string | null = null): ZapisRadek =>
  ({ prihlaskaId, poradiVCili, kod }) as ZapisRadek;

/** Pořadí po přesunu, jako mapa id → číslo. */
const poradi = (radky: ZapisRadek[]) =>
  Object.fromEntries(radky.map((x) => [x.prihlaskaId, x.poradiVCili]));

console.log('Přesun lodi v zápisu');

zkus('nahoru prohodí s lodí o místo lepší', () => {
  const v = prohodVRade([r(1, 1), r(2, 2), r(3, 3)], 3, 'nahoru');
  assert.ok(v);
  assert.deepEqual(poradi(v.radky), { 1: 1, 2: 3, 3: 2 });
  assert.deepEqual(v.prohozeno, [3, 2]);
});

zkus('dolů prohodí s lodí o místo horší', () => {
  const v = prohodVRade([r(1, 1), r(2, 2), r(3, 3)], 1, 'dolu');
  assert.ok(v);
  assert.deepEqual(poradi(v.radky), { 1: 2, 2: 1, 3: 3 });
});

zkus('tabulka může přijít v jakémkoliv pořadí — rozhoduje číslo, ne řádek', () => {
  // Zapisuje se po kategoriích, takže sousedi v řadě bývají daleko od sebe.
  const v = prohodVRade([r(9, 3), r(4, 1), r(7, 2)], 9, 'nahoru');
  assert.ok(v);
  assert.deepEqual(poradi(v.radky), { 9: 2, 4: 1, 7: 3 });
});

zkus('díry v číslování se nezacelují — prohodí se právě dvě čísla', () => {
  // 1, 3, 7 vzniknou tím, že lodě mezi nimi mají kód. Vsunutí by je
  // přečíslovalo a člověk by nepoznal, co se vlastně stalo.
  const v = prohodVRade([r(1, 1), r(2, 3), r(3, 7)], 3, 'nahoru');
  assert.ok(v);
  assert.deepEqual(poradi(v.radky), { 1: 1, 2: 7, 3: 3 });
});

zkus('řádky mimo řadu zůstanou, jak byly', () => {
  const vstup = [r(1, 1), r(2, 2), r(5, null, 'Dnf'), r(6, null)];
  const v = prohodVRade(vstup, 2, 'nahoru');
  assert.ok(v);
  assert.deepEqual(poradi(v.radky), { 1: 2, 2: 1, 5: null, 6: null });
  assert.equal(v.radky.find((x) => x.prihlaskaId === 5)?.kod, 'Dnf');
});

zkus('loď bez pořadí nemá co prohazovat', () => {
  assert.equal(prohodVRade([r(1, 1), r(2, null, 'Dnf')], 2, 'nahoru'), null);
  assert.equal(prohodVRade([r(1, 1), r(2, null, 'Dnf')], 2, 'dolu'), null);
});

zkus('z kraje řady se nedá dál', () => {
  assert.equal(prohodVRade([r(1, 1), r(2, 2)], 1, 'nahoru'), null);
  assert.equal(prohodVRade([r(1, 1), r(2, 2)], 2, 'dolu'), null);
});

zkus('jediná loď v řadě nemá kam', () => {
  assert.equal(prohodVRade([r(1, 1)], 1, 'nahoru'), null);
  assert.equal(prohodVRade([r(1, 1)], 1, 'dolu'), null);
});

zkus('neznámé id neudělá nic', () => {
  assert.equal(prohodVRade([r(1, 1), r(2, 2)], 99, 'nahoru'), null);
});

zkus('shoda v cíli projde a obě čísla nechá', () => {
  // ZPJ A7, nález K7: dvě lodě na témže místě jsou platný zápis a body se
  // dělí. V řadě tedy sousedí a prohození mezi nimi je úkon bez následku —
  // ne chyba, kterou by měl někdo hlásit.
  const v = prohodVRade([r(1, 3), r(2, 3), r(3, 5)], 2, 'nahoru');
  assert.ok(v);
  assert.deepEqual(poradi(v.radky), { 1: 3, 2: 3, 3: 5 });
});

zkus('vstup se nemění — vrací se nová sada', () => {
  const vstup = [r(1, 1), r(2, 2)];
  prohodVRade(vstup, 2, 'nahoru');
  assert.deepEqual(poradi(vstup), { 1: 1, 2: 2 });
});

console.log(`\n  ${prosly} v pořádku`);
