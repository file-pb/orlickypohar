/**
 * Startovní procedura, jak ji appka počítá.
 *
 * Měří se tu pravidlo, ne vykreslení: co je na startu na řadě, odkdy běží
 * odpočet a co se stane, když čas startu zestárne. Na vodě je rozdíl mezi
 * „odpočet běží" a „nic se neděje" ta nejdražší informace v appce, a
 * zahlédnout ji v mocku nejde — žádná rozjížďka tam na start nečeká.
 */
import assert from 'node:assert/strict';

import {
  dusledekUkonu,
  fazeProcedury,
  maBytKlid,
  mmss,
  odStartu,
  popisStartu,
  stavStartu,
  trvani,
  ukonyStartu,
  usekyProcedury,
  zacatekProcedury,
  type RozjizdkaProOdpocet,
} from '../src/lib/start.ts';

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

/** Start ve 14:00 pražského času, tedy 12:00 UTC (letní čas). */
const START = '2027-05-15T12:00:00Z';
const V = (hhmmss: string) => Date.parse(`2027-05-15T${hhmmss}Z`);

const planovana = (cislo: number, startV: string | null): RozjizdkaProOdpocet => ({
  cislo,
  startV,
  stav: 'Planovana',
});

zkus('odStartu je záporné před startem a kladné po něm', () => {
  assert.equal(odStartu(START, V('11:55:00')), -300);
  assert.equal(odStartu(START, V('12:00:00')), 0);
  assert.equal(odStartu(START, V('12:03:20')), 200);
});

zkus('odStartu bez času nebo s nesmyslem vrací null', () => {
  assert.equal(odStartu(null, V('11:55:00')), null);
  assert.equal(odStartu('zítra odpoledne', V('11:55:00')), null);
});

zkus('mmss doplňuje vteřiny na dvě místa a znaménko zahazuje', () => {
  assert.equal(mmss(300), '5:00');
  assert.equal(mmss(7), '0:07');
  assert.equal(mmss(-65), '1:05');
});

zkus('bez rozjížděk se na startu neděje nic', () => {
  assert.equal(stavStartu([], V('11:55:00')), null);
  assert.equal(stavStartu([planovana(1, null)], V('11:55:00')), null);
});

zkus('deset minut před startem se čeká, pět minut už běží procedura', () => {
  const r = [planovana(1, START)];
  assert.deepEqual(stavStartu(r, V('11:50:00')), {
    druh: 'ceka',
    cislo: 1,
    startV: START,
  });
  assert.deepEqual(stavStartu(r, V('11:55:00')), {
    druh: 'procedura',
    cislo: 1,
    startV: START,
    doStartuS: 300,
  });
});

zkus('delší procedura začíná dřív', () => {
  const r = [planovana(1, START)];
  // Deset minut před startem: s pětkou se ještě čeká, s desítkou už jede odpočet.
  assert.equal(stavStartu(r, V('11:50:00'))?.druh, 'ceka');
  assert.equal(stavStartu(r, V('11:50:00'), 10 * 60)?.druh, 'procedura');
});

zkus('běžící rozjížďka přebíjí odpočet té další', () => {
  const stav = stavStartu(
    [
      { cislo: 1, startV: '2027-05-15T11:30:00Z', stav: 'Probiha' },
      planovana(2, START),
    ],
    V('11:56:00'),
  );
  // Jede se 26 minut, ne „do startu zbývají 4".
  assert.deepEqual(stav, { druh: 'jede', cislo: 1, odStartuS: 26 * 60 });
});

zkus('z plánovaných se bere nejbližší v čase, ne první v seznamu', () => {
  // Trojka byla odložena až za čtyřku — pořadí v poli je podle čísla.
  const stav = stavStartu(
    [planovana(3, '2027-05-15T12:30:00Z'), planovana(4, START)],
    V('11:58:00'),
  );
  assert.equal(stav?.cislo, 4);
  assert.equal(stav?.druh, 'procedura');
});

zkus('po startu panel drží, dokud se nepotvrdí, že se jede', () => {
  // Odpočet doběhl, rozjížďka je pořád „plánovaná". Rozhodčí musí mít
  // co zmáčknout — prázdná obrazovka mu nepomůže.
  assert.deepEqual(stavStartu([planovana(1, START)], V('12:05:00')), {
    druh: 'odstartovano',
    cislo: 1,
    odStartuS: 5 * 60,
  });
});

zkus('po čtvrthodině přestává být start čerstvý', () => {
  // Pak už to není start, na který se čeká, ale zapomenutý čas.
  assert.equal(stavStartu([planovana(1, START)], V('12:16:00')), null);
});

zkus('dokončená ani zrušená rozjížďka na start nepatří', () => {
  const r: RozjizdkaProOdpocet[] = [
    { cislo: 1, startV: START, stav: 'Dokoncena' },
    { cislo: 2, startV: START, stav: 'Zrusena' },
  ];
  assert.equal(stavStartu(r, V('11:55:00')), null);
});

