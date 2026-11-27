/**
 * Samoaktualizace: kdy se appka smí sama restartovat, co si pamatuje mezi
 * restarty, co o sobě tvrdí a co hlásí serveru.
 *
 * Měří se to, co by jinak poznal až Filip u vody: že restart nikdy
 * nepřijde uprostřed startu nebo cíle, že se appka nezacyklí na verzi,
 * která padá, a že nikde nenapíše „aktuální" bez úspěšné kontroly.
 * Telefon se tu nespouští — to, že `reloadAsync` za běhu záznamu trasy
 * nic neztratí, ověří až zkouška na zařízení (testy/README.md).
 */
import assert from 'node:assert/strict';
import { zapomenVse } from 'expo-file-system';
import { nastav, nastavKontrolu, zapomenZaznam, zaznam } from 'expo-updates';

import {
  jsOverenoCerstve, maSeKontrolovat, nactiPamet, poStartu, popisStavuJs, pouzijVerzi,
  PRAZDNA_PAMET, predChvili, stavJs, ulozPamet, zkontrolujTed, type Pamet,
} from '../src/lib/aktualizace.ts';
import {
  DLOUHA_PAUZA_MS, naZmenuZamku, prekazkyRestartu, restartovatTed, startDrzi, zamkni, zamkyTed,
} from '../src/lib/restart.ts';
import { sit, zapisuVLetu } from '../src/lib/sit.ts';
import { hlavickaTed, hlavickaVerze, spusteni, type UdajeVerze } from '../src/lib/verze-hlavicka.ts';

let prosly = 0;
async function zkus(nazev: string, f: () => Promise<void> | void) {
  try {
    await f();
    prosly += 1;
    console.log('  ok   ' + nazev);
  } catch (e) {
    console.log('  CHYBA ' + nazev + ': ' + (e as Error).message);
    process.exitCode = 1;
  }
}

const TED = Date.parse('2026-11-27T10:00:00+01:00');
const ID_A = '01a21a43-f106-7715-b38a-21aace07baaa';
const ID_B = '02b32b54-a217-4826-c49b-32bbdf18cbbb';

/* ------------------------------------------------------------------ restart */

console.log('Kdy se smí restartovat');

await zkus('start drží celé okno procedury a pět minut po startu', () => {
  const delka = 300;
  assert.equal(startDrzi(null, TED, delka), false);
  // Opakovač svěsí každou chvíli; odstartovanou ohlašuje jen obrazovka.
  assert.equal(startDrzi({ druh: 'opakovac', cislo: 1, opakovacOd: '', visiS: 30 }, TED, delka), true);
  assert.equal(startDrzi({ druh: 'odstartovano', cislo: 1, odStartuS: 10 }, TED, delka), true);
  // Za dvě hodiny: ještě se smí.
  assert.equal(startDrzi({ druh: 'ceka', cislo: 1, startV: new Date(TED + 2 * 3600_000).toISOString() }, TED, delka), false);
  // Patnáct minut do startu je uvnitř okna (5 min procedura + 1 min klid + 10 min rezerva).
  assert.equal(startDrzi({ druh: 'ceka', cislo: 1, startV: new Date(TED + 15 * 60_000).toISOString() }, TED, delka), true);
  assert.equal(startDrzi({ druh: 'jede', cislo: 1, odStartuS: 2 * 60 }, TED, delka), true);
  assert.equal(startDrzi({ druh: 'jede', cislo: 1, odStartuS: 10 * 60 }, TED, delka), false);
});

const cerstva = { doletelo: true, kdy: TED - 1000 };

await zkus('bez zámků a s čerstvým spojením nic nebrání', () => {
  assert.deepEqual(prekazkyRestartu({ ted: TED, zamky: [], ukazka: false, zapisuVLetu: 0, sit: cerstva }), []);
});

await zkus('bez ověřeného spojení se nerestartuje', () => {
  // Obrazovky nemají mezipaměť — restart bez signálu nechá cílovku prázdnou.
  assert.deepEqual(prekazkyRestartu({ ted: TED, zamky: [], ukazka: false, zapisuVLetu: 0, sit: null }), ['bez-site']);
  const stara = { doletelo: true, kdy: TED - 60_000 };
  assert.deepEqual(prekazkyRestartu({ ted: TED, zamky: [], ukazka: false, zapisuVLetu: 0, sit: stara }), ['bez-site']);
  const nedoletelo = { doletelo: false, kdy: TED };
  assert.deepEqual(prekazkyRestartu({ ted: TED, zamky: [], ukazka: false, zapisuVLetu: 0, sit: nedoletelo }), ['bez-site']);
});

