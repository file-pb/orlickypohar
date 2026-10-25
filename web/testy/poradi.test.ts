/**
 * Pořadí na vodě — co se smí hýbat a co ne.
 *
 * Jádro věci: **dojetá loď se v pořadí nehýbe**. Postup po trase umí
 * klesnout, protože se počítá z průmětu na trať a loď po cíli stáčí
 * k přístavu; bez tohohle pravidla se dojeté lodě na tabuli přehazují
 * (Filip, 25. 10. 2026).
 */
import assert from 'node:assert/strict';

import { seradNaVode } from '../lib/poradi-na-vode.ts';

let prosly = 0;
function zkus(nazev: string, f: () => void) {
  try { f(); prosly += 1; console.log('  ok   ' + nazev); }
  catch (e) { console.log('  CHYBA ' + nazev + ': ' + (e as Error).message); process.exitCode = 1; }
}

type L = { id: string; postup: number; dojelaV: number | null; nedostupna: boolean };
const lod = (id: string, postup: number, dojelaV: number | null = null, nedostupna = false): L =>
  ({ id, postup, dojelaV, nedostupna });
const poradi = (l: L[]) => seradNaVode(l).map((x) => x.id);

console.log('Pořadí na vodě');

zkus('kdo je dál po trati, je výš', () => {
  assert.deepEqual(poradi([lod('b', 10), lod('a', 90), lod('c', 50)]), ['a', 'c', 'b']);
});

zkus('dojetá loď stojí nad jedoucími', () => {
  // I když má menší postup: cíl je cíl.
  assert.deepEqual(poradi([lod('jede', 99), lod('dojela', 80, 1000)]), ['dojela', 'jede']);
});

zkus('mezi dojetými rozhoduje čas cíle, ne postup', () => {
  assert.deepEqual(
    poradi([lod('druha', 100, 2000), lod('prvni', 95, 1000)]),
    ['prvni', 'druha'],
  );
});

zkus('dojetou loď nerozhodí, že jí postup po cíli klesne', () => {
  // Přesně ten případ z tabule: loď protla cíl první a pak stočila
  // k přístavu, takže jí průmět na trať sjel zpátky.
  const pred = poradi([lod('prvni', 100, 1000), lod('druha', 98, 1200)]);
  const po = poradi([lod('prvni', 40, 1000), lod('druha', 98, 1200)]);
  assert.deepEqual(pred, ['prvni', 'druha']);
  assert.deepEqual(po, ['prvni', 'druha'], 'pořadí se po dojezdu měnit nesmí');
});

zkus('nedostupná loď propadá nakonec', () => {
  assert.deepEqual(
    poradi([lod('mlci', 99, null, true), lod('hlasi', 10)]),
    ['hlasi', 'mlci'],
  );
});

zkus('ale dojetá loď propadnout nemůže, i když zmlkne', () => {
  // Telefon po dojezdu zhasne nebo se vybije — o pořadí je už rozhodnuto.
  assert.deepEqual(
    poradi([lod('jede', 99), lod('dojela', 80, 1000, true)]),
    ['dojela', 'jede'],
  );
});

zkus('vstup se nemění', () => {
  const vstup = [lod('b', 10), lod('a', 90)];
  seradNaVode(vstup);
  assert.deepEqual(vstup.map((x) => x.id), ['b', 'a'], 'seřadit se má kopie');
});

console.log(`\n${prosly} kontrol prošlo.`);
