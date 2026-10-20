import assert from 'node:assert/strict';
import {
  body, bezicZaznam, ostrihej, prehled, smazZaznam, ukonciZaznam, zalozZaznam, zapisBody,
} from '../src/lib/tracker/zaznam.ts';
import { slozGpx } from '../src/lib/tracker/gpx.ts';
import { spustSimulaci } from '../src/lib/tracker/simulace.ts';
import { rychlost, trvani, vzdalenost } from '../src/lib/tracker/formaty.ts';

let prosly = 0;
function zkus(nazev: string, f: () => void) {
  try { f(); prosly += 1; console.log('  ok   ' + nazev); }
  catch (e) { console.log('  CHYBA ' + nazev + ': ' + (e as Error).message); process.exitCode = 1; }
}

const T0 = Date.parse('2027-06-26T08:00:00Z');
function uklid() {
  const z = bezicZaznam();
  if (z) { ukonciZaznam(z.id); smazZaznam(z.id); }
}

console.log('Zápis a souběh');
zkus('druhý záznam se nezaloží, dokud první běží', () => {
  uklid();
  const id = zalozZaznam({ lod: 'LUNA', zdroj: 'gps' });
  assert.throws(() => zalozZaznam({ lod: 'PEZI', zdroj: 'gps' }), /už běží/);
  ukonciZaznam(id); smazZaznam(id);
});

console.log('Ostříhání na okno závodu (podmínka 5)');
zkus('body po hranici se smažou, dřívější zůstanou', () => {
  uklid();
  const id = zalozZaznam({ lod: 'LUNA', zdroj: 'gps' });
  // Dvě hodiny závodu po 5 s, pak hodina cesty domů.
  zapisBody(id, Array.from({ length: 1440 }, (_, i) => ({
    sirka: 49.51 + i * 1e-5, delka: 14.16 + i * 1e-5, casGps: T0 + i * 5000, rychlost: 2.5,
  })));
  zapisBody(id, Array.from({ length: 720 }, (_, i) => ({
    sirka: 49.60 + i * 1e-4, delka: 14.30 + i * 1e-4, casGps: T0 + 7_200_000 + i * 5000,
  })));
  const pred = prehled(id);
  assert.equal(pred.pocetBodu, 2160);

  // Hranice je inkluzivní: bod přesně v okamžiku dojezdu je ještě závod,
  // takže se maže 719 pozdějších a ten na hranici zůstává.
  const hranice = T0 + 7_200_000;
  const smazano = ostrihej(id, hranice);
  const po = prehled(id);
  assert.equal(smazano, 719, 'mělo se smazat 719 bodů cesty domů');
  assert.equal(po.pocetBodu, 1441, 'závod i bod na hranici musí zůstat');
  assert.equal(po.posledni, hranice, 'posledním bodem je ten na hranici');
  // Smazané musí být fyzicky pryč, ne jen skryté — je to věc soukromí.
  assert.equal(body(id).length, 1441);
  ukonciZaznam(id); smazZaznam(id);
});

console.log('Čas z telefonu');
zkus('skok hodin se pozná a žádný bod se nezahodí', () => {
  uklid();
  const id = zalozZaznam({ lod: 'LUNA', zdroj: 'gps' });
  // Prvních deset bodů s hodinami v pořádku, pak si telefon posune hodiny
  // o dvě hodiny dopředu: čas z polohy zůstává, hodiny zařízení skáčou.
  zapisBody(id, Array.from({ length: 10 }, (_, i) => ({
    sirka: 49.51, delka: 14.16, casGps: Date.now() - 600_000 + i * 5000,
  })));
  zapisBody(id, Array.from({ length: 10 }, (_, i) => ({
    sirka: 49.51, delka: 14.16, casGps: Date.now() - 600_000 - 7_200_000 + i * 5000,
  })));
  const p = prehled(id);
  assert.equal(p.pocetBodu, 20, 'všech dvacet bodů musí zůstat');
  assert.ok(p.rozptylHodinMs! > 7_000_000, 'rozptyl hodin se musí projevit: ' + p.rozptylHodinMs);
  ukonciZaznam(id); smazZaznam(id);
});

zkus('bod s časem v budoucnosti se spočítá, ale nesmaže', () => {
  uklid();
  const id = zalozZaznam({ lod: 'LUNA', zdroj: 'gps' });
  zapisBody(id, [
    { sirka: 49.51, delka: 14.16, casGps: Date.now() - 1000 },
    { sirka: 49.51, delka: 14.16, casGps: Date.now() + 3_600_000 },
  ]);
  const p = prehled(id);
  assert.equal(p.vBudoucnosti, 1);
  assert.equal(p.pocetBodu, 2);
  ukonciZaznam(id); smazZaznam(id);
});

