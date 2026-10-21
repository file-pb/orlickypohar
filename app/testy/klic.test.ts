/**
 * Mobilní klíč k lodi — uplatnění pozvánky a co z toho telefon drží.
 *
 * Pozvánka je **jednorázová**: to hlídá server. Tady se měří appková
 * strana, tedy že se uplatnění uloží, že neplatná pozvánka není chyba
 * k zobrazení červeně, a že zapomenutí klíče telefon odpojí.
 */
import assert from 'node:assert/strict';
import * as Trezor from 'expo-secure-store';

import { klic, tajemstvi, uplatni, zapomen } from '../src/lib/klic.ts';

let prosly = 0;
async function zkus(nazev: string, f: () => Promise<void> | void) {
  try { await f(); prosly += 1; console.log('  ok   ' + nazev); }
  catch (e) { console.log('  CHYBA ' + nazev + ': ' + (e as Error).message); process.exitCode = 1; }
}

/** Falešný server s jednou pozvánkou, kterou lze uplatnit jen jednou. */
function falesnyServer(platnePozvanky: string[]) {
  const zbyva = new Set(platnePozvanky);
  const stav = { pokusy: 0, hlavicky: [] as (string | undefined)[] };

  globalThis.fetch = (async (
    url: string,
    init?: { method?: string; body?: string; headers?: Record<string, string> },
  ) => {
    const cesta = String(url).replace(/^https?:\/\/[^/]+/, '');
    assert.equal(cesta, '/klice/uplatnit');
    assert.equal(init?.method, 'POST');
    stav.pokusy += 1;
    // Uplatnění je jediný endpoint bez přihlášení — pozvánka je oprávnění.
    stav.hlavicky.push(init?.headers?.authorization);

    const kod = JSON.parse(init?.body ?? '{}').kod as string;
    if (!zbyva.delete(kod)) {
      return { ok: false, status: 400, json: async () => 'Pozvánka neplatí.' } as unknown as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ klic: 'tajne-' + kod, lodId: 7, lodNazev: 'LUNA', jmeno: 'Honza' }),
    } as unknown as Response;
  }) as unknown as typeof fetch;

  return stav;
}

console.log('Klíč k lodi');

await zkus('bez uplatnění není telefon spárovaný s ničím', async () => {
  await zapomen();
  assert.equal(await klic(), null);
  assert.equal(await tajemstvi(), null);
});

await zkus('uplatněná pozvánka uloží klíč i loď', async () => {
  await zapomen();
  falesnyServer(['abc']);

  const k = await uplatni('abc');
  assert.deepEqual(k, { lodId: 7, lodNazev: 'LUNA', jmeno: 'Honza' });
  assert.deepEqual(await klic(), { lodId: 7, lodNazev: 'LUNA', jmeno: 'Honza' });
  assert.equal(await tajemstvi(), 'tajne-abc', 'tajemství se uložilo pro odesílání');
});

await zkus('kód se před odesláním ořeže', async () => {
  await zapomen();
  // Posádka ho opisuje z papíru nebo ho lepí ze schránky, takže mezera
  // na konci je normální a nesmí pozvánku zneplatnit.
  falesnyServer(['abc']);
  assert.notEqual(await uplatni('  abc\n'), null);
});

await zkus('neplatná pozvánka vrací null, ne výjimku', async () => {
  await zapomen();
  falesnyServer([]);
  // Prošlá, vymyšlená i podruhé uplatněná vypadají stejně — posádce
  // pomůže jedině nová pozvánka, takže se nerozlišují.
  assert.equal(await uplatni('neexistuje'), null);
  assert.equal(await klic(), null, 'nic se neuložilo');
});

await zkus('druhé uplatnění téže pozvánky už neprojde', async () => {
  await zapomen();
  falesnyServer(['abc']);
  assert.notEqual(await uplatni('abc'), null);
  await zapomen();
  assert.equal(await uplatni('abc'), null, 'pozvánka je jednorázová');
});

await zkus('uplatnění se neprokazuje účtem', async () => {
  await zapomen();
  const stav = falesnyServer(['abc']);
  await uplatni('abc');
  assert.deepEqual(stav.hlavicky, [undefined], 'žádná autorizační hlavička');
});

await zkus('nový klíč přepíše starý — telefon patří jedné lodi', async () => {
  await zapomen();
  falesnyServer(['prvni', 'druhy']);
  await uplatni('prvni');
  await uplatni('druhy');
  assert.equal(await tajemstvi(), 'tajne-druhy');
});

await zkus('zapomenutí klíče telefon odpojí', async () => {
  await zapomen();
  falesnyServer(['abc']);
  await uplatni('abc');
  await zapomen();

  assert.equal(await klic(), null);
  assert.equal(await tajemstvi(), null, 'tajemství nesmí v telefonu zůstat');
});

await zkus('server na nečekanou chybu se neskryje', async () => {
  await zapomen();
  globalThis.fetch = (async () =>
    ({ ok: false, status: 500, json: async () => ({}) }) as unknown as Response) as typeof fetch;
  // 400 je odpověď, 500 je porucha — ta se nesmí tvářit jako neplatná pozvánka.
  await assert.rejects(() => uplatni('abc'), /500/);
});

console.log(`\n${prosly} kontrol prošlo.`);

// Náhrada SecureStore je v paměti; kontrola, že test nic nenechal za sebou.
assert.equal(await (Trezor as unknown as { getItemAsync(k: string): Promise<string | null> })
  .getItemAsync('op_klic_lodi'), null);