zkus('začátek procedury se říká pražským časem', () => {
  // Start 12:00 UTC = 14:00 v Praze (letní čas), procedura tedy od 13:55.
  assert.equal(zacatekProcedury(START), '13:55');
  assert.equal(zacatekProcedury(START, 15 * 60), '13:45');
});

zkus('popis říká, co se děje, a mlčí, když se neděje nic', () => {
  assert.equal(popisStartu(null), null);
  assert.equal(
    popisStartu(stavStartu([planovana(2, START)], V('11:50:00'))),
    'Rozjížďka 2 — procedura začne ve 13:55',
  );
  assert.equal(
    popisStartu(stavStartu([planovana(2, START)], V('11:56:00'))),
    'Rozjížďka 2 startuje',
  );
  assert.equal(
    popisStartu(stavStartu([{ cislo: 1, startV: START, stav: 'Probiha' }], V('12:02:30'))),
    'Rozjížďka 1 jede 2:30',
  );
});

// --- Fáze podle ZPJ 26 ---

zkus('fáze se lámou na čtyřech a jedné minutě, ne každou minutu', () => {
  assert.equal(fazeProcedury(300), 'vyzva');
  assert.equal(fazeProcedury(241), 'vyzva');
  // Přípravné znamení padá čtyři minuty před startem.
  assert.equal(fazeProcedury(240), 'priprava');
  assert.equal(fazeProcedury(61), 'priprava');
  // Přípravná vlajka dolů minutu před startem.
  assert.equal(fazeProcedury(60), 'minuta');
  assert.equal(fazeProcedury(1), 'minuta');
});

zkus('pětiminutovka má úseky v poměru 1 : 3 : 1', () => {
  const u = usekyProcedury(300);
  assert.deepEqual(u.map((x) => x.faze), ['vyzva', 'priprava', 'minuta']);
  assert.deepEqual(u.map((x) => x.delkaS), [60, 180, 60]);
});

zkus('delší procedura prodlužuje jen vyzývací úsek', () => {
  // Příprava i poslední minuta jsou v pravidlech přibité ke startu.
  const u = usekyProcedury(600, 600);
  assert.deepEqual(u.map((x) => x.delkaS), [360, 180, 60]);
});

zkus('u krátké procedury vyzývací úsek zmizí', () => {
  // Tříminutovka: přípravné znamení by padlo dřív než vyzývací.
  const u = usekyProcedury(180, 180);
  assert.deepEqual(u.map((x) => x.faze), ['priprava', 'minuta']);
  assert.deepEqual(u.map((x) => x.delkaS), [120, 60]);
});

zkus('uběhlá část se počítá po úsecích, ne přes celek', () => {
  // Minutu po zahájení pětiminutovky: vyzývací hotový, příprava začíná.
  const u = usekyProcedury(240);
  assert.equal(u[0].hotovo, 1);
  assert.equal(u[1].hotovo, 0);
  assert.equal(u[2].hotovo, 0);
});

zkus('v poslední minutě jsou první dva úseky hotové', () => {
  const u = usekyProcedury(30);
  assert.equal(u[0].hotovo, 1);
  assert.equal(u[1].hotovo, 1);
  assert.equal(u[2].hotovo, 0.5);
});

// --- Zapomenutá rozjížďka ---

zkus('trvání nad hodinu ukazuje hodiny, ne stovky minut', () => {
  assert.equal(trvani(758), '12:38');
  assert.equal(trvani(3851), '1:04:11');
  // Změřeno na produkci: rozjížďka „běžela" 47 hodin a `mmss` z toho
  // udělalo 2845:13, což se nevešlo ani do rámečku.
  assert.equal(trvani(170713), '47:25:13');
});

zkus('rozjížďka běžící přes den a noc odpočet nepřebije', () => {
  // Skutečný stav z 29. 10. 2026: čtyřka ve stavu „probíhá" od 27. 10.
  const r: RozjizdkaProOdpocet[] = [
    { cislo: 4, startV: '2027-05-13T12:00:00Z', stav: 'Probiha' },
    planovana(5, START),
  ];
  const stav = stavStartu(r, V('11:56:00'));
  assert.equal(stav?.druh, 'procedura');
  assert.equal(stav?.cislo, 5);
});

zkus('dvacetičtyřhodinovka se za zapomenutou nepovažuje', () => {
  // „24 se jede klidně 30 h i s tou přípravou a dojezdy."
  const pred29h = new Date(Date.parse(START) - 29 * 3600 * 1000).toISOString();
  const stav = stavStartu([{ cislo: 1, startV: pred29h, stav: 'Probiha' }], V('12:00:00'));
  assert.equal(stav?.druh, 'jede');
});

zkus('běžící rozjížďka bez času startu se nedomýšlí', () => {
  // O jejím stáří nic nevíme, takže tvrdit „zapomenutá" by bylo hádání.
  const stav = stavStartu([{ cislo: 1, startV: null, stav: 'Probiha' }], V('12:00:00'));
  assert.deepEqual(stav, { druh: 'jede', cislo: 1, odStartuS: 0 });
});

