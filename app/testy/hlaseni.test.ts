/**
 * Co appka u startu řekne a kdy zatroubí.
 *
 * Měří se partitura, ne přehrávání: že znamení padnou na okamžiky, které
 * jmenoval Miloš (nahrávka 21 — *„vyzývací znamení v pátý minutě, ve
 * čtvrtý minutě, přípravní znamení, minuta do startu a minuta"*), že se
 * před každým odpočítá, a že se při skoku hodin žádné neztratí.
 */
import assert from 'node:assert/strict';

import {
  casHlasem,
  coOkamzik,
  coPrehrat,
  nejblizsiOkamzik,
  partitura,
  posledniZnameni,
  stiha,
  znameniStartu,
  type Znameni,
} from '../src/lib/hlaseni.ts';

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

/** Jen okamžiky, ve kterých se troubí. */
const troubeni = (z: Znameni[]) =>
  z.filter((x) => x.troubi).map((x) => [x.vterinDoStartu, x.troubi]);

zkus('troubí se v pátou, čtvrtou, první minutu a na start', () => {
  assert.deepEqual(troubeni(partitura()), [
    [300, 'kratce'],
    [240, 'kratce'],
    [60, 'dlouze'],
    [0, 'kratce'],
  ]);
});

zkus('jedna minuta se troubí dlouze, ostatní krátce', () => {
  const dlouhe = partitura().filter((z) => z.troubi === 'dlouze');
  assert.equal(dlouhe.length, 1);
  assert.equal(dlouhe[0].vterinDoStartu, 60);
});

zkus('před každým znamením se odpočítá po vteřinách', () => {
  // Každá číslovka má vlastní okamžik, aby padla na svou vteřinu —
  // jedna věta by dozněla, kdy dozní, podle rychlosti telefonu.
  const p = partitura();
  for (const [kdy] of troubeni(p)) {
    const t = kdy as number;
    assert.deepEqual(
      [5, 4, 3, 2, 1].map((i) => p.find((z) => z.vterinDoStartu === t + i)?.rekni),
      ['pět', 'čtyři', 'tři', 'dva', 'jedna'],
      `odpočet před ${kdy} nesedí`,
    );
  }
});

zkus('deset vteřin předem se řekne, co přijde a jakým tónem', () => {
  // Filip, 30. 10. 2026: rozhodčí musí vědět, co mačká, dřív než začne
  // odpočet — jinak je hlas metronom, ne instrukce pro ruku.
  const p = partitura();
  const rekne = (kdy: number) => p.find((z) => z.vterinDoStartu === kdy + 10)?.rekni;

  assert.equal(rekne(300), 'Vyzývací znamení, krátký tón');
  assert.equal(rekne(240), 'Přípravné znamení, krátký tón');
  assert.equal(rekne(60), 'Jedna minuta, dlouhý tón');
  assert.equal(rekne(0), 'Start, krátký tón');
});

zkus('dlouhý tón se ohlásí jen tam, kde se troubí dlouze', () => {
  // ZPJ 26: dlouze se troubí jedině u jedné minuty, kdy jde přípravná
  // vlajka dolů. Kdyby to hlas spletl, rozhodčí zatroubí špatně.
  const p = partitura();
  const sDlouhym = p.filter((z) => z.rekni.endsWith('dlouhý tón'));
  assert.deepEqual(sDlouhym.map((z) => z.vterinDoStartu), [70]);
});

zkus('po zahájení procedury se řekne, kolik zbývá, a zopakuje se to', () => {
  const p = partitura();
  const po = p.find((z) => z.vterinDoStartu === 300 && !z.troubi && z.rekni);
  assert.equal(po?.rekni, 'Pět minut do startu, opakuji, Pět minut do startu');
});

zkus('delší procedura posune jen zahájení, zbytek zůstává', () => {
  assert.deepEqual(troubeni(partitura(600)), [
    [600, 'kratce'],
    [240, 'kratce'],
    [60, 'dlouze'],
    [0, 'kratce'],
  ]);
});

zkus('u krátké procedury přípravné znamení odpadá', () => {
  // Tříminutovka: přípravné znamení by padlo dřív než vyzývací.
  assert.deepEqual(troubeni(partitura(180)), [
    [180, 'kratce'],
    [60, 'dlouze'],
    [0, 'kratce'],
  ]);
});

zkus('partitura jde odshora dolů, od zahájení ke startu', () => {
  const casy = partitura().map((z) => z.vterinDoStartu);
  assert.deepEqual(casy, [...casy].sort((a, b) => b - a));
});

zkus('mezi dvěma tiky se vybere to, co do okna spadlo', () => {
  // Hodiny tiknou z 61 na 59. Na šedesáté vteřině leží dvojice: nejdřív
  // se zatroubí, pak se řekne co — a v tom pořadí to musí i vyjít.
  const co = coPrehrat(60.5, 59);
  assert.deepEqual(
    co.map((z) => [z.vterinDoStartu, z.troubi]),
    [
      [60, 'dlouze'],
      [60, null],
    ],
  );
  assert.equal(co[1].rekni, 'Jedna minuta do startu, opakuji, Jedna minuta do startu');
});

