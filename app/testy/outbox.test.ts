/**
 * Obecná fronta úkonů, které se nesmějí ztratit bez signálu.
 *
 * Měří se to, kvůli čemu vznikla: že se <b>stojí po druzích</b>. U prvků
 * trati určuje pořadí server podle pořadí doručení, takže odmítnutý prvek
 * musí zastavit i ty za ním; sebrání jedné bóje ale nemá co blokovat
 * přebarvení druhé.
 */
import assert from 'node:assert/strict';

import { cekajici, stav, vyprazdni, zarad, type Odesilatele } from '../src/lib/outbox.ts';

let prosly = 0;
function zkus(nazev: string, f: () => void | Promise<void>) {
  const hotovo = () => {
    prosly += 1;
    console.log('  ok   ' + nazev);
  };
  try {
    const v = f();
    if (v instanceof Promise) return v.then(hotovo, (e: Error) => {
      console.log('  CHYBA ' + nazev + ': ' + e.message);
      process.exitCode = 1;
    });
    hotovo();
  } catch (e) {
    console.log('  CHYBA ' + nazev + ': ' + (e as Error).message);
    process.exitCode = 1;
  }
  return Promise.resolve();
}

/** Chyba v tom tvaru, jaký vyhazuje klient API. */
const odmitnuti = (stav: number, duvod: string) =>
  Object.assign(new Error(duvod), { stav, duvod });

await (async () => {
  await zkus('zařazený úkon ve frontě čeká i s popisem', () => {
    zarad('seber', 'k1', 'Sebrat bóji 1', { boje: 1 });
    const u = cekajici().find((x) => x.klic === 'k1');
    assert.ok(u);
    assert.equal(u!.popis, 'Sebrat bóji 1');
    assert.deepEqual(u!.telo, { boje: 1 });
    assert.equal(u!.odmitnuto, false);
  });

  await zkus('týž klíč se nezaloží dvakrát', () => {
    const pred = cekajici().length;
    zarad('seber', 'k1', 'Sebrat bóji 1', { boje: 1 });
    assert.equal(cekajici().length, pred);
  });

  await zkus('co projde, z fronty zmizí', async () => {
    zarad('barva', 'k2', 'Přebarvit bóji 2', { boje: 2 });
    const odesilatele: Odesilatele = {
      seber: async () => undefined,
      barva: async () => undefined,
    };
    const v = await vyprazdni(odesilatele);
    assert.equal(v.odeslano, 2);
    assert.equal(cekajici().length, 0);
    assert.equal(v.stoji.length, 0);
  });

  await zkus('vada jednoho druhu nezastaví druhý', async () => {
    zarad('prvek', 'p1', 'Otočná 1', {});
    zarad('prvek', 'p2', 'Brána', {});
    zarad('barva', 'b1', 'Přebarvit', {});

    const v = await vyprazdni({
      prvek: async () => {
        throw odmitnuti(400, 'Trať je zamčená.');
      },
      barva: async () => undefined,
    });

    // Barva prošla, prvky stojí — a stojí oba, protože za odmítnutým
    // prvkem čeká pořadí na trati.
    assert.equal(v.odeslano, 1);
    assert.deepEqual(
      v.stoji.map((s) => s.druh),
      ['prvek'],
    );
    assert.equal(v.stoji[0].odmitnuto, true);
    assert.equal(cekajici('prvek').length, 2);
    assert.equal(cekajici('barva').length, 0);
  });

  await zkus('výpadek signálu není odmítnutí a zkusí se znovu', async () => {
    const v = await vyprazdni({
      prvek: async () => {
        throw odmitnuti(502, 'Bad gateway');
      },
    });
    assert.equal(v.stoji[0].odmitnuto, false);
    assert.equal(stav().odmitnuto, 0);

    // A po návratu signálu projde obojí v pořadí.
    const poradi: string[] = [];
    const v2 = await vyprazdni({
      prvek: async (t: never) => {
        poradi.push((t as { co?: string }).co ?? '');
        return undefined;
      },
    });
    assert.equal(v2.odeslano, 2);
    assert.equal(cekajici().length, 0);
  });

  await zkus('neznámý druh se nechá ležet, nezahodí se', async () => {
    zarad('zitrejsi', 'z1', 'Úkon z novější verze', {});
    const v = await vyprazdni({});
    assert.equal(v.odeslano, 0);
    assert.equal(cekajici('zitrejsi').length, 1);
  });

  console.log(`\n  ${prosly} v pořádku`);
})();
