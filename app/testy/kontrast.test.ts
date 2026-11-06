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
import {
  barvaNaVyplni,
  jas,
  MEZ_GRAFIKA,
  pismoNaVyplni,
  pomerKontrastu,
  sPruhlednosti,
} from '../src/lib/kontrast.ts';

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

// --- proužky fází na panelu odpočtu ----------------------------------

/** Dvě plochy, na kterých panel odpočtu stojí. */
const PANELY: (keyof Barvy)[] = ['procedura', 'vystraha'];
/** Tři proužky, a nesou barvy znamení. */
const ZNAMENI: (keyof Barvy)[] = ['vyzvaZnameni', 'pripravaZnameni', 'minutaZnameni'];

for (const [jmenoSady, sada] of Object.entries(Colors) as [string, Barvy][]) {
  for (const panel of PANELY) {
    for (const znameni of ZNAMENI) {
      zkus(`${jmenoSady}: proužek ${znameni} na ${panel} drží ${MEZ_GRAFIKA}:1`, () => {
        const barva = barvaNaVyplni(sada, sada[panel], sada[znameni]);
        const pomer = pomerKontrastu(barva, sada[panel]);
        assert.ok(pomer >= MEZ_GRAFIKA, `vyšlo ${pomer.toFixed(2)}:1 (barva ${barva})`);
      });
    }
  }
}

zkus('na modrém panelu zůstávají barvy znamení, jaké jsou', () => {
  // Ustoupit mají jen tam, kde by zmizely — jinde by to byla ztráta
  // významu bez důvodu.
  for (const sada of [Colors.light, Colors.dark]) {
    assert.equal(
      barvaNaVyplni(sada, sada.procedura, sada.pripravaZnameni),
      sada.pripravaZnameni,
    );
  }
});

zkus('na jantaru v tmavé sadě ustoupí, protože by zmizely', () => {
  assert.ok(pomerKontrastu(Colors.dark.pripravaZnameni, Colors.dark.vystraha) < MEZ_GRAFIKA);
  assert.notEqual(
    barvaNaVyplni(Colors.dark, Colors.dark.vystraha, Colors.dark.pripravaZnameni),
    Colors.dark.pripravaZnameni,
  );
});

zkus('žádná pevná barva proužku pro obě plochy v tmavé sadě neexistuje', () => {
  // Tohle je důvod, proč je `barvaNaVyplni` funkce a ne tabulka. Kdyby
  // se tokeny změnily tak, že pevná barva existovat začne, test padne
  // a pravidlo se dá zjednodušit.
  const rozsah = (vypln: string) => ({
    dolni: (jas(vypln) + 0.05) / MEZ_GRAFIKA - 0.05,
    horni: MEZ_GRAFIKA * (jas(vypln) + 0.05) - 0.05,
  });
  const m = rozsah(Colors.dark.procedura);
  const j = rozsah(Colors.dark.vystraha);
  assert.ok(Math.min(m.dolni, j.dolni) < 0, 'tmavá společná barva by existovala');
  assert.ok(Math.max(m.horni, j.horni) > 1, 'světlá společná barva by existovala');
});

zkus('průhlednost se skládá na osmimístný zápis', () => {
  assert.equal(sPruhlednosti('#58c98c', 0.3), '#58c98c4d');
  assert.equal(sPruhlednosti('#58c98c', 1), '#58c98cff');
  assert.equal(sPruhlednosti('#58c98c', 0), '#58c98c00');
});

console.log(`  ${prosly} prošlo`);
