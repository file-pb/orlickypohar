/**
 * Co appka udělá s tím, co člověk zadá nebo načte z QR.
 *
 * Měří se jediná čistá věc z napojení: že se kód pozná i z celé adresy.
 * QR totiž nenese holý kód, ale `…/napojeni?kod=…` — telefon bez appky
 * má skončit na stránce, která mu poradí, ne na nefunkčním odkazu.
 */
import assert from 'node:assert/strict';

import { kodZeSkenu, kodZeVstupu } from '../src/lib/klic-uctu.ts';

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


/* ---------------------------------------------------------------------------
 * Co se zahodí a co ne
 *
 * Kód je od 26. 11. 2026 osm znaků z abecedy bez nul, jedniček, I a O
 * (`KliceUctuSprava.Abeceda`). Do té doby to byl base64url ze 32 bajtů —
 * tedy 43 znaků s malými písmeny, které převod na velká pokaždé zničil.
 * Napojení kódem proto nemohlo projít vůbec; mock přitom vydával
 * osmiznakový kód, takže se ta neshoda neměla kde ukázat.
 * ------------------------------------------------------------------------ */

zkus('oddělovače z opisu zmizí', () => {
  assert.equal(kodZeVstupu('JKM6-2Q7P'), 'JKM62Q7P');
  assert.equal(kodZeVstupu('jkm6 2q7p'), 'JKM62Q7P');
});

zkus('znak mimo abecedu se zahodí, nepřeloží', () => {
  // Nula se nezmění na „O" ani naopak: u přístupového údaje by to
  // znamenalo tiše měnit, co člověk zadal. Obojí prostě zmizí.
  assert.equal(kodZeVstupu('J0O1I'), 'J');
  assert.equal(kodZeVstupu('JKM6+2Q7P'), 'JKM62Q7P');
});

zkus('kódem je jen to, co má osm znaků', () => {
  assert.equal(kodZeSkenu([{ data: 'JKM62Q7P' }]), 'JKM62Q7P');
  assert.equal(kodZeSkenu([{ data: 'JKM62Q' }]), null);
  assert.equal(kodZeSkenu([]), null);
});

zkus('náš QR se pozná podle parametru', () => {
  assert.equal(
    kodZeSkenu([{ data: 'https://orlickypohar.klihovka.cz/napojeni?kod=JKM62Q7P' }]),
    'JKM62Q7P',
  );
});

zkus('cizí QR o osmi platných znacích neprojde', () => {
  // `https://a.cz` dá po očištění `HTTPSACZ` — osm znaků z abecedy.
  // Kdyby rozhodovala jen délka, poslala by appka serveru cizí adresu.
  assert.equal(kodZeSkenu([{ data: 'https://a.cz' }]), null);
  assert.equal(kodZeSkenu([{ data: 'WIFI:S:Orlik;T:WPA;P:heslo;;' }]), null);
});

zkus('mezi cizími QR se najde ten náš', () => {
  // Snímek obrazovky zachytí i QR z vedlejší stránky a foťák namířený
  // na monitor klidně dva. Brát slepě první by znamenalo chybu nad
  // obrázkem, na kterém ten správný kód je.
  const nalezy = [
    { data: 'https://example.com/neco' },
    { data: 'tel:+420123456789' },
    { data: 'https://orlickypohar.klihovka.cz/napojeni?kod=JKM62Q7P' },
  ];
  assert.equal(kodZeSkenu(nalezy), 'JKM62Q7P');
});

console.log(`  ${prosly} prošlo`);
