/**
 * Co stojí v pravém sloupci řádky trati.
 *
 * Měří se pravidlo, ne vykreslení: že hotová řádka **mlčí**, že zámek
 * přebíjí všechno ostatní, a že stavy jdou v pořadí, které plyne z toho,
 * co každý z nich dovoluje — ne ze závažnosti.
 */
import assert from 'node:assert/strict';

import { opakovaniUJmena, stavRadky, type VstupRadky } from '../src/lib/radka-trati.ts';

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

const nic: VstupRadky = {
  zamceno: false,
  veFronte: false,
  chybiDruhyKonec: false,
  zPlanu: false,
  bezFotky: false,
};

zkus('hotová řádka mlčí, protože je nejčastější', () => {
  assert.equal(stavRadky(nic), null);
});

zkus('zámek přebíjí i chybějící fotku a plán', () => {
  assert.equal(
    stavRadky({ ...nic, zamceno: true, bezFotky: true, zPlanu: true }),
    'čeká na odemčení',
  );
});

zkus('fronta je dřív než chybějící konec', () => {
  assert.equal(stavRadky({ ...nic, veFronte: true, chybiDruhyKonec: true }), 'čeká');
});

zkus('chybějící konec je dřív než plán', () => {
  assert.equal(stavRadky({ ...nic, chybiDruhyKonec: true, zPlanu: true }), 'chybí druhý konec');
});

zkus('plán je dřív než chybějící fotka', () => {
  assert.equal(stavRadky({ ...nic, zPlanu: true, bezFotky: true }), 'z plánu');
});

zkus('chybějící fotka zůstane, když nic jiného nepřekáží', () => {
  assert.equal(stavRadky({ ...nic, bezFotky: true }), 'chybí fotka');
});

zkus('jeden průjezd se u jména nepíše', () => {
  assert.equal(opakovaniUJmena(1), null);
});

zkus('dva průjezdy se u jména píšou', () => {
  assert.equal(opakovaniUJmena(2), '2×');
});

zkus('maraton nemá číslo, krouží pořád', () => {
  assert.equal(opakovaniUJmena('porad'), 'pořád');
});

console.log(`\n  ${prosly} v pořádku`);