zkus('nic se neztratí, když appka chvíli spala', () => {
  // Telefon se probudí o dvanáct vteřin později: dostane celé okno
  // najednou — ohlášení, všech pět číslovek i znamení — a vybrat si
  // musí přehrávač, ne tahle tabulka.
  const co = coPrehrat(70, 58);
  assert.deepEqual(
    co.map((z) => z.vterinDoStartu),
    [70, 65, 64, 63, 62, 61, 60, 60],
  );
});

zkus('mimo proceduru se nehraje nic', () => {
  // Před předehrou (ta začíná 360 vteřin před startem) a mezi startem
  // a koncem okna klidu se mlčí.
  assert.deepEqual(coPrehrat(500, 450), []);
  assert.deepEqual(coPrehrat(-5, -30), []);
});

// --- Předehra a konec okna ---

zkus('minutu před procedurou appka ohlásí, že se ztišuje', () => {
  const p = partitura();
  const predehra = p.find((z) => z.vterinDoStartu === 360);
  assert.equal(predehra?.rekni, 'Přepínám se do režimu Nerušit');
  assert.equal(predehra?.troubi, null);
});

zkus('půl minuty před procedurou řekne, že se začíná', () => {
  const p = partitura();
  const ohlaseni = p.find((z) => z.vterinDoStartu === 330);
  assert.equal(ohlaseni?.rekni, 'Za třicet vteřin bude zahájena startovní procedura');
});

zkus('v předehře se netroubí', () => {
  // Procedura ještě neběží; zvuk by poslal posádky ke startu dřív, než má.
  // Nad pětiminutovkou leží tři věty: dvě z předehry a odpočet do zahájení.
  const predehra = partitura().filter((z) => z.vterinDoStartu > 300);
  assert.deepEqual(
    predehra.map((z) => z.vterinDoStartu),
    [360, 330, 310, 305, 304, 303, 302, 301],
  );
  assert.ok(predehra.every((z) => z.troubi === null));
});

zkus('pět minut po startu se ohlásí konec klidu', () => {
  const konec = partitura().find((z) => z.vterinDoStartu === -300);
  assert.equal(konec?.rekni, 'Vypínám režim Nerušit');
  assert.equal(konec?.troubi, null);
});

zkus('konec klidu padne do okna i po startu', () => {
  // Po startu jdou vteřiny do záporu: −299 je pět minut a vteřina po něm.
  const co = coPrehrat(-299, -301);
  assert.equal(co.length, 1);
  assert.equal(co[0].rekni, 'Vypínám režim Nerušit');
});

/* ---------- co se smí ozvat pozdě ---------- */

zkus('znamení, které propadlo o minutu, se už neozve', () => {
  // Příčina je obyčejná: appka byla na pozadí, hovor trval. Odříkat
  // „pět minut do startu", když zbývají čtyři, pošle rozhodčího
  // zatroubit do prázdna.
  const vyzva = partitura().find((z) => z.rekni.startsWith('Pět minut'))!;
  assert.equal(stiha(vyzva, 300), true);
  assert.equal(stiha(vyzva, 298), true); // dvě vteřiny po něm: tik hodin
  assert.equal(stiha(vyzva, 240), false);
});

zkus('z fronty po probuzení se neozve nic, co už propadlo', () => {
  // Telefon spal od páté minuty do stodvacáté vteřiny. Nejpozdější
  // znamení v tom okně je přípravné (T−240) a je dávno po něm — takže
  // se mlčí a čeká se na to, co doopravdy platí.
  assert.deepEqual(coOkamzik(300, 120), []);
});

zkus('po krátkém výpadku se ozve ta číslovka, která právě platí', () => {
  // Probuzení vteřinu před jednou minutou: propadlé ohlášení i starší
  // číslovky se nedohánějí, ozve se jen „dva".
  const o = coOkamzik(300, 61);
  assert.deepEqual(o.map((z) => z.rekni), ['dva']);
});

zkus('probuzení přesně na startu zatroubí a řekne start', () => {
  // Nejhorší případ: appka se vrátí z pozadí půl vteřiny po startu.
  // Propadlý odpočet „za pět, čtyři…" se nedohání, startovní znamení ano.
  const o = coOkamzik(300, -0.5);
  assert.deepEqual(o.map((z) => [z.vterinDoStartu, z.troubi, z.rekni]), [
    [0, 'kratce', ''],
    [0, null, 'Start'],
  ]);
});

zkus('nic neprobíhá, nic se neozve', () => {
  assert.deepEqual(coOkamzik(400, 390), []);
});

zkus('v jednom okamžiku se troubí i mluví', () => {
  // Tohle je ten defekt, kvůli kterému funkce nevrací jedno znamení:
  // na minutu patří dlouhý zvuk <b>a</b> hlášení, a kdyby se vrátilo jen
  // jedno, při běžném tiku by se netroubilo.
  const o = coOkamzik(60.4, 59.4);
  assert.equal(o.length, 2);
  assert.equal(o.find((z) => z.troubi)?.troubi, 'dlouze');
  assert.equal(o.find((z) => z.rekni)?.rekni, 'Jedna minuta do startu, opakuji, Jedna minuta do startu');
});

