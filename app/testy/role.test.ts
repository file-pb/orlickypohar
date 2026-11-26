/**
 * Kdo zapíná aplikaci a co má tedy vidět nahoře.
 *
 * Měří se pravidlo, ne vykreslení: že velení přebíjí loď, že oprávnění
 * na jednu regatu vyhrává nad oprávněním na celý ročník, a že
 * nepřihlášený zůstává čtenářem i s klíčem v telefonu.
 */
import assert from 'node:assert/strict';

import { jePouzePomocnik, kdeStavi, kdeVeli, postava, smiStavet, veliNekde } from '../src/lib/role.ts';
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

zkus('rozhodčí, organizátor i správce velí, editor a čtenář ne', () => {
  // <b>Správce mezi ně patří</b> (opraveno 26. 11. 2026). Server mu podle
  // `Prava.Pokryva` dává rozhodčího i organizátora (`Prava.cs:82` a `:88`),
  // takže správce ročníku regatu vést smí. Dokud ho tenhle výčet vynechával,
  // nedostal Filip na rozcestníku *Velím regatě* vůbec — a protože mu nad
  // podlahou zbyla jediná dlaždice, appka ho rovnou odvezla jinam.
  assert.equal(veliNekde(ja({ role: 'Rozhodci', serie: '2027' })), true);
  assert.equal(veliNekde(ja({ role: 'Organizator', serie: '2027' })), true);
  assert.equal(veliNekde(ja({ role: 'Spravce', serie: '2027' })), true);
  assert.equal(veliNekde(ja({ role: 'Editor', serie: '2027' })), false);
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
    { role: 'Ctenar', serie: '2027', zavod: 'jarni-vitr' },
  );
  assert.equal(veliNekde(kdo), false);
  assert.equal(kdeVeli(kdo), null);
});

zkus('správce v hromadě cizích rolí velí tam, kde ho má', () => {
  const kdo = ja(
    { role: 'Editor', serie: '2026' },
    { role: 'Spravce', serie: '2027' },
    { role: 'Ctenar', serie: '2028' },
  );
  assert.equal(veliNekde(kdo), true);
  assert.deepEqual(kdeVeli(kdo), { serie: '2027', zavod: null });
});

/** Přihlášený i se zastávkami, kde je dneska zaškrtnutý jako pomocník. */
const jaSPomoci = (
  pomaha: { serie: string; zavod: string }[],
  ...opravneni: { role: string; serie: string; zavod?: string | null }[]
): Ja => ({ ...ja(...opravneni), kdePomaha: pomaha }) as unknown as Ja;

zkus('pořadatel cizí zastávky stavbu nevidí', () => {
  // Živá vada do 17. 11. 2026: karta visela na `veliNekde`, a pořadatelství
  // kterékoliv zastávky ročníku stačí k zaškrtnutí za pomocníka. Pořadatel
  // Zahájení sezóny tak viděl stavbu i na Radavě, kde mu server odmítne
  // každý prvek.
  const kdo = ja({ role: 'Organizator', serie: '2027', zavod: 'zahajeni-sezony' });
  assert.equal(veliNekde(kdo), true);
  assert.equal(smiStavet(kdo, '2027', 'zahajeni-sezony'), true);
  assert.equal(smiStavet(kdo, '2027', 'radavska-regata'), false);
});

zkus('zaškrtnutý pomocník staví tam, kde je zaškrtnutý', () => {
  const kdo = jaSPomoci([{ serie: '2027', zavod: 'radavska-regata' }], {
    role: 'Organizator',
    serie: '2027',
    zavod: 'zahajeni-sezony',
  });
  assert.equal(smiStavet(kdo, '2027', 'radavska-regata'), true);
  // A nikde jinde. Příznak patří jedné zastávce, ne ročníku.
  assert.equal(smiStavet(kdo, '2027', 'podzimni-vitr'), false);
});

zkus('právo na celý ročník staví na kterékoliv jeho zastávce', () => {
  const kdo = ja({ role: 'Organizator', serie: '2027' });
  assert.equal(smiStavet(kdo, '2027', 'radavska-regata'), true);
  // Cizí ročník ne.
  assert.equal(smiStavet(kdo, '2026', 'radavska-regata'), false);
});

zkus('rozhodčí svázaný s jednou zastávkou nestaví na druhé', () => {
  // Server se na rozhodčího ptá na celý ročník (`Pozadavek(Role.Rozhodci,
  // rozsah.SerieId)`), takže právo na jednu zastávku na to nestačí.
  const kdo = ja({ role: 'Rozhodci', serie: '2027', zavod: 'zahajeni-sezony' });
  assert.equal(smiStavet(kdo, '2027', 'radavska-regata'), false);
  assert.equal(smiStavet(ja({ role: 'Rozhodci', serie: '2027' }), '2027', 'radavska-regata'), true);
});

zkus('nepřihlášený nestaví nikde', () => {
  assert.equal(smiStavet(null, '2027', 'radavska-regata'), false);
  assert.equal(kdeStavi(null), null);
});

zkus('nabídka vede tam, kde dneska pomáhá', () => {
  // Zaškrtnutí je dnešní pokyn; právo na ročník má ten člověk pořád.
  const kdo = jaSPomoci([{ serie: '2027', zavod: 'radavska-regata' }], {
    role: 'Organizator',
    serie: '2027',
  });
  assert.deepEqual(kdeStavi(kdo), { serie: '2027', zavod: 'radavska-regata' });
});

zkus('bez zastávky vede nabídka na ročník, ne na cizí regatu', () => {
  assert.deepEqual(kdeStavi(ja({ role: 'Rozhodci', serie: '2027' })), {
    serie: '2027',
    zavod: null,
  });
});

const pomocnik = (): Ja =>
  ({
    id: '00000000-0000-0000-0000-000000000002',
    zobrazovane: 'Pomocník',
    email: null,
    opravneni: [],
    kdePomaha: [{ serie: 'r', zavod: 'z' }],
  }) as unknown as Ja;

zkus('pomocník je ten, kdo smí stavět jen přes příznak', () => {
  assert.equal(jePouzePomocnik(pomocnik(), 'r', 'z'), true);
});

zkus('organizátor téže zastávky pomocník není', () => {
  assert.equal(
    jePouzePomocnik(ja({ role: 'Organizator', serie: 'r', zavod: 'z' }), 'r', 'z'),
    false,
  );
});

zkus('kdo tam nesmí stavět, není ani pomocník', () => {
  assert.equal(jePouzePomocnik(ja(), 'r', 'z'), false);
});

console.log(`  ${prosly} prošlo`);
