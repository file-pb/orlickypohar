/**
 * Cíl: co se stane s pořadím, když rozhodčí klepe, překlepne se a opraví.
 *
 * Měří se tři pravidla, na kterých stojí zbytek a která jdou proti
 * intuici: pořadí je průběžné přes všechny kategorie, <b>čas patří místu,
 * ne lodi</b>, a loď má buď pořadí, nebo kód. Čtvrté je obrana proti
 * vodě: dvojí klepnutí je překlep, ne dvojí dojezd.
 *
 * Tatáž pravidla drží web (`cil/cil.tsx`) — kdyby se rozešla, jeden
 * zápis by z téhož závodu udělal dvoje výsledky.
 */
import assert from 'node:assert/strict';

import {
  klepni,
  navrhyKZobrazeni,
  odeber,
  prepisCas,
  presnejsiCas,
  plula,
  prehod,
  radky,
  radkyPriUkonceni,
  vratPosledni,
  zbyva,
  zeZapisu,
  type LodVCili,
  type Misto,
  type PrujezdZTrasovani,
} from '../src/lib/cil.ts';

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

const lod = (id: number, jmeno: string, kategorie = 'NAD7M', kod: string | null = null): LodVCili => ({
  prihlaskaId: id,
  lod: jmeno,
  cisloPlachty: null,
  kategorie,
  poradiVCili: null,
  kod,
  dojezdV: null,
});

const LODE = [lod(1, 'LUNA'), lod(2, 'RELAX', 'DO7M'), lod(3, 'AVENIR')];
const T = Date.parse('2027-05-15T12:30:00Z');

zkus('klepání dává průběžné pořadí přes všechny kategorie', () => {
  // Body se počítají po kategoriích z relativního pořadí, takže se
  // číslovat po kategoriích nemusí — a server to tak i bere.
  let m: Misto[] = [];
  m = klepni(m, 3, T);
  m = klepni(m, 2, T + 12_000);
  m = klepni(m, 1, T + 40_000);

  assert.deepEqual(
    m.map((x) => [x.poradi, x.prihlaskaId]),
    [[1, 3], [2, 2], [3, 1]],
  );
  assert.equal(m[1].dojezdV, '2027-05-15T12:30:12.000Z');
});

zkus('dvojí klepnutí na tutéž loď je překlep, ne dvojí dojezd', () => {
  // Server by sadu se dvěma řádky téže lodi odmítl, a hlavně: loď
  // neprojela cílem dvakrát.
  const m = klepni(klepni([], 1, T), 1, T + 3000);
  assert.equal(m.length, 1);
});

zkus('zpátky o jedno klepnutí', () => {
  const m = klepni(klepni([], 1, T), 2, T + 5000);
  assert.deepEqual(vratPosledni(m).map((x) => x.prihlaskaId), [1]);
});

zkus('smazané místo zavře mezeru a jeho čas zmizí s ním', () => {
  let m: Misto[] = [];
  m = klepni(m, 1, T);
  m = klepni(m, 2, T + 10_000);
  m = klepni(m, 3, T + 20_000);

  const po = odeber(m, 2);
  assert.deepEqual(
    po.map((x) => [x.poradi, x.prihlaskaId, x.dojezdV]),
    [
      [1, 1, '2027-05-15T12:30:00.000Z'],
      [2, 3, '2027-05-15T12:30:20.000Z'],
    ],
  );
});

zkus('prohození mění jména, ne časy', () => {
  // Cílem něco projelo v těch okamžicích; pletla se jen jména lodí.
  let m: Misto[] = [];
  m = klepni(m, 1, T);
  m = klepni(m, 2, T + 10_000);

  const po = prehod(m, 1, 2);
  assert.deepEqual(
    po.map((x) => [x.poradi, x.prihlaskaId, x.dojezdV]),
    [
      [1, 2, '2027-05-15T12:30:00.000Z'],
      [2, 1, '2027-05-15T12:30:10.000Z'],
    ],
  );
});

zkus('zápis ze serveru se přečísluje od jedničky', () => {
  // Pořadatel mohl číslovat po kategoriích; obrazovka pracuje s průběžným.
  const zeServeru: LodVCili[] = [
    { ...lod(1, 'LUNA'), poradiVCili: 2, dojezdV: '2027-05-15T12:31:00Z' },
    { ...lod(2, 'RELAX', 'DO7M'), poradiVCili: 1, dojezdV: '2027-05-15T12:30:00Z' },
    lod(3, 'AVENIR'),
  ];

  assert.deepEqual(
    zeZapisu(zeServeru).map((m) => [m.poradi, m.prihlaskaId]),
    [[1, 2], [2, 1]],
  );
});

zkus('na klepání zbývají jen lodě, které nedojely', () => {
  const m = klepni([], 2, T);
  assert.deepEqual(zbyva(LODE, m).map((l) => l.prihlaskaId), [1, 3]);
});

