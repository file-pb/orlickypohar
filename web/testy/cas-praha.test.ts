/**
 * Místní čas Orlíku proti okamžiku.
 *
 * Dvě pasti, obě už někde v projektu uhodily: server jede v UTC, takže
 * „10:55" zapsané do formuláře není 10:55Z, a posun se musí počítat
 * k tomu dni, ne k dnešku — vypsání se píše v zimě na květnový závod.
 */
import assert from 'node:assert/strict';

import { mistniZOkamziku, okamzikZMistniho } from '../lib/cas-praha.ts';

let prosly = 0;
function zkus(nazev: string, f: () => void) {
  try { f(); prosly += 1; console.log('  ok   ' + nazev); }
  catch (e) { console.log('  CHYBA ' + nazev + ': ' + (e as Error).message); process.exitCode = 1; }
}

console.log('Čas Orlíku');

zkus('v květnu je Praha o dvě hodiny napřed', () => {
  assert.equal(okamzikZMistniho('2027-05-15T10:55'), '2027-05-15T08:55:00.000Z');
});

zkus('v lednu o jednu', () => {
  assert.equal(okamzikZMistniho('2027-01-15T10:55'), '2027-01-15T09:55:00.000Z');
});

zkus('prázdný a nesmyslný vstup nedá okamžik', () => {
  assert.equal(okamzikZMistniho(''), null);
  assert.equal(okamzikZMistniho(null), null);
  assert.equal(okamzikZMistniho('tohle není datum'), null);
});

zkus('zpátky do formuláře se vrátí tentýž místní čas', () => {
  for (const mistni of ['2027-05-15T10:55', '2027-01-15T10:55', '2027-10-31T02:30']) {
    assert.equal(mistniZOkamziku(okamzikZMistniho(mistni)), mistni, mistni);
  }
});

zkus('okamžik ze serveru se ukáže v čase Orlíku, ne v UTC', () => {
  assert.equal(mistniZOkamziku('2027-05-15T08:55:00Z'), '2027-05-15T10:55');
});

zkus('prázdno zůstane prázdné', () => {
  assert.equal(mistniZOkamziku(null), '');
  assert.equal(mistniZOkamziku('nesmysl'), '');
});

console.log(`\n  ${prosly} v pořádku`);
