/**
 * Co tabule ohlásí kartou — a co ne.
 *
 * Nejdůležitější je rozdíl mezi **čerstvým dojezdem** a **sadou, která
 * šla ven**: obojí vypadá v datech stejně (řádek, který v minulém snímku
 * nebyl), a dokud se to nerozlišovalo, vyjela při publikaci karta za
 * každou loď. Na televizi, kterou nikdo neobsluhuje, to byla skoro minuta
 * převalujícího se závodu, který dojel před hodinou.
 */
import assert from 'node:assert/strict';

import { CERSTVY_DOJEZD_S, udalosti } from '../lib/tabule-udalosti.ts';
import type { Snimek } from '../lib/tabule.ts';

let prosly = 0;
function zkus(nazev: string, f: () => void) {
  try { f(); prosly += 1; console.log('  ok   ' + nazev); }
  catch (e) { console.log('  CHYBA ' + nazev + ': ' + (e as Error).message); process.exitCode = 1; }
}

const START = Date.parse('2027-05-15T10:00:00Z');
/** Snímek pořízený `vterin` po startu rozjížďky. */
const TED = (vterin: number) => new Date(START + vterin * 1000).toISOString();

type Radek = Snimek['rozjizdky'][number]['poradi'][number];
const lod = (jmeno: string, misto: number, cas: number | null): Radek =>
  ({ lod: jmeno, kategorie: 'Race', misto, kod: null, cas });

const snimek = (kdyVterin: number, poradi: Radek[], stav = 'Probiha'): Snimek =>
  ({
    kdy: TED(kdyVterin),
    zpravy: [], nazev: 'Izolepa', stav: 'Vypsany', vysledkySkryte: false, procesniDej: false,
    lode: [], tabule: [], oknoDo: null, znacky: [], trat: null, mapa: [],
    zavod: {},
    rozjizdky: [{
      cislo: 1, stav, stavVysledku: 'Navrzeno',
      startV: new Date(START).toISOString(), doSerie: true, poradi,
    }],
  }) as unknown as Snimek;

console.log('Události tabule');

zkus('první snímek není změna', () => {
  assert.deepEqual(udalosti(null, snimek(60, [lod('MAMBA', 1, 50)])), []);
});

zkus('loď, která právě projela cílem, dostane kartu', () => {
  const u = udalosti(snimek(40, []), snimek(55, [lod('MAMBA', 1, 50)]));
  assert.equal(u.length, 1);
  assert.equal(u[0].druh, 'dojezd');
  assert.equal(u[0].titulek, '1. MAMBA');
});

zkus('dojezd starší než okno čerstvosti kartu nedostane', () => {
  const pozde = CERSTVY_DOJEZD_S + 30;
  const u = udalosti(snimek(40, []), snimek(50 + pozde, [lod('MAMBA', 1, 50)]));
  assert.deepEqual(u.filter((x) => x.druh === 'dojezd'), []);
});

zkus('publikovaná sada je jedna karta, ne karta za loď', () => {
  const hotovo = [
    lod('MAMBA', 1, 50), lod('ČERVENÉ CAFE', 2, 54), lod('MODRÉ CAFE', 3, 56),
    lod('SEA MOUSE III', 4, 62), lod('LUNA', 5, 70),
  ];
  // Správce pustil čísla ven hodinu po dojezdu.
  const u = udalosti(snimek(3600, [], 'Dokoncena'), snimek(3615, hotovo, 'Dokoncena'));
  assert.equal(u.length, 1);
  assert.equal(u[0].druh, 'venku');
  assert.equal(u[0].titulek, '1. rozjížďka je venku');
  assert.equal(u[0].detail, '5 lodí v cíli');
});

zkus('jedna loď dopsaná dodatečně je oprava, ne zpráva', () => {
  const u = udalosti(
    snimek(3600, [lod('MAMBA', 1, 50)], 'Dokoncena'),
    snimek(3615, [lod('MAMBA', 1, 50), lod('SOCKA', 2, 80)], 'Dokoncena'),
  );
  assert.deepEqual(u, []);
});

zkus('dvě lodě bez zapsaného času jsou sada, ne dva čerstvé dojezdy', () => {
  const u = udalosti(
    snimek(60, []),
    snimek(70, [lod('MAMBA', 1, null), lod('SOCKA', 2, null)]),
  );
  assert.equal(u.length, 1);
  assert.equal(u[0].druh, 'venku');
  assert.equal(u[0].detail, '2 lodě v cíli');
});

zkus('čerstvé a staré v jedné dávce se nesmíchají', () => {
  const stare = [lod('MAMBA', 1, 50), lod('ČERVENÉ CAFE', 2, 54)];
  const u = udalosti(
    snimek(600, stare, 'Probiha'),
    snimek(615, [...stare, lod('SOCKA', 3, 600), lod('JOY', 4, 60), lod('LUNA', 5, 62)]),
  );
  // SOCKA dojela před patnácti vteřinami, JOY a LUNA před devíti minutami.
  assert.deepEqual(u.map((x) => x.druh), ['dojezd', 'venku']);
  assert.equal(u[0].titulek, '3. SOCKA');
  assert.equal(u[1].detail, '2 lodě v cíli');
});

zkus('táž sada podruhé se nehlásí', () => {
  const hotovo = [lod('MAMBA', 1, 50), lod('SOCKA', 2, 80)];
  assert.deepEqual(udalosti(snimek(3600, hotovo, 'Dokoncena'), snimek(3615, hotovo, 'Dokoncena')), []);
});

console.log(`\n${prosly} prošlo`);
