/**
 * Volba zvuku na startu: hlas a klakson zvlášť.
 *
 * <b>Měří se hlavně jedna věc: že se stará volba nezahodí.</b> Do 8. 11.
 * 2026 byl v souboru jediný přepínač `{ zapnuto }`. Kdo ho měl vypnutý,
 * chtěl ticho — a kdyby nový tvar spadl na výchozí „obojí zapnuto",
 * začal by mu telefon po aktualizaci troubit uprostřed regaty. Je to
 * past, která se pozná až na vodě a opravit se tam nedá.
 *
 * Soubor je mezi testy potřeba vyprázdnit a modul načíst znovu: volba se
 * čte jednou za běh a drží se v paměti modulu.
 */
import assert from 'node:assert/strict';
import { zapomenVse } from 'expo-file-system';

let prosly = 0;
function zkus(nazev: string, f: () => Promise<void> | void) {
  return Promise.resolve()
    .then(() => {
      zapomenVse();
      return f();
    })
    .then(() => {
      prosly += 1;
      console.log('  ok   ' + nazev);
    })
    .catch((e: Error) => {
      console.log('  CHYBA ' + nazev + ': ' + e.message);
      process.exitCode = 1;
    });
}

/** Čerstvý modul nad prázdným souborem — volba se načte znovu. */
async function cerstvy(obsah?: Record<string, unknown>) {
  if (obsah) {
    const { File, Paths } = await import('expo-file-system');
    const f = new File(Paths.document, 'dirigent.json');
    f.create();
    f.write(JSON.stringify(obsah));
  }
  // Dotaz navíc v cestě obchází mezipaměť modulů.
  return import(`../src/lib/zvuk.ts?${Math.random()}`) as Promise<
    typeof import('../src/lib/zvuk.ts')
  >;
}

async function vse() {
  await zkus('bez souboru hlásí i troubí', async () => {
    const z = await cerstvy();
    assert.deepEqual(z.zvukTed(), { hlas: true, klakson: true });
  });

  await zkus('vypnutý starý přepínač umlčí obojí', async () => {
    // Tohle je ta past: `{ zapnuto: false }` znamenalo ticho, a ticho
    // musí zůstat tichem i po rozdělení na dvě volby.
    const z = await cerstvy({ zapnuto: false });
    assert.deepEqual(z.zvukTed(), { hlas: false, klakson: false });
  });

  await zkus('zapnutý starý přepínač zapne obojí', async () => {
    const z = await cerstvy({ zapnuto: true });
    assert.deepEqual(z.zvukTed(), { hlas: true, klakson: true });
  });

  await zkus('nový tvar se čte, jak je zapsaný', async () => {
    const z = await cerstvy({ hlas: false, klakson: true });
    assert.deepEqual(z.zvukTed(), { hlas: false, klakson: true });
  });

  await zkus('chybějící půlka nového tvaru padne na výchozí', async () => {
    const z = await cerstvy({ klakson: false });
    assert.deepEqual(z.zvukTed(), { hlas: true, klakson: false });
  });

  await zkus('nesmysl v souboru shodí nanejvýš volbu', async () => {
    const { File, Paths } = await import('expo-file-system');
    const f = new File(Paths.document, 'dirigent.json');
    f.create();
    f.write('tohle není JSON');
    const z = await cerstvy();
    assert.deepEqual(z.zvukTed(), { hlas: true, klakson: true });
  });

  await zkus('změna se zapamatuje a přečte zpátky', async () => {
    const z = await cerstvy();
    z.nastavZvuk({ klakson: false });
    assert.deepEqual(z.zvukTed(), { hlas: true, klakson: false });

    // A přežije konec appky: nový běh ji musí najít v souboru.
    const znovu = await import(`../src/lib/zvuk.ts?${Math.random()}`);
    assert.deepEqual(znovu.zvukTed(), { hlas: true, klakson: false });
  });

  await zkus('jedna volba druhou nepřepíše', async () => {
    const z = await cerstvy({ hlas: false, klakson: false });
    z.nastavZvuk({ hlas: true });
    assert.deepEqual(z.zvukTed(), { hlas: true, klakson: false });
  });

  console.log(`  ${prosly} prošlo`);
}

void vse();