zkus('sada se posílá celá, i s loděmi bez výsledku', () => {
  // Co v sadě není, výsledek nemá — uložení takovou loď smaže.
  const m = klepni([], 2, T);
  const r = radky(m, LODE);

  assert.equal(r.length, 3);
  assert.deepEqual(r[1], {
    prihlaskaId: 2,
    poradiVCili: 1,
    kod: null,
    dojezdV: '2027-05-15T12:30:00.000Z',
  });
  assert.deepEqual(r[0], { prihlaskaId: 1, poradiVCili: null, kod: null, dojezdV: null });
});

zkus('loď, která nakonec dojela, ztratí DNF', () => {
  // „Má pořadí i kód" by sadu shodilo — a DNF u lodi, která projela
  // cílem, je prostě nepravda.
  const s_dnf = [lod(1, 'LUNA', 'NAD7M', 'Dnf')];
  const r = radky(klepni([], 1, T), s_dnf);
  assert.equal(r[0].kod, null);
  assert.equal(r[0].poradiVCili, 1);
});

zkus('bodový trest zůstává i s pořadím', () => {
  // ZPJ 44.3(c): ZFP se k dosaženému pořadí přičítá, nenahrazuje ho.
  const s_zfp = [lod(1, 'LUNA', 'NAD7M', 'Zfp')];
  const r = radky(klepni([], 1, T), s_zfp);
  assert.equal(r[0].kod, 'Zfp');
  assert.equal(r[0].poradiVCili, 1);
});

zkus('ukončení dá DNF tomu, kdo nedojel, a cizí kód nepřepíše', () => {
  const lode = [lod(1, 'LUNA'), lod(2, 'RELAX', 'DO7M'), lod(3, 'AVENIR', 'NAD7M', 'Ocs')];
  const r = radkyPriUkonceni(klepni([], 1, T), lode);

  assert.equal(r[0].poradiVCili, 1);
  assert.equal(r[1].kod, 'Dnf');
  // OCS řekl rozhodčí, DNF je jen „nedojela do uzávěrky".
  assert.equal(r[2].kod, 'Ocs');
});

zkus('naměřený čas se počítá od startu rozjížďky', () => {
  assert.equal(plula('2027-05-15T12:00:00Z', '2027-05-15T12:30:12Z'), 30 * 60 + 12);
  assert.equal(plula(null, '2027-05-15T12:30:12Z'), null);
  assert.equal(plula('2027-05-15T12:00:00Z', null), null);
});

/* ---------- návrhy z trasování (R33) ---------- */

const prujezd = (id: number, lod: string, kdy: string): PrujezdZTrasovani => ({
  prihlaskaId: id,
  lod,
  kdy,
});

zkus('navrhne se jen čerstvý průjezd lodi, která ještě nemá místo', () => {
  const ted = Date.parse('2027-05-15T12:30:00Z');
  const navrhy = navrhyKZobrazeni(
    [
      prujezd(1, 'LUNA', '2027-05-15T12:29:40Z'), // před dvaceti vteřinami
      prujezd(2, 'RELAX', '2027-05-15T12:20:00Z'), // deset minut zpátky
      prujezd(3, 'AVENIR', '2027-05-15T12:29:50Z'),
    ],
    klepni([], 3, ted), // AVENIR už je zapsaná
    ted,
  );

  assert.deepEqual(navrhy.map((n) => n.prihlaskaId), [1]);
});

zkus('návrhy jdou v pořadí, v jakém projely', () => {
  const ted = Date.parse('2027-05-15T12:30:00Z');
  const navrhy = navrhyKZobrazeni(
    [
      prujezd(1, 'LUNA', '2027-05-15T12:29:50Z'),
      prujezd(2, 'RELAX', '2027-05-15T12:29:30Z'),
    ],
    [],
    ted,
  );

  assert.deepEqual(navrhy.map((n) => n.prihlaskaId), [2, 1]);
});

zkus('trasování nabídne přesnější čas k zapsanému klepnutí', () => {
  // R33 naopak: rozhodčí určil, kdo dojel, stopa dodá kdy.
  const kleplo = Date.parse('2027-05-15T12:30:05Z');
  const m = klepni([], 1, kleplo)[0];

  assert.equal(
    presnejsiCas(m, [prujezd(1, 'LUNA', '2027-05-15T12:30:02Z')]),
    '2027-05-15T12:30:02Z',
  );

  // Přes minutu je to jiná událost, ne zpožděný palec.
  assert.equal(presnejsiCas(m, [prujezd(1, 'LUNA', '2027-05-15T12:28:00Z')]), null);
  // Jiná loď se nenabízí ani v čase.
  assert.equal(presnejsiCas(m, [prujezd(2, 'RELAX', '2027-05-15T12:30:02Z')]), null);
  // Totožný čas není co přepisovat.
  assert.equal(presnejsiCas(m, [prujezd(1, 'LUNA', m.dojezdV!)]), null);
});

zkus('přepsání času nechá pořadí i loď na pokoji', () => {
  const m = klepni(klepni([], 1, T), 2, T + 10_000);
  const po = prepisCas(m, 2, '2027-05-15T12:30:09Z');

  assert.deepEqual(po[0], m[0]);
  assert.equal(po[1].prihlaskaId, 2);
  assert.equal(po[1].poradi, 2);
  assert.equal(po[1].dojezdV, '2027-05-15T12:30:09Z');
});

console.log(`  ${prosly} prošlo`);
