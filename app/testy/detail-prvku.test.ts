/**
 * Co detail prvku nabídne.
 *
 * Měří se tři rozhodnutí konzilia naráz: že chybějící akce **chybí**
 * a nezešedivuje se, že pomocník smí přesouvat, ale ne sebrat, a že
 * u značky se dvěma průjezdy se mazání nenabízí vůbec.
 */
import assert from 'node:assert/strict';

import { akceDetailu, type StavDetailu } from '../src/lib/detail-prvku.ts';

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

const zaklad: StavDetailu = {
  naServeru: true,
  zamceno: false,
  opakuje: false,
  jePomocnik: false,
};

zkus('zamčená trať nenabídne nic', () => {
  assert.deepEqual(akceDetailu({ ...zaklad, zamceno: true }), []);
});

zkus('přesun je první, protože měří a je to hlavní práce dne', () => {
  assert.equal(akceDetailu(zaklad)[0], 'presunout');
});

zkus('prvek, který nedošel na server, nemá přesun ani fotku', () => {
  const a = akceDetailu({ ...zaklad, naServeru: false });
  assert.ok(!a.includes('presunout'));
  assert.ok(!a.includes('vyfotit'));
  assert.ok(!a.includes('vybrat-z-galerie'));
  // Co jde bez serverových čísel, zůstává.
  assert.ok(a.includes('sebrat'));
  assert.ok(a.includes('barva-a-tvar'));
});

zkus('galerie stojí nad foťákem kvůli chybějícímu EXIF', () => {
  const a = akceDetailu(zaklad);
  assert.ok(a.indexOf('vybrat-z-galerie') < a.indexOf('vyfotit'));
});

zkus('pomocník smí přesunout, ale ne sebrat', () => {
  const a = akceDetailu({ ...zaklad, jePomocnik: true });
  assert.ok(a.includes('presunout'));
  assert.ok(!a.includes('sebrat'));
});

zkus('pomocník nemaže ani nepřerovnává', () => {
  const a = akceDetailu({ ...zaklad, jePomocnik: true });
  assert.ok(!a.includes('smazat'));
  assert.ok(!a.includes('vys'));
  assert.ok(!a.includes('niz'));
});

zkus('u značky se dvěma průjezdy se mazání nenabízí vůbec', () => {
  assert.ok(!akceDetailu({ ...zaklad, opakuje: true }).includes('smazat'));
  // A jinak je mazání poslední.
  const a = akceDetailu(zaklad);
  assert.equal(a[a.length - 1], 'smazat');
});

console.log(`\n  ${prosly} v pořádku`);
