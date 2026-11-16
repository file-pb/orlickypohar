/**
 * Fronta prvků, které stavitel pípnul a server je ještě nevidí.
 *
 * Dvě pravidla, na kterých to stojí, a obě se dají splést tak, že se to
 * pozná až na vodě:
 *
 * 1. <b>Pořadí.</b> Pořadí prvku na trati určuje server podle pořadí,
 *    v jakém požadavky dorazí. Fronta, která by zaseknutý prvek
 *    přeskočila, by trať poskládala jinak, než jak ji stavitel postavil.
 * 2. <b>Odmítnutí není nedoručení.</b> Nedoručené se zkouší dál, odmítnuté
 *    musí přečíst člověk — bušit do věty „trať je zamčená" ji neodemkne.
 */
import assert from 'node:assert/strict';

import { OdmitnutoServerem } from '../src/lib/api.ts';
import {
  cekajici,
  hotovo,
  novyKlic,
  prvniKOdeslani,
  stav,
  zahod,
  zapisPotiz,
  zarad,
  type PrvekKPostaveni,
} from '../src/lib/stavba/fronta.ts';
import { odesliFrontu } from '../src/lib/stavba/odesilani.ts';

let prosly = 0;
function zkus(nazev: string, f: () => void | Promise<void>) {
  const hotovoTest = () => {
    prosly += 1;
    console.log('  ok   ' + nazev);
  };
  const selhalo = (e: unknown) => {
    console.log('  CHYBA ' + nazev + ': ' + (e as Error).message);
    process.exitCode = 1;
  };
  try {
    const v = f();
    if (v instanceof Promise) return v.then(hotovoTest, selhalo);
    hotovoTest();
  } catch (e) {
    selhalo(e);
  }
  return Promise.resolve();
}

const SERIE = '2027';
const ZAVOD = 'jarni-vitr';

let poradi = 0;
function prvek(): PrvekKPostaveni {
  poradi += 1;
  return {
    klic: novyKlic(),
    typ: 'OtocnaBoje',
    body: [{ nazev: `otočná ${poradi}`, sirka: 49.516, delka: 14.165, presnostM: 5 }],
  };
}

function zaradNovy(popis: string) {
  return zarad(SERIE, ZAVOD, popis, prvek());
}

await zkus('klíč má tvar, který server přijme jako Guid', () => {
  const tvar = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  for (let i = 0; i < 200; i++) assert.match(novyKlic(), tvar);

  // Opakovaný klíč by znamenal, že server pokládá dva různé prvky za týž
  // a druhý tiše zahodí jako „už postaveno".
  const klice = new Set(Array.from({ length: 5000 }, novyKlic));
  assert.equal(klice.size, 5000);
});

await zkus('fronta drží pořadí stavby', () => {
  zaradNovy('1. otočná');
  zaradNovy('2. otočná');
  zaradNovy('3. otočná');

  assert.deepEqual(
    cekajici(SERIE, ZAVOD).map((c) => c.popis),
    ['1. otočná', '2. otočná', '3. otočná'],
  );
  assert.equal(prvniKOdeslani(SERIE, ZAVOD)?.popis, '1. otočná');
});

await zkus('cizí regata se do fronty nemíchá', () => {
  zarad('2026', 'jina-regata', 'cizí prvek', prvek());
  assert.equal(cekajici(SERIE, ZAVOD).length, 3);
  assert.equal(cekajici('2026', 'jina-regata').length, 1);
});

await zkus('odeslaný prvek mizí z fronty, ne dřív', () => {
  const prvni = prvniKOdeslani(SERIE, ZAVOD)!;
  hotovo(prvni.id);
  assert.equal(cekajici(SERIE, ZAVOD).length, 2);
  assert.equal(prvniKOdeslani(SERIE, ZAVOD)?.popis, '2. otočná');
});