await zkus('zámky, ukázka a rozběhnutý zápis brání', () => {
  const p = prekazkyRestartu({ ted: TED, zamky: ['start', 'cil'], ukazka: true, zapisuVLetu: 1, sit: cerstva });
  assert.deepEqual(new Set(p), new Set(['start', 'cil', 'ukazka', 'zapis-v-letu']));
});

await zkus('restart: bez připravené verze nikdy, na tlačítko vždycky', () => {
  assert.equal(restartovatTed({ druh: 'domov' }, null, null, []), false);
  assert.equal(restartovatTed({ druh: 'tlacitko' }, { id: ID_A }, ID_A, ['start']), true);
});

await zkus('verze, která se jednou nevzala, se sama znovu nezkouší', () => {
  // Bez toho by se appka točila ve smyčce: restart, pád, návrat, restart…
  assert.equal(restartovatTed({ druh: 'domov' }, { id: ID_A }, ID_A, []), false);
  assert.equal(restartovatTed({ druh: 'domov' }, { id: ID_B }, ID_A, []), true);
});

await zkus('krátký návrat z pozadí není příležitost', () => {
  // Dialog oprávnění, galerie, přihlášení — člověk je uprostřed něčeho.
  assert.equal(restartovatTed({ druh: 'navrat', vPozadiMs: 30_000 }, { id: ID_A }, null, []), false);
  assert.equal(restartovatTed({ druh: 'navrat', vPozadiMs: DLOUHA_PAUZA_MS }, { id: ID_A }, null, []), true);
});

await zkus('s překážkou se sám nerestartuje ani doma', () => {
  assert.equal(restartovatTed({ druh: 'domov' }, { id: ID_A }, null, ['zaznam']), false);
  assert.equal(restartovatTed({ druh: 'navrat', vPozadiMs: DLOUHA_PAUZA_MS }, { id: ID_A }, null, ['bez-site']), false);
});

await zkus('změna zámků se ohlásí — vzetí i puštění', () => {
  // Pruh o nové verzi podle toho zmizí, když začne start nebo zápis v cíli.
  let hlaseni = 0;
  const pustOdber = naZmenuZamku(() => { hlaseni += 1; });
  const pust = zamkni('start');
  pust();
  pust();
  assert.equal(hlaseni, 2, 'dvojí puštění téže funkce se nehlásí dvakrát');
  pustOdber();
});

await zkus('zámky se počítají a dvojí puštění nic neukradne', () => {
  const a = zamkni('cil');
  const b = zamkni('cil');
  a();
  assert.deepEqual(zamkyTed(), ['cil'], 'druhé místo pořád drží');
  a();
  assert.deepEqual(zamkyTed(), ['cil'], 'opakované puštění téže funkce nesmí pustit cizí zámek');
  b();
  assert.deepEqual(zamkyTed(), []);
});

/* ------------------------------------------------------------- aktualizace */

console.log('Paměť a pravdivý stav');

await zkus('kontroluje se s rozestupem', () => {
  assert.equal(maSeKontrolovat(TED, null, 60_000), true);
  assert.equal(maSeKontrolovat(TED, TED - 30_000, 60_000), false);
  assert.equal(maSeKontrolovat(TED, TED - 60_000, 60_000), true);
});

await zkus('po startu: vzatá verze se uklidí, nevzatá se zapíše jako odmítnutá', () => {
  const zkousi: Pamet = { ...PRAZDNA_PAMET, zkousena: ID_A };
  assert.deepEqual(poStartu(zkousi, ID_A, false), PRAZDNA_PAMET);
  assert.deepEqual(poStartu(zkousi, ID_B, false), { ...PRAZDNA_PAMET, odmitnuta: ID_A });
  // Nouzové spuštění znamená, že se nevzala, i kdyby ID sedělo.
  assert.deepEqual(poStartu(zkousi, ID_A, true), { ...PRAZDNA_PAMET, odmitnuta: ID_A });
  assert.deepEqual(poStartu(PRAZDNA_PAMET, ID_B, false), PRAZDNA_PAMET);
});

const zaklad = { zapnute: true, nouzove: false, pripravena: false, hleda: false, odmitnuta: false, chyba: null };

await zkus('„aktuální" nikde bez úspěšné kontroly', () => {
  // Přesně ta lež z 26. 11. 2026: telefon na starém kódu, appka tvrdí opak.
  const nikdy = stavJs({ ...zaklad, kontrola: null });
  assert.equal(nikdy.druh, 'nikdy');
  const spadla = stavJs({ ...zaklad, kontrola: { kdy: TED - 60_000, vysledek: 'chyba', duvod: 'Network request failed' } });
  assert.equal(spadla.druh, 'neovereno');
  for (const s of [nikdy, spadla]) assert.doesNotMatch(popisStavuJs(s, TED), /aktuální|nic nového\./);
});

