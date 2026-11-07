/**
 * Režim „hlásím se" — slepý tracking od klubovny a překlopení v T−20 (R3).
 *
 * Měří se tu ta část, na které celý nález stojí: že se telefon <b>překlopí
 * sám</b>, podle stáhnutého času, a že se do té chvíle <b>neposílá ani jedna
 * souřadnice</b>. Server se nahrazuje falešným `fetch`, takže je vidět, co
 * telefon opravdu odeslal — ne jen co si o tom myslí.
 */
import assert from 'node:assert/strict';
import * as Trezor from 'expo-secure-store';

import {
  hlasim, jeCasSeOzvat, maSeNahravat, ozviSeAsync, vypniHlaseni, zacniKdyzJeCas,
  zapisStazeny, zapniHlaseni, JAK_CASTO_MS,
} from '../src/lib/tracker/hlasim-se.ts';
import { bezicZaznam, smazZaznam, ukonciZaznam } from '../src/lib/tracker/zaznam.ts';

let prosly = 0;
async function zkus(nazev: string, f: () => Promise<void> | void) {
  try { await f(); prosly += 1; console.log('  ok   ' + nazev); }
  catch (e) { console.log('  CHYBA ' + nazev + ': ' + (e as Error).message); process.exitCode = 1; }
}

const START = Date.parse('2027-06-26T09:00:00Z');
const T20 = START - 20 * 60_000;

function uklid() {
  const z = bezicZaznam();
  if (z) { ukonciZaznam(z.id); smazZaznam(z.id); }
  vypniHlaseni();
}

/** Falešné API: vrací, co by vrátil `POST /klice/hlaseni`. */
function falesnyServer(nahravatOd: string | null) {
  const stav = { hlaseni: 0, baterie: [] as (number | null)[], cesty: [] as string[] };
  globalThis.fetch = (async (
    url: string,
    init?: { method?: string; body?: string; headers?: Record<string, string> },
  ) => {
    const cesta = String(url).replace(/^https?:\/\/[^/]+/, '');
    stav.cesty.push(cesta);
    if (cesta === '/klice/hlaseni' && init?.method === 'POST') {
      stav.hlaseni += 1;
      stav.baterie.push(JSON.parse(init.body ?? '{}').baterieProcent ?? null);
      return {
        ok: true,
        status: 200,
        json: async () => ({ sleduje: true, startV: null, nahravatOd, nahravatTed: false }),
      } as unknown as Response;
    }
    throw new Error('neznámá cesta ' + cesta);
  }) as typeof fetch;
  return stav;
}

(Trezor as unknown as { nastav(k: string, v: string): void }).nastav('op_klic_lodi', 'tajemstvi');
(Trezor as unknown as { nastav(k: string, v: string): void }).nastav('op_klic_lod', '7');

console.log('Kdy se přepne na nahrávání');

await zkus('bez stáhnutého času se nenahrává, i když je režim zapnutý', () => {
  uklid();
  zapniHlaseni({ lod: 'LUNA', regata: 'Radavská' });
  // Rozprava ještě nedala čas startu — není proti čemu měřit.
  assert.equal(maSeNahravat(hlasim(), START), false);
  assert.equal(zacniKdyzJeCas(START), null);
  assert.equal(bezicZaznam(), null);
  uklid();
});

await zkus('před T−20 ještě ne, od T−20 už ano', () => {
  uklid();
  zapniHlaseni({ lod: 'LUNA', regata: null });
  zapisStazeny(T20, START - 60 * 60_000);

  assert.equal(maSeNahravat(hlasim(), T20 - 1000), false);
  assert.equal(maSeNahravat(hlasim(), T20), true);
  assert.equal(maSeNahravat(hlasim(), START), true);
  uklid();
});

await zkus('vypnutý režim nenahrává, i když čas dávno nadešel', () => {
  uklid();
  zapniHlaseni({ lod: 'LUNA', regata: null });
  zapisStazeny(T20, 0);
  vypniHlaseni();
  assert.equal(maSeNahravat(hlasim(), START), false);
  uklid();
});

