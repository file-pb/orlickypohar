/**
 * Co appka ukáže tomu, kdo přišel jenom koukat.
 *
 * Měří se dvě rozhodnutí, obě s jednou správnou odpovědí: <b>který
 * ročník</b> (letošní, jinak nejnovější — příští bývá v kalendáři dřív,
 * než ten letošní skončí) a <b>která regata z něj</b> (dnešní, jinak
 * nejbližší, jinak poslední odjetá, a zrušená nikdy).
 */
import assert from 'node:assert/strict';

import type { SerieShrnuti, ZavodShrnuti } from '../src/lib/api.ts';
import { kteraRegata, kterySledovat, vetaNaRade } from '../src/lib/sledovani.ts';

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

const serie = (slug: string, rok: number): SerieShrnuti =>
  ({ slug, nazev: `Orlický pohár ${rok}`, rok, pocetZavodu: 8 }) as SerieShrnuti;

const zavod = (
  slug: string,
  datum: string,
  stav: string = 'Vypsany',
  datumKonce: string | null = null,
): ZavodShrnuti =>
  ({
    slug,
    nazev: slug,
    datum,
    datumKonce,
    typ: null,
    poradatel: null,
    poradi: 1,
    stav,
    puvodniDatum: null,
  }) as unknown as ZavodShrnuti;

const DEN = (iso: string) => new Date(`${iso}T12:00:00`);

zkus('bez ročníků není co sledovat', () => {
  assert.equal(kterySledovat([], DEN('2026-11-26')), null);
});

zkus('letošní vyhrává nad příštím', () => {
  // V listopadu 2026 jsou v API 2026 i 2027. Kdo přijde kouknout na
  // výsledky, chce ten, který se jede, ne ten, který se teprve plánuje.
  const vybrany = kterySledovat(
    [serie('2027', 2027), serie('2026', 2026)],
    DEN('2026-11-26'),
  );
  assert.equal(vybrany?.slug, '2026');
});

zkus('bez letošního se vezme nejnovější', () => {
  const vybrany = kterySledovat(
    [serie('2024', 2024), serie('2027', 2027), serie('2025', 2025)],
    DEN('2026-11-26'),
  );
  assert.equal(vybrany?.slug, '2027');
});

zkus('po přelomu roku přeskočí volba s ním', () => {
  const v = [serie('2027', 2027), serie('2026', 2026)];
  assert.equal(kterySledovat(v, DEN('2026-12-31'))?.slug, '2026');
  assert.equal(kterySledovat(v, DEN('2027-01-01'))?.slug, '2027');
});

zkus('dnešní regata vyhrává nad vším', () => {
  const z = [zavod('jarni', '2026-05-10'), zavod('izolepa', '2026-06-07')];
  const r = kteraRegata(z, DEN('2026-06-07'));
  assert.equal(r?.zavod.slug, 'izolepa');
  assert.equal(r?.kdy, 'dnes');
});

zkus('vícedenní regata se počítá celá', () => {
  // 24hodinovka končí jiný den, než začíná. Bez `datumKonce` by druhý den
  // vypadalo, že se nejede nic.
  const z = [zavod('24hodinovka', '2026-07-18', 'Vypsany', '2026-07-19')];
  assert.equal(kteraRegata(z, DEN('2026-07-19'))?.kdy, 'dnes');
  assert.equal(kteraRegata(z, DEN('2026-07-20'))?.kdy, 'odjeto');
});

zkus('bez dnešní se ukáže nejbližší, ne první v kalendáři', () => {
  const z = [
    zavod('podzimni', '2026-09-20'),
    zavod('jarni', '2026-05-10'),
    zavod('izolepa', '2026-06-07'),
  ];
  const r = kteraRegata(z, DEN('2026-05-20'));
  assert.equal(r?.zavod.slug, 'izolepa');
  assert.equal(r?.kdy, 'blizi');
});

zkus('po sezóně se ukáže poslední odjetá', () => {
  const z = [zavod('jarni', '2026-05-10'), zavod('podzimni', '2026-09-20')];
  const r = kteraRegata(z, DEN('2026-11-26'));
  assert.equal(r?.zavod.slug, 'podzimni');
  assert.equal(r?.kdy, 'odjeto');
});

zkus('zrušená se nenabízí v žádné ze tří rolí', () => {
  // Dnešní zrušená není „dnes se jede", nejbližší zrušená není, kam se
  // chystat, a odjetá zrušená nemá výsledky.
  const dnesek = [zavod('izolepa', '2026-06-07', 'Zruseny')];
  assert.equal(kteraRegata(dnesek, DEN('2026-06-07')), null);

  const budouci = [zavod('izolepa', '2026-06-07', 'Zruseny'), zavod('podzimni', '2026-09-20')];
  assert.equal(kteraRegata(budouci, DEN('2026-05-20'))?.zavod.slug, 'podzimni');

  const minule = [zavod('jarni', '2026-05-10'), zavod('podzimni', '2026-09-20', 'Zruseny')];
  assert.equal(kteraRegata(minule, DEN('2026-11-26'))?.zavod.slug, 'jarni');
});

zkus('prázdný kalendář nic nevymýšlí', () => {
  assert.equal(kteraRegata([], DEN('2026-11-26')), null);
  assert.equal(kteraRegata([zavod('x', '2026-05-10', 'Zruseny')], DEN('2026-11-26')), null);
});

zkus('věta říká, co se děje, ne jak se regata jmenuje', () => {
  assert.equal(vetaNaRade('dnes'), 'Dnes se jede');
  assert.equal(vetaNaRade('blizi'), 'Nejbližší regata');
  assert.equal(vetaNaRade('odjeto'), 'Naposledy se jelo');
});

console.log(`  ${prosly} prošlo`);
