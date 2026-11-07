/**
 * Přeskočení čekání v ukázce.
 *
 * Z obrazovky se to ověří špatně: celá věc je o tom, že se nečeká, takže
 * omyl vypadá jako „nic se nestalo". A hlavně — po přeskoku musí zbýt
 * dost na to, aby <b>stihlo začít hlášení</b>; o pět vteřin kratší skok
 * by ukázku tiše ochudil přesně o to, kvůli čemu se pouští.
 */
import assert from 'node:assert/strict';

import {
  dalsiTroubeni,
  kolikPreskocit,
  NASKOK_PRED_HRANOU_S,
  NEJDELSI_CEKANI_S,
  OZNAMENI_S,
  partitura,
} from '../src/lib/hlaseni.ts';
import { PROCEDURA_S } from '../src/lib/start.ts';

let prosly = 0;
function zkus(nazev: string, f: () => void) {
  try { f(); prosly += 1; console.log('  ok   ' + nazev); }
  catch (e) { console.log('  CHYBA ' + nazev + ': ' + (e as Error).message); process.exitCode = 1; }
}

zkus('před procedurou míří další hrana na vyzývací znamení', () => {
  // Start za deset minut, procedura pětiminutová: nejbližší troubení je
  // vyzývací na −5:00.
  assert.equal(dalsiTroubeni(600, PROCEDURA_S), PROCEDURA_S);
});

zkus('v přípravě míří další hrana na poslední minutu', () => {
  // Mezi přípravným (−4:00) a minutou (−1:00).
  assert.equal(dalsiTroubeni(200, PROCEDURA_S), 60);
});

zkus('po posledním troubení už není co přeskočit', () => {
  assert.equal(dalsiTroubeni(0, PROCEDURA_S), null);
  assert.equal(kolikPreskocit(0, PROCEDURA_S), null);
});

zkus('krátké čekání se nenabízí', () => {
  // Do minuty zbývá přesně mez — nenabízí se.
  assert.equal(kolikPreskocit(60 + NEJDELSI_CEKANI_S, PROCEDURA_S), null);
  // O vteřinu víc už ano.
  assert.ok((kolikPreskocit(61 + NEJDELSI_CEKANI_S, PROCEDURA_S) ?? 0) > 0);
});

zkus('nabízí se u každé hrany, poslední minutu včetně', () => {
  // Filip, 7. 11. 2026: *„do ukázky doplň ty zkracující modaly a to
  // i tam, kde je minuta."* V pětiminutové proceduře jsou čtyři čekání
  // a tři z nich kratší než původní dvouminutová mez — ta je proto
  // vynechávala. Projdeme všechna a každé musí něco nabídnout.
  const hrany = [PROCEDURA_S, 240, 60, 0];
  for (let i = 0; i < hrany.length - 1; i += 1) {
    // Vteřinu po znamení: do dalšího zbývá celý úsek bez jedné.
    const doStartu = hrany[i] - 1;
    const o = kolikPreskocit(doStartu, PROCEDURA_S);
    assert.ok(
      o !== null && o > 0,
      `u hrany ${hrany[i]} → ${hrany[i + 1]} se nenabídlo nic (doStartu ${doStartu})`,
    );
    // A po přeskoku zbývá přesně náskok, ať je úsek jakkoli dlouhý.
    assert.equal(doStartu - o - hrany[i + 1], NASKOK_PRED_HRANOU_S);
  }
});

zkus('po přeskoku zbývá právě náskok před hranou', () => {
  const doStartu = 600;
  const o = kolikPreskocit(doStartu, PROCEDURA_S);
  assert.ok(o !== null);
  const po = doStartu - o!;
  assert.equal(po - dalsiTroubeni(doStartu, PROCEDURA_S)!, NASKOK_PRED_HRANOU_S);
});

zkus('náskok stačí na to, aby hlášení stihlo začít', () => {
  // Hlášení jde OZNAMENI_S před znamením; náskok musí být delší.
  assert.ok(
    NASKOK_PRED_HRANOU_S > OZNAMENI_S,
    `náskok ${NASKOK_PRED_HRANOU_S} s nestačí na hlášení ${OZNAMENI_S} s předem`,
  );
});

zkus('po přeskoku je hlášení opravdu ještě před námi', () => {
  const doStartu = 600;
  const po = doStartu - kolikPreskocit(doStartu, PROCEDURA_S)!;
  const hrana = dalsiTroubeni(doStartu, PROCEDURA_S)!;
  // V partituře existuje věta, která k té hraně patří, a leží mezi
  // bodem po přeskoku a samotným troubením.
  const veta = partitura(PROCEDURA_S).find(
    (z) => z.troubi === null && z.vterinDoStartu === hrana + OZNAMENI_S,
  );
  assert.ok(veta, 'k hraně nepatří žádné hlášení');
  assert.ok(veta!.vterinDoStartu < po, 'hlášení by se přeskočilo');
});

console.log(`\n  ${prosly} prošlo`);
