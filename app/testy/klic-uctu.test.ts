/**
 * Co appka udělá s tím, co člověk zadá nebo načte z QR.
 *
 * Měří se jediná čistá věc z napojení: že se kód pozná i z celé adresy.
 * QR totiž nenese holý kód, ale `…/napojeni?kod=…` — telefon bez appky
 * má skončit na stránce, která mu poradí, ne na nefunkčním odkazu.
 */
import assert from 'node:assert/strict';

import { kodZeVstupu } from '../src/lib/klic-uctu.ts';

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

zkus('holý kód projde', () => {
  assert.equal(kodZeVstupu('JJJ6226Q'), 'JJJ6226Q');
});

zkus('kód z adresy se vyloupne', () => {
  assert.equal(
    kodZeVstupu('https://orlickypohar.klihovka.cz/napojeni?kod=JJJ6226Q'),
    'JJJ6226Q',
  );
});

zkus('na pořadí parametrů nezáleží', () => {
  assert.equal(kodZeVstupu('https://web/napojeni?od=qr&kod=ABC234XY'), 'ABC234XY');
});

zkus('opsané z ruky: malá písmena a mezery', () => {
  // Osm znaků se z papíru opisuje po dvojicích a nikdo nehlídá velikost.
  assert.equal(kodZeVstupu(' jjj 6226 q '), 'JJJ6226Q');
});

zkus('procenta z adresy se rozkódují', () => {
  assert.equal(kodZeVstupu('https://web/napojeni?kod=AB%32CD'), 'AB2CD');
});

zkus('prázdný vstup dá prázdno, ne nesmysl', () => {
  assert.equal(kodZeVstupu('   '), '');
});

console.log(`  ${prosly} prošlo`);
