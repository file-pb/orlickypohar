/**
 * Odesílání trasy na server — fronta, výpadky a doposílání.
 *
 * Server se nahrazuje falešným `fetch`, který se chová jako to skutečné API:
 * je **idempotentní**. Na tom celé nahrávání stojí, takže test, který by to
 * zjednodušil, by neměřil nic.
 */
import assert from 'node:assert/strict';
import * as Trezor from 'expo-secure-store';

import {
  bezicZaznam, kolikCeka, prehled, smazZaznam, ukonciZaznam, zalozZaznam, zapisBody, zaznam,
} from '../src/lib/tracker/zaznam.ts';
import {
  dokonciNahraniAsync, nahrajAsync, stavNahravani, zkusZiveAsync, ZIVE_MS,
} from '../src/lib/tracker/nahravani.ts';

let prosly = 0;
async function zkus(nazev: string, f: () => Promise<void> | void) {
  try { await f(); prosly += 1; console.log('  ok   ' + nazev); }
  catch (e) { console.log('  CHYBA ' + nazev + ': ' + (e as Error).message); process.exitCode = 1; }
}

const T0 = Date.parse('2027-06-26T08:00:00Z');

/** Falešné API, které se chová jako to skutečné: přijatý bod se nepřijme podruhé. */
function falesnyServer() {
  const trasy = new Map<string, Set<number>>();
  const stav = {
    zalozeni: 0, davky: 0, dokonceno: false, selziPo: Number.POSITIVE_INFINITY,
    /** Server odmítá zakládat trasu, protože neběží okno regaty. */
    mimoOkno: false,
    /** Čím se poslední požadavek prokázal. Tím se měří, že jde klíč, ne token. */
    klice: [] as (string | undefined)[],
  };

  globalThis.fetch = (async (
    url: string,
    init?: { method?: string; body?: string; headers?: Record<string, string> },
  ) => {
    stav.klice.push(init?.headers?.['x-klic-lodi']);
    const cesta = String(url).replace(/^https?:\/\/[^/]+/, '');
    const odpoved = (telo: unknown) =>
      ({ ok: true, status: 200, json: async () => telo }) as unknown as Response;

    if (cesta === '/trasy' && init?.method === 'POST') {
      const t = JSON.parse(init.body ?? '{}');
      stav.zalozeni += 1;
      if (stav.mimoOkno) {
        return {
          ok: false,
          status: 409,
          json: async () => ({ error: 'Teď neběží žádné okno regaty.' }),
        } as unknown as Response;
      }
      if (!trasy.has(t.lokalniId)) trasy.set(t.lokalniId, new Set());
      const body = trasy.get(t.lokalniId)!;
      return odpoved({ lokalniId: t.lokalniId, posledniBod: body.size ? Math.max(...body) : null });
    }

    const mBody = cesta.match(/^\/trasy\/([^/]+)\/body$/);
    if (mBody && init?.method === 'POST') {
      stav.davky += 1;
      if (stav.davky > stav.selziPo) {
        return { ok: false, status: 503, json: async () => ({}) } as unknown as Response;
      }
      const body = trasy.get(mBody[1]);
      if (!body) return { ok: false, status: 404, json: async () => ({}) } as unknown as Response;
      const prichozi = JSON.parse(init.body ?? '[]') as { lokalniId: number }[];
      let prijato = 0;
      for (const b of prichozi) {
        if (!body.has(b.lokalniId)) { body.add(b.lokalniId); prijato += 1; }
      }
      return odpoved({
        prijato,
        preskoceno: prichozi.length - prijato,
        posledniBod: body.size ? Math.max(...body) : null,
      });
    }

    const mHotovo = cesta.match(/^\/trasy\/([^/]+)\/dokonceno$/);
    if (mHotovo && init?.method === 'POST') {
      stav.dokonceno = true;
      const body = trasy.get(mHotovo[1]) ?? new Set();
      return odpoved({ lokalniId: mHotovo[1], posledniBod: body.size ? Math.max(...body) : null });
    }

    throw new Error('neznámá cesta ' + cesta);
  }) as typeof fetch;

  return { trasy, stav };
}

function uklid() {
  const z = bezicZaznam();
  if (z) { ukonciZaznam(z.id); smazZaznam(z.id); }
}

function trasaSBody(kolik: number): string {
  uklid();
  const id = zalozZaznam({ lod: 'LUNA', regata: 'Radavská regata', zdroj: 'gps' });
  zapisBody(id, Array.from({ length: kolik }, (_, i) => ({
    sirka: 49.5 + i * 1e-5, delka: 14.16 + i * 1e-5, casGps: T0 + i * 5000, presnost: 6,
  })));
  return id;
}

