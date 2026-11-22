/**
 * Dvě fáze u zahození prvku z fronty.
 *
 * Měří se to, na čem se shodly všechny tři obory: prodleva proti
 * dvojklepu z houpnutí lodi, a že otevřené potvrzení nečeká donekonečna.
 */
import assert from 'node:assert/strict';

import { PLATNOST_MS, PRODLEVA_MS, lzePotvrdit, vyprselo } from '../src/lib/stavba/potvrzeni.ts';

let prosly = 0;
function zkus(nazev: string, f: () => void) {
  try {
    f();
    prosly += 1;
    console.log('  ok   ' + nazev);
  } catch (e) {
    console.log('  CHYBA ' + nazev + ': ' + (e as Error).message);
    process.exitCode = 1;
  }
}

zkus('zavřené potvrzení nepřijme nic', () => {
  assert.equal(lzePotvrdit(null, 1_000), false);
  assert.equal(vyprselo(null, 1_000_000), false);
});

zkus('dvojklep z houpnutí lodi neprojde', () => {
  // Druhé klepnutí hned po prvním je to, co prodleva zachycuje.
  assert.equal(lzePotvrdit(1_000, 1_050), false);
  assert.equal(lzePotvrdit(1_000, 1_000 + PRODLEVA_MS - 1), false);
});

zkus('po prodlevě se klepnutí přijme', () => {
  assert.equal(lzePotvrdit(1_000, 1_000 + PRODLEVA_MS), true);
  assert.equal(lzePotvrdit(1_000, 1_000 + 2_000), true);
});

zkus('po pěti vteřinách potvrzení neplatí a zavírá se', () => {
  assert.equal(lzePotvrdit(1_000, 1_000 + PLATNOST_MS), false);
  assert.equal(vyprselo(1_000, 1_000 + PLATNOST_MS), true);
  assert.equal(vyprselo(1_000, 1_000 + PLATNOST_MS - 1), false);
});

console.log(`\n  ${prosly} v pořádku`);
