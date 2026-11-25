/**
 * Skládání odběrů upozornění.
 *
 * Měří se to, co 25. 11. 2026 nesedělo: zapnutí jednoho ročníku nesmí
 * vypnout druhý. Našlo se to na skutečném zařízení, které mělo zapsaný
 * odběr ukázkového ročníku místo ostrého — appka posílala seznam
 * s jediným ročníkem, takže ten předchozí přepsala.
 */
import assert from 'node:assert/strict';

import { slozOdbery } from '../src/lib/odbery.ts';

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

const A = 'serie:2026-nanecisto';
const B = 'serie:2027';

zkus('první zapnutí na prázdném seznamu', () => {
  assert.deepEqual(slozOdbery([], B, true), [B]);
});

zkus('první zapnutí, když appka ještě nic neposlala', () => {
  assert.deepEqual(slozOdbery(null, B, true), [B]);
  assert.deepEqual(slozOdbery(undefined, B, true), [B]);
});

zkus('zapnutí druhého ročníku nevypne první', () => {
  assert.deepEqual(slozOdbery([A], B, true), [A, B]);
});

zkus('vypnutí jednoho nechá ostatní', () => {
  assert.deepEqual(slozOdbery([A, B], A, false), [B]);
});

zkus('vypnutí posledního dá prázdný seznam, ne null', () => {
  assert.deepEqual(slozOdbery([B], B, false), []);
});

zkus('zapnutí už zapnutého nic nepřidá ani nepřehází', () => {
  assert.deepEqual(slozOdbery([A, B], A, true), [A, B]);
});

zkus('vypnutí toho, co tam není, nic nezmění', () => {
  assert.deepEqual(slozOdbery([A], B, false), [A]);
});

zkus('pořadí přidávání zůstává', () => {
  assert.deepEqual(slozOdbery(slozOdbery([], A, true), B, true), [A, B]);
});

zkus('vstup se nemění pod rukama', () => {
  const puvodni = [A];
  slozOdbery(puvodni, B, true);
  assert.deepEqual(puvodni, [A]);
});

console.log(`  ${prosly} kontrol`);
