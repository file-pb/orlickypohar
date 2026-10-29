/**
 * Kdo zapíná aplikaci a co má tedy vidět nahoře.
 *
 * Měří se pravidlo, ne vykreslení: že velení přebíjí loď, že oprávnění
 * na jednu regatu vyhrává nad oprávněním na celý ročník, a že
 * nepřihlášený zůstává čtenářem i s klíčem v telefonu.
 */
import assert from 'node:assert/strict';

import { kdeVeli, postava, veliNekde } from '../src/lib/role.ts';
import type { Ja } from '../src/lib/api.ts';

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

const ja = (...opravneni: { role: string; serie: string; zavod?: string | null }[]): Ja =>
  ({
    id: '00000000-0000-0000-0000-000000000001',
    zobrazovane: 'Miloš Zvonař',
    email: null,
    opravneni: opravneni.map((o) => ({ ...o, zavod: o.zavod ?? null })),
  }) as unknown as Ja;

zkus('nepřihlášený je čtenář, i když má v telefonu klíč', () => {
  assert.equal(postava(null, false), 'ctenar');
  // Klíč je pro zápis za loď, ne doklad, že appku zapnul závodník —
  // a seznam vlastních lodí se stejně načítá jen za přihlášeného.
  assert.equal(postava(null, true), 'ctenar');
});

zkus('rozhodčí i organizátor velí, editor a správce ne', () => {
  assert.equal(veliNekde(ja({ role: 'Rozhodci', serie: '2027' })), true);
  assert.equal(veliNekde(ja({ role: 'Organizator', serie: '2027' })), true);
  assert.equal(veliNekde(ja({ role: 'Editor', serie: '2027' })), false);
  assert.equal(veliNekde(ja({ role: 'Spravce', serie: '2027' })), false);
  assert.equal(veliNekde(ja({ role: 'Ctenar', serie: '2027' })), false);
});

zkus('velení přebíjí vlastní loď', () => {
  // Rozhodčí s plachetnicí přišel k vodě velet, ne sledovat se.
  assert.equal(postava(ja({ role: 'Rozhodci', serie: '2027' }), true), 'rozhodci');
});

zkus('bez velení a s lodí je kapitán', () => {
  assert.equal(postava(ja({ role: 'Ctenar', serie: '2027' }), true), 'kapitan');
});

zkus('bez velení a bez lodi je čtenář', () => {
  assert.equal(postava(ja({ role: 'Editor', serie: '2027' }), false), 'ctenar');
});

zkus('kde velí: bez oprávnění nikde', () => {
  assert.equal(kdeVeli(null), null);
  assert.equal(kdeVeli(ja({ role: 'Ctenar', serie: '2027' })), null);
});

zkus('oprávnění na jednu regatu vyhrává nad celým ročníkem', () => {
  const kdo = ja(
    { role: 'Rozhodci', serie: '2027' },
    { role: 'Rozhodci', serie: '2027', zavod: 'jarni-vitr' },
  );
  assert.deepEqual(kdeVeli(kdo), { serie: '2027', zavod: 'jarni-vitr' });
});

zkus('oprávnění na celý ročník nechá výběr na něm', () => {
  assert.deepEqual(kdeVeli(ja({ role: 'Rozhodci', serie: '2027' })), {
    serie: '2027',
    zavod: null,
  });
});

zkus('cizí role se do velení nepočítají ani v hromadě', () => {
  const kdo = ja(
    { role: 'Editor', serie: '2026' },
    { role: 'Spravce', serie: '2027' },
    { role: 'Ctenar', serie: '2027', zavod: 'jarni-vitr' },
  );
  assert.equal(veliNekde(kdo), false);
  assert.equal(kdeVeli(kdo), null);
});

console.log(`  ${prosly} prošlo`);
