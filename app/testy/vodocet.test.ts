/**
 * Změna hladiny: appka musí u téhož jezu ukázat totéž co web.
 *
 * <b>Proč na to je test.</b> Výpočet existuje dvakrát — v `web/lib/vodocet.ts`
 * a teď i v appce. Dvě kopie téhož vzorce jsou přesně to, co se rozejde,
 * a rozejdou se tiše: obě budou ukazovat číslo, jen jiné.
 */
import assert from 'node:assert/strict';

import { smerZmeny, vetaZmeny, zmenaCm, type BodHladiny } from '../src/lib/vodocet.ts';

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

/** Řada po hodinách zpět od zadaného času. Hladina v metrech. */
function rada(odKonce: number[], konec = Date.parse('2026-11-07T12:00:00Z')): BodHladiny[] {
  return odKonce.map((hladina, i) => ({
    cas: new Date(konec - (odKonce.length - 1 - i) * 3600_000).toISOString(),
    hladina,
  }));
}

zkus('stoupnutí o deset centimetrů za šest hodin', () => {
  assert.equal(zmenaCm(rada([350.0, 350.02, 350.04, 350.06, 350.08, 350.09, 350.1])), 10);
});

zkus('klesnutí se vrací záporně', () => {
  assert.equal(zmenaCm(rada([350.1, 350.08, 350.06, 350.04, 350.02, 350.01, 350.0])), -10);
});

zkus('beze změny je nula, ne zaokrouhlený šum', () => {
  assert.equal(zmenaCm(rada([350, 350, 350, 350, 350, 350, 350])), 0);
});

zkus('jediný bod nestačí a nic se nedomýšlí', () => {
  assert.equal(zmenaCm(rada([350])), 0);
  assert.equal(zmenaCm([]), 0);
});

zkus('bere nejbližší naměřený bod, ne přesnou hodinu', () => {
  // Měření nechodí po pravidelných krocích. Kdyby se trvalo na přesném
  // čase, nevrátilo by se nic — a dopočítaná hladina není naměřená.
  const konec = Date.parse('2026-11-07T12:00:00Z');
  const h: BodHladiny[] = [
    { cas: new Date(konec - 6.4 * 3600_000).toISOString(), hladina: 350.0 },
    { cas: new Date(konec - 5.8 * 3600_000).toISOString(), hladina: 350.05 },
    { cas: new Date(konec).toISOString(), hladina: 350.1 },
  ];
  // Cíl je −6 h. Bod −6,4 h je od něj 24 min, bod −5,8 h jen 12 — bere se
  // ten bližší, tedy 350,05, a vyjde 5 cm. (Při shodné vzdálenosti vyhraje
  // ten dřívější; je to tatáž `reduce` jako na webu.)
  assert.equal(zmenaCm(h), 5);
});

zkus('věta o nule nezní jako „stoupá o nula"', () => {
  assert.equal(vetaZmeny(0), 'Za 6 h beze změny');
  assert.match(vetaZmeny(7), /Stoupá o 7 cm/);
  assert.match(vetaZmeny(-7), /Klesá o 7 cm/);
});

zkus('šipka má tři stavy, ne dva', () => {
  assert.equal(smerZmeny(3), '▲');
  assert.equal(smerZmeny(-3), '▼');
  assert.equal(smerZmeny(0), '–');
});

console.log(`  ${prosly} prošlo`);
