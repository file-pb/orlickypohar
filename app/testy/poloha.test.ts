/**
 * Kdy se poloha smí vzít jako pípnutí.
 *
 * Jádro je <b>stáří fixu</b>. Systém umí vrátit polohu zaměřenou před
 * chvílí, a protože stavitel mezi dvěma body popojede, položila by taková
 * poloha druhou značku tam, kde stála první — a na obrazovce by to
 * vypadalo stejně jako správné pípnutí. Zbytek pravidel je opsaný ze
 * serveru, aby se do fronty nedostal prvek, který stejně odmítne.
 */
import assert from 'node:assert/strict';

import {
  NEJSTARSI_FIX_MS,
  popisPresnosti,
  posud,
  type Fix,
} from '../src/lib/stavba/poloha.ts';

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

const TED = 1_800_000_000_000;
const naOrliku = (zmena: Partial<Fix> = {}): Fix => ({
  sirka: 49.516,
  delka: 14.165,
  presnostM: 5,
  kdy: TED,
  ...zmena,
});

zkus('čerstvá a přesná poloha projde bez poznámky', () => {
  const p = posud(naOrliku(), TED);
  assert.equal(p.ok, true);
  assert.equal(p.ok && p.varovani, null);
});

zkus('bez polohy se nepípá', () => {
  assert.equal(posud(null, TED).ok, false);
});

zkus('stará poloha neprojde, i když je jinak v pořádku', () => {
  // Tohle je ta past, kvůli které pravidlo existuje: souřadnice jsou
  // platné, přesnost skvělá, a přesto je to místo, kde loď stála před
  // chvílí.
  const p = posud(naOrliku({ kdy: TED - NEJSTARSI_FIX_MS - 1 }), TED);
  assert.equal(p.ok, false);
  assert.match(p.ok ? '' : p.proc, /stará/);
});

zkus('poloha těsně pod mezí stáří projde', () => {
  assert.equal(posud(naOrliku({ kdy: TED - NEJSTARSI_FIX_MS + 1 }), TED).ok, true);
});

zkus('fix z budoucnosti znamená rozejité hodiny, ne čerstvost', () => {
  const p = posud(naOrliku({ kdy: TED + NEJSTARSI_FIX_MS * 2 }), TED);
  assert.equal(p.ok, false);
  assert.match(p.ok ? '' : p.proc, /[Hh]odiny/);
});

zkus('přesnost nad sto metrů neprojde — server ji stejně odmítne', () => {
  assert.equal(posud(naOrliku({ presnostM: 101 }), TED).ok, false);
  assert.equal(posud(naOrliku({ presnostM: 100 }), TED).ok, true);
});

zkus('mezi dvaceti pěti a sto metry se pípnout dá, ale řekne se to', () => {
  const p = posud(naOrliku({ presnostM: 40 }), TED);
  assert.equal(p.ok, true);
  assert.ok(p.ok && p.varovani);
});

zkus('neznámá přesnost pípnutí nebrání, jen se o ní ví', () => {
  const p = posud(naOrliku({ presnostM: null }), TED);
  assert.equal(p.ok, true);
  assert.ok(p.ok && p.varovani);
});

zkus('poloha mimo Orlík neprojde, včetně prohozené šířky a délky', () => {
  assert.equal(posud(naOrliku({ sirka: 14.165, delka: 49.516 }), TED).ok, false);
  assert.equal(posud(naOrliku({ sirka: 50.08 }), TED).ok, false);
});

zkus('stáří se posuzuje dřív než poloha', () => {
  // Jinak by stará poloha z Prahy hlásila „nejsi na Orlíku" — pravdu
  // o špatné věci. Stavitel by hledal signál družic a čekal na něco,
  // co se samo nespraví.
  const p = posud({ sirka: 50.08, delka: 14.43, presnostM: 5, kdy: TED - 60_000 }, TED);
  assert.equal(p.ok, false);
  assert.match(p.ok ? '' : p.proc, /stará/);
});

zkus('přesnost se vypisuje číslem, ne slovem', () => {
  assert.equal(popisPresnosti(naOrliku({ presnostM: 4.6 })), '±5 m');
  assert.equal(popisPresnosti(naOrliku({ presnostM: null })), 'přesnost neznámá');
  assert.equal(popisPresnosti(null), 'hledám polohu');
});

console.log(`  ${prosly} prošlo`);
