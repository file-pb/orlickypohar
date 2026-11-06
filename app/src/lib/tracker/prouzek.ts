/**
 * Proužek spojení: co stojí pod hodinami a baterií.
 *
 * <b>Proč je to nahoře a ne na obrazovce.</b> Filip, 6. 11. 2026. Jestli se
 * stopa dostane ven, není informace o závodě — je o telefonu, a je stejně
 * užitečná rozhodčímu u startu jako posádce na vodě. V systémovém pruhu je
 * vidět na <b>každé</b> obrazovce a nezabere ani řádek obsahu. Zároveň je
 * to jediná věc, kterou ví jenom telefon a se kterou může jeho majitel sám
 * něco udělat; co se děje na vodě, slyší od komise.
 *
 * <b>Když se nic nezaznamenává, proužek není.</b> Pruh, který svítí pořád,
 * se přestane číst — a tenhle projekt ten případ zná: *„Čeká se na
 * rozpravu"* platilo i hodinu po rozpravě (nález 9 v `TABULE-DIVAK.md`).
 *
 * <b>Nový stavový automat tu nevzniká.</b> Rozhoduje se z `svetloGps`
 * a `stavOdesilani`, tedy z téhož, co ukazuje obrazovka Trasa — jinak by
 * se obě časem rozešly a posádka by na dvou místech viděla dvě pravdy.
 *
 * Pravidla zvlášť od vykreslování, jako u startu: tohle se dá ověřit bez
 * telefonu (`app/testy/prouzek.test.ts`).
 */

import type { StavNahravani } from './nahravani';
import { stavOdesilani, svetloGps, type StavGps } from './stav';
import type { Zaznam } from './zaznam';

/** Barevné tokeny, které proužek používá jako výplň. */
export type VyplnProuzku = 'jede' | 'vystraha' | 'stavZruseny' | 'zvyrazneni';

export type Prouzek = {
  druh: 'vysila' | 'drzi' | 'nezapisuje' | 'bezKlice' | 'pozastaveno';
  /** Co se do proužku napíše. Krátce — je to pás vysoký jeden řádek. */
  text: string;
  /**
   * Klíč barvy v `theme.ts`. Logika barvy nezná, jen je jmenuje; složit
   * je umí komponenta, a díky tomu jde tohle testovat bez appky.
   */
  vypln: VyplnProuzku;
};

/**
 * Co má proužek ukázat, nebo `null`, když nemá být vidět.
 *
 * Pořadí podmínek je pořadí naléhavosti: <b>nejdřív to, s čím se dá něco
 * udělat.</b> Zapisování je pod vším ostatním — když nechodí poloha, je
 * jedno, jak je na tom odesílání.
 */
export function stavProuzku(
  z: Zaznam | null,
  gps: StavGps,
  nahr: StavNahravani | null,
  ted = Date.now(),
): Prouzek | null {
  // Žádný otevřený záznam: není co hlásit, a proužek se tedy nekreslí.
  if (!z || z.stav === 'ukonceny') return null;

  // Pozastavení je vědomé rozhodnutí posádky, ne porucha — nesmí vypadat
  // jako červená. Zmizet ale nesmí: zapomenutá pauza je přesně ta chyba,
  // kterou by jinak nikdo nezahlédl.
  if (z.stav === 'pozastaveny') {
    return { druh: 'pozastaveno', text: 'SLEDOVÁNÍ POZASTAVENO', vypln: 'zvyrazneni' };
  }

  if (svetloGps(z, gps) !== 'jede') {
    return { druh: 'nezapisuje', text: 'NEZAPISUJE SE', vypln: 'stavZruseny' };
  }

  const odesilani = stavOdesilani(z, nahr, ted);

  // Bez klíče se data nedostanou ven nikdy, ať je signál jakýkoliv — a je
  // to jediná ze tří potíží, kterou posádka vyřeší sama (u kapitána).
  if (nahr?.potiz === 'bez-klice') {
    return { druh: 'bezKlice', text: 'BEZ KLÍČE K LODI', vypln: 'stavZruseny' };
  }

  if (odesilani.svetlo === 'jede') {
    return { druh: 'vysila', text: 'VYSÍLÁ SE', vypln: 'jede' };
  }

  // Všechno ostatní znamená, že se zapisuje, ale neodesílá. Není to ztráta
  // a posádka s tím nemá co dělat — proto jantarová, ne červená. Číslo
  // u toho je důkaz, že body nikam nezmizely.
  const ceka = nahr?.ceka ?? 0;
  return {
    druh: 'drzi',
    text: ceka > 0 ? `DRŽÍ SE V TELEFONU · ${ceka}` : 'DRŽÍ SE V TELEFONU',
    vypln: 'vystraha',
  };
}