await zkus('chyba z běžícího procesu přebije starší úspěšnou kontrolu', () => {
  const s = stavJs({ ...zaklad, chyba: 'HTTP 400', kontrola: { kdy: TED - 2 * 3600_000, vysledek: 'nic', duvod: null } });
  assert.deepEqual(s, { druh: 'neovereno', chyba: 'HTTP 400', naposledyOk: TED - 2 * 3600_000 });
  assert.match(popisStavuJs(s, TED), /Naposledy ověřeno/);
});

await zkus('úspěšná kontrola řekne kdy, a jen čerstvá smí být „nejnovější"', () => {
  const s = stavJs({ ...zaklad, kontrola: { kdy: TED - 5 * 60_000, vysledek: 'nic', duvod: null } });
  assert.match(popisStavuJs(s, TED), /Ověřeno před 5 min/);
  assert.equal(jsOverenoCerstve(s, TED), true);
  const stara = stavJs({ ...zaklad, kontrola: { kdy: TED - 3 * 24 * 3600_000, vysledek: 'nic', duvod: null } });
  assert.equal(jsOverenoCerstve(stara, TED), false);
});

await zkus('pořadí stavů: nouzové a připravená přebijí všechno', () => {
  const k = { kdy: TED, vysledek: 'nic' as const, duvod: null };
  assert.equal(stavJs({ ...zaklad, nouzove: true, pripravena: true, kontrola: k }).druh, 'nouzove');
  assert.equal(stavJs({ ...zaklad, pripravena: true, chyba: 'x', kontrola: k }).druh, 'pripravena');
  assert.equal(stavJs({ ...zaklad, zapnute: false, kontrola: k }).druh, 'nejde');
  assert.equal(stavJs({ ...zaklad, odmitnuta: true, kontrola: k }).druh, 'odmitnuta');
});

await zkus('čas lidsky: minuty, dnes, jiný den', () => {
  assert.equal(predChvili(TED, TED - 20_000), 'právě teď');
  assert.equal(predChvili(TED, TED - 42 * 60_000), 'před 42 min');
  assert.match(predChvili(TED, TED - 3 * 3600_000), /^dnes v \d\d:\d\d$/);
  assert.match(predChvili(TED, Date.parse('2026-11-25T08:05:00+01:00')), /^25\. listopadu 2026 v 08:05$/);
});

await zkus('paměť přežije restart a rozbitý soubor ji nevykolejí', () => {
  zapomenVse();
  assert.deepEqual(nactiPamet(), PRAZDNA_PAMET);
  const p: Pamet = { zkousena: ID_A, odmitnuta: null, kontrola: { kdy: TED, vysledek: 'nic', duvod: null } };
  ulozPamet(p);
  assert.deepEqual(nactiPamet(), p);
});

await zkus('kontrola: nová verze se stáhne a zapíše', async () => {
  zapomenVse();
  zapomenZaznam();
  nastavKontrolu({ isAvailable: true });
  assert.equal(await zkontrolujTed(), 'stazeno');
  assert.equal(zaznam().stazeni, 1);
  assert.equal(nactiPamet().kontrola?.vysledek, 'stazeno');
});

await zkus('kontrola: verze, která tu jednou spadla, se pozná', async () => {
  zapomenZaznam();
  nastavKontrolu({ isAvailable: false, reason: 'updatePreviouslyFailed' });
  assert.equal(await zkontrolujTed(), 'vadna');
  assert.equal(zaznam().stazeni, 0);
});

await zkus('kontrola: chyba se zapíše i s důvodem, nic se nestáhne', async () => {
  zapomenZaznam();
  nastavKontrolu(new Error('Network request failed'));
  assert.equal(await zkontrolujTed(), 'chyba');
  assert.equal(nactiPamet().kontrola?.duvod, 'Network request failed');
  assert.equal(zaznam().stazeni, 0);
  nastavKontrolu({ isAvailable: false, reason: 'noUpdateAvailableOnServer' });
  assert.equal(await zkontrolujTed(), 'nic');
});

await zkus('odmítnutá verze přestane být zpráva, až přijde něco nového', async () => {
  zapomenVse();
  zapomenZaznam();
  ulozPamet({ ...PRAZDNA_PAMET, odmitnuta: ID_A });
  nastavKontrolu({ isAvailable: false, reason: 'updatePreviouslyFailed' });
  await zkontrolujTed();
  assert.equal(nactiPamet().odmitnuta, ID_A, 'vadná je pořád nejnovější');
  nastavKontrolu({ isAvailable: true });
  await zkontrolujTed();
  assert.equal(nactiPamet().odmitnuta, null, 'přišla jiná verze');
});

