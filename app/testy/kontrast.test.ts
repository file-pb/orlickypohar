/**
 * Písmo na barevné výplni musí držet mez v obou sadách.
 *
 * <b>Proč na to je test.</b> Bílá napevno na tokenu použitém jako výplň
 * dávala v tmavé sadě 2,07:1 a nic to neohlásilo — `kontrola-tokenu.py`
 * se dívá na páry odvozené z webového CSS a tenhle pár vzniká až v appce.
 * Test tu díru zavírá z druhé strany: jede přes <b>každou</b> výplň, která
 * se v appce vyskytuje, v obou sadách, a počítá poměr z tokenů.
 *
 * Padne tedy i tehdy, když se změní barva v `theme.ts` — což je přesně to,
 * co se u oranžové čeká (kontrola tokenů hlásí u webového jantaru desetinu
 * rezervy).
 */
import assert from 'node:assert/strict';

import { Colors, type Barvy } from '../src/constants/theme.ts';
import { jas, pismoNaVyplni, pomerKontrastu } from '../src/lib/kontrast.ts';

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

/** Mez WCAG 2.2 AA pro běžný text. */
const MEZ = 4.5;

/** Tokeny, které appka používá jako výplň pod písmem. */
const VYPLNE: (keyof Barvy)[] = ['procedura', 'vystraha', 'jede', 'stavZruseny', 'voda'];

// --- vzorec sám ---------------------------------------------------------

zkus('bílá proti černé je 21:1', () => {
  assert.equal(Math.round(pomerKontrastu('#ffffff', '#000000')), 21);
});

zkus('stejná barva proti sobě je 1:1', () => {
  assert.equal(Math.round(pomerKontrastu('#1f6f8b', '#1f6f8b')), 1);
});

zkus('jas bílé je 1 a černé 0', () => {
  assert.equal(Math.round(jas('#ffffff')), 1);
  assert.equal(Math.round(jas('#000000')), 0);
});

// --- a hlavně: co z toho vyjde na skutečných tokenech -------------------

for (const [jmenoSady, sada] of Object.entries(Colors) as [string, Barvy][]) {
  for (const vypln of VYPLNE) {
    zkus(`${jmenoSady}: písmo na ${vypln} drží ${MEZ}:1`, () => {
      const pismo = pismoNaVyplni(sada, sada[vypln]);
      const pomer = pomerKontrastu(pismo, sada[vypln]);
      assert.ok(
        pomer >= MEZ,
        `vyšlo ${pomer.toFixed(2)}:1 (písmo ${pismo} na ${sada[vypln]})`,
      );
    });
  }
}

zkus('na tmavé ploše vyjde světlé písmo a na světlé tmavé', () => {
  // Kdyby se vybíralo podle režimu místo podle výplně, tahle dvojice by
  // selhala: obě výplně jsou z téže sady, ale každá chce opačné písmo.
  assert.ok(jas(pismoNaVyplni(Colors.dark, Colors.dark.procedura)) > 0.5);
  assert.ok(jas(pismoNaVyplni(Colors.dark, Colors.dark.jede)) < 0.5);
});

zkus('bílá na tmavém „jede" by mez nedržela — proto se nevybere', () => {
  assert.ok(pomerKontrastu('#ffffff', Colors.dark.jede) < 3);
  assert.notEqual(pismoNaVyplni(Colors.dark, Colors.dark.jede), '#ffffff');
});

console.log(`  ${prosly} prošlo`);
