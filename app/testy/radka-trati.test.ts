/**
 * Co stojí v pravém sloupci řádky trati.
 *
 * Měří se pravidlo, ne vykreslení: že hotová řádka **mlčí**, že zámek
 * přebíjí všechno ostatní, a že stavy jdou v pořadí, které plyne z toho,
 * co každý z nich dovoluje — ne ze závažnosti.
 */
import assert from 'node:assert/strict';

import {
  dvoukonec,
  predpisPrvku,
  predpisRadky,
  stavRadky,
  znackyZTrati,
  type KonecProRadku,
  type VstupRadky,
} from '../src/lib/radka-trati.ts';

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

const nic: VstupRadky = {
  zamceno: false,
  veFronte: false,
  chybiDruhyKonec: false,
  zPlanu: false,
  bezFotky: false,
};

zkus('hotová řádka mlčí, protože je nejčastější', () => {
  assert.equal(stavRadky(nic), null);
});

zkus('zámek přebíjí i chybějící fotku a plán', () => {
  assert.equal(
    stavRadky({ ...nic, zamceno: true, bezFotky: true, zPlanu: true }),
    'čeká na odemčení',
  );
});

zkus('fronta je dřív než chybějící konec', () => {
  assert.equal(stavRadky({ ...nic, veFronte: true, chybiDruhyKonec: true }), 'čeká');
});

zkus('chybějící konec je dřív než plán', () => {
  assert.equal(stavRadky({ ...nic, chybiDruhyKonec: true, zPlanu: true }), 'chybí druhý konec');
});

zkus('plán je dřív než chybějící fotka', () => {
  assert.equal(stavRadky({ ...nic, zPlanu: true, bezFotky: true }), 'z plánu');
});

zkus('chybějící fotka zůstane, když nic jiného nepřekáží', () => {
  assert.equal(stavRadky({ ...nic, bezFotky: true }), 'chybí fotka');
});

const boje = (id: number, nazev: string): KonecProRadku => ({
  id,
  nazev,
  sirka: 49.516,
  delka: 14.165,
  zdroj: 'Telefon',
  fotek: 2,
});

const A = boje(1, 'Otočná 1');
const B = boje(2, 'Brána levá');
const C = boje(3, 'Brána pravá');

zkus('dvě kola na jednu bóji dají jednu značku, ne dva řádky', () => {
  const z = znackyZTrati([
    { poradi: 1, typ: 'OtocnaBoje', strana: 'PoLeve', a: A },
    { poradi: 2, typ: 'Brana', a: B, b: C },
    { poradi: 3, typ: 'OtocnaBoje', strana: 'PoLeve', a: A },
  ]);
  assert.equal(z.length, 3);
  assert.equal(z[0].boje.id, 1);
  assert.equal(z[0].prujezdu, 2);
  // Pořadí je pořadí prvního výskytu, ne pořadí prvků.
  assert.deepEqual(z.map((x) => x.boje.id), [1, 2, 3]);
});

zkus('oba konce brány jsou dvě značky, každá jednou', () => {
  const z = znackyZTrati([{ poradi: 1, typ: 'Brana', a: B, b: C }]);
  assert.equal(z.length, 2);
  assert.ok(z.every((x) => x.prujezdu === 1));
});

zkus('chybějící druhý konec se pozná jen u dvoukoncového typu', () => {
  const chybi = znackyZTrati([{ poradi: 1, typ: 'Brana', a: B }]);
  assert.equal(chybi[0].chybiDruhyKonec, true);
  const neni = znackyZTrati([{ poradi: 1, typ: 'OtocnaBoje', strana: 'PoLeve', a: A }]);
  assert.equal(neni[0].chybiDruhyKonec, false);
});

zkus('dvoukonec je opsaný ze serveru jako pravidlo negativní', () => {
  assert.equal(dvoukonec('OtocnaBoje'), false);
  assert.equal(dvoukonec('PrujezdniBoje'), false);
  assert.equal(dvoukonec('Brana'), true);
  assert.equal(dvoukonec('Start'), true);
  // Typ, který ještě neexistuje, je dvoukoncový — tak to má server.
  assert.equal(dvoukonec('NecoNoveho'), true);
});

