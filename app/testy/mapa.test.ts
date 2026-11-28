/**
 * Výběr bodu z mapy: projekce, mřížka dlaždic a kde mapa začne.
 *
 * Projekce je kopie `web/lib/mapa.ts` — test proto hlídá hodnoty, které
 * vydá web. Kdyby se kopie rozešly, bod vybraný v appce by ležel jinde
 * než tentýž bod vybraný na webu.
 */
import assert from 'node:assert/strict';

import {
  adresaDlazdice, DLAZDICE, doPixelu, metruNaPixel, mrizkaDlazdic, naPlose, ORLIK, posunuty,
  vychoziStred, zPixelu,
} from '../src/lib/mapa.ts';

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

const blizko = (a: number, b: number, tol: number) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} není do ${tol} u ${b}`);

zkus('projekce sedí na dlaždice OSM i na webový modul', () => {
  // Radava při z=15 leží v dlaždici 17673 / 11180 — spočítáno 28. 11. 2026
  // nezávisle standardním vzorcem slippy map (Python) i webovým
  // web/lib/mapa.ts; obojí se shodlo. Pixely níž jsou výstup webového
  // modulu: kdyby se kopie rozešly, rozejdou se i ony.
  const p = doPixelu(ORLIK.sirka, ORLIK.delka, 15);
  assert.equal(Math.floor(p.x / DLAZDICE), 17673);
  assert.equal(Math.floor(p.y / DLAZDICE), 11180);
  blizko(p.x, 4524493.5919, 1e-3);
  blizko(p.y, 2862263.3682, 1e-3);
  const praha = doPixelu(50.08, 14.42, 13);
  blizko(praha.x, 1132578.5884, 1e-3);
  blizko(praha.y, 710512.5184, 1e-3);
});

zkus('tam a zpátky vyjde tentýž bod', () => {
  for (const z of [10, 15, 17]) {
    const p = doPixelu(49.5201, 14.1702, z);
    const b = zPixelu(p.x, p.y, z);
    blizko(b.sirka, 49.5201, 1e-9);
    blizko(b.delka, 14.1702, 1e-9);
  }
});

zkus('metry na pixel: řádově správně nad Orlíkem', () => {
  // Webový modul vydá pro 49,52° a z=15 hodnotu 3,10135 m na pixel.
  blizko(metruNaPixel(49.52, 15), 3.10135, 1e-5);
});

zkus('mřížka pokryje celou plochu, bez prázdného pruhu u kraje', () => {
  const sirka = 390, vyska = 600;
  const m = mrizkaDlazdic(ORLIK, 15, sirka, vyska);
  const levo = Math.min(...m.map((d) => d.x));
  const nahore = Math.min(...m.map((d) => d.y));
  const pravo = Math.max(...m.map((d) => d.x + DLAZDICE));
  const dole = Math.max(...m.map((d) => d.y + DLAZDICE));
  assert.ok(levo <= 0 && nahore <= 0, 'levý horní roh pokrytý');
  assert.ok(pravo >= sirka && dole >= vyska, 'pravý dolní roh pokrytý');
  // A netahá se nic, co vidět není: každá dlaždice aspoň kouskem na ploše.
  for (const d of m) assert.ok(d.x < sirka && d.y < vyska && d.x + DLAZDICE > 0 && d.y + DLAZDICE > 0);
});

zkus('tah prstem: podklad jede s prstem, střed proti němu', () => {
  // Prst doprava → mapa doprava → pod křížkem je, co bylo vlevo (menší délka).
  const b = posunuty(ORLIK, 15, 100, 0);
  assert.ok(b.delka < ORLIK.delka);
  blizko(b.sirka, ORLIK.sirka, 1e-9);
  // Prst dolů → pod křížkem je, co bylo nahoře (větší šířka).
  assert.ok(posunuty(ORLIK, 15, 0, 100).sirka > ORLIK.sirka);
});

zkus('mapa začne u posledního bodu trati, který leží v Česku', () => {
  const posledniPrvek = { sirka: 49.51, delka: 14.17 };
  const zahranici = { sirka: 47.07, delka: 15.44 };
  assert.deepEqual(vychoziStred([null, posledniPrvek]), posledniPrvek);
  // Bod trati vyhrává i nad polohou telefonu: stavitel pokračuje, kde přestal.
  assert.deepEqual(vychoziStred([posledniPrvek], { sirka: 49.6, delka: 14.2 }), posledniPrvek);
  assert.deepEqual(vychoziStred([zahranici, posledniPrvek]), posledniPrvek);
  assert.deepEqual(vychoziStred([{ sirka: Number.NaN, delka: 14 }]), ORLIK);
  assert.deepEqual(vychoziStred([]), ORLIK);
});

zkus('poloha telefonu jen u Orlíku, jinak Orlík (28. 11. 2026)', () => {
  // Na vodě se špatným signálem je poloha nejlepší odhad.
  const naVode = { sirka: 49.55, delka: 14.19 };
  assert.deepEqual(vychoziStred([], naVode), naVode);
  // U hráze (9,8 km) a u Zvíkova (9,2 km) taky — tam se ještě staví.
  const hraz = { sirka: 49.6075, delka: 14.188 };
  assert.deepEqual(vychoziStred([], hraz), hraz);
  const zvikov = { sirka: 49.4383, delka: 14.1915 };
  assert.deepEqual(vychoziStred([], zvikov), zvikov);
  // Doma v Milevsku (15,7 km) nebo v Písku (23,6 km) už ne: mapa nad
  // domem k ničemu není.
  assert.deepEqual(vychoziStred([], { sirka: 49.4509, delka: 14.36 }), ORLIK);
  assert.deepEqual(vychoziStred([], { sirka: 49.3088, delka: 14.1475 }), ORLIK);
  // Ani v Praze (~65 km) — Filip stavěl doma.
  assert.deepEqual(vychoziStred([], { sirka: 50.08, delka: 14.42 }), ORLIK);
  // V zahraničí tím spíš (Filip byl ve chvíli hlášení mimo republiku).
  assert.deepEqual(vychoziStred([], { sirka: 48.2082, delka: 16.3738 }), ORLIK);
  assert.deepEqual(vychoziStred([], null), ORLIK);
});

zkus('bod na ploše: střed je uprostřed a jede s tahem prstu', () => {
  const sirka = 400;
  const vyska = 600;
  const stred = naPlose(ORLIK, ORLIK, 15, sirka, vyska);
  blizko(stred.x, 200, 1e-6);
  blizko(stred.y, 300, 1e-6);
  // Bod na východ je vpravo, na sever nahoře.
  assert.ok(naPlose({ sirka: ORLIK.sirka, delka: ORLIK.delka + 0.001 }, ORLIK, 15, sirka, vyska).x > 200);
  assert.ok(naPlose({ sirka: ORLIK.sirka + 0.001, delka: ORLIK.delka }, ORLIK, 15, sirka, vyska).y < 300);
  // Po tahu o (30, −20) se značka na ploše posune přesně o tolik, jako podklad.
  const znacka = { sirka: 49.521, delka: 14.172 };
  const pred = naPlose(znacka, ORLIK, 15, sirka, vyska);
  const po = naPlose(znacka, posunuty(ORLIK, 15, 30, -20), 15, sirka, vyska);
  blizko(po.x - pred.x, 30, 1e-6);
  blizko(po.y - pred.y, -20, 1e-6);
});

zkus('adresa dlaždice: podklad a opakování, nic navíc', () => {
  const d = { z: 15, tx: 17673, ty: 11180 };
  const web = 'https://orlickypohar.klihovka.cz';
  assert.equal(adresaDlazdice(web, d, false), `${web}/dlazdice/15/17673/11180`);
  assert.equal(adresaDlazdice(web, d, true), `${web}/dlazdice/15/17673/11180?podklad=satelit`);
  assert.equal(adresaDlazdice(web, d, false, 'a1-1'), `${web}/dlazdice/15/17673/11180?znovu=a1-1`);
  assert.equal(
    adresaDlazdice(web, d, true, 'a1-2'),
    `${web}/dlazdice/15/17673/11180?podklad=satelit&znovu=a1-2`,
  );
});

console.log(`  ${prosly} prošlo`);
