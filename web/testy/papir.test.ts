/**
 * Čtení papírového zápisu nasypaného jako text.
 *
 * <b>Co se tu hlídá především:</b> že se nic tiše neztratí. Řádek, který
 * se nepodaří přiřadit, musí vyjít jako nepřečtený — rozhodčí, který
 * porovnává verze, jinak uvidí tabulku a uvěří, že je celá.
 */
import assert from 'node:assert/strict';

import { prectiPapir, type LodKParovani } from '../lib/papir.ts';

let prosly = 0;
function zkus(nazev: string, f: () => void) {
  try { f(); prosly += 1; console.log('  ok   ' + nazev); }
  catch (e) { console.log('  CHYBA ' + nazev + ': ' + (e as Error).message); process.exitCode = 1; }
}

const LODE: LodKParovani[] = [
  { prihlaskaId: 1, lod: 'LUNA', cisloPlachty: 'CZE 783' },
  { prihlaskaId: 2, lod: 'SENDY', cisloPlachty: 'CZE 125' },
  { prihlaskaId: 3, lod: 'FAR  STAR III', cisloPlachty: null },
  { prihlaskaId: 4, lod: 'Charlotte III', cisloPlachty: null },
  { prihlaskaId: 5, lod: 'M1', cisloPlachty: null },
  { prihlaskaId: 6, lod: 'MODRÉ CAFE', cisloPlachty: null },
];

console.log('Čtení papírového zápisu');

zkus('pořadí a kódy se přečtou', () => {
  const v = prectiPapir('LUNA 1\nSENDY 2\nM1 DNF', LODE);
  assert.deepEqual(v.radky, [
    { prihlaskaId: 1, poradiVCili: 1, kod: null },
    { prihlaskaId: 2, poradiVCili: 2, kod: null },
    { prihlaskaId: 5, poradiVCili: null, kod: 'Dnf' },
  ]);
  assert.deepEqual(v.neprecteno, []);
});

zkus('jméno se hledá od konce, takže lodě končící číslicí projdou', () => {
  // `M1 3` — bez hledání od konce by se „M" nespárovalo s ničím.
  const v = prectiPapir('M1 3\nCharlotte III 4', LODE);
  assert.deepEqual(v.radky.map((r) => r.prihlaskaId), [5, 4]);
  assert.deepEqual(v.radky.map((r) => r.poradiVCili), [3, 4]);
});

zkus('diakritika, velikost písma ani dvojité mezery nevadí', () => {
  const v = prectiPapir('modre cafe 1\nfar star iii 2', LODE);
  assert.deepEqual(v.radky.map((r) => r.prihlaskaId), [6, 3]);
});

zkus('oddělovač může být cokoliv nealfanumerického', () => {
  const v = prectiPapir('LUNA — 1\nSENDY: 2\nM1 . DNS', LODE);
  assert.deepEqual(v.radky.map((r) => [r.prihlaskaId, r.poradiVCili, r.kod]), [
    [1, 1, null],
    [2, 2, null],
    [5, null, 'Dns'],
  ]);
});

zkus('číslo plachty je na papíře často jediné čitelné', () => {
  const v = prectiPapir('CZE 783 1\nCZE 125 2', LODE);
  assert.deepEqual(v.radky.map((r) => r.prihlaskaId), [1, 2]);
});

zkus('neznámá loď se nezahodí, vyjde jako nepřečtená', () => {
  const v = prectiPapir('LUNA 1\nPLACHETNICE XY 2', LODE);
  assert.deepEqual(v.radky.map((r) => r.prihlaskaId), [1]);
  assert.deepEqual(v.neprecteno, ['PLACHETNICE XY 2']);
});

zkus('řádek bez čísla i bez kódu je nepřečtený', () => {
  const v = prectiPapir('LUNA\nSENDY ???\nM1 1', LODE);
  assert.deepEqual(v.radky.map((r) => r.prihlaskaId), [5]);
  assert.deepEqual(v.neprecteno, ['LUNA', 'SENDY ???']);
});

zkus('druhý zápis téže lodi je rozpor, ne oprava', () => {
  // Na papíře se škrtá a připisuje; dvě místa pro jednu loď znamenají,
  // že tomu člověk musí přijít na kloub, ne že platí to pozdější.
  const v = prectiPapir('LUNA 1\nSENDY 2\nLUNA 3', LODE);
  assert.deepEqual(v.radky.map((r) => [r.prihlaskaId, r.poradiVCili]), [[1, 1], [2, 2]]);
  assert.deepEqual(v.neprecteno, ['LUNA 3']);
});

zkus('prázdné řádky se přeskakují, nehlásí', () => {
  const v = prectiPapir('\n\nLUNA 1\n   \nSENDY 2\n\n', LODE);
  assert.equal(v.radky.length, 2);
  assert.deepEqual(v.neprecteno, []);
});

zkus('prázdný vstup nevydá nic', () => {
  assert.deepEqual(prectiPapir('', LODE), { radky: [], neprecteno: [] });
  assert.deepEqual(prectiPapir('   \n  ', LODE), { radky: [], neprecteno: [] });
});

zkus('pořadí nepřečtených je pořadí z papíru', () => {
  const v = prectiPapir('???\nLUNA 1\n!!!', LODE);
  assert.deepEqual(v.neprecteno, ['???', '!!!']);
});

console.log(`\n  ${prosly} v pořádku`);