console.log('Odesílání trasy');

await zkus('bez klíče k lodi se nic neodešle a fronta zůstane', async () => {
  const id = trasaSBody(10);
  falesnyServer();
  // Klíč není — `posliKlicem` vrátí null, aniž by se na API ozvalo.
  const v = await nahrajAsync(id);
  assert.equal(v.klicPlati, false);
  assert.equal(v.odeslano, 0);
  assert.equal(kolikCeka(id), 10, 'body musí zůstat ve frontě');
  ukonciZaznam(id); smazZaznam(id);
});

// Od téhle chvíle je telefon spárovaný s lodí.
(Trezor as unknown as { nastav(k: string, v: string): void }).nastav('op_klic_lodi', 'tajemstvi');
(Trezor as unknown as { nastav(k: string, v: string): void }).nastav('op_klic_lod', '7');

await zkus('telefon se prokazuje klíčem k lodi, ne tokenem účtu', async () => {
  const id = trasaSBody(10);
  const { stav } = falesnyServer();
  await nahrajAsync(id);

  // Jádro věci: trasa patří lodi. Kdyby tu šel `authorization`, musela by
  // se celá posádka registrovat.
  assert.ok(stav.klice.length >= 2, 'mělo proběhnout založení i dávka');
  assert.ok(
    stav.klice.every((k) => k === 'tajemstvi'),
    'každý požadavek se prokázal klíčem: ' + JSON.stringify(stav.klice),
  );
  ukonciZaznam(id); smazZaznam(id);
});

await zkus('fronta se vyprázdní a potvrdí podle serveru', async () => {
  const id = trasaSBody(450);
  const { trasy } = falesnyServer();
  const v = await nahrajAsync(id);

  assert.equal(v.klicPlati, true);
  assert.equal(v.odeslano, 450);
  assert.equal(v.zbyva, 0);
  assert.equal(trasy.get(id)!.size, 450, 'server má všechny body');
  assert.equal(stavNahravani(id)!.ceka, 0);
  ukonciZaznam(id); smazZaznam(id);
});

await zkus('druhé nahrání téže trasy nic nezdvojí', async () => {
  const id = trasaSBody(300);
  const { trasy, stav } = falesnyServer();
  await nahrajAsync(id);
  const druhe = await nahrajAsync(id);

  assert.equal(druhe.odeslano, 0, 'podruhé není co posílat');
  assert.equal(trasy.get(id)!.size, 300);
  assert.equal(stav.zalozeni, 2, 'zakládalo se dvakrát, trasa je jedna');
  ukonciZaznam(id); smazZaznam(id);
});

await zkus('výpadek uprostřed nechá zbytek ve frontě a doposlání ho dožene', async () => {
  const id = trasaSBody(500);
  const { trasy, stav } = falesnyServer();
  stav.selziPo = 1; // první dávka projde, druhá spadne

  await assert.rejects(() => nahrajAsync(id), /503/);

  const ceka = kolikCeka(id);
  assert.equal(ceka, 300, 'prvních 200 je potvrzených, zbytek čeká');
  assert.equal(trasy.get(id)!.size, 200);

  stav.selziPo = Number.POSITIVE_INFINITY;
  const dalsi = await nahrajAsync(id);
  assert.equal(dalsi.odeslano, 300);
  assert.equal(kolikCeka(id), 0);
  assert.equal(trasy.get(id)!.size, 500);
  ukonciZaznam(id); smazZaznam(id);
});

await zkus('server, který má víc než telefon, posune hranici sám', async () => {
  const id = trasaSBody(100);
  const { trasy } = falesnyServer();
  await nahrajAsync(id);

  // Telefon „zapomene", co bylo potvrzené — jako by se ztratila odpověď.
  const z = zaznam(id)!;
  assert.ok(z.potvrzeno_do > 0);
  const { databaze } = await import('../src/lib/tracker/db.ts');
  databaze().runSync('UPDATE zaznam SET potvrzeno_do = 0 WHERE id = ?', [id]);
  assert.equal(kolikCeka(id), 100);

  // Při dalším nahrání se hranice srovná podle serveru a neposílá se znovu.
  const v = await nahrajAsync(id);
  assert.equal(v.odeslano, 0, 'server už je má, nic se neposílá');
  assert.equal(trasy.get(id)!.size, 100);
  ukonciZaznam(id); smazZaznam(id);
});

