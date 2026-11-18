/**
 * Předpisy průvodce proti pravidlům serveru.
 *
 * <b>Odskok se do 18. 11. 2026 nedal postavit</b> (konzilium nad
 * stavitelem trati, bod 9): v nabídce měl dva body, ale `jak: "jedna"`,
 * takže průvodce nabídl volby ukládající `OtocnaBoje` — typ, který je na
 * serveru jednokoncový. Pět klepnutí skončilo prvkem, který server odmítne,
 * a protože prvky jdou frontou v pořadí, zastavilo to celou trať.
 *
 * Projít se to dá jen tak, že člověk na vodě projde všech pět typů do
 * konce. Tenhle test místo toho porovná každou volbu v nabídce s tím, co
 * o jejím typu říká server — a chytí tutéž vadu u kteréhokoliv dalšího
 * typu, ne jen u odskoku.
 */
import assert from 'node:assert/strict';

import {
  dlazdiceNabidky,
  dvaBody,
  NABIDKA,
  patriSmer,
  stopaProPrvek,
  TYPY,
  VOLBY,
} from '../src/lib/stavba-prvku.ts';

let prosly = 0;
function zkus(nazev: string, f: () => void) {
  try { f(); prosly += 1; console.log('  ok   ' + nazev); }
  catch (e) { console.log('  CHYBA ' + nazev + ': ' + (e as Error).message); process.exitCode = 1; }
}

console.log('Předpisy průvodce stavbou');

zkus('každý typ v nabídce má svou sadu předpisů', () => {
  for (const typ of TYPY) {
    assert.ok(VOLBY[typ.jak]?.length, `${typ.id} nemá ani jeden předpis`);
  }
});

zkus('počet pípaných bodů sedí s tím, co server o typu ví', () => {
  // `dvaBody` je protějšek `PrvekTrati.Dvoukonec`. Prvek, který se pípá
  // dvěma body, se nesmí uložit jako jednokoncový typ a naopak — server
  // to odmítne a fronta stojí.
  for (const typ of TYPY) {
    for (const volba of VOLBY[typ.jak]) {
      assert.equal(
        dvaBody(volba.typ),
        typ.body.length === 2,
        `${typ.id} → ${volba.jmeno}: pípají se ${typ.body.length} body, ale ${volba.typ} ` +
          `je ${dvaBody(volba.typ) ? 'dvoukoncový' : 'jednokoncový'}`,
      );
    }
  }
});

zkus('strana se vyplňuje jen tam, kam patří', () => {
  // `PrvekTrati.StranaPatri`: otočná bóje, průjezdní bóje a odskok. Jinde
  // ji určuje loď nebo směr průjezdu, takže by ji průvodce vymýšlel.
  const seStranou = new Set(['OtocnaBoje', 'PrujezdniBoje', 'Odskok']);
  for (const volby of Object.values(VOLBY)) {
    for (const volba of volby) {
      assert.equal(
        volba.strana !== null,
        seStranou.has(volba.typ),
        `${volba.jmeno} (${volba.typ}): strana ${volba.strana === null ? 'chybí' : 'přebývá'}`,
      );
    }
  }
});

zkus('na směr se ptá jen start a cíl', () => {
  for (const typ of TYPY) {
    assert.equal(patriSmer(typ), typ.id === 'Start' || typ.id === 'Cil', typ.id);
  }
});

zkus('odskok se staví jako odskok, levobokem i pravobokem', () => {
  const volby = VOLBY.odskok;
  assert.equal(volby.length, 2);
  assert.deepEqual(volby.map((v) => v.typ), ['Odskok', 'Odskok']);
  assert.deepEqual(volby.map((v) => v.strana), ['PoLeve', 'PoPrave']);
});

zkus('postavený odskok si najde svou stopu', () => {
  // Veřejná stránka kreslí náhled z typu a strany. Dokud odskok `VOLBY`
  // neznaly, vracelo se `null` a stopa se nenakreslila.
  assert.equal(stopaProPrvek('Odskok', 'PoLeve'), 'otocLevobok');
  assert.equal(stopaProPrvek('Odskok', 'PoPrave'), 'otocPravobok');
});

zkus('nabídka pokrývá všechny předpisy do jednoho', () => {
  // Dlaždice, která nenajde svůj předpis, z nabídky tiše vypadne —
  // a na vodě by chyběl celý prvek. Tohle je ta kontrola, co to ohlásí
  // dřív: každá volba v `VOLBY` musí mít v nabídce právě jedno místo.
  const vsechny = Object.values(VOLBY).flat();
  const dlazdice = dlazdiceNabidky();
  assert.equal(
    dlazdice.length,
    NABIDKA.length,
    `nabídka má ${NABIDKA.length} položek, rozsvítilo se ${dlazdice.length} — ` +
      'některá nenašla typ nebo předpis',
  );
  assert.equal(dlazdice.length, vsechny.length, 'nabídka a předpisy se rozešly v počtu');

  for (const volba of vsechny) {
    const kolik = dlazdice.filter((d) => d.volba === volba).length;
    assert.equal(kolik, 1, `${volba.jmeno} (${volba.typ}) je v nabídce ${kolik}×`);
  }
});

zkus('každá dlaždice nese jméno i vysvětlení', () => {
  for (const d of dlazdiceNabidky()) {
    assert.ok(d.jmeno.length > 0, 'dlaždice bez jména');
    assert.ok(d.detail.length > 0, `${d.jmeno} nemá detail`);
  }
});

zkus('jména v nabídce se neopakují', () => {
  const jmena = NABIDKA.map((x) => x.jmeno);
  assert.equal(new Set(jmena).size, jmena.length, 'dvě dlaždice se jmenují stejně');
});

console.log(`\n  ${prosly} v pořádku`);
