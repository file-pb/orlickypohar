/**
 * Kde je loď na trati — podle skrytých branek rozestavěných po trati.
 *
 * Tohle se z obrazovky neověří: je to výpočet, a když se splete, vypadá
 * to jen jako „divné pořadí". Filip na to narazil třikrát (naposledy
 * 26. 10. 2026: *„PEZI tady ale nevede, ta je snad až desátá"*), proto
 * to má kontroly — a všechny zkouší trať, která se sama k sobě vrací,
 * protože právě tam se to lámalo.
 */
import assert from 'node:assert/strict';

import { brankyTrati, minuteBranky, postupVMetrech } from '../lib/postup-po-trase.ts';

let prosly = 0;
function zkus(nazev: string, f: () => void) {
  try { f(); prosly += 1; console.log('  ok   ' + nazev); }
  catch (e) { console.log('  CHYBA ' + nazev + ': ' + (e as Error).message); process.exitCode = 1; }
}

/** Trať jako na Orlíku: nahoru k návětrné, dolů skoro souběžně, do cíle na startu. */
const UZLY = [
  { x: 0, y: 1000 },   // start
  { x: 0, y: 0 },      // návětrná
  { x: 40, y: 1000 },  // odpadávací, 40 px vedle startu
  { x: 0, y: 1000 },   // cíl leží na startu
];
const NOHY = [1000, 1000.8, 40];
const CELKEM = NOHY.reduce((a, b) => a + b, 0);
const BRANKY = brankyTrati(UZLY, NOHY);

/**
 * Celá plavba po bodech, jak ji počítá komponenta — <b>i s oknem</b>,
 * kam až loď od minulého hlášení mohla doplout. Bez něj by se hledalo
 * po celé trati a kolmice by padala na souběžnou nohu; komponenta ho
 * počítá z času mezi hlášeními a rychlosti lodi, tady z toho, že jeden
 * krok je 50 m a branky stojí po 25.
 */
const MAX_VPRED = 4;
function plavba(body: { x: number; y: number }[]): number[] {
  let idx = 0;
  return body.map((b, i) => {
    idx = minuteBranky(BRANKY, b, idx, i === 0 ? Infinity : MAX_VPRED);
    return postupVMetrech(BRANKY, b, idx);
  });
}
const nahoru = (x = 5) => Array.from({ length: 21 }, (_, i) => ({ x, y: 1000 - i * 50 }));
const dolu = (x = 38) => Array.from({ length: 21 }, (_, i) => ({ x, y: i * 50 }));
const doCile = () => Array.from({ length: 5 }, (_, i) => ({ x: 38 - i * 10, y: 1000 }));

console.log('Postup po trati');

zkus('branky pokrývají celou trať', () => {
  assert.ok(BRANKY.length > CELKEM / 25 - 5, `branek je jen ${BRANKY.length}`);
  assert.equal(Math.round(BRANKY.at(-1)!.postup), Math.round(CELKEM));
});

zkus('loď na první noze nedostane postup z poslední', () => {
  const p = plavba(nahoru().slice(0, 6)).at(-1)!;
  assert.ok(p < 400, `čekáno pod 400, vyšlo ${p.toFixed(0)}`);
});

zkus('stoupání po návětrné nepřeskočí na cestu zpátky', () => {
  const p = plavba(nahoru());
  for (let i = 1; i < p.length; i++) {
    assert.ok(p[i] >= p[i - 1], `postup klesl v kroku ${i}`);
    assert.ok(p[i] <= 1100, `v kroku ${i} skočil na ${p[i].toFixed(0)} — to je už druhá noha`);
  }
});

zkus('postup po celé trati dojde skoro na konec', () => {
  const p = plavba([...nahoru(), ...dolu(), ...doCile()]).at(-1)!;
  assert.ok(p > CELKEM * 0.95, `čekáno přes ${(CELKEM * 0.95).toFixed(0)}, vyšlo ${p.toFixed(0)}`);
});

zkus('cíl na startu nestrhne loď zpátky na začátek trati', () => {
  // Nejhorší případ: poslední bod leží přesně na prvním.
  const p = plavba([...nahoru(), ...dolu(), ...doCile(), { x: 0, y: 1000 }]).at(-1)!;
  assert.ok(p > CELKEM * 0.95, `loď v cíli má mít trať za sebou, vyšlo ${p.toFixed(0)}`);
});

zkus('křižující loď postupuje stejně jako ta, co jede přímo', () => {
  // Křižuje sto pixelů na každou stranu — od čáry trati je pořád daleko,
  // ale brankami projede stejně.
  const klicky = Array.from({ length: 21 }, (_, i) => ({
    x: i % 2 === 0 ? -100 : 100,
    y: 1000 - i * 50,
  }));
  const krizuje = plavba(klicky).at(-1)!;
  const primo = plavba(nahoru()).at(-1)!;
  assert.ok(Math.abs(krizuje - primo) < 80,
    `křižující ${krizuje.toFixed(0)} proti přímé ${primo.toFixed(0)}`);
});

zkus('postup nikdy neklesne, ani po obratu u bóje', () => {
  const p = plavba([...nahoru(), ...dolu(), ...doCile()]);
  for (let i = 1; i < p.length; i++) {
    assert.ok(p[i] >= p[i - 1] - 0.001, `klesl v kroku ${i}: ${p[i - 1].toFixed(0)} → ${p[i].toFixed(0)}`);
  }
});

zkus('pořadí deseti lodí odpovídá tomu, kde na trati jsou', () => {
  const lode = Array.from({ length: 10 }, (_, i) => ({ jmeno: String.fromCharCode(65 + i), y: 950 - i * 90 }));
  const postupy = lode.map((l) => ({
    ...l,
    p: plavba(nahoru().filter((b) => b.y >= l.y)).at(-1)!,
  }));
  const podlePostupu = [...postupy].sort((a, b) => b.p - a.p).map((x) => x.jmeno);
  const podleTrati = [...lode].sort((a, b) => a.y - b.y).map((x) => x.jmeno);
  assert.deepEqual(podlePostupu, podleTrati);
});

zkus('loď, která se vrátí k bóji, o postup nepřijde', () => {
  const tam = nahoru();
  const zpet = [{ x: 5, y: 200 }, { x: 5, y: 400 }];
  const p = plavba([...tam, ...zpet]);
  assert.ok(p.at(-1)! >= p[tam.length - 1] - 0.001, 'postup po návratu klesl');
});

console.log(`\n${prosly} kontrol prošlo.`);
