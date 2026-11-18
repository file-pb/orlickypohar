/**
 * Který krok je ten, na který se čeká.
 *
 * Rozhoduje o tom, co na kartě rozjížďky dostane váhu. Splést se dá dvěma
 * směry a oba jsou drahé: zvýraznit couvnutí, nebo zvýraznit správcův
 * přeskok a dělat z výjimky obvyklou cestu.
 */
import assert from 'node:assert/strict';

import { krokVpred } from '../lib/workflow.ts';
import type { StavVysledku } from '../lib/vysledky.ts';

let prosly = 0;
function zkus(nazev: string, f: () => void) {
  try { f(); prosly += 1; console.log('  ok   ' + nazev); }
  catch (e) { console.log('  CHYBA ' + nazev + ': ' + (e as Error).message); process.exitCode = 1; }
}

const s = (...x: string[]) => x as StavVysledku[];

console.log('Krok vpřed ve workflow výsledků');

zkus('z návrhu se podepisuje', () => {
  assert.equal(krokVpred('Navrzeno', s('Schvaleno', 'Potvrzeno', 'Eliminovano')), 'Schvaleno');
});

zkus('z podpisu se potvrzuje', () => {
  assert.equal(krokVpred('Schvaleno', s('Potvrzeno', 'KRevizi', 'Eliminovano')), 'Potvrzeno');
});

zkus('potvrzená rozjížďka už nemá kam', () => {
  assert.equal(krokVpred('Potvrzeno', s('KRevizi', 'Eliminovano')), null);
});

zkus('z revize vede cesta na návrh, a je to krok vpřed', () => {
  // Zní to jako couvnutí, ale je to jediné, co se dá udělat — proto se
  // tlačítko jmenuje „Otevřít k opravě", ne „Vrátit do návrhu".
  assert.equal(krokVpred('KRevizi', s('Navrzeno', 'Eliminovano')), 'Navrzeno');
});

zkus('ze zrušené taky na návrh', () => {
  assert.equal(krokVpred('Eliminovano', s('Navrzeno')), 'Navrzeno');
});

zkus('správcův přeskok se nezvýrazňuje', () => {
  // API nabídne správci `Potvrzeno` rovnou z návrhu. Obvyklá cesta je
  // ale řada po jednom stupni; přeskok patří mezi ostatní úkony.
  assert.equal(krokVpred('Navrzeno', s('Schvaleno', 'Potvrzeno')), 'Schvaleno');
});

zkus('co API nenabídlo, se nenabídne ani tady', () => {
  // Rozhoduje server; obrazovka smí být přísnější, nikdy volnější.
  assert.equal(krokVpred('Navrzeno', s('Eliminovano')), null);
  assert.equal(krokVpred('KRevizi', s('Eliminovano')), null);
});

zkus('prázdná nabídka nevydá nic', () => {
  assert.equal(krokVpred('Navrzeno', s()), null);
  assert.equal(krokVpred('Potvrzeno', s()), null);
});

console.log(`\n  ${prosly} v pořádku`);
