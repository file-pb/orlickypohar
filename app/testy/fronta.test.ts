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

import { OdmitnutoServerem, type PrvekSpravy } from '../src/lib/api.ts';
import {
  cekajici,
  hotovo,
  novyKlic,
  postavene,
  postavenyPodleKlice,
  prvniKOdeslani,
  stav,
  zahod,
  zapisPostaveny,
  zapisPotiz,
  zarad,
  type PrvekKPostaveni,
} from '../src/lib/stavba/fronta.ts';
import { odesliFrontu } from '../src/lib/stavba/odesilani.ts';
import { jeVadaPrvku } from '../src/lib/stavba/odesilani.ts';

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

/**
 * Odpověď serveru na `postav`. Čísla bójí v ní jsou to jediné, odkud se
 * appka dozví, kam se k té bóji dá přiložit fotka.
 */
function odpoved(
  prvekId: number,
  nazevA: string,
  konecB?: { id: number; nazev: string },
): PrvekSpravy {
  return {
    id: prvekId,
    typ: konecB ? 'Brana' : 'OtocnaBoje',
    poradi: prvekId,
    strana: null,
    poznamka: null,
    a: { id: prvekId * 10, nazev: nazevA, sirka: 49.516, delka: 14.165 },
    b: konecB ? { ...konecB, sirka: 49.517, delka: 14.166 } : null,
  };
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
    return odpoved(poslano.length, vstup.body![0]!.nazev!);
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

await zkus('čísla bójí ze serveru přežijí smazání řádku fronty', async () => {
  const radek = zaradNovy('F');

  await odesliFrontu(SERIE, ZAVOD, async (_s, _z, vstup) =>
    odpoved(7, vstup.body![0]!.nazev!),
  );

  // Řádek fronty je pryč — a právě proto musí být čísla jinde. Do
  // 17. 11. 2026 se zahazovala spolu s ním a fotka neměla kam přijít.
  assert.equal(cekajici(SERIE, ZAVOD).length, 0);

  const zapsany = postavenyPodleKlice(radek.klic);
  assert.ok(zapsany, 'postavený prvek se nezapsal');
  assert.equal(zapsany.prvekId, 7);
  assert.equal(zapsany.bojeAId, 70);
  assert.equal(zapsany.popis, 'F');
  // Jednobodový prvek druhý konec nemá a nesmí si ho vymyslet.
  assert.equal(zapsany.bojeBId, null);
});

await zkus('brána si zapamatuje obě čísla, ne jen první', async () => {
  const radek = zaradNovy('G');

  await odesliFrontu(SERIE, ZAVOD, async (_s, _z, vstup) =>
    odpoved(8, vstup.body![0]!.nazev!, { id: 99, nazev: 'levý konec' }),
  );

  const zapsany = postavenyPodleKlice(radek.klic);
  assert.equal(zapsany?.bojeAId, 80);
  assert.equal(zapsany?.bojeBId, 99);
  assert.equal(zapsany?.bojeBNazev, 'levý konec');
});

await zkus('opakované potvrzení téhož prvku nezaloží druhý záznam', () => {
  const pred = postavene(SERIE, ZAVOD).length;
  const klic = novyKlic();
  const zaznam = {
    klic,
    serie: SERIE,
    zavod: ZAVOD,
    popis: 'H',
    prvekId: 9,
    bojeAId: 90,
    bojeANazev: 'otočná 9',
    bojeBId: null,
    bojeBNazev: null,
    potvrzenoV: 1_700_000_000_000,
  };

  // Server vrací na opakované odeslání týž prvek (200 místo 201), takže
  // druhý zápis je tatáž věc znovu, ne duplicita.
  zapisPostaveny(zaznam);
  zapisPostaveny({ ...zaznam, potvrzenoV: 1_700_000_001_000 });

  assert.equal(postavene(SERIE, ZAVOD).length, pred + 1);
  assert.equal(postavenyPodleKlice(klic)?.potvrzenoV, 1_700_000_001_000);
});

await zkus('postavené se řadí podle pořadí na trati, ne podle času', () => {
  const vsechny = postavene(SERIE, ZAVOD).map((p) => p.prvekId);
  assert.deepEqual(vsechny, [...vsechny].sort((x, y) => x - y));
});

zkus('vadu prvku hlásí jedině 400, protože tak jdou ven věty pravidel', () => {
  assert.equal(jeVadaPrvku(400), true);
});

zkus('výpadek proxy při nasazení není vada prvku', () => {
  // Tohle je ten případ, kvůli kterému rozlišení vzniklo: 502 od proxy
  // během nasazení označilo platný prvek za odmítnutý a nabídlo jediné
  // východisko — smazat nenahraditelné měření.
  for (const stav of [500, 502, 503, 504]) assert.equal(jeVadaPrvku(stav), false);
});

zkus('ani chybějící rozsah a vypršení nejsou vada prvku', () => {
  for (const stav of [404, 408, 429]) assert.equal(jeVadaPrvku(stav), false);
});

console.log(`  ${prosly} prošlo`);