await zkus('dokončit nahrání jde, až když fronta doběhne', async () => {
  const id = trasaSBody(250);
  const { stav } = falesnyServer();
  stav.selziPo = 0; // žádná dávka neprojde

  await assert.rejects(() => dokonciNahraniAsync(id), /503/);
  assert.equal(stav.dokonceno, false, 'nedokončuje se s nedoslanými body');

  stav.selziPo = Number.POSITIVE_INFINITY;
  const hotovo = await dokonciNahraniAsync(id);
  assert.equal(hotovo.hotovo, true);
  assert.equal(stav.dokonceno, true);
  assert.equal(stavNahravani(id)!.hotovo, true);
  ukonciZaznam(id); smazZaznam(id);
});

await zkus('ostříhané body se už neodesílají', async () => {
  const id = trasaSBody(100);
  const { ostrihej } = await import('../src/lib/tracker/zaznam.ts');
  const p = prehled(id);
  ostrihej(id, p.prvni! + 49 * 5000);

  const { trasy } = falesnyServer();
  await nahrajAsync(id);

  // Co se podle plánu nemá uchovávat, se nemá ani nahrávat.
  assert.equal(trasy.get(id)!.size, 50);
  ukonciZaznam(id); smazZaznam(id);
});

await zkus('mimo okno regaty se nic nezahodí a fronta zůstane', async () => {
  const id = trasaSBody(30);
  const { trasy, stav } = falesnyServer();
  stav.mimoOkno = true;

  const v = await nahrajAsync(id);

  // Rozprava ještě nebyla, takže server trasu nevezme. Je to stav závodu,
  // ne porucha telefonu — body zůstávají zapsané a pošlou se potom.
  assert.equal(v.potiz, 'mimo-okno');
  assert.equal(v.odeslano, 0);
  assert.equal(kolikCeka(id), 30);
  assert.equal(trasy.size, 0, 'server trasu nezaložil');
  assert.equal(stavNahravani(id)!.potiz, 'mimo-okno');

  // Po rozpravě se doposílá bez dalšího zásahu posádky.
  stav.mimoOkno = false;
  const potom = await nahrajAsync(id);
  assert.equal(potom.odeslano, 30);
  assert.equal(stavNahravani(id)!.potiz, null);
  ukonciZaznam(id); smazZaznam(id);
});

await zkus('živě se odesílá nejvýš jednou za minutu', async () => {
  const id = trasaSBody(12);
  const { stav } = falesnyServer();
  const t0 = T0 + 10 * 60 * 1000;

  const prvni = await zkusZiveAsync(id, t0);
  assert.equal(prvni.odeslano, 12);

  // Další bod přišel za pět sekund — rádio se kvůli němu zapínat nebude.
  zapisBody(id, [{ sirka: 49.6, delka: 14.2, casGps: t0 + 5000 }]);
  const hned = await zkusZiveAsync(id, t0 + 5000);
  assert.equal(hned.preskoceno, true);
  assert.equal(hned.odeslano, 0);
  assert.equal(stav.davky, 1, 'druhá dávka se neposlala');

  // Po minutě ano.
  const pozdeji = await zkusZiveAsync(id, t0 + ZIVE_MS);
  assert.equal(pozdeji.odeslano, 1);
  assert.equal(stav.davky, 2);
  ukonciZaznam(id); smazZaznam(id);
});

await zkus('živý kanál nepadá na výpadku sítě a fronta zůstane', async () => {
  const id = trasaSBody(20);
  const { stav } = falesnyServer();
  stav.selziPo = 0;

  // Výjimka z handleru úlohy na pozadí by znamenala, že systém úlohu
  // odregistruje a záznam skončí bez varování v půlce závodu.
  const v = await zkusZiveAsync(id, T0 + 20 * 60 * 1000);

  assert.equal(v.potiz, 'sit');
  assert.equal(kolikCeka(id), 20);
  assert.equal(stavNahravani(id)!.potiz, 'sit');
  ukonciZaznam(id); smazZaznam(id);
});

await zkus('ukončený záznam se živě už neodesílá', async () => {
  const id = trasaSBody(10);
  falesnyServer();
  ukonciZaznam(id);

  const v = await zkusZiveAsync(id, T0 + 30 * 60 * 1000);

  // Po dojezdu se dokončuje ručně (a je u toho vidět, co se děje); živý
  // kanál patří k jízdě.
  assert.equal(v.odeslano, 0);
  assert.equal(kolikCeka(id), 10);
  smazZaznam(id);
});

console.log(`\n${prosly} kontrol prošlo`);
