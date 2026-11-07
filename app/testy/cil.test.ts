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
  prepniShodu,
  navrhyKZobrazeni,
  odeber,
  prepisCas,
  presnejsiCas,
  plula,
  posun,
  prehod,
  radky,
  radkyPriUkonceni,
  rozdel,
  skupiny,
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
  // <b>Čísla přihlášek schválně nejsou 1, 2, 3.</b> Od K7 se místo adresuje
  // lodí, ne pořadím — a s totožnými čísly by test prošel i implementaci,
  // která je pletla.
  let m: Misto[] = [];
  m = klepni(m, 11, T);
  m = klepni(m, 12, T + 10_000);
  m = klepni(m, 13, T + 20_000);

  const po = odeber(m, 12);
  assert.deepEqual(
    po.map((x) => [x.poradi, x.prihlaskaId, x.dojezdV]),
    [
      [1, 11, '2027-05-15T12:30:00.000Z'],
      [2, 13, '2027-05-15T12:30:20.000Z'],
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

console.log('\nShoda v cíli (K7, ZPJ A7)');

zkus('dvě lodě na třetím místě a další je pátá', () => {
  // Obsadily dvě místa, takže další skáče. Server z toho spočítá body:
  // dvě lodě třetí berou 3,5.
  let m: Misto[] = [];
  m = klepni(m, 11, T);
  m = klepni(m, 12, T + 10_000);
  m = klepni(m, 13, T + 20_000);
  m = klepni(m, 14, T + 20_100);
  m = klepni(m, 15, T + 30_000);

  m = prepniShodu(m, 14);

  assert.deepEqual(
    m.map((x) => [x.poradi, x.prihlaskaId]),
    [
      [1, 11],
      [2, 12],
      [3, 13],
      [3, 14],
      [5, 15],
    ],
  );
});

zkus('shoda se zruší tímtéž úkonem', () => {
  let m: Misto[] = [];
  m = klepni(m, 11, T);
  m = klepni(m, 12, T + 10_000);

  m = prepniShodu(m, 12);
  assert.deepEqual(m.map((x) => x.poradi), [1, 1]);

  m = prepniShodu(m, 12);
  assert.deepEqual(m.map((x) => x.poradi), [1, 2]);
});

zkus('s první lodí se shoda udělat nedá', () => {
  // Shoda je vztah k předchozímu místu a před prvním nic není.
  const m = prepniShodu(klepni([], 11, T), 11);
  assert.deepEqual(m.map((x) => x.poradi), [1]);
  assert.equal(m[0].shodneSPredchozim, undefined);
});

zkus('tři lodě najednou drží totéž číslo a další skáče o tři', () => {
  let m: Misto[] = [];
  m = klepni(m, 11, T);
  m = klepni(m, 12, T + 100);
  m = klepni(m, 13, T + 200);
  m = klepni(m, 14, T + 10_000);
  m = prepniShodu(m, 12);
  m = prepniShodu(m, 13);

  assert.deepEqual(m.map((x) => x.poradi), [1, 1, 1, 4]);
});

zkus('odebraná loď ze shody skupinu zmenší, ne přelepí', () => {
  // Zmizí-li loď, s níž se shoda váže, přebírá její vztah ta následující.
  // Jinak by se skupina tiše připojila k docela jiné lodi.
  let m: Misto[] = [];
  m = klepni(m, 11, T);
  m = klepni(m, 12, T + 10_000);
  m = klepni(m, 13, T + 10_100);
  m = prepniShodu(m, 13);
  assert.deepEqual(m.map((x) => x.poradi), [1, 2, 2]);

  // Odebere se první ze shodné dvojice. Ta druhá nesmí spadnout do shody
  // s jedenáctkou — ta s ní cílem neprojela.
  const po = odeber(m, 12);
  assert.deepEqual(
    po.map((x) => [x.poradi, x.prihlaskaId]),
    [
      [1, 11],
      [2, 13],
    ],
  );
  assert.equal(po[1].shodneSPredchozim, false);
});

zkus('zápis ze serveru shodu pozná z čísel', () => {
  // Server shodu nevydává jako příznak, vydává dvě lodě s týmž pořadím.
  // Bez dopočtu by se shoda prvním klepnutím rozpadla.
  const ze = zeZapisu([
    { prihlaskaId: 11, lod: 'LUNA', kategorie: null, poradiVCili: 1, kod: null, dojezdV: null },
    { prihlaskaId: 12, lod: 'PEZI', kategorie: null, poradiVCili: 2, kod: null, dojezdV: null },
    { prihlaskaId: 13, lod: 'ASTRA', kategorie: null, poradiVCili: 2, kod: null, dojezdV: null },
  ]);

  assert.deepEqual(ze.map((x) => x.poradi), [1, 2, 2]);
  assert.equal(ze[2].shodneSPredchozim, true);

  // A po dalším klepnutí se shoda drží a nové místo skáče na čtvrté.
  const dal = klepni(ze, 14, T);
  assert.deepEqual(dal.map((x) => x.poradi), [1, 2, 2, 4]);
});

zkus('shoda projde i do řádků zápisu', () => {
  const lode: LodVCili[] = [
    { prihlaskaId: 11, lod: 'LUNA', kategorie: null, poradiVCili: null, kod: null, dojezdV: null },
    { prihlaskaId: 12, lod: 'PEZI', kategorie: null, poradiVCili: null, kod: null, dojezdV: null },
  ];
  let m: Misto[] = [];
  m = klepni(m, 11, T);
  m = klepni(m, 12, T + 50);
  m = prepniShodu(m, 12);

  assert.deepEqual(
    radky(m, lode).map((r) => [r.prihlaskaId, r.poradiVCili]),
    [
      [11, 1],
      [12, 1],
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
  const m = klepni(klepni([], 11, T), 12, T + 10_000);
  const po = prepisCas(m, 12, '2027-05-15T12:30:09Z');

  assert.deepEqual(po[0], m[0]);
  assert.equal(po[1].prihlaskaId, 12);
  assert.equal(po[1].poradi, 2);
  assert.equal(po[1].dojezdV, '2027-05-15T12:30:09Z');
});

zkus('shodné lodě tvoří jednu řádku pořadí', () => {
  const m = prepniShodu(klepni(klepni(klepni([], 11, T), 12, T + 5_000), 13, T + 9_000), 12);
  const sk = skupiny(m);

  assert.equal(sk.length, 2, 'ze tří lodí mají být dvě řádky');
  assert.deepEqual(
    sk.map((s) => s.mista.map((x) => x.prihlaskaId)),
    [[11, 12], [13]],
  );
  // Číslo nese skupina, ne druhá loď v ní: dvě první a další třetí.
  assert.deepEqual(sk.map((s) => s.poradi), [1, 3]);
});

zkus('posun řádky přehodí lodě, časy nechá místům', () => {
  const m = klepni(klepni([], 11, T), 12, T + 5_000);
  const casy = m.map((x) => x.dojezdV);

  const dolu = posun(m, 11, 1);
  assert.deepEqual(dolu.map((x) => x.prihlaskaId), [12, 11], 'loď má jít o místo níž');
  assert.deepEqual(dolu.map((x) => x.dojezdV), casy, 'okamžiky průjezdu se hýbat nesmějí');
  assert.deepEqual(dolu.map((x) => x.poradi), [1, 2]);

  // Nahoru je to táž výměna z druhé strany.
  assert.deepEqual(posun(m, 12, -1), dolu);
});

zkus('posun na kraji řady nedělá nic', () => {
  const m = klepni(klepni([], 11, T), 12, T + 5_000);
  assert.deepEqual(posun(m, 11, -1), m, 'nad první řádkou není kam');
  assert.deepEqual(posun(m, 12, 1), m, 'pod poslední taky ne');
  assert.deepEqual(posun(m, 99, -1), m, 'loď, která v cíli není, nemá co posouvat');
});

zkus('posune se celá shodná dvojice, ne jen jedna loď z ní', () => {
  // 1. LUNA + AVENIR (shodně), 3. SIRIUS
  const m = prepniShodu(klepni(klepni(klepni([], 11, T), 12, T + 5_000), 13, T + 9_000), 12);
  const casy = m.map((x) => x.dojezdV);
  const po = posun(m, 11, 1);

  assert.deepEqual(po.map((x) => x.prihlaskaId), [13, 11, 12], 'SIRIUS má být první');
  assert.deepEqual(po.map((x) => x.dojezdV), casy, 'časy zůstávají místům');
  // Dvojice se cestou nerozpojila a čísla sedí: 1. SIRIUS, 2. LUNA + AVENIR.
  assert.deepEqual(po.map((x) => x.poradi), [1, 2, 2]);
  assert.deepEqual(po.map((x) => x.shodneSPredchozim), [false, false, true]);
});

zkus('rozdělit rozpojí celou shodu, i trojici', () => {
  let m = klepni(klepni(klepni([], 11, T), 12, T + 2_000), 13, T + 3_000);
  m = prepniShodu(prepniShodu(m, 12), 13);
  assert.deepEqual(m.map((x) => x.poradi), [1, 1, 1], 'tři lodě shodně první');

  const po = rozdel(m, 11);
  assert.deepEqual(po.map((x) => x.poradi), [1, 2, 3]);
  // `Boolean`, protože první místo příznak nikdy nedostalo — `klepni` ho
  // nenastavuje a nenastavená shoda je totéž jako žádná.
  assert.deepEqual(po.map((x) => Boolean(x.shodneSPredchozim)), [false, false, false]);

  // Na řádce o jedné lodi není co dělit.
  assert.deepEqual(rozdel(po, 12), po);
});

console.log(`  ${prosly} prošlo`);
