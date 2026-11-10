/**
 * Sdělení o poloze před systémovým dotazem.
 *
 * <b>Měří se pravidlo Googlu, ne vzhled dialogu.</b> Text smí kdokoliv
 * přepsat — ale ne o povinnou část. Play žádá slovo *poloha*, zmínku
 * o zavřené nebo nepoužívané appce a výčet všech funkcí, které polohu na
 * pozadí používají (support.google.com/googleplay/android-developer/answer/9799150,
 * *Disclosure statement requirements*, čteno 10. 11. 2026). Kdyby některá
 * vypadla, appka by se nevydala — a poznalo by se to až z odmítnutí po
 * nahrání, tedy o tři dny později.
 *
 * Druhá polovina testu hlídá to, co Play žádá opačným směrem: že se
 * <b>zavření dialogu nebere jako souhlas</b>.
 */
import assert from 'node:assert/strict';

import {
  SDELENI,
  cekejNaSdeleni,
  hostJeNaMiste,
  prihlasHosta,
  textSdeleni,
} from '../src/lib/tracker/sdeleni.ts';

let prosly = 0;
async function zkus(nazev: string, f: () => Promise<void> | void) {
  try { await f(); prosly += 1; console.log('  ok   ' + nazev); }
  catch (e) { console.log('  CHYBA ' + nazev + ': ' + (e as Error).message); process.exitCode = 1; }
}

await zkus('text říká, že jde o polohu', () => {
  assert.match(textSdeleni(), /poloh/i);
});

await zkus('text říká, že se sbírá i při zavřené appce', () => {
  // Jedna z frází, které Play u pozadí vyžaduje — v češtině její
  // protějšek. Slovo „pozadí" samo by neprošlo: posádce neřekne nic.
  assert.match(textSdeleni(), /zavřená|nepoužíváš|nepoužívá/i);
});

await zkus('text vyjmenuje všechny funkce, které polohu na pozadí berou', () => {
  // Výčet musí být úplný. Tři jsou dnešní stav; čtvrtá funkce patří do
  // `SDELENI.ucely`, ne jen do zásad na webu.
  assert.ok(SDELENI.ucely.length >= 3, `účelů je jen ${SDELENI.ucely.length}`);
  for (const u of SDELENI.ucely) {
    assert.ok(textSdeleni().includes(u), `v textu chybí účel: ${u}`);
  }
  const vse = SDELENI.ucely.join(' ').toLowerCase();
  assert.match(vse, /trasa|trasy/, 'chybí záznam trasy');
  assert.match(vse, /přenos/, 'chybí živý přenos');
  assert.match(vse, /baterie/, 'chybí hlášení a baterie');
});

await zkus('odkaz vede na zveřejněné zásady, ne na domovskou stránku', () => {
  assert.match(SDELENI.odkaz, /^https:\/\//);
  assert.ok(SDELENI.odkaz.endsWith('/osobni-udaje'), SDELENI.odkaz);
});

await zkus('tlačítko dál a tlačítko zrušit nejsou totéž', () => {
  assert.notEqual(SDELENI.dal, SDELENI.zrusit);
});

await zkus('bez hosta se nečeká na nikoho a odpověď je „ne"', async () => {
  // Kdyby se vracelo „ano", appka by se zeptala na polohu bez sdělení —
  // tedy přesně to, co Play zakazuje.
  assert.equal(hostJeNaMiste(), false);
  assert.equal(await cekejNaSdeleni(), false);
});

await zkus('souhlas se propíše a dialog se zavolá jednou', async () => {
  let kolikrat = 0;
  const odhlas = prihlasHosta((odpoved) => { kolikrat += 1; odpoved(true); });
  assert.equal(hostJeNaMiste(), true);
  assert.equal(await cekejNaSdeleni(), true);
  assert.equal(kolikrat, 1);
  odhlas();
  assert.equal(hostJeNaMiste(), false);
});

await zkus('zavření dialogu není souhlas', async () => {
  const odhlas = prihlasHosta((odpoved) => odpoved(false));
  assert.equal(await cekejNaSdeleni(), false);
  odhlas();
});

await zkus('druhá odpověď téhož dialogu se zahodí', async () => {
  // Dialog umí odpovědět dvakrát: tlačítkem a pak ještě zavřením. První
  // odpověď platí — jinak by klepnutí na „Rozumím" přebilo zavření, nebo
  // naopak.
  const odhlas = prihlasHosta((odpoved) => {
    odpoved(true);
    odpoved(false);
  });
  assert.equal(await cekejNaSdeleni(), true);
  odhlas();
});

await zkus('úklid po starém hostovi neodpojí nového', () => {
  const odhlasPrvni = prihlasHosta(() => {});
  prihlasHosta(() => {});
  odhlasPrvni();
  assert.equal(hostJeNaMiste(), true, 'úklid odpojil hosta, který na místě zůstal');
});

console.log(`\n${prosly} kontrol prošlo`);
