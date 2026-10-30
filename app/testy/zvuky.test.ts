/**
 * Čekání po troubení musí sedět se zvukovými soubory.
 *
 * <b>Proč na to je test.</b> Hlášení se po klaksonu pouští se zpožděním
 * `DELKA_TROUBENI_MS`, protože pod klaksonem by ho nikdo neslyšel.
 * Jenže zvuky se vyrábějí skriptem (`scripts/klakson.py`) a jejich délku
 * jde změnit jedním číslem — a kdyby se to číslo rozešlo s konstantou,
 * nic by nespadlo. Jen by na vodě začala věta dřív, než klakson dohraje,
 * a rozhodčí by ji neslyšel.
 *
 * Měří se délka rovnou ze souboru, ne z toho, co je o něm napsané.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DELKA_TROUBENI_MS, type Troubeni } from '../src/lib/hlaseni.ts';

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

/**
 * Délka WAV souboru v milisekundách.
 *
 * Chunky se procházejí, nečte se pevný posun: `afconvert` mezi `fmt `
 * a `data` přidává vlastní bloky a pevných 44 bajtů by ukázalo na
 * nesmysl.
 */
function delkaMs(cesta: string): number {
  const b = readFileSync(cesta);
  assert.equal(b.toString('ascii', 0, 4), 'RIFF', `${cesta} není RIFF`);
  assert.equal(b.toString('ascii', 8, 12), 'WAVE', `${cesta} není WAVE`);

  let bytuZaVterinu = 0;
  let i = 12;
  while (i + 8 <= b.length) {
    const jmeno = b.toString('ascii', i, i + 4);
    const velikost = b.readUInt32LE(i + 4);
    if (jmeno === 'fmt ') bytuZaVterinu = b.readUInt32LE(i + 28 - 20 + 8);
    if (jmeno === 'data') {
      assert.ok(bytuZaVterinu > 0, `${cesta}: chybí fmt před data`);
      return (velikost / bytuZaVterinu) * 1000;
    }
    i += 8 + velikost + (velikost % 2);
  }
  throw new Error(`${cesta}: chunk 'data' nenalezen`);
}

const SOUBORY: Record<Troubeni, string> = {
  kratce: new URL('../assets/zvuky/klakson-kratky.wav', import.meta.url).pathname,
  dlouze: new URL('../assets/zvuky/klakson-dlouhy.wav', import.meta.url).pathname,
};

for (const druh of ['kratce', 'dlouze'] as Troubeni[]) {
  zkus(`čekání po troubení „${druh}" sedí se souborem`, () => {
    const skutecna = delkaMs(SOUBORY[druh]);
    const ceka = DELKA_TROUBENI_MS[druh];

    // Kratší čekání pustí větu pod klakson — to je ta chyba, kvůli které
    // test je.
    assert.ok(
      ceka >= skutecna - 1,
      `čeká se ${ceka} ms, ale klakson troubí ${Math.round(skutecna)} ms`,
    );
    // Delší o víc než čtvrt vteřiny je zbytečná pauza v proceduře.
    assert.ok(
      ceka - skutecna <= 250,
      `čeká se ${ceka} ms na klakson dlouhý ${Math.round(skutecna)} ms`,
    );
  });
}

zkus('dlouhý klakson je doopravdy delší než krátký', () => {
  // ZPJ 26 rozlišuje krátký a dlouhý zvuk; kdyby se soubory prohodily,
  // minuta do startu by zněla jako vyzývací znamení.
  assert.ok(delkaMs(SOUBORY.dlouze) > delkaMs(SOUBORY.kratce) * 2);
});

console.log(`  ${prosly} prošlo`);