zkus('sloveso řekne, jestli se obeplouvá, nebo jen míjí', () => {
  // Do 26. 11. 2026 tu stálo „ponechat" u otočné a „nechat" u průjezdní —
  // rozdíl jediného písmene mezi točením a projetím.
  assert.equal(predpisPrvku('OtocnaBoje', 'PoLeve'), 'obeplout po levoboku');
  assert.equal(predpisPrvku('PrujezdniBoje', 'PoLeve'), 'minout po levoboku');
  assert.notEqual(
    predpisPrvku('OtocnaBoje', 'PoLeve').split(' ')[0],
    predpisPrvku('PrujezdniBoje', 'PoLeve').split(' ')[0],
  );
});

zkus('bok ano, směr otáčení ne', () => {
  // Nálezy J7 a J8: ponechat znak po levoboku znamená točit doprava,
  // a to směrnice neříká. Předpis proto o směru mlčet musí.
  for (const bok of ['PoLeve', 'PoPrave']) {
    const p = predpisPrvku('OtocnaBoje', bok);
    assert.ok(!/doprava|doleva|vlevo|vpravo/.test(p), p);
  }
  assert.equal(predpisPrvku('OtocnaZona'), 'otočit se za linií');
});

zkus('bez zapsané strany se bok nevymýšlí', () => {
  assert.equal(predpisPrvku('OtocnaBoje'), 'obeplout');
  assert.equal(predpisPrvku('PrujezdniBoje'), 'minout');
});

zkus('jeden průjezd je holý předpis', () => {
  assert.equal(predpisRadky(['obeplout po levoboku']), 'obeplout po levoboku');
  assert.equal(predpisRadky([]), null);
});

zkus('shodné průjezdy řeknou, že se jede dvakrát', () => {
  // `2×` u jména skončilo 26. 11. 2026, ale mlčet o opakování nejde:
  // na řádce je značka jedna a jinak to z ní nepoznáš.
  assert.equal(
    predpisRadky(['obeplout po levoboku', 'obeplout po levoboku']),
    'obeplout po levoboku, podruhé stejně',
  );
});

zkus('tři a víc shodných průjezdů se nevyjmenovává', () => {
  assert.equal(
    predpisRadky(['obeplout po levoboku', 'obeplout po levoboku', 'obeplout po levoboku']),
    'obeplout po levoboku, a tak pokaždé',
  );
});

zkus('maraton nemá číslo, krouží pořád', () => {
  assert.equal(
    predpisRadky(['obeplout po levoboku', 'obeplout po levoboku'], true),
    'obeplout po levoboku, a tak pokaždé',
  );
});

zkus('po obrátce opačnou stranou řekne řádka jen ten rozdíl', () => {
  assert.equal(
    predpisRadky(['obeplout po levoboku', 'obeplout po pravoboku']),
    'obeplout po levoboku, podruhé po pravoboku',
  );
});

zkus('třetí průjezd dostane vlastní řadovou číslovku', () => {
  assert.equal(
    predpisRadky(['obeplout po levoboku', 'obeplout po pravoboku', 'obeplout po levoboku']),
    'obeplout po levoboku, podruhé po pravoboku, potřetí po levoboku',
  );
});

zkus('bez společného začátku se nic neořezává', () => {
  assert.equal(predpisRadky(['start', 'cíl']), 'start, podruhé cíl');
});

zkus('ořezává se po celých slovech, ne uprostřed', () => {
  // „pravoboku" a „pravobok" mají společný kus písmen, ne slovo.
  assert.equal(
    predpisRadky(['minout po levoboku', 'projet bránou']),
    'minout po levoboku, podruhé projet bránou',
  );
});

console.log(`\n  ${prosly} v pořádku`);
