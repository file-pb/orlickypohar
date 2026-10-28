/**
 * Na čem appka jede a kdy to má ohlásit.
 *
 * Měří se dvě věci, které by jinak nikdo nezkusil, dokud by je Miloš
 * nenahlásil: že se banner o aktualizaci <b>neukáže podruhé</b> (jinak by
 * svítil při každém otevření appky) a že se u <b>další</b> aktualizace
 * ukáže znovu (na tom by selhal uložený příznak místo ID). Navrch čas
 * v místním pásmu, protože na UTC se dá šlápnout tak, že to nikdo nepozná.
 */
import assert from 'node:assert/strict';
import { zapomenVse } from 'expo-file-system';
import { nastav } from 'expo-updates';

import {
  jePrvniNabeh, kdy, kratkyOtisk, popisHledani, popisPuvodu, puvod,
  videnaVerze, zapamatuj,
} from '../src/lib/verze.ts';

let prosly = 0;
async function zkus(nazev: string, f: () => Promise<void> | void) {
  try { await f(); prosly += 1; console.log('  ok   ' + nazev); }
  catch (e) { console.log('  CHYBA ' + nazev + ': ' + (e as Error).message); process.exitCode = 1; }
}

console.log('Verze appky');

await zkus('z instalačního souboru se nehlásí nic', () => {
  nastav({ isEnabled: true, isEmbeddedLaunch: true, updateId: 'apk-1' });
  assert.equal(jePrvniNabeh(null, puvod()), false);
});

await zkus('vypnuté aktualizace nehlásí nic, i když ID je', () => {
  nastav({ isEnabled: false, isEmbeddedLaunch: false, updateId: 'a' });
  assert.equal(jePrvniNabeh(null, puvod()), false);
});

await zkus('neviděná aktualizace se ohlásí', () => {
  nastav({ isEnabled: true, isEmbeddedLaunch: false, updateId: 'a' });
  assert.equal(jePrvniNabeh(null, puvod()), true);
});

await zkus('táž aktualizace se podruhé neohlásí', () => {
  zapomenVse();
  nastav({ isEnabled: true, isEmbeddedLaunch: false, updateId: 'a' });
  assert.equal(jePrvniNabeh(videnaVerze(), puvod()), true);
  zapamatuj('a');
  assert.equal(videnaVerze(), 'a');
  assert.equal(jePrvniNabeh(videnaVerze(), puvod()), false);
});

// Tohle je ten rozdíl proti uloženému příznaku „banner už byl": ten by po
// první aktualizaci zhasl navždy a druhá by se k Milošovi dostala tiše.
await zkus('další aktualizace se ohlásí znovu', () => {
  zapomenVse();
  nastav({ isEnabled: true, isEmbeddedLaunch: false, updateId: 'a' });
  zapamatuj('a');
  nastav({ updateId: 'b' });
  assert.equal(jePrvniNabeh(videnaVerze(), puvod()), true);
});

await zkus('čas je v místním pásmu, ne v UTC', () => {
  // Červen schválně: na konci října se mění letní čas a chyba o hodinu by
  // se dala omluvit přechodem. 15:42 UTC je v Praze 17:42 (CEST).
  assert.equal(kdy(new Date(Date.UTC(2026, 5, 15, 15, 42))), '15. června 2026 v 17:42');
});

await zkus('chybějící datum se nedomýšlí', () => {
  const bezData = popisPuvodu({ zAktualizace: true, vydano: null, otisk: null, id: 'a' });
  assert.match(bezData, /aktualizaci stažené po síti/);
  assert.doesNotMatch(bezData, /\d{4}/);
});

await zkus('APK a aktualizace se v popisu nepletou', () => {
  const zApk = popisPuvodu({ zAktualizace: false, vydano: null, otisk: null, id: null });
  assert.match(zApk, /instalačního souboru/);
  const zSite = popisPuvodu({
    zAktualizace: true, vydano: new Date(2026, 9, 28, 17, 42), otisk: null, id: 'a',
  });
  assert.match(zSite, /28. října 2026 v 17:42/);
});

await zkus('otisk se krátí na osm znaků a prázdný zůstane prázdný', () => {
  assert.equal(kratkyOtisk('c4d54801b117f3f57da9d2157e87723fca62f063'), 'c4d54801');
  assert.equal(kratkyOtisk(null), null);
});

await zkus('připravená verze přebije „je tu novinka"', () => {
  const s = { hleda: false, stahuje: false, cekaRestart: true, jeNovinka: true };
  assert.match(popisHledani(s), /zavřeš a znovu otevřeš/);
  assert.equal(
    popisHledani({ hleda: false, stahuje: false, cekaRestart: false, jeNovinka: false }),
    'Appka je aktuální.',
  );
});

console.log(`  ${prosly} prošlo`);
