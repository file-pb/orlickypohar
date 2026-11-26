/**
 * Co je v nabídce pod kebabem.
 *
 * <b>Od 26. 11. 2026 je nabídka režie, ne navigace.</b> Co se měnilo podle
 * rolí — *Moje regata* a *Stavba trati* — se přestěhovalo na rozcestník
 * a měří se v `rozcestnik.test.ts`. Tady zbývá to, co se tím rozbít dá:
 * že nabídka na oprávněních opravdu nezávisí, a že z ní nevypadla cesta
 * k výsledkům.
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

const texty = (p: { text: string }[]) => p.map((k) => k.text);

zkus('nabídka je pro všechny stejná', () => {
  // Rozhodčí, pořadatel, pomocník i správce webu: nic z toho ji nemění.
  // Dokud ji měnila stavba trati, musel kebab při každém otevření sahat
  // pro `/ja` — na vodě dotaz navíc u každého klepnutí.
  assert.deepEqual(nabidka(null), KAM);
  assert.deepEqual(nabidka(ja([{ role: 'Rozhodci', serie: '2027' }])), KAM);
  assert.deepEqual(nabidka(ja([{ role: 'Organizator', serie: '2027', zavod: 'radava' }])), KAM);
  assert.deepEqual(nabidka(ja([], [{ serie: '2027', zavod: 'radava' }])), KAM);
  assert.deepEqual(nabidka(ja([], [], ['Spravce'])), KAM);
});

zkus('sledování z nabídky nevypadlo', () => {
  // Komu se rozcestník přeskakuje — závodníkovi, pomocníkovi bez lodi —
  // je tohle jediná cesta k výsledkům. Kdyby zmizela, zavřel by se mu
  // zbytek appky a poznalo by se to až od něj.
  const s = KAM.find((k) => k.cil === '/rocniky');
  assert.ok(s, 'sledování v nabídce není');
  assert.equal(s?.text, 'Sledování');
});

zkus('domů je první', () => {
  // Hlavička se nekreslí, takže bez tohohle vede cesta zpátky jen gestem.
  assert.equal(texty(KAM)[0], 'Domů');
  assert.equal(KAM[0].cil, '/');
});

zkus('co se přestěhovalo na rozcestník, tu už není', () => {
  const t = texty(KAM);
  assert.ok(!t.includes('Moje regata'), 'Moje regata zůstala v nabídce');
  assert.ok(!t.includes('Stavba trati'), 'Stavba trati zůstala v nabídce');
  assert.ok(!t.includes('Ročníky'), 'Ročníky se měly přejmenovat na Sledování');
});

zkus('žádná položka nevede dvakrát na totéž', () => {
  const cile = KAM.map((k) => k.cil);
  assert.equal(new Set(cile).size, cile.length);
});

console.log(`  ${prosly} prošlo`);