console.log('\nPřeklopení');

await zkus('v T−20 se záznam založí sám a režim se vypne', () => {
  uklid();
  zapniHlaseni({ lod: 'LUNA', regata: 'Radavská' });
  zapisStazeny(T20, 0);

  const id = zacniKdyzJeCas(T20);
  assert.ok(id, 'záznam se měl založit');
  const z = bezicZaznam();
  assert.equal(z?.lod, 'LUNA');
  assert.equal(z?.regata, 'Radavská');
  assert.equal(z?.zdroj, 'gps');

  // Režim svou práci udělal. Kdyby zůstal zapnutý, telefon by si po
  // ukončení záznamu do pěti sekund založil nový — nahrával by cestu k molu.
  assert.equal(hlasim().zapnuto, false);
  uklid();
});

await zkus('po ukončení záznamu se nezaloží druhý', () => {
  uklid();
  zapniHlaseni({ lod: 'LUNA', regata: null });
  zapisStazeny(T20, 0);

  const id = zacniKdyzJeCas(T20)!;
  ukonciZaznam(id);
  assert.equal(zacniKdyzJeCas(START), null);
  smazZaznam(id);
  uklid();
});

console.log('\nJak často se telefon ozývá');

await zkus('první hlášení jde hned, druhé až po pěti minutách', () => {
  uklid();
  zapniHlaseni({ lod: 'LUNA', regata: null });
  assert.equal(jeCasSeOzvat(hlasim(), START), true, 'první hlášení musí odejít hned');

  zapisStazeny(null, START);
  assert.equal(jeCasSeOzvat(hlasim(), START + JAK_CASTO_MS - 1000), false);
  assert.equal(jeCasSeOzvat(hlasim(), START + JAK_CASTO_MS), true);
  uklid();
});

await zkus('vypnutý režim se neozývá vůbec', () => {
  uklid();
  assert.equal(jeCasSeOzvat(hlasim(), START), false);
});

console.log('\nCo jde na server');

await zkus('hlášení posílá baterii a žádnou souřadnici, a přinese čas', async () => {
  uklid();
  const server = falesnyServer(new Date(T20).toISOString());
  zapniHlaseni({ lod: 'LUNA', regata: null });

  const po = await ozviSeAsync(START - 60 * 60_000);

  assert.equal(server.hlaseni, 1);
  assert.deepEqual(server.cesty, ['/klice/hlaseni']);
  // Jediná cesta, na kterou se tlouklo. Kdyby režim posílal polohy, byla by
  // tu i `/trasy` — a falešný server by na ní rovnou vyhodil výjimku.
  assert.equal(po.nahravatOd, T20, 'stáhnutý čas se měl zapsat');
  uklid();
});

await zkus('mezi dvěma hlášeními se na server netluče', async () => {
  uklid();
  const server = falesnyServer(null);
  zapniHlaseni({ lod: 'LUNA', regata: null });

  await ozviSeAsync(START);
  await ozviSeAsync(START + 1000);
  await ozviSeAsync(START + JAK_CASTO_MS);

  assert.equal(server.hlaseni, 2, 'druhé hlášení v téže minutě mělo vypadnout');
  uklid();
});

await zkus('padlá síť stáhnutý čas nezahodí', async () => {
  uklid();
  zapniHlaseni({ lod: 'LUNA', regata: null });
  zapisStazeny(T20, 0);

  globalThis.fetch = (async () => { throw new Error('bez signálu'); }) as typeof fetch;
  const po = await ozviSeAsync(START - 60 * 60_000);

  // Celý smysl stáhnutého času je, že funguje i bez signálu.
  assert.equal(po.nahravatOd, T20);
  assert.equal(maSeNahravat(po, T20), true);
  uklid();
});

console.log(`\n${prosly} v pořádku`);
