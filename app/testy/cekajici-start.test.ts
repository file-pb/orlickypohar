/**
 * Start, který se ještě nedoručil.
 *
 * Měří se to, co u stolu nikdo nezkusí a na vodě se to nedá zopakovat:
 * že <b>odpočet běží dřív, než o něm server ví</b>, že se podržený úkon
 * počítá od stisku a ne od doručení, a že odvolaná rozjížďka přestane
 * v appce „jet" ještě předtím, než to server potvrdí.
 *
 * Tatáž pravidla hlídá na druhé straně `ProceduraTests` v API — kdyby se
 * rozešla, odpočet v telefonu a čas v databázi by si přestaly odpovídat.
 */
import assert from 'node:assert/strict';
import { zapomenVse } from 'expo-file-system';

import {
  nactiCekajici,
  platnyUkon,
  sCekajicim,
  startZUkonu,
  ulozCekajici,
  type CekajiciUkon,
} from '../src/lib/cekajici-start.ts';
import { NEJDELSI_JIZDA_S, stavStartu, type RozjizdkaProOdpocet } from '../src/lib/start.ts';

let prosly = 0;
function zkus(nazev: string, f: () => void) {
  try {
    zapomenVse();
    f();
    prosly += 1;
    console.log('  ok   ' + nazev);
  } catch (e) {
    console.log('  CHYBA ' + nazev + ': ' + (e as Error).message);
    process.exitCode = 1;
  }
}

/** 15. 5. 2027, 11:55:00 UTC — pět minut před startem ve 12:00. */
const STISK = Date.parse('2027-05-15T11:55:00Z');
const DELKA_S = 5 * 60;

const ukon = (druh: CekajiciUkon['druh'], kdy = STISK): CekajiciUkon => ({
  serie: '2027',
  zavod: 'jarni-vitr',
  cislo: 2,
  druh,
  kdy,
});

zkus('spuštění dá start o celou proceduru dál', () => {
  assert.equal(startZUkonu('Spustit', STISK, DELKA_S), '2027-05-15T12:00:00.000Z');
  // Délka je vlastnost regaty, ne konstanta (ZPJ 26 má u pětky hvězdičku).
  assert.equal(startZUkonu('Spustit', STISK, 10 * 60), '2027-05-15T12:05:00.000Z');
});

zkus('odložení nechává čas volný', () => {
  // ZPJ 27.3: nový čas se nedopočítává, volí ho startér.
  assert.equal(startZUkonu('Odlozit', STISK, DELKA_S), null);
});

zkus('odvolání přidá minutu z pravidla 29.2', () => {
  // „Vyzývací znamení nového startu musí být dáno jednu minutu poté."
  assert.equal(startZUkonu('Odvolat', STISK, DELKA_S), '2027-05-15T12:01:00.000Z');
});

zkus('odpočet běží dřív, než o něm server ví', () => {
  // Server pořád vrací rozjížďku bez času startu — tak vypadá regata,
  // u které se zmáčklo a odpověď nedorazila.
  const zeServeru: RozjizdkaProOdpocet[] = [{ cislo: 2, startV: null, stav: 'Planovana' }];

  const stav = stavStartu(sCekajicim(zeServeru, ukon('Spustit'), DELKA_S), STISK + 60_000, DELKA_S);

  assert.deepEqual(stav, {
    druh: 'procedura',
    cislo: 2,
    startV: '2027-05-15T12:00:00.000Z',
    doStartuS: 4 * 60,
  });
});

zkus('odvolaná rozjížďka přestane jet hned, ne až to potvrdí server', () => {
  // Na serveru je pořád „probíhá"; kdyby appka věřila jen jemu, ukazovala
  // by, že se jede, zatímco pole stojí na startu.
  const zeServeru: RozjizdkaProOdpocet[] = [
    { cislo: 2, startV: '2027-05-15T11:40:00Z', stav: 'Probiha' },
  ];

  const po = (vterin: number) =>
    stavStartu(sCekajicim(zeServeru, ukon('Odvolat'), DELKA_S), STISK + vterin * 1000, DELKA_S);

  // Půl minuty po odvolání se čeká: vyzývací znamení padne až minutu
  // poté, co je spuštěn první opakovač (ZPJ 29.2), takže procedura
  // ještě neběží. Hlavně ale už <b>nejede</b> rozjížďka.
  assert.equal(po(30)?.druh, 'ceka');
  assert.equal(po(30)?.cislo, 2);

  // A po té minutě je z toho odpočet nového startu.
  assert.equal(po(90)?.druh, 'procedura');
});

zkus('ostatní rozjížďky zůstanou, jak je poslal server', () => {
  const zeServeru: RozjizdkaProOdpocet[] = [
    { cislo: 1, startV: '2027-05-15T10:00:00Z', stav: 'Dokoncena' },
    { cislo: 2, startV: null, stav: 'Planovana' },
  ];

  const s = sCekajicim(zeServeru, ukon('Spustit'), DELKA_S);

  assert.deepEqual(s[0], zeServeru[0]);
  assert.equal(s[1].startV, '2027-05-15T12:00:00.000Z');
});

zkus('bez čekajícího úkonu se nic nedosazuje', () => {
  const zeServeru: RozjizdkaProOdpocet[] = [{ cislo: 2, startV: null, stav: 'Planovana' }];
  assert.equal(sCekajicim(zeServeru, null, DELKA_S), zeServeru);
});

zkus('úkon z jiné regaty se nedosadí', () => {
  // Jeden soubor na telefon: podržený start z jiné regaty by jinak
  // rozjel odpočet tam, kde se nestartuje.
  assert.equal(platnyUkon(ukon('Spustit'), '2027', 'podzimni-vitr', STISK), null);
  assert.equal(platnyUkon(ukon('Spustit'), '2026', 'jarni-vitr', STISK), null);
});

zkus('příliš starý úkon se zahodí', () => {
  // Server bere čas z telefonu jen v okně kolem svého; co je starší, by
  // zapsal vlastním časem — a tím by z podrženého startu udělal start
  // v okamžiku doručení.
  const ted = STISK + NEJDELSI_JIZDA_S * 1000 + 1000;
  assert.equal(platnyUkon(ukon('Spustit'), '2027', 'jarni-vitr', ted), null);

  // Hodinu po stisku je to pořád tentýž start, jen nedoručený.
  const zaHodinu = STISK + 3600 * 1000;
  assert.equal(platnyUkon(ukon('Spustit'), '2027', 'jarni-vitr', zaHodinu)?.cislo, 2);
});

zkus('úkon přežije konec appky', () => {
  // Kdyby se držel jen v paměti, zabitá appka by start ztratila — a na
  // vodě není kdo by ho zapsal znovu.
  assert.equal(nactiCekajici(), null);

  ulozCekajici(ukon('Spustit'));
  assert.deepEqual(nactiCekajici(), ukon('Spustit'));

  ulozCekajici(null);
  assert.equal(nactiCekajici(), null);
});

console.log(`  ${prosly} prošlo`);
