/**
 * Shoda v cíli v klepacím listu (nález K7, ZPJ A7).
 *
 * Appka to umí od 7. 11. 2026, klepací list webu do 18. 11. ne — čísloval
 * místa jako `i + 1`, takže dvě stejná čísla v něm vzniknout nemohla a
 * rozhodčí u stolu shodu zapsat nedokázal. Okrajové případy (odebrání
 * prostřední lodi ze skupiny, shoda na prvním místě, přehazování šipkami)
 * se proklikat dají, ale ne pokaždé znovu.
 */
import assert from 'node:assert/strict';

import {
  cislaMist,
  cislaVKategoriich,
  odeberMisto,
  prepniShodu,
  prohodMista,
  shodyZCisel,
  type MistoVCili,
} from '../lib/cil-shoda.ts';

let prosly = 0;
function zkus(nazev: string, f: () => void) {
  try { f(); prosly += 1; console.log('  ok   ' + nazev); }
  catch (e) { console.log('  CHYBA ' + nazev + ': ' + (e as Error).message); process.exitCode = 1; }
}

/** Místo: id lodi, a jestli dojela shodně s tou nad sebou. */
const m = (id: number, shoda = false): MistoVCili =>
  ({ id, v: null, shodneSPredchozim: shoda });

console.log('Shoda v cíli');

zkus('bez shody se čísluje od jedničky', () => {
  assert.deepEqual(cislaMist([m(1), m(2), m(3)]), [1, 2, 3]);
});

zkus('dvě lodě třetí a za nimi pátá', () => {
  // A7 dělí body za obsazená místa: třetí a čtvrté berou 3,5 a další je
  // pátá. Kdyby se přečíslovalo, zmizelo by jedno obsazené místo.
  assert.deepEqual(cislaMist([m(1), m(2), m(3), m(4, true), m(5)]), [1, 2, 3, 3, 5]);
});

zkus('tři lodě na témž místě', () => {
  assert.deepEqual(cislaMist([m(1), m(2, true), m(3, true), m(4)]), [1, 1, 1, 4]);
});

zkus('shoda na prvním místě se ignoruje', () => {
  // Zbyde tam po odebrání lodi, se kterou se vázala. Číslo 1 je jediné
  // možné — s ničím nad sebou se shodovat nedá.
  assert.deepEqual(cislaMist([m(1, true), m(2)]), [1, 2]);
});

zkus('přepnutí shodu zapne a zruší', () => {
  const a = prepniShodu([m(1), m(2)], 1);
  assert.deepEqual(cislaMist(a), [1, 1]);
  assert.deepEqual(cislaMist(prepniShodu(a, 1)), [1, 2]);
});

zkus('na prvním místě přepnutí nic nedělá', () => {
  assert.equal(prepniShodu([m(1), m(2)], 0)[0].shodneSPredchozim, false);
});

zkus('vstup se nemění — vrací se nová sada', () => {
  const vstup = [m(1), m(2)];
  prepniShodu(vstup, 1);
  odeberMisto(vstup, 0);
  prohodMista(vstup, 0, 1);
  assert.deepEqual(cislaMist(vstup), [1, 2]);
});

zkus('odebraná loď ze skupiny předá shodu následníkovi', () => {
  // 1 · 2 = 3: lodě 2 a 3 jsou shodné. Odebere-li se dvojka, nesmí trojka
  // zůstat „shodná s předchozí" — to by ji přilepilo k jedničce, o které
  // nikdo nic netvrdil.
  const po = odeberMisto([m(1), m(2), m(3, true)], 1);
  assert.deepEqual(po.map((x) => x.id), [1, 3]);
  assert.deepEqual(cislaMist(po), [1, 2]);
});

zkus('odebraná první ze dvojice nechá shodu platit dál', () => {
  // 1 = 2 = 3, tedy všechny tři na témž místě. Odebráním dvojky zůstává
  // trojka shodná s jedničkou, a to je pravda.
  const po = odeberMisto([m(1), m(2, true), m(3, true)], 1);
  assert.deepEqual(cislaMist(po), [1, 1]);
});

zkus('odebrání mimo řadu nic nerozbije', () => {
  assert.deepEqual(odeberMisto([m(1)], 5).map((x) => x.id), [1]);
});

zkus('šipky hýbou loděmi, shoda a čas zůstávají u místa', () => {
  // Čas se v klepacím listu drží místa od 14. 11. 2026; shoda se chová
  // stejně, jinak by se při přehození tvrdilo něco o jiné dvojici.
  const vstup: MistoVCili[] = [
    { id: 1, v: 'a' },
    { id: 2, v: 'b' },
    { id: 3, v: 'c', shodneSPredchozim: true },
  ];
  const po = prohodMista(vstup, 2, 1);
  assert.deepEqual(po.map((x) => x.id), [1, 3, 2]);
  assert.deepEqual(po.map((x) => x.v), ['a', 'b', 'c']);
  assert.deepEqual(cislaMist(po), [1, 2, 2]);
});

zkus('prohození dvou shodných lodí je úkon bez následku', () => {
  const po = prohodMista([m(1), m(2), m(3, true)], 2, 1);
  assert.deepEqual(cislaMist(po), [1, 2, 2]);
});

zkus('shoda se pozná z čísel ze serveru', () => {
  assert.deepEqual(shodyZCisel([1, 2, 3, 3, 5]), [false, false, false, true, false]);
});

zkus('kategorie: shodné lodě téže kategorie mají v ní totéž číslo', () => {
  const kat = (id: number) => (id % 2 === 1 ? 'RACE' : 'do 7 m');
  // 1 RACE · 3 RACE shodná s 1 → v RACE obě první, a 5 je třetí.
  const mista = [m(1), m(3, true), m(5)];
  assert.deepEqual(cislaVKategoriich(mista, kat), [1, 1, 3]);
});

zkus('kategorie: shoda s jinou kategorií se v ní neprojeví', () => {
  const kat = (id: number) => (id % 2 === 1 ? 'RACE' : 'do 7 m');
  // Dvojka (do 7 m) je shodná s jedničkou (RACE). Mezi sebou se nepředjely,
  // ale ve své kategorii je každá první.
  assert.deepEqual(cislaVKategoriich([m(1), m(2, true)], kat), [1, 1]);
});

console.log(`\n  ${prosly} v pořádku`);