await zkus('použití verze si ji zapamatuje jako zkoušenou a restartuje', async () => {
  zapomenVse();
  zapomenZaznam();
  await pouzijVerzi(ID_B, '#FCFCFB');
  assert.equal(nactiPamet().zkousena, ID_B);
  assert.equal(zaznam().restarty.length, 1);
  assert.equal((zaznam().restarty[0] as { reloadScreenOptions: { backgroundColor: string } }).reloadScreenOptions.backgroundColor, '#FCFCFB');
});

/* --------------------------------------------------------------- hlavička */

console.log('Hlavička s verzí');

const udaje: UdajeVerze = {
  platforma: 'android', otisk: '84146e78d94b4ab28d7e36a9c22d3bae60b8ee6b', aktualizace: ID_A,
  kanal: 'production', spusteni: 'stazena', ceka: null,
};

await zkus('hlavička podle smlouvy se serverem', () => {
  assert.equal(
    hlavickaVerze(udaje),
    `platforma=android;otisk=84146e78d94b4ab28d7e36a9c22d3bae60b8ee6b;aktualizace=${ID_A};kanal=production;spusteni=stazena`,
  );
  assert.match(hlavickaVerze({ ...udaje, ceka: ID_B }) ?? '', new RegExp(`;ceka=${ID_B}$`));
});

await zkus('neúplná hlavička se nepošle vůbec', () => {
  assert.equal(hlavickaVerze({ ...udaje, otisk: null }), null);
  assert.equal(hlavickaVerze({ ...udaje, otisk: 'má mezeru' }), null);
  assert.equal(hlavickaVerze({ ...udaje, aktualizace: 'neni-uuid' }), null);
  assert.equal(hlavickaVerze({ ...udaje, platforma: 'web' }), null);
  // Kanál smí chybět (vývojový build), neplatné „čeká" se vynechá.
  assert.match(hlavickaVerze({ ...udaje, kanal: null }) ?? '', /;kanal=;/);
  assert.doesNotMatch(hlavickaVerze({ ...udaje, ceka: 'x' }) ?? '', /ceka/);
});

await zkus('jak appka nastartovala: nouzově, z balíčku, staženou', () => {
  nastav({ isEmergencyLaunch: true, isEmbeddedLaunch: true });
  assert.equal(spusteni(), 'nouzova');
  nastav({ isEmergencyLaunch: false, isEmbeddedLaunch: true });
  assert.equal(spusteni(), 'vestavena');
  nastav({ isEmbeddedLaunch: false });
  assert.equal(spusteni(), 'stazena');
});

await zkus('hlavička jede s každým požadavkem a nepřepíše cizí hlavičky', async () => {
  nastav({ isEnabled: true, runtimeVersion: udaje.otisk, updateId: ID_A, channel: 'production' });
  let videno: Record<string, string> | undefined;
  globalThis.fetch = (async (_url: string, init?: { headers?: Record<string, string> }) => {
    videno = init?.headers;
    return { ok: true, status: 200, json: async () => ({}) } as unknown as Response;
  }) as unknown as typeof fetch;
  await sit('/ja', { headers: { authorization: 'Bearer x' } });
  assert.equal(videno?.authorization, 'Bearer x');
  assert.match(videno?.['X-Appka-Verze'] ?? '', /^platforma=android;otisk=84146e78/);
  nastav({ isEnabled: false });
  assert.equal(hlavickaTed(), null);
  await sit('/ja', { headers: { authorization: 'Bearer y' } });
  assert.equal(videno?.['X-Appka-Verze'], undefined, 'bez aktualizací po síti hlavička nejde');
  nastav({ isEnabled: true });
});

await zkus('rozběhnutý zápis se počítá a uvolní i po chybě', async () => {
  let pust: (() => void) | undefined;
  globalThis.fetch = (() => new Promise((ok) => {
    pust = () => ok({ ok: true, status: 200, json: async () => ({}) } as unknown as Response);
  })) as unknown as typeof fetch;
  const zapis = sit('/x', { method: 'POST' });
  assert.equal(zapisuVLetu(), 1);
  pust?.();
  await zapis;
  assert.equal(zapisuVLetu(), 0);
  globalThis.fetch = (async () => { throw new Error('bez signálu'); }) as unknown as typeof fetch;
  await sit('/x', { method: 'PUT' }).catch(() => undefined);
  assert.equal(zapisuVLetu(), 0, 'chyba sítě nesmí nechat zápis viset — jinak by restart čekal navždy');
  await sit('/health').catch(() => undefined);
  assert.equal(zapisuVLetu(), 0, 'GET se nepočítá');
});

console.log(`  ${prosly} prošlo`);
