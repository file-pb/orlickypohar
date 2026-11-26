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
  jePrvniNabeh, kdy, kratkyOtisk, popisBalicku, popisHledani, popisPuvodu, puvod,
  stavBalicku, verzeKratce, videnaVerze, zapamatuj, type Vydani,
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


/* ---------------------------------------------------------------------------
 * Balíček v obchodě
 *
 * Aktualizace po síti hledají jen pro otisk, na kterém appka běží. Po
 * nativní změně proto hlásí „aktuální", zatímco v Play leží nová verze —
 * tyhle testy hlídají, že seznam vydaných balíčků řekne pravdu, a hlavně
 * že neřekne „aktualizuj" tam, kde by to byla lež.
 * ------------------------------------------------------------------------ */

const A = 'af0083f42f028367c6244d3b0f83a6202a725c23';
const B = '84146e78d94b4ab28d7e36a9c22d3bae60b8ee6b';
const v = (cisloBalicku: number, otisk: string): Vydani =>
  ({ cisloBalicku, otisk, vydanoV: '2026-11-26T23:02:38Z' });

await zkus('poslední otisk v obchodě je můj: aktuální', () => {
  const s = stavBalicku([v(18, B), v(17, A)], B, 'production');
  assert.equal(s.druh, 'aktualni');
});

await zkus('můj otisk je starší balíček: v obchodě je novější', () => {
  const s = stavBalicku([v(18, B), v(17, A)], A, 'production');
  assert.equal(s.druh, 'novejsi');
  if (s.druh !== 'novejsi') return;
  assert.equal(s.posledni.cisloBalicku, 18);
  assert.equal(s.muj.cisloBalicku, 17);
});

await zkus('neznámý otisk není „novější venku"', () => {
  // Vývojový build, nebo balíček, jehož zápis se nepovedl. Rada
  // „aktualizuj" by poslala člověka hledat verzi, kterou už má.
  assert.equal(stavBalicku([v(18, B)], 'ffffffff', 'production').druh, 'neznamy');
});

await zkus('APK z webu a vývojový build se neptají obchodu', () => {
  assert.equal(stavBalicku([v(18, B), v(17, A)], A, 'preview').druh, 'neznamy');
  assert.equal(stavBalicku([v(18, B), v(17, A)], A, null).druh, 'neznamy');
});

await zkus('prázdný seznam ani chybějící otisk nic netvrdí', () => {
  assert.equal(stavBalicku([], A, 'production').druh, 'neznamy');
  assert.equal(stavBalicku([v(18, B)], null, 'production').druh, 'neznamy');
});

await zkus('na pořadí z API se nespoléhá', () => {
  // Vzestupně: kdyby se bral první prvek, vyšel by starý balíček jako
  // poslední a telefon s ním by dostal „aktuální".
  const s = stavBalicku([v(17, A), v(18, B)], A, 'production');
  assert.equal(s.druh, 'novejsi');
});

await zkus('tentýž otisk pod dvěma čísly: počítá se vyšší', () => {
  // Ruční „nahrát znovu" dá stejnému otisku nové číslo.
  const s = stavBalicku([v(19, B), v(18, A), v(17, A)], A, 'production');
  assert.equal(s.druh, 'novejsi');
  if (s.druh === 'novejsi') assert.equal(s.muj.cisloBalicku, 18);
});

await zkus('věta o novější verzi řekne obě čísla a proč se to nestáhne samo', () => {
  const veta = popisBalicku(stavBalicku([v(18, B), v(17, A)], A, 'production'));
  assert.ok(veta);
  assert.match(veta, /č\. 18/);
  assert.match(veta, /máš č\. 17/);
  assert.match(veta, /sama se nestáhne/);
  assert.equal(popisBalicku({ druh: 'neznamy' }), null);
});

await zkus('patička nabídky: číslo, když je známé, jinak otisk', () => {
  assert.equal(
    verzeKratce(stavBalicku([v(18, B)], B, 'production'), B),
    'Nejnovější verze · balíček č. 18',
  );
  assert.equal(
    verzeKratce(stavBalicku([v(18, B), v(17, A)], A, 'production'), A),
    'Máš balíček č. 17 · v obchodě je č. 18',
  );
  assert.equal(verzeKratce({ druh: 'neznamy' }, A), 'Otisk af0083f4');
  assert.equal(verzeKratce(null, null), null);
});

console.log(`  ${prosly} prošlo`);
