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
  opakovaniUJmena,
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

zkus('jeden průjezd se u jména nepíše', () => {
  assert.equal(opakovaniUJmena(1), null);
});

zkus('dva průjezdy se u jména píšou', () => {
  assert.equal(opakovaniUJmena(2), '2×');
});

zkus('maraton nemá číslo, krouží pořád', () => {
  assert.equal(opakovaniUJmena('porad'), 'pořád');
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

zkus('otočná se ponechává, netočí se levobokem', () => {
  assert.equal(predpisPrvku('OtocnaBoje', 'PoLeve'), 'ponechat po levoboku');
  assert.equal(predpisPrvku('OtocnaZona'), 'otočit se za linií');
});

zkus('shodné průjezdy dají jeden předpis', () => {
  assert.equal(
    predpisRadky(['ponechat po levoboku', 'ponechat po levoboku']),
    'ponechat po levoboku',
  );
});

zkus('po obrátce opačnou stranou řekne řádka obojí', () => {
  assert.equal(
    predpisRadky(['ponechat po levoboku', 'ponechat po pravoboku']),
    'ponechat po levoboku, pak ponechat po pravoboku',
  );
});

console.log(`\n  ${prosly} v pořádku`);
