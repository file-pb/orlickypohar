/**
 * Kód k napojení appky, jak ho stránka *Můj účet* ukáže k opsání.
 *
 * <b>Proč na jednořádkovou funkci test.</b> Měří se dvě věci, které se
 * obě snadno rozbijí při úpravě vzhledu a ani jedna není vidět ze čtení
 * kódu: že se osm znaků rozdělí na dvě čtveřice, a že je mezi nimi
 * **nezlomitelná** mezera. S obyčejnou mezerou se kód na úzké obrazovce
 * zlomí na konci řádku a člověk opisuje přístupový údaj po částech ze
 * dvou řádků — přesně tam, kde se dělají chyby.
 */
import assert from 'node:assert/strict';

import { kodKOpsani } from '../lib/kod-k-opsani.ts';

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

zkus('osm znaků se rozdělí po čtyřech', () => {
  assert.equal(kodKOpsani('JKM62Q7P'), 'JKM6 2Q7P');
});

zkus('mezera je nezlomitelná', () => {
  // Obyčejná mezera by kód na mobilu zlomila na dva řádky.
  assert.ok(!kodKOpsani('JKM62Q7P').includes(' '));
});

zkus('kratší kód se nerozpadne', () => {
  assert.equal(kodKOpsani('JKM6'), 'JKM6');
  assert.equal(kodKOpsani(''), '');
});

console.log(`  ${prosly} prošlo`);
