/**
 * Co appka u startu řekne a kdy zatroubí.
 *
 * Měří se partitura, ne přehrávání: že znamení padnou na okamžiky, které
 * jmenoval Miloš (nahrávka 21 — *„vyzývací znamení v pátý minutě, ve
 * čtvrtý minutě, přípravní znamení, minuta do startu a minuta"*), že se
 * před každým odpočítá, a že se při skoku hodin žádné neztratí.
 */
import assert from 'node:assert/strict';

import { coPrehrat, partitura, type Znameni } from '../src/lib/hlaseni.ts';

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

/** Jen okamžiky, ve kterých se troubí. */
const troubeni = (z: Znameni[]) =>
  z.filter((x) => x.troubi).map((x) => [x.vterinDoStartu, x.troubi]);

zkus('troubí se v pátou, čtvrtou, první minutu a na start', () => {
  assert.deepEqual(troubeni(partitura()), [
    [300, 'kratce'],
    [240, 'kratce'],
    [60, 'dlouze'],
    [0, 'kratce'],
  ]);
});

zkus('jedna minuta se troubí dlouze, ostatní krátce', () => {
  const dlouhe = partitura().filter((z) => z.troubi === 'dlouze');
  assert.equal(dlouhe.length, 1);
  assert.equal(dlouhe[0].vterinDoStartu, 60);
});

zkus('před každým znamením se odpočítá pět vteřin předem', () => {
  const p = partitura();
  for (const [kdy] of troubeni(p)) {
    const odpocet = p.find((z) => z.vterinDoStartu === (kdy as number) + 5);
    assert.ok(odpocet, `chybí odpočet před ${kdy}`);
    assert.match(odpocet!.rekni, /za pět, čtyři, tři, dva, jedna$/);
  }
});

zkus('po zahájení procedury se řekne, kolik zbývá, a zopakuje se to', () => {
  const p = partitura();
  const po = p.find((z) => z.vterinDoStartu === 300 && !z.troubi && z.rekni);
  assert.equal(po?.rekni, 'Pět minut do startu, opakuji, Pět minut do startu');
});

zkus('delší procedura posune jen zahájení, zbytek zůstává', () => {
  assert.deepEqual(troubeni(partitura(600)), [
    [600, 'kratce'],
    [240, 'kratce'],
    [60, 'dlouze'],
    [0, 'kratce'],
  ]);
});

zkus('u krátké procedury přípravné znamení odpadá', () => {
  // Tříminutovka: přípravné znamení by padlo dřív než vyzývací.
  assert.deepEqual(troubeni(partitura(180)), [
    [180, 'kratce'],
    [60, 'dlouze'],
    [0, 'kratce'],
  ]);
});

zkus('partitura jde odshora dolů, od zahájení ke startu', () => {
  const casy = partitura().map((z) => z.vterinDoStartu);
  assert.deepEqual(casy, [...casy].sort((a, b) => b - a));
});

zkus('mezi dvěma tiky se vybere to, co do okna spadlo', () => {
  // Hodiny tiknou z 61 na 59. Na šedesáté vteřině leží dvojice: nejdřív
  // se zatroubí, pak se řekne co — a v tom pořadí to musí i vyjít.
  const co = coPrehrat(61, 59);
  assert.deepEqual(
    co.map((z) => [z.vterinDoStartu, z.troubi]),
    [
      [60, 'dlouze'],
      [60, null],
    ],
  );
  assert.equal(co[1].rekni, 'Jedna minuta do startu, opakuji, Jedna minuta do startu');
});

zkus('nic se neztratí, když appka chvíli spala', () => {
  // Telefon se probudí o deset vteřin později: dostane obojí najednou
  // a vybrat si musí přehrávač, ne tahle tabulka.
  const co = coPrehrat(70, 58);
  assert.deepEqual(
    co.map((z) => z.vterinDoStartu),
    [65, 60, 60],
  );
});

zkus('mimo proceduru se nehraje nic', () => {
  assert.deepEqual(coPrehrat(400, 350), []);
  assert.deepEqual(coPrehrat(-5, -30), []);
});

console.log(`  ${prosly} prošlo`);