console.log('Přehled (aby šlo říct „vzorkování je moc hrubé")');
zkus('počet, rozsah, délka a vzorkování odpovídají zápisu', () => {
  uklid();
  const id = zalozZaznam({ lod: 'LUNA', zdroj: 'gps' });
  // Stovka bodů po 5 s a po 0.001° zeměpisné šířky = 111,2 m na krok.
  zapisBody(id, Array.from({ length: 100 }, (_, i) => ({
    sirka: 49.5 + i * 0.001, delka: 14.16, casGps: T0 + i * 5000, rychlost: 3, presnost: 4 + i * 0.1,
  })));
  const p = prehled(id);
  assert.equal(p.pocetBodu, 100);
  assert.equal(p.prvni, T0);
  assert.equal(p.posledni, T0 + 99 * 5000);
  assert.ok(Math.abs(p.delkaM - 99 * 111.2) < 60, 'délka ' + Math.round(p.delkaM) + ' m');
  assert.equal(p.maxRychlostMS, 3);
  assert.ok(Math.abs(p.nejhorsiPresnostM! - 13.9) < 0.2);
  ukonciZaznam(id); smazZaznam(id);
});

zkus('dvacetičtyřhodinovka po 5 s se zapíše a přehled projde pod sekundu', () => {
  uklid();
  const id = zalozZaznam({ lod: 'AVENIR', regata: '24hodinovka', zdroj: 'gps' });
  const pocet = 17_280;
  const zacatekZapisu = Date.now();
  for (let d = 0; d < pocet; d += 1440) {
    zapisBody(id, Array.from({ length: 1440 }, (_, i) => ({
      sirka: 49.5 + Math.sin((d + i) / 500) * 0.01,
      delka: 14.17 + Math.cos((d + i) / 500) * 0.01,
      casGps: T0 + (d + i) * 5000, rychlost: 2.5, presnost: 5,
    })));
  }
  const zapis = Date.now() - zacatekZapisu;
  const t = Date.now();
  const p = prehled(id);
  const dotaz = Date.now() - t;
  assert.equal(p.pocetBodu, pocet);
  assert.equal(p.posledni! - p.prvni!, 24 * 3600 * 1000 - 5000);
  console.log(`       ${pocet} bodů: zápis ${zapis} ms, přehled ${dotaz} ms, ${Math.round(p.delkaM / 1000)} km`);
  assert.ok(dotaz < 1000, 'přehled trval ' + dotaz + ' ms');
  ukonciZaznam(id); smazZaznam(id);
});

console.log('GPX');
zkus('má tolik bodů, kolik se zapsalo, čas v UTC a nic nedomýšlí', () => {
  uklid();
  const id = zalozZaznam({ lod: 'M@rtina & "Rio"', regata: 'Izolepa cup', zdroj: 'gps' });
  zapisBody(id, [
    { sirka: 49.5163, delka: 14.1651, casGps: T0, rychlost: 2.5, presnost: 4 },
    { sirka: 49.5201, delka: 14.1702, casGps: T0 + 5000 },
  ]);
  const gpx = slozGpx(id);
  assert.equal((gpx.match(/<trkpt /g) ?? []).length, 2);
  assert.ok(gpx.includes('<time>2027-06-26T08:00:00.000Z</time>'), 'čas musí být UTC s Z');
  assert.equal((gpx.match(/<speed>/g) ?? []).length, 1, 'rychlost jen u bodu, který ji měl');
  assert.ok(gpx.includes('M@rtina &amp; &quot;Rio&quot;'), 'jméno lodi se musí escapovat');
  assert.ok(!gpx.includes('<desc>'), 'skutečná trasa není simulace');
  ukonciZaznam(id); smazZaznam(id);
});

zkus('simulovaná trasa je v GPX označená', () => {
  uklid();
  const id = zalozZaznam({ lod: 'LUNA', zdroj: 'simulace' });
  zapisBody(id, [{ sirka: 49.5, delka: 14.1, casGps: T0, podvrzeny: true }]);
  assert.ok(slozGpx(id).includes('Simulovaná trasa'));
  ukonciZaznam(id); smazZaznam(id);
});

console.log('Simulace');
await (async () => {
  uklid();
  const id = zalozZaznam({ lod: 'LUNA', zdroj: 'simulace' });
  const beh = spustSimulaci(id, { krokMs: 50, zhusteni: 20 });
  await new Promise((r) => setTimeout(r, 400));
  beh.stop();
  const p = prehled(id);
  zkus('simulace zapisuje stejnou cestou jako GPS', () => {
    assert.ok(p.pocetBodu >= 100, 'bodů ' + p.pocetBodu);
    assert.equal(p.podvrzenych, p.pocetBodu, 'každý simulovaný bod musí být označený');
    assert.ok(p.delkaM > 0);
  });
  ukonciZaznam(id); smazZaznam(id);
})();

console.log('Formáty');
zkus('uzly, vzdálenost a trvání', () => {
  assert.equal(rychlost(2.5), '4.9 kt');
  assert.equal(rychlost(null), '—');
  assert.equal(vzdalenost(850), '850 m');
  assert.equal(vzdalenost(12_340), '12.34 km');
  assert.equal(trvani(3_600_000 * 24), '24 h 00 min');
  assert.equal(trvani(125_000), '2 min 05 s');
});

console.log(`\n${prosly} kontrol prošlo`);
