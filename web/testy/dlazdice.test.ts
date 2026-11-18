/**
 * Fronta na stahování mapových dlaždic.
 *
 * <b>Odkud se to vzalo.</b> Filipovo pozorování 11: *„mapa se občas
 * nevykreslí celá — chybí dlaždice podkladu, trať a značky se kreslí."*
 * To „občas" je tu to podstatné: fronta držela mez při prvním otevření
 * a rozpadla se až při dalším, protože jí počítadlo spadlo do záporu.
 * Napoprvé tedy mapa vyšla, napodruhé OSM polovinu odmítlo.
 *
 * Proklikat se to nedá — vada je v čítači, který obrazovka neukazuje,
 * a projeví se jen při druhé vlně požadavků. Proto testy.
 */
import assert from 'node:assert/strict';

import { NARAZ, stavFronty, vRade, vynulujFrontu } from '../lib/fronta-dlazdic.ts';

let prosly = 0;
function zkus(nazev: string, f: () => void | Promise<void>) {
  return Promise.resolve()
    .then(f)
    .then(() => { prosly += 1; console.log('  ok   ' + nazev); })
    .catch((e) => { console.log('  CHYBA ' + nazev + ': ' + (e as Error).message); process.exitCode = 1; });
}

/** Spustí vlnu prací a vrátí, kolik jich kdy běželo najednou. */
async function vlna(kolik: number, trvani = 10) {
  let soucasne = 0;
  let nejvic = 0;
  await Promise.all(
    Array.from({ length: kolik }, () =>
      vRade(async () => {
        soucasne += 1;
        nejvic = Math.max(nejvic, soucasne);
        await new Promise((d) => setTimeout(d, trvani));
        soucasne -= 1;
      }),
    ),
  );
  return nejvic;
}

console.log('Fronta mapových dlaždic');

await zkus('jedna vlna drží mez souběhu', async () => {
  vynulujFrontu();
  assert.ok((await vlna(20)) <= NARAZ);
});

await zkus('po doběhnutí je počítadlo zpátky na nule', async () => {
  // Tohle je ta vada: `bezi` padalo na −18, protože slot uvolnil jak ten,
  // kdo dobíhal, tak ten, koho probudil.
  vynulujFrontu();
  await vlna(20);
  assert.deepEqual(stavFronty(), { bezi: 0, ceka: 0 });
});

await zkus('druhá vlna drží mez stejně jako první', async () => {
  // Přímá reprodukce pozorování 11: první otevření mapy prošlo, druhé
  // pustilo všech dvacet dlaždic naráz a zdroj je odmítl.
  vynulujFrontu();
  await vlna(20);
  const nejvic = await vlna(20);
  assert.ok(nejvic <= NARAZ, `druhá vlna pustila ${nejvic} naráz místo ${NARAZ}`);
});

await zkus('pět vln po sobě nerozhodí počítadlo', async () => {
  vynulujFrontu();
  for (let i = 0; i < 5; i += 1) {
    const nejvic = await vlna(12);
    assert.ok(nejvic <= NARAZ, `vlna ${i + 1} pustila ${nejvic} naráz`);
  }
  assert.deepEqual(stavFronty(), { bezi: 0, ceka: 0 });
});

await zkus('práce dostane svůj výsledek zpátky', async () => {
  vynulujFrontu();
  const vysledky = await Promise.all(
    [1, 2, 3, 4, 5].map((i) => vRade(async () => i * 10)),
  );
  assert.deepEqual(vysledky, [10, 20, 30, 40, 50]);
});

await zkus('spadlá práce slot neukradne', async () => {
  // `finally` musí slot vrátit i tehdy, když stahování vyhodí výjimku —
  // jinak fronta po pár chybách zatuhne nadobro.
  vynulujFrontu();
  await Promise.all(
    Array.from({ length: 6 }, (_, i) =>
      vRade(async () => {
        if (i % 2 === 0) throw new Error('síť');
        return i;
      }).catch(() => null),
    ),
  );
  assert.deepEqual(stavFronty(), { bezi: 0, ceka: 0 });
});

console.log(`\n  ${prosly} v pořádku`);
