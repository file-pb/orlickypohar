/**
 * Panýlky rozjížděk na tabuli — kdy co řeknou.
 *
 * Jde hlavně o startovní proceduru: ta se musí ukázat **jen** v těch pár
 * minutách před startem a jinde po ní nesmí zbýt ani stopa. V mocku se to
 * nedá zahlédnout, protože tam žádná rozjížďka nečeká na start.
 */
import assert from 'node:assert/strict';

import { popis, procedura } from '../lib/rozjizdky-tabule.ts';

let prosly = 0;
function zkus(nazev: string, f: () => void) {
  try { f(); prosly += 1; console.log('  ok   ' + nazev); }
  catch (e) { console.log('  CHYBA ' + nazev + ': ' + (e as Error).message); process.exitCode = 1; }
}

const TED = Date.parse('2027-05-15T10:00:00Z');
const za = (vterin: number) => new Date(TED + vterin * 1000).toISOString();
type R = Parameters<typeof popis>[0];
const r = (stav: string, startV: string | null): R =>
  ({ cislo: 1, stav, stavVysledku: null, startV, doSerie: true, poradi: [] }) as unknown as R;

console.log('Panýlky rozjížděk');

zkus('rozjížďka, na které se nic neděje, řekne jen číslo', () => {
  assert.equal(popis(r('Planovana', za(3600)), TED), null);
  assert.equal(popis(r('Dokoncena', za(-3600)), TED), null);
});

zkus('probíhající ukáže čas od startu', () => {
  assert.equal(popis(r('Probiha', za(-(14 * 60 + 22))), TED), 'jede se 14:22');
});

zkus('zrušená to řekne', () => {
  assert.equal(popis(r('Zrusena', null), TED), 'zrušena');
});

zkus('startovní procedura běží pět minut před startem', () => {
  const s = { rozjizdky: [r('Planovana', za(4 * 60 + 12))] };
  assert.equal(procedura(s, TED), 4 * 60 + 12);
});

zkus('dřív než pět minut před startem procedura neběží', () => {
  // Odpočet od rána by na tabuli visel celý den a nic neříkal.
  const s = { rozjizdky: [r('Planovana', za(20 * 60))] };
  assert.equal(procedura(s, TED), null);
});

zkus('po startu procedura zmizí', () => {
  const s = { rozjizdky: [r('Probiha', za(-30))] };
  assert.equal(procedura(s, TED), null);
});

zkus('bez času startu se nic nepředstírá', () => {
  // Nedosazuje se pravděpodobná hodnota: bez `startV` se neví nic.
  const s = { rozjizdky: [r('Planovana', null)] };
  assert.equal(procedura(s, TED), null);
});

zkus('z několika rozjížděk se chytí ta, která se zrovna startuje', () => {
  const s = { rozjizdky: [
    r('Dokoncena', za(-7200)),
    r('Planovana', za(60)),
    r('Planovana', za(7200)),
  ] };
  assert.equal(procedura(s, TED), 60);
});

console.log(`\n${prosly} kontrol prošlo.`);