await zkus('odmítnutý prvek zastaví i všechno za ním', () => {
  const prvni = prvniKOdeslani(SERIE, ZAVOD)!;
  zapisPotiz(prvni.id, 'Trať je přijatá rozhodčím a zamčená.', true);

  // Tohle je to pravidlo: za zaseknutým prvkem se nepokračuje, i když
  // by ten druhý sám o sobě prošel.
  assert.equal(prvniKOdeslani(SERIE, ZAVOD), null);
  assert.equal(stav(SERIE, ZAVOD).ceka, 2);
  assert.equal(stav(SERIE, ZAVOD).odmitnuto, 1);
});

await zkus('zahození odmítnutého frontu zase rozjede', () => {
  const zaseknuty = cekajici(SERIE, ZAVOD)[0];
  zahod(zaseknuty.id);
  assert.equal(prvniKOdeslani(SERIE, ZAVOD)?.popis, '3. otočná');
});

await zkus('nedoručení prvek neodmítá — zkusí se znovu', () => {
  const prvni = prvniKOdeslani(SERIE, ZAVOD)!;
  zapisPotiz(prvni.id, 'Zatím se nepodařilo odeslat — není signál.', false);

  const porad = prvniKOdeslani(SERIE, ZAVOD);
  assert.equal(porad?.id, prvni.id);
  assert.equal(porad?.pokusu, 1);
  assert.equal(porad?.odmitnuto, false);

  hotovo(prvni.id);
  assert.equal(cekajici(SERIE, ZAVOD).length, 0);
});

await zkus('odesílání vyprázdní frontu v pořadí stavby', async () => {
  // Jména se čtou ze zařazených prvků, ne z ruky: čísluje je čítač
  // sdílený s ostatními zkouškami a test má měřit pořadí, ne ten čítač.
  const cekane = ['A', 'B', 'C'].map((p) => zaradNovy(p).vstup.body[0].nazev);

  const poslano: string[] = [];
  const vysledek = await odesliFrontu(SERIE, ZAVOD, async (_s, _z, vstup) => {
    poslano.push(vstup.body![0]!.nazev!);
    return { id: poslano.length };
  });

  assert.equal(vysledek.odeslano, 3);
  assert.equal(vysledek.stoji, null);
  assert.equal(cekajici(SERIE, ZAVOD).length, 0);
  assert.deepEqual(poslano, cekane);
});

await zkus('po odmítnutí se další prvek neodešle', async () => {
  zaradNovy('D');
  zaradNovy('E');

  let pokusu = 0;
  const vysledek = await odesliFrontu(SERIE, ZAVOD, async () => {
    pokusu += 1;
    throw new OdmitnutoServerem(400, 'Trať je přijatá rozhodčím a zamčená.', '/postav');
  });

  // Jediný pokus: druhý prvek by se zařadil před ten zaseknutý a trať
  // by se poskládala jinak, než jak se stavěla.
  assert.equal(pokusu, 1);
  assert.equal(vysledek.odeslano, 0);
  assert.equal(vysledek.proc, 'Trať je přijatá rozhodčím a zamčená.');
  assert.equal(cekajici(SERIE, ZAVOD)[0].odmitnuto, true);
});

await zkus('výpadek sítě prvek neodmítne, jen ho nechá čekat', async () => {
  zahod(cekajici(SERIE, ZAVOD)[0].id);

  const vysledek = await odesliFrontu(SERIE, ZAVOD, async () => {
    throw new Error('network request failed');
  });

  assert.equal(vysledek.odeslano, 0);
  const ceka = cekajici(SERIE, ZAVOD);
  assert.equal(ceka.length, 1);
  assert.equal(ceka[0].odmitnuto, false);
  assert.equal(prvniKOdeslani(SERIE, ZAVOD)?.id, ceka[0].id);
});

await zkus('nepřihlášený se nebere jako odmítnutí prvku', async () => {
  const vysledek = await odesliFrontu(SERIE, ZAVOD, async () => null);

  assert.equal(vysledek.odeslano, 0);
  // Po přihlášení prvek projde, takže odmítnutý není — jen stojí.
  assert.equal(cekajici(SERIE, ZAVOD)[0].odmitnuto, false);
  assert.match(vysledek.proc ?? '', /přihlášen/);
});

console.log(`  ${prosly} prošlo`);
