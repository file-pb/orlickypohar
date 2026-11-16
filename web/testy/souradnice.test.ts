/**
 * Čtení polohy z adresy — a hlavně to, komu se adresa uzná jako Googlu.
 *
 * Dokud se hostitel porovnával `endsWith("google.com")`, prošla i doména
 * `evilgoogle.com`: čísla z cizí adresy se četla jako bod z Google Maps
 * (CodeQL `js/incomplete-url-substring-sanitization`, 14. 11. 2026).
 * Z obrazovky to vidět není — výsledek vypadá stejně, jen pochází
 * odjinud, než co stránka napíše.
 */
import assert from 'node:assert/strict';

import { DELKA_DO, SIRKA_OD, jeZkratka, precti } from '../lib/souradnice.ts';

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

const BOD = '49.4957,14.1841';

zkus('Google i jeho poddomény se čtou dál', () => {
  for (const host of ['google.com', 'www.google.com', 'maps.google.com', 'maps.google.com.']) {
    const c = precti(`https://${host.replace(/\.$/, '')}/maps/search/${BOD}`);
    assert.equal(c.stav, 'poloha', host + ' se má přečíst');
  }
});

zkus('doména s „google.com“ na konci jména se nečte jako Google', () => {
  for (const host of ['evilgoogle.com', 'notgoogle.com', 'agoogle.com']) {
    const c = precti(`https://${host}/maps/search/${BOD}`);
    assert.equal(c.stav, 'nic', host + ' nemá být uznán jako Google');
  }
});

zkus('cizí doména s dvojicí v parametru se čte dál jako souřadnice z adresy', () => {
  // Tohle se nemění: pravidlo níž v `zAdresy` bere `q=` z čehokoliv a je
  // to záměr — dvojice čísel je dvojice čísel, ať přišla odkudkoliv.
  const c = precti(`https://evilgoogle.com/x?q=${BOD}`);
  assert.equal(c.stav, 'poloha');
  assert.equal(c.stav === 'poloha' ? c.jak : '', 'souřadnice z adresy');
});

zkus('Mapy.com a Google zkratky se poznají přesnou shodou', () => {
  assert.equal(jeZkratka(new URL('https://mapy.com/s/zluty')), true);
  assert.equal(jeZkratka(new URL('https://www.mapy.cz/s/zluty')), true);
  assert.equal(jeZkratka(new URL('https://maps.app.goo.gl/xyz')), true);
  assert.equal(jeZkratka(new URL('https://goo.gl/xyz')), true);
  assert.equal(jeZkratka(new URL('https://zlymapy.com/s/zluty')), false);
  assert.equal(jeZkratka(new URL('https://goo.gl.zly.priklad/xyz')), false);
  assert.equal(jeZkratka(new URL('https://mapy.com/turisticka?id=14.18,49.49')), false);
});

zkus('zadané souřadnice a stupně se čtou dál', () => {
  assert.equal(precti('49.4957N, 14.1841E').stav, 'poloha');
  assert.equal(precti(`49°29'44.6"N 14°11'2.8"E`).stav, 'poloha');
  assert.equal(precti('mapy.com/s/zluty').stav, 'zkratka');
});

zkus('rozsah šířky a délky se nepřekrývá', () => {
  // Na tomhle stojí čtení dvojice bez udaného pořadí: když žádné číslo
  // nemůže být zároveň platnou šířkou i platnou délkou, projde nanejvýš
  // jedna z obou kombinací. Rozvolnění hranic na Česko tu vlastnost
  // zachovalo; kdyby se rozšiřovaly dál, tohle je to, co se rozbije jako
  // první — a ne hlučně, ale tak, že se bod tiše přečte naruby.
  assert.ok(SIRKA_OD > DELKA_DO, `šířka od ${SIRKA_OD} musí být nad délku do ${DELKA_DO}`);
});

zkus('prohozená dvojice se přiřadí správně, ať přijde v jakémkoli pořadí', () => {
  for (const text of ['49.4957, 14.1841', '14.1841, 49.4957']) {
    const c = precti(text);
    assert.equal(c.stav, 'poloha', text);
    if (c.stav !== 'poloha') return;
    assert.ok(Math.abs(c.poloha.sirka - 49.4957) < 1e-6, text + ' → šířka');
    assert.ok(Math.abs(c.poloha.delka - 14.1841) < 1e-6, text + ' → délka');
  }
});

zkus('bod v Česku mimo Orlík se přečte, bod v cizině ne', () => {
  // Rozvolněno 16. 11. 2026: meze hlídají překlep, ne území. Praha projde,
  // Vídeň ne — a kdyby prošla, byl by to bod, který API stejně odmítne.
  assert.equal(precti('50.0755N, 14.4378E').stav, 'poloha');
  assert.equal(precti('48.2082N, 16.3738E').stav, 'nic');
});

console.log('\n' + prosly + ' prošlo');
