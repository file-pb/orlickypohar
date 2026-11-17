/**
 * Co je v nabídce pod kebabem.
 *
 * Měří se pravidlo, ne vykreslení: že stavba trati přibude jen tomu, kdo
 * ji má kde dělat, že stojí hned za *Moje regata*, a že bez zastávky vede
 * na ročník — vybrat za člověka tu první regatu by znamenalo pípat do cizí.
 */
import assert from 'node:assert/strict';

import type { Ja } from '../src/lib/api.ts';
import { KAM, nabidka } from '../src/lib/nabidka.ts';

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
  opravneni: { role: string; serie: string; zavod?: string | null }[],
  kdePomaha: { serie: string; zavod: string }[] = [],
): Ja =>
  ({
    id: '00000000-0000-0000-0000-000000000001',
    zobrazovane: 'Miloš Zvonař',
    email: null,
    opravneni: opravneni.map((o) => ({ ...o, zavod: o.zavod ?? null })),
    kdePomaha,
  }) as unknown as Ja;

const texty = (p: { text: string }[]) => p.map((k) => k.text);

zkus('bez oprávnění je nabídka beze změny', () => {
  assert.deepEqual(nabidka(null), KAM);
  assert.deepEqual(nabidka(ja([{ role: 'Ctenar', serie: '2027' }])), KAM);
});

zkus('stavba trati stojí hned za Moje regata', () => {
  const n = texty(nabidka(ja([{ role: 'Organizator', serie: '2027', zavod: 'radava' }])));
  assert.equal(n[n.indexOf('Moje regata') + 1], 'Stavba trati');
  // Nic se neztratilo ani nepřibylo dvakrát.
  assert.equal(n.length, KAM.length + 1);
});

zkus('se zastávkou vede rovnou na stavbu', () => {
  const polozka = nabidka(ja([{ role: 'Organizator', serie: '2027', zavod: 'radava' }])).find(
    (k) => k.text === 'Stavba trati',
  );
  assert.equal(polozka?.cil, '/serie/2027/zavody/radava/stavba');
});

zkus('bez zastávky vede na ročník, ne na cizí regatu', () => {
  const polozka = nabidka(ja([{ role: 'Rozhodci', serie: '2027' }])).find(
    (k) => k.text === 'Stavba trati',
  );
  assert.equal(polozka?.cil, '/serie/2027');
  assert.match(polozka?.popis ?? '', /vyber/);
});

zkus('zaškrtnutý pomocník ji dostane taky', () => {
  const kdo = ja([{ role: 'Ctenar', serie: '2027' }], [{ serie: '2027', zavod: 'radava' }]);
  const polozka = nabidka(kdo).find((k) => k.text === 'Stavba trati');
  assert.equal(polozka?.cil, '/serie/2027/zavody/radava/stavba');
});

console.log(`  ${prosly} prošlo`);