zkus('z jednoho okamžiku se nevrací znamení jiného', () => {
  // Okno (239,5; 300,5] drží vyzývací i přípravné; platí to pozdější.
  const o = coOkamzik(300.5, 239.5);
  assert.deepEqual([...new Set(o.map((z) => z.vterinDoStartu))], [240]);
});


/* ---------- plánování dopředu ---------- */

zkus('zvuk se najde dřív, než má zaznít', () => {
  // Tik padne kdykoli; hledá se, co přijde do příští vteřiny, aby se to
  // dalo naplánovat na přesný okamžik místo čekání na další tik.
  const o = nejblizsiOkamzik(61.4, 1.5);
  assert.deepEqual(o.map((z) => z.rekni), ['jedna']);
});

zkus('okamžik se dvěma znameními se vrací celý', () => {
  // Na nule leží klakson i slovo „Start"; naplánovat se musí obojí.
  const o = nejblizsiOkamzik(0.6, 1.5);
  assert.equal(o.length, 2);
  assert.equal(o.find((z) => z.troubi)?.troubi, 'kratce');
  assert.equal(o.find((z) => z.rekni)?.rekni, 'Start');
});

zkus('co je dál než okno, se ještě neplánuje', () => {
  // Jinak by se do fronty dostala celá partitura a odpočet by se
  // odvíjel z plánu, ne z hodin.
  assert.deepEqual(nejblizsiOkamzik(100, 1.5), []);
});

zkus('to, co právě nastalo, se dopředu nenajde', () => {
  // V 60,0 leží znamení přesně teď, ne v budoucnu — a další je až
  // u startu. Dohnat to, co nastalo, je věc `coOkamzik`, ne plánování;
  // kdyby to uměly obě, zaznělo by to dvakrát.
  assert.deepEqual(nejblizsiOkamzik(60, 1.5), []);
  assert.deepEqual(coOkamzik(60.4, 59.9).map((z) => z.vterinDoStartu), [60, 60]);
});

zkus('znamení startu jsou čtyři a jdou odshora', () => {
  assert.deepEqual(znameniStartu(300), [
    { jmeno: 'Vyzývací', vterinDoStartu: 300 },
    { jmeno: 'Příprava', vterinDoStartu: 240 },
    { jmeno: 'Jedna minuta', vterinDoStartu: 60 },
    { jmeno: 'Start', vterinDoStartu: 0 },
  ]);

  // Krátká procedura: přípravné by padlo dřív než vyzývací, takže odpadá
  // — tatáž podmínka, jakou má partitura.
  assert.deepEqual(
    znameniStartu(180).map((z) => z.jmeno),
    ['Vyzývací', 'Jedna minuta', 'Start'],
  );
  assert.deepEqual(znameniStartu(30).map((z) => z.jmeno), ['Vyzývací', 'Start']);

  // Co se jmenuje v partituře, se musí jmenovat i tady — jinak by hlas
  // říkal jedno a obrazovka druhé.
  const troubi = partitura(300).filter((z) => z.troubi !== null).map((z) => z.vterinDoStartu);
  assert.deepEqual(troubi.sort((a, b) => b - a), znameniStartu(300).map((z) => z.vterinDoStartu));
});

zkus('poslední znamení je to, které už padlo', () => {
  // Před vyzývacím ještě žádné nebylo.
  assert.equal(posledniZnameni(301, 300), null);
  // Na vteřině samotné se troubí, takže se počítá.
  assert.equal(posledniZnameni(300, 300)?.jmeno, 'Vyzývací');
  assert.equal(posledniZnameni(241, 300)?.jmeno, 'Vyzývací');
  assert.equal(posledniZnameni(240, 300)?.jmeno, 'Příprava');
  assert.equal(posledniZnameni(61, 300)?.jmeno, 'Příprava');
  assert.equal(posledniZnameni(60, 300)?.jmeno, 'Jedna minuta');
  assert.equal(posledniZnameni(0, 300)?.jmeno, 'Start');
  // Po startu zůstává start — po něm už žádné znamení není.
  assert.equal(posledniZnameni(-600, 300)?.jmeno, 'Start');
});

// <b>Čas, který jde vyslovit.</b> „15:06" syntéza čte nesrozumitelně
// (Filip, 8. 11. 2026), proto se rozepisuje na hodiny a minuty.
zkus('čas se řekne slovy, ne s dvojtečkou', () => {
  assert.equal(casHlasem('15:06'), '15 hodin 6 minut');
  assert.equal(casHlasem('9:30'), '9 hodin 30 minut');
});

zkus('celá hodina se říká bez minut', () => {
  assert.equal(casHlasem('11:00'), '11 hodin');
});

zkus('co není čas, se neříká vůbec', () => {
  // Raději věta bez času než věta s nesmyslem — volající ji vynechá.
  assert.equal(casHlasem('25:00'), null);
  assert.equal(casHlasem('11:60'), null);
  assert.equal(casHlasem('brzo'), null);
  assert.equal(casHlasem(''), null);
});

console.log(`  ${prosly} prošlo`);
