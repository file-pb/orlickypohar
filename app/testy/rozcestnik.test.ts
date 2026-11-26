/**
 * Co appka nabídne tomu, kdo ji zapnul — a komu rozcestník vůbec neukáže.
 *
 * Měří se pravidlo, ne vykreslení: že sledování je podlaha a je tam
 * i u nepřihlášeného, že velení přebíjí loď, že se rozcestí přeskočí tomu,
 * kdo má nad podlahou jedinou věc, a že se zvýrazní nejvýš jedna dlaždice.
 */
import assert from 'node:assert/strict';

import type { Ja } from '../src/lib/api.ts';
import { dlazdice, kamRovnou, type Stav } from '../src/lib/rozcestnik.ts';

let prosly = 0;
function zkus(nazev: string, f: () => void) {
  try {
    f();
    prosly += 1;
    console.log('  ok   ' + nazev);
  } catch (e) {
    console.log('  CHYBA ' + nazev + ': ' + (e as Error).message);
    process.exitCode = 1;
  }
}

const ja = (
  opravneni: { role: string; serie: string; zavod?: string | null }[] = [],
  kdePomaha: { serie: string; zavod: string }[] = [],
  web: string[] = [],
): Ja =>
  ({
    id: '00000000-0000-0000-0000-000000000001',
    zobrazovane: 'Miloš Zvonař',
    email: null,
    opravneni: opravneni.map((o) => ({ ...o, zavod: o.zavod ?? null })),
    kdePomaha,
    web,
  }) as unknown as Ja;

const DNES: Stav['dnes'] = { lod: 'Far Star III', cisloPlachty: 'CZE 142' };

const klice = (s: Stav) => dlazdice(s).map((d) => d.klic);

zkus('nepřihlášený má sledování, a nic jiného', () => {
  assert.deepEqual(klice({ ja: null, dnes: null }), ['sledovani']);
});

zkus('sledování je podlaha — je tam u každého', () => {
  const vsichni: Stav[] = [
    { ja: null, dnes: null },
    { ja: ja(), dnes: DNES },
    { ja: ja([{ role: 'Rozhodci', serie: '2027' }]), dnes: null },
    { ja: ja([{ role: 'Organizator', serie: '2027', zavod: 'radava' }]), dnes: DNES },
  ];
  for (const s of vsichni) assert.ok(klice(s).includes('sledovani'), JSON.stringify(klice(s)));
});

zkus('velení přebíjí loď', () => {
  // Rozhodčí s vlastní plachetnicí přišel k vodě velet. Kdyby byl nahoře
  // závod, hledal by start pod ním.
  const k = klice({ ja: ja([{ role: 'Rozhodci', serie: '2027' }]), dnes: DNES });
  assert.deepEqual(k, ['velim', 'stavim', 'zavod', 'sledovani']);
});

zkus('závodníkovi se rozcestník nekreslí', () => {
  // Filip, 26. 11. 2026: „v okamžiku, kdy to bude jenom závodník, tak
  // vlastně ani nepotřebuje zobrazovat ten rozcestník."
  const d = dlazdice({ ja: ja(), dnes: DNES });
  assert.deepEqual(d.map((x) => x.klic), ['zavod', 'sledovani']);
  assert.equal(kamRovnou(d), '/zavodnik');
});

zkus('nepřihlášený jde rovnou na sledování', () => {
  // Rozhodnuto 26. 11. 2026. Kdo si appku stáhl kvůli výsledkům, nemá být
  // nejdřív vyzván k přihlášení.
  assert.equal(kamRovnou(dlazdice({ ja: null, dnes: null })), '/rocniky');
});

zkus('rozhodčí rozcestník dostane — jedna role, víc vstupů', () => {
  const d = dlazdice({ ja: ja([{ role: 'Rozhodci', serie: '2027' }]), dnes: null });
  assert.deepEqual(d.map((x) => x.klic), ['velim', 'stavim', 'sledovani']);
  assert.equal(kamRovnou(d), null);
});

zkus('pomocník bez lodi jde rovnou na stavbu', () => {
  // Zaškrtnutý pomocník přijel stavět a nic jiného dnes nemá; rozcestí by
  // mu jen přidalo klepnutí.
  const kdo = ja([], [{ serie: '2027', zavod: 'radava' }]);
  const d = dlazdice({ ja: kdo, dnes: null });
  assert.deepEqual(d.map((x) => x.klic), ['stavim', 'sledovani']);
  assert.equal(kamRovnou(d), '/serie/2027/zavody/radava/stavba');
});

zkus('pomocník, který dnes i závodí, rozcestník dostane', () => {
  const kdo = ja([], [{ serie: '2027', zavod: 'radava' }]);
  assert.equal(kamRovnou(dlazdice({ ja: kdo, dnes: DNES })), null);
});

