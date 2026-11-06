/**
 * Proužek spojení: kdy je, jaký je a kdy není.
 *
 * <b>Proč na to je test.</b> Proužek visí nad celou appkou, takže chyba
 * v něm je vidět pořád — a nejhorší z nich je ta tichá: zelená, protože se
 * nikdo nezeptal. Test proto jede přes všechny stavy záznamu včetně těch,
 * které na vodě nastanou jednou za den (pauza, výpadek klíče, mrtvá GPS).
 *
 * Běží bez telefonu i bez databáze — `stavProuzku` dostává hotové hodnoty.
 */
import assert from 'node:assert/strict';

import type { StavNahravani } from '../src/lib/tracker/nahravani.ts';
import { stavProuzku } from '../src/lib/tracker/prouzek.ts';
import type { StavGps } from '../src/lib/tracker/stav.ts';
import type { Zaznam } from '../src/lib/tracker/zaznam.ts';

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

const TED = 1_700_000_000_000;

function zaznam(stav: Zaznam['stav'] = 'bezi'): Zaznam {
  return {
    id: 'z1',
    stav,
    zdroj: 'gps',
    lod: 'JOY',
    regata: null,
    zacatek: TED - 3_600_000,
    konec: null,
    ostrihano_do: null,
    nahrano_v: null,
    potvrzeno_do: 0,
    nahravani_hotovo: 0,
  } as Zaznam;
}

/** Čerstvá poloha: bod před čtyřmi vteřinami. */
const GPS_PRAZDNA: StavGps = { posledniBod: null, stariMs: null, presnostM: null, pocetBodu: 0 };
const GPS_CERSTVA: StavGps = { posledniBod: TED - 4000, stariMs: 4000, presnostM: 6, pocetBodu: 412 };
/** Poloha, která dávno nepřišla — nad `PODEZRELE_MS`. */
const GPS_MRTVA: StavGps = { posledniBod: TED - 90_000, stariMs: 90_000, presnostM: 6, pocetBodu: 412 };

function nahravani(zmeny: Partial<StavNahravani> = {}): StavNahravani {
  return { ceka: 0, potvrzenoDo: 0, hotovo: false, posledniPokus: TED - 5000, potiz: null, ...zmeny };
}

// --- kdy proužek není --------------------------------------------------

zkus('bez záznamu se proužek nekreslí', () => {
  assert.equal(stavProuzku(null, GPS_CERSTVA, null, TED), null);
});

zkus('po ukončení záznamu se proužek nekreslí', () => {
  assert.equal(stavProuzku(zaznam('ukonceny'), GPS_CERSTVA, nahravani(), TED), null);
});

// --- a kdy je ----------------------------------------------------------

zkus('všechno jede: zelená a „vysílá se"', () => {
  const p = stavProuzku(zaznam(), GPS_CERSTVA, nahravani(), TED);
  assert.equal(p?.druh, 'vysila');
  assert.equal(p?.vypln, 'jede');
});

zkus('bez signálu: jantarová a počet bodů, co čeká', () => {
  const p = stavProuzku(zaznam(), GPS_CERSTVA, nahravani({ ceka: 412, potiz: 'sit' }), TED);
  assert.equal(p?.druh, 'drzi');
  assert.equal(p?.vypln, 'vystraha');
  assert.match(p!.text, /412/);
});

zkus('čekání na rozpravu je taky „drží se", ne porucha', () => {
  // Server trasu nevezme, dokud pořadatel neotevřel okno dne. Posádka
  // s tím nic nenadělá a nemá kvůli tomu vidět červenou.
  const p = stavProuzku(zaznam(), GPS_CERSTVA, nahravani({ ceka: 20, potiz: 'mimo-okno' }), TED);
  assert.equal(p?.druh, 'drzi');
});

zkus('mrtvá GPS je červená, i když odesílání vypadá v pořádku', () => {
  const p = stavProuzku(zaznam(), GPS_MRTVA, nahravani(), TED);
  assert.equal(p?.druh, 'nezapisuje');
  assert.equal(p?.vypln, 'stavZruseny');
});

zkus('bez klíče k lodi je červená a řekne to jménem', () => {
  const p = stavProuzku(zaznam(), GPS_CERSTVA, nahravani({ ceka: 412, potiz: 'bez-klice' }), TED);
  assert.equal(p?.druh, 'bezKlice');
  assert.equal(p?.vypln, 'stavZruseny');
});

zkus('pozastavení není porucha, ale proužek nezmizí', () => {
  // Zapomenutá pauza je přesně ta chyba, kterou by jinak nikdo nezahlédl.
  const p = stavProuzku(zaznam('pozastaveny'), GPS_CERSTVA, nahravani(), TED);
  assert.equal(p?.druh, 'pozastaveno');
  assert.equal(p?.vypln, 'zvyrazneni');
});

zkus('stará poloha přebíjí potíž s odesíláním', () => {
  // Pořadí podmínek je pořadí naléhavosti: když nechodí poloha, je jedno,
  // jak je na tom odesílání.
  const p = stavProuzku(zaznam(), GPS_MRTVA, nahravani({ ceka: 9, potiz: 'bez-klice' }), TED);
  assert.equal(p?.druh, 'nezapisuje');
});

zkus('dlouho neodeslaný záznam přepne na „drží se" sám', () => {
  // Dvojnásobek odesílacího okna, z `stavOdesilani` — jedno vynechané kolo
  // se stane, dvě znamenají, že se něco děje.
  const p = stavProuzku(zaznam(), GPS_CERSTVA, nahravani({ posledniPokus: TED - 150_000 }), TED);
  assert.equal(p?.druh, 'drzi');
});

zkus('text je krátký — vejde se pod hodiny', () => {
  for (const p of [
    stavProuzku(zaznam(), GPS_CERSTVA, nahravani(), TED),
    stavProuzku(zaznam(), GPS_CERSTVA, nahravani({ ceka: 9999, potiz: 'sit' }), TED),
    stavProuzku(zaznam(), GPS_MRTVA, nahravani(), TED),
    stavProuzku(zaznam('pozastaveny'), GPS_CERSTVA, nahravani(), TED),
  ]) {
    assert.ok(p!.text.length <= 28, `moc dlouhé: ${p!.text}`);
  }
});


// --- Spojení se serverem bez záznamu (Filip, 7. 11. 2026) ---

zkus('bez záznamu a bez spojení se proužek ukáže', () => {
  const p = stavProuzku(null, GPS_PRAZDNA, null, Date.now(), false, { doletelo: false, kdy: Date.now() });
  assert.equal(p?.druh, 'bezSpojeni');
  assert.match(p!.text, /BEZ SPOJEN/);
});

zkus('bez záznamu a se spojením proužek mlčí', () => {
  assert.equal(
    stavProuzku(null, GPS_PRAZDNA, null, Date.now(), false, { doletelo: true, kdy: Date.now() }),
    null,
  );
});

zkus('dokud se appka nezeptala, netvrdí nic', () => {
  assert.equal(stavProuzku(null, GPS_PRAZDNA, null, Date.now(), false, null), null);
});

zkus('ukázka přebíjí i ztrátu spojení', () => {
  const p = stavProuzku(null, GPS_PRAZDNA, null, Date.now(), true, { doletelo: false, kdy: Date.now() });
  assert.equal(p?.druh, 'ukazka');
});

console.log(`  ${prosly} prošlo`);
