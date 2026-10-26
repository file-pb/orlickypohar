/**
 * Co tabule ukáže — a hlavně čemu kolik času dá.
 *
 * Okem se to z běžící tabule nespočítá: záběr se mění po minutách a
 * rozjížďka trvá hodinu. Tyhle kontroly berou plán celý naráz.
 */
import assert from 'node:assert/strict';

import { DAV_LODI, planRezie, type Prohozeni } from '../lib/rezie-tabule.ts';
import type { Lod, Znacka } from '../app/nacrt/mapa/plavba.ts';

let prosly = 0;
function zkus(nazev: string, f: () => void) {
  try { f(); prosly += 1; console.log('  ok   ' + nazev); }
  catch (e) { console.log('  CHYBA ' + nazev + ': ' + (e as Error).message); process.exitCode = 1; }
}

const KONEC = 600;
/** Bóje ve dvou set metrech od sebe; první a poslední je start a cíl. */
const znacka = (poradi: number, sirka: number): Znacka =>
  ({ poradi, nazev: `z${poradi}`, typ: 'Boje', konce: [], sirka, delka: 14.3 }) as unknown as Znacka;
const ZNACKY = [znacka(1, 49.50), znacka(2, 49.51), znacka(3, 49.52), znacka(4, 49.53)];

/** Loď, která celou dobu stojí na jednom místě — pro kontrolu pravidel stačí. */
const stojici = (id: number, sirka: number, delka = 14.3): Lod => ({
  id, nazev: `L${id}`, kategorie: 'Race',
  body: Array.from({ length: KONEC / 10 + 1 }, (_, k) => ({ sirka, delka, cas: k * 10 })),
  dosloDo: KONEC / 10 + 1,
});
const postupyPro = (lode: Lod[]) => lode.map((l, i) => l.body.map(() => 100 - i));

function plan(lode: Lod[], prohozeni: Prohozeni[] = []) {
  return planRezie({ lode, postupy: postupyPro(lode), prohozeni, znacky: ZNACKY, konec: KONEC });
}
const duvody = (p: ReturnType<typeof plan>) =>
  [...p.values()].reduce<Record<string, number>>((m, z) => ({ ...m, [z.duvod]: (m[z.duvod] ?? 0) + 1 }), {});

console.log('Režie tabule');

zkus('tři lodě u obratové bóje jsou dav', () => {
  // Všechny tři na značce č. 2 (49.51).
  const p = plan([stojici(1, 49.5101), stojici(2, 49.5102), stojici(3, 49.5103)]);
  assert.equal(duvody(p).boje, p.size, 'u bóje má být dav po celou dobu');
  assert.deepEqual(p.get(0)?.lode, [1, 2, 3]);
});

zkus('dvě lodě u bóje dav nejsou — od toho je souboj', () => {
  const p = plan([stojici(1, 49.5101), stojici(2, 49.5102)]);
  assert.equal(duvody(p).boje, undefined);
  assert.equal(duvody(p).kolotoc, p.size);
});

zkus('tlačenice na startu a v cíli se za dav nepočítá', () => {
  // Tytéž tři lodě, ale u první značky (start) a u poslední (cíl).
  for (const sirka of [49.50, 49.53]) {
    const p = plan([stojici(1, sirka), stojici(2, sirka + 0.0001), stojici(3, sirka + 0.0002)]);
    assert.equal(duvody(p).boje, undefined, `u značky ${sirka} nemá být dav`);
  }
});

zkus('dav drží, i když se jedna loď trochu vzdálí', () => {
  // Dvě zůstanou u bóje, třetí odjede za hranici DAV_M (60 m ≈ 0.00054°).
  const odjizdejici: Lod = {
    ...stojici(3, 49.5103),
    body: Array.from({ length: KONEC / 10 + 1 }, (_, k) => ({
      sirka: 49.5103 + (k > 10 ? 0.0008 : 0), delka: 14.3, cas: k * 10,
    })),
  };
  const p = plan([stojici(1, 49.5101), stojici(2, 49.5102), odjizdejici]);
  assert.equal(p.get(300)?.duvod, 'boje', 'dvě lodě v širším okruhu dav udrží');
  assert.deepEqual(p.get(300)?.lode, [1, 2], 'ale odjetá už v něm není');
});

zkus('kolotoč bere dvojici, ne jednu loď', () => {
  // Rozptýlené lodě: žádný dav, jede kolotoč.
  const p = plan([stojici(1, 49.500), stojici(2, 49.505), stojici(3, 49.515), stojici(4, 49.525)]);
  assert.equal(duvody(p).kolotoc, p.size);
  for (const [t, z] of p) assert.equal(z.lode.length, 2, `v čase ${t} má být dvojice`);
});

zkus('poslední loď v poli se v kolotoči nedostane na záběr sama', () => {
  const lode = [stojici(1, 49.500), stojici(2, 49.505), stojici(3, 49.515)];
  const p = plan(lode);
  const videne = new Set([...p.values()].flatMap((z) => z.lode));
  assert.deepEqual([...videne].sort(), [1, 2, 3], 'na každou loď dojde');
});

zkus('souboj má přednost před davem i kolotočem', () => {
  const p = plan(
    [stojici(1, 49.5101), stojici(2, 49.5102), stojici(3, 49.5103)],
    [{ cas: 100, nahoru: 0, dolu: 1, pozice: 1 }],
  );
  assert.equal(p.get(100)?.duvod, 'souboj');
  assert.deepEqual(p.get(100)?.lode, [1, 2]);
  // A po doběhnutí focusu se vrátí k davu.
  assert.equal(p.get(200)?.duvod, 'boje');
});

zkus('bez značek to nespadne, jen není co zabírat u bóje', () => {
  const p = planRezie({
    lode: [stojici(1, 49.5101), stojici(2, 49.5102), stojici(3, 49.5103)],
    postupy: postupyPro([stojici(1, 49.5101), stojici(2, 49.5102), stojici(3, 49.5103)]),
    prohozeni: [], znacky: [], konec: KONEC,
  });
  assert.equal(duvody(p).boje, undefined);
});

zkus('práh davu je tři lodě, ne dvě', () => {
  assert.equal(DAV_LODI, 3);
});

console.log(`\n${prosly} kontrol prošlo.`);
