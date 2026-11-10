/**
 * Sdělení o poloze jde **před** systémovým dotazem.
 *
 * <b>Tohle je ta vlastnost, kvůli které Google Play appku vydá, nebo
 * odmítne</b> — ne text dialogu (ten měří `sdeleni.test.ts`), ale pořadí:
 * dokud posádka sdělení nepřečte, nesmí přijít dotaz na oprávnění.
 * Drží to jediná podmínka v `zadejOpravneni`, takže by ji příští úprava
 * mohla obrátit, aniž by si toho kdokoliv všiml až do odmítnutí po
 * nahrání.
 *
 * Poloha, úloha na pozadí i systémový dialog jsou nahrazené
 * (`nahrady/`): měří se naše rozhodování, ne Expo.
 */
import assert from 'node:assert/strict';

import * as Location from 'expo-location';
import { klepni, posledniDialog, zapomenDialog, zavri } from 'react-native';

import { SDELENI, prihlasHosta } from '../src/lib/tracker/sdeleni.ts';
import { zadejOpravneni } from '../src/lib/tracker/uloha.ts';

let prosly = 0;
async function zkus(nazev: string, f: () => Promise<void> | void) {
  try { await f(); prosly += 1; console.log('  ok   ' + nazev); }
  catch (e) { console.log('  CHYBA ' + nazev + ': ' + (e as Error).message); process.exitCode = 1; }
}

/** Čistý stůl: zapomenuté volání z předchozí kontroly by lhalo o pořadí. */
function odznovu() {
  Location.zapomen();
  zapomenDialog();
}

/**
 * Host, který odpoví, jak se mu řekne, a zapíše se do téhož seznamu jako
 * volání polohy — pořadí se jinak dokázat nedá.
 */
function hostKtery(odpovi: boolean) {
  return prihlasHosta((odpoved) => {
    Location.volani.push('sdeleni');
    odpoved(odpovi);
  });
}

/** Nechá doběhnout rozdělané `await`y, aby byl systémový dialog na světě. */
const chvilku = () => new Promise((hotovo) => setImmediate(hotovo));

await zkus('sdělení přijde dřív než dotaz na oprávnění', async () => {
  odznovu();
  // Popředí povolené, pozadí ne — tedy přesně ten stav, ve kterém se
  // systém na pozadí teprve zeptá. S nepovoleným popředím by se k druhému
  // dotazu vůbec nedošlo a o pořadí by test neřekl nic.
  Location.nastav({ popredi: 'granted', pozadi: 'denied' });
  const odhlas = hostKtery(true);
  await zadejOpravneni();
  odhlas();
  // Nejdřív se přečte, jak to stojí (kdyby bylo povoleno, nic se neděje),
  // pak sdělení, a teprve pak dotazy.
  assert.deepEqual(Location.volani, ['cti-pozadi', 'sdeleni', 'zadej-popredi', 'zadej-pozadi']);
});

await zkus('zavřené sdělení žádný systémový dotaz nevyvolá', async () => {
  odznovu();
  const odhlas = hostKtery(false);
  assert.equal(await zadejOpravneni(), 'bez-sdeleni');
  odhlas();
  assert.deepEqual(Location.volani.filter((v) => v.startsWith('zadej')), []);
});

await zkus('s povolenou polohou na pozadí se sdělení neukazuje', async () => {
  odznovu();
  Location.nastav({ popredi: 'granted', pozadi: 'granted' });
  const odhlas = hostKtery(true);
  assert.equal(await zadejOpravneni(), 'ok');
  odhlas();
  // Systém se ptát nebude, takže sdělení nemá co předcházet — a dialog
  // před každým spuštěním záznamu by byl u vody jen zdržení.
  assert.deepEqual(Location.volani, ['cti-pozadi']);
});

await zkus('bez hosta se sáhne po systémovém dialogu, nic se nezasekne', async () => {
  odznovu();
  const slib = zadejOpravneni();
  await chvilku();
  const d = posledniDialog();
  assert.ok(d, 'systémový dialog se neukázal — slib by zůstal viset');
  assert.equal(d.nadpis, SDELENI.nadpis);
  assert.ok(d.text.includes(SDELENI.ucely[0]), 'v dialogu chybí výčet účelů');
  assert.equal(d.tlacitka.length, 2);
  // Zavřít se dá, ale souhlas to není.
  assert.equal(typeof d.volby.onDismiss, 'function');
  zavri();
  assert.equal(await slib, 'bez-sdeleni');
  assert.deepEqual(Location.volani.filter((v) => v.startsWith('zadej')), []);
});

await zkus('v systémovém dialogu „Zrušit" taky zastaví, „Rozumím" pustí dál', async () => {
  odznovu();
  const zruseno = zadejOpravneni();
  await chvilku();
  klepni(SDELENI.zrusit);
  assert.equal(await zruseno, 'bez-sdeleni');

  odznovu();
  const dal = zadejOpravneni();
  await chvilku();
  klepni(SDELENI.dal);
  // Oprávnění nikdo nedal, takže se dál nedostane — ale dotaz přišel,
  // a to je to, co se tu měří.
  assert.equal(await dal, 'bez-popredi');
  assert.deepEqual(Location.volani, ['cti-pozadi', 'zadej-popredi']);
});

console.log(`\n${prosly} kontrol prošlo`);
