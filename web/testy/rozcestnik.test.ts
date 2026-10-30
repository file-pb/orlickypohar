/**
 * Kam vede regata ve správě, když na ni pořadatel přijde bez dalšího určení.
 *
 * Z obrazovky se to ověří špatně: výsledek je přesměrování, takže ta
 * původní stránka není nikdy vidět a omyl vypadá jen jako „otevřelo se
 * mi něco jiného". A hlavně — stránka vybírá z úkonů, které sestavuje
 * `polozkyZastavky`, takže se cesty staví na dvou místech. Proto se tu
 * ani jedna nepíše ručně: úkony vyrábí tatáž funkce jako na stránce a
 * kdyby se adresy rozešly, filtry níž nic nenajdou a kontrola spadne.
 */
import assert from 'node:assert/strict';

import { kamNaRegate, polozkyZastavky, type Polozka, type Udelena } from '../lib/co-smim.ts';

let prosly = 0;
function zkus(nazev: string, f: () => Promise<void> | void) {
  return Promise.resolve()
    .then(f)
    .then(() => { prosly += 1; console.log('  ok   ' + nazev); })
    .catch((e) => { console.log('  CHYBA ' + nazev + ': ' + (e as Error).message); process.exitCode = 1; });
}

// Slug s diakritikou a mezerou schválně: cesta se kóduje a obě strany ji
// musí zakódovat stejně, jinak se úkon v seznamu nenajde.
const SERIE = '2027';
const ZAVOD = 'jarní vítr';

const PORADATEL: Udelena[] = [{ role: 'Organizator', serie: SERIE, zavod: ZAVOD }];
const vse = () => polozkyZastavky(PORADATEL, SERIE, ZAVOD);

const jen = (ukony: Polozka[], co: string) => ukony.filter((u) => u.kam.includes(`/${co}/`));
const bez = (ukony: Polozka[], co: string) => ukony.filter((u) => !u.kam.includes(`/${co}/`));

/** Vrací `jeloSe` a počítá, kolikrát se na rozjížďky doopravdy sáhlo. */
function spion(odpoved: boolean) {
  const stav = { zeptano: 0 };
  return { stav, ptej: async () => { stav.zeptano += 1; return odpoved; } };
}

await zkus('pořadatel má obojí a nejelo se → přihlášky', async () => {
  const ukony = vse();
  const s = spion(false);
  const kam = await kamNaRegate(ukony, SERIE, ZAVOD, s.ptej);
  assert.equal(kam, jen(ukony, 'prihlasky')[0]!.kam);
  assert.equal(s.stav.zeptano, 1);
});

await zkus('první rozjížďka odjetá → výsledky', async () => {
  const ukony = vse();
  const kam = await kamNaRegate(ukony, SERIE, ZAVOD, spion(true).ptej);
  assert.equal(kam, jen(ukony, 'vysledky')[0]!.kam);
});

await zkus('kdo má jen výsledky, jde na ně a na rozjížďky se neptá', async () => {
  const ukony = bez(vse(), 'prihlasky');
  const s = spion(false);
  const kam = await kamNaRegate(ukony, SERIE, ZAVOD, s.ptej);
  assert.equal(kam, jen(ukony, 'vysledky')[0]!.kam);
  assert.equal(s.stav.zeptano, 0, 'rozjížďky se četly, i když nebylo z čeho vybírat');
});

await zkus('kdo má jen přihlášky, jde na ně a na rozjížďky se neptá', async () => {
  const ukony = bez(vse(), 'vysledky');
  const s = spion(true);
  const kam = await kamNaRegate(ukony, SERIE, ZAVOD, s.ptej);
  assert.equal(kam, jen(ukony, 'prihlasky')[0]!.kam);
  assert.equal(s.stav.zeptano, 0, 'rozjížďky se četly, i když nebylo z čeho vybírat');
});

await zkus('bez obou úkonů vede na první, co zbylo', async () => {
  const ukony = bez(bez(vse(), 'vysledky'), 'prihlasky');
  assert.ok(ukony.length > 0, 'pořadatel má mít i jiné úkony než ty dva');
  const kam = await kamNaRegate(ukony, SERIE, ZAVOD, spion(false).ptej);
  assert.equal(kam, ukony[0]!.kam);
});

await zkus('kdo nemá na regatě nic, nikam nejde', async () => {
  assert.equal(await kamNaRegate([], SERIE, ZAVOD, spion(true).ptej), null);
});

await zkus('cesty sedí s těmi, které sestavuje seznam úkonů', () => {
  const ukony = vse();
  assert.equal(jen(ukony, 'vysledky').length, 1);
  assert.equal(jen(ukony, 'prihlasky').length, 1);
});

console.log(`\n  ${prosly} v pořádku`);