// --- Odpočet nesmí uhnout ---

zkus('po hovoru odpočet navazuje, ne pokračuje tam, kde stál', () => {
  // Procedura začne ve 13:55, start ve 14:00. Rozhodčímu někdo zavolá
  // ve 13:56 a hovor trvá dvě minuty; po návratu musí odpočet ukazovat
  // 2:00, ne 4:00, kde ho hovor zastavil.
  const r = [planovana(2, START)];
  assert.equal(stavStartu(r, V('11:56:00'))?.druh, 'procedura');
  assert.equal(
    (stavStartu(r, V('11:56:00')) as { doStartuS: number }).doStartuS,
    4 * 60,
  );
  assert.equal(
    (stavStartu(r, V('11:58:00')) as { doStartuS: number }).doStartuS,
    2 * 60,
  );
});

zkus('start, který padl, dokud byla appka na pozadí, se nepřeskočí', () => {
  // Appka spala přes start. Po probuzení neodpočítává, ale ani nemlčí —
  // ukáže, že start padl a čeká na potvrzení.
  const stav = stavStartu([planovana(2, START)], V('12:01:00'));
  assert.equal(stav?.druh, 'odstartovano');
});

// --- Kdy má telefon mlčet ---

zkus('klid platí od zahájení procedury', () => {
  const r = [planovana(2, START)];
  // Deset minut před startem se ještě čeká — telefon smí vyzvánět.
  assert.equal(maBytKlid(stavStartu(r, V('11:50:00'))), false);
  // Jakmile procedura běží, klid.
  assert.equal(maBytKlid(stavStartu(r, V('11:55:30'))), true);
  assert.equal(maBytKlid(stavStartu(r, V('11:59:50'))), true);
});

zkus('klid trvá ještě pět minut po startu', () => {
  const jede = (odStartuS: number) =>
    maBytKlid({ druh: 'jede', cislo: 2, odStartuS });
  assert.equal(jede(0), true);
  assert.equal(jede(4 * 60), true);
  assert.equal(jede(5 * 60), true);
  // Po páté minutě se předčasné starty už neřeší a telefon smí zvonit.
  assert.equal(jede(5 * 60 + 1), false);
  assert.equal(jede(20 * 60), false);
});

zkus('když se na startu nic neděje, klid se nevynucuje', () => {
  // Vypnout rozhodčímu vyzvánění na celý den by byla medvědí služba.
  assert.equal(maBytKlid(null), false);
});

zkus('klid začíná minutu před procedurou, ne s ní', () => {
  const r = [planovana(2, START)];
  // Procedura začne ve 13:55 (11:55 UTC). Klid tedy od 11:54.
  assert.equal(maBytKlid(stavStartu(r, V('11:53:30')), V('11:53:30')), false);
  assert.equal(maBytKlid(stavStartu(r, V('11:54:10')), V('11:54:10')), true);
});

zkus('před startem se odkládá, po startu odvolává', () => {
  // ZPJ 27.3 platí před startem, 29.2 po něm — a nabídnout obojí vždycky
  // by znamenalo, že startér vybírá podle jména tlačítka, ne podle toho,
  // co se stalo. Totéž pravidlo hlídá server (`Procedura.ProcNejde`).
  const r = [planovana(1, START)];
  assert.deepEqual(ukonyStartu(stavStartu(r, V('11:50:00'))), ['Odlozit']);
  assert.deepEqual(ukonyStartu(stavStartu(r, V('11:57:00'))), ['Odlozit']);
  assert.deepEqual(ukonyStartu(stavStartu(r, V('12:03:00'))), ['Odvolat']);
});

zkus('bez startu není co zastavovat', () => {
  assert.deepEqual(ukonyStartu(null), []);
  assert.deepEqual(ukonyStartu(stavStartu([planovana(1, null)], V('11:50:00'))), []);
});

zkus('rozjížďka, která jede, se taky dá odvolat', () => {
  // Zapomenutý čas sem patří: i rozjížďku, co „jede" od včerejška, je
  // čím vrátit na start.
  const bezici: RozjizdkaProOdpocet = { cislo: 2, startV: START, stav: 'Probiha' };
  assert.deepEqual(ukonyStartu(stavStartu([bezici], V('12:30:00'))), ['Odvolat']);
});

zkus('důsledek úkonu mluví o čase, ne o vlajce', () => {
  // Věta jde do potvrzení, aby se do nevratného úkonu neklepnulo omylem
  // (Filip, 28. 10. 2026). Rozhodčí z ní musí poznat, co bude dál.
  assert.ok(dusledekUkonu('Odlozit').includes('bez času startu'));
  assert.ok(dusledekUkonu('Odvolat').includes('znovu'));
});

console.log(`  ${prosly} prošlo`);