zkus('cíle stavby mají tytéž tři případy jako dřív nabídka', () => {
  const kam = (s: Stav) => dlazdice(s).find((d) => d.klic === 'stavim')?.cil;
  assert.equal(
    kam({ ja: ja([{ role: 'Organizator', serie: '2027', zavod: 'radava' }]), dnes: null }),
    '/serie/2027/zavody/radava/stavba',
  );
  // Rozhodčí ročníku může stavět kdekoliv v něm — vybrat za něj první
  // regatu by znamenalo pípat do cizí.
  assert.equal(
    kam({ ja: ja([{ role: 'Rozhodci', serie: '2027' }]), dnes: null }),
    '/serie/2027/stavba',
  );
  // Správce celého webu nemá ročník, tak ať si vybere.
  assert.equal(kam({ ja: ja([], [], ['Spravce']), dnes: null }), '/rocniky');
});

zkus('velení bez zastávky vede na ročník, ne do cizí regaty', () => {
  const d = dlazdice({ ja: ja([{ role: 'Rozhodci', serie: '2027' }]), dnes: null });
  assert.equal(d.find((x) => x.klic === 'velim')?.cil, '/serie/2027');
});

zkus('zvýrazněná je nejvýš jedna, a nikdy sledování', () => {
  const pripady: Stav[] = [
    { ja: null, dnes: null },
    { ja: ja(), dnes: DNES },
    { ja: ja([{ role: 'Rozhodci', serie: '2027' }]), dnes: DNES },
    { ja: ja([{ role: 'Organizator', serie: '2027', zavod: 'radava' }]), dnes: null },
  ];
  for (const s of pripady) {
    const d = dlazdice(s);
    const hlavni = d.filter((x) => x.hlavni);
    assert.ok(hlavni.length <= 1, `zvýrazněných ${hlavni.length}`);
    assert.ok(!hlavni.some((x) => x.klic === 'sledovani'), 'zvýrazněná podlaha');
  }
});

zkus('nad jedinou dlaždicí se nezvýrazňuje nic', () => {
  // Zvýraznění je rozlišení. Nad jednou položkou nerozlišuje nic.
  assert.ok(!dlazdice({ ja: null, dnes: null }).some((d) => d.hlavni));
});

zkus('jméno lodi a číslo plachty jdou na dlaždici závodu', () => {
  const d = dlazdice({ ja: ja(), dnes: DNES }).find((x) => x.klic === 'zavod');
  assert.equal(d?.kontext, 'Far Star III · CZE 142');
  // Loď bez čísla plachty nesmí skončit s visícím oddělovačem.
  const bez = dlazdice({ ja: ja(), dnes: { lod: 'Mimoň', cisloPlachty: null } }).find(
    (x) => x.klic === 'zavod',
  );
  assert.equal(bez?.kontext, 'Mimoň');
});

zkus('správce ročníku velí a rozcestník dostane', () => {
  // <b>Skutečný případ z produkce, 26. 11. 2026.</b> Filip má na ročníku
  // 2026-nanecisto roli Spravce a nic jiného; server mu podle
  // `Prava.Pokryva` dovolí rozhodčího i organizátora. Rozcestník mu ale
  // *Velím regatě* nenabídl, zbyla jediná dlaždice nad podlahou a pravidlo
  // jediné možnosti ho odvezlo do stavby. Vypadalo to, že appka
  // přihlášeného nepozná.
  const kdo = ja([{ role: 'Spravce', serie: '2026-nanecisto' }], [], ['Spravce']);
  const d = dlazdice({ ja: kdo, dnes: null });
  assert.deepEqual(d.map((x) => x.klic), ['velim', 'stavim', 'sledovani']);
  assert.equal(kamRovnou(d), null);
  assert.equal(d[0].cil, '/serie/2026-nanecisto');
});

zkus('správce celého webu bez ročníku si vybere sám', () => {
  // Role na celý web chodí v `JaDto.Web`, ne jako oprávnění s prázdnou
  // sérií — kdo se dívá jen do `opravneni`, toho správce mine.
  const d = dlazdice({ ja: ja([], [], ['Spravce']), dnes: null });
  assert.deepEqual(d.map((x) => x.klic), ['velim', 'stavim', 'sledovani']);
  assert.equal(d.find((x) => x.klic === 'velim')?.cil, '/rocniky');
});

zkus('editor webu nevelí a nestaví', () => {
  // Editor píše o závodech, nezasahuje do nich.
  const d = dlazdice({ ja: ja([{ role: 'Editor', serie: '2027' }], [], ['Editor']), dnes: null });
  assert.deepEqual(d.map((x) => x.klic), ['sledovani']);
});

console.log(`  ${prosly} prošlo`);
