/**
 * Napojený telefon je přihlášený — a kdo to potřebuje vědět, dozví se to hned.
 *
 * Měří se dvě věci, které by bez testu poznal až Filip u vody:
 *
 * 1. <b>`jePrihlasen()` bere klíč k účtu.</b> Dokud se ptala jen na token
 *    z poskytovatele, telefon napojený kódem vypadal jako cizí: na headeru
 *    svítilo „Přihlásit" a rozcestník neukázal, co ten účet smí.
 * 2. <b>Napojení, odpojení i odhlášení se ohlásí.</b> Kebab v kořenovém
 *    rozvržení se připojí jednou za běh a rozcestník zůstává v zásobníku,
 *    takže bez ohlášení by se o napojení nedozvěděly.
 */
import assert from 'node:assert/strict';
import { nastav } from 'expo-secure-store';

import { jePrihlasen, odhlas } from '../src/lib/identita.ts';
import { naZmenuUctu, napoj, zapomenKlic } from '../src/lib/klic-uctu.ts';

let prosly = 0;
async function zkus(nazev: string, f: () => Promise<void>) {
  try {
    await f();
    prosly += 1;
    console.log('  ok   ' + nazev);
  } catch (e) {
    console.log('  CHYBA ' + nazev + ': ' + (e as Error).message);
    process.exitCode = 1;
  }
}

/** Server, který kód přijme. Ověřuje, že appka volá tu cestu, kterou má. */
function serverPrijme() {
  globalThis.fetch = (async (url: string, init?: { method?: string }) => {
    assert.equal(String(url).replace(/^https?:\/\/[^/]+/, ''), '/klice/napojit');
    assert.equal(init?.method, 'POST');
    return {
      ok: true,
      status: 200,
      json: async () => ({ klic: 'tajny-klic', zobrazovane: 'Filip' }),
    } as unknown as Response;
  }) as unknown as typeof fetch;
}

function serverOdmitne() {
  globalThis.fetch = (async () =>
    ({ ok: false, status: 401, json: async () => ({}) }) as unknown as Response) as unknown as typeof fetch;
}

await zkus('bez klíče i tokenu není nikdo přihlášený', async () => {
  await zapomenKlic();
  await odhlas();
  assert.equal(await jePrihlasen(), false);
});

await zkus('napojený telefon je přihlášený i bez tokenu', async () => {
  await odhlas();
  serverPrijme();
  assert.equal(await napoj('JKM62Q7P', 'Android'), 'Filip');
  assert.equal(await jePrihlasen(), true);
});

await zkus('token z doby přihlašování heslem platí dál', async () => {
  // Kdo se přihlásil dřív, nemá o přístup přijít uprostřed sezóny jen
  // proto, že tlačítko na heslo z appky zmizelo.
  await zapomenKlic();
  nastav('op_token', 'stary-token');
  assert.equal(await jePrihlasen(), true);
  await odhlas();
  assert.equal(await jePrihlasen(), false);
});

await zkus('napojení, odpojení i odhlášení se ohlásí', async () => {
  let hlaseni = 0;
  const odhlasit = naZmenuUctu(() => {
    hlaseni += 1;
  });
  serverPrijme();
  await napoj('JKM62Q7P', 'Android');
  await zapomenKlic();
  await odhlas();
  assert.equal(hlaseni, 3);

  odhlasit();
  await zapomenKlic();
  assert.equal(hlaseni, 3, 'odhlášený posluchač se už volat nemá');
});

await zkus('neplatný kód nic neohlásí ani neuloží', async () => {
  // Ohlášení po odmítnutém kódu by kebab obnovilo zbytečně — a hlavně
  // by to znamenalo, že se ohlašuje dřív, než je co ohlásit.
  await zapomenKlic();
  let hlaseni = 0;
  const odhlasit = naZmenuUctu(() => {
    hlaseni += 1;
  });
  serverOdmitne();
  assert.equal(await napoj('SPATNYKD', 'Android'), null);
  assert.equal(hlaseni, 0);
  assert.equal(await jePrihlasen(), false);
  odhlasit();
});

console.log(`  ${prosly} prošlo`);
