import {
  pipni,
  seberBoji,
  smazPrvek,
  upravPrvek,
  znaceniBoje,
  type PipnutiVstup,
  type PrvekVstup,
  type ZnaceniBoje,
} from '../api';
import { vyprazdni, zarad, type Odesilatele } from '../outbox';

/**
 * Úkony stavitele, které se nesmějí ztratit bez signálu.
 *
 * <para>
 * <b>Proč tudy.</b> Do 22. 11. 2026 volal detail značky API přímo, takže
 * bez signálu spadl a stavitel se dozvěděl „nepovedlo se to". Jenže on je
 * na vodě a signál se mu nevrátí tím, že to zkusí potřetí — tohle je
 * přesně ten případ, kvůli kterému fronta existuje.
 * </para>
 *
 * <para>
 * <b>Každý druh má svůj klíč a ten nese záměr</b>, ne náhodu: dvakrát
 * zmáčknuté sebrání téže bóje je jeden úkon, kdežto dvě přebarvení za
 * sebou jsou dva a musí dojít v pořadí.
 * </para>
 */

export const SEBRANI = 'boje-sebrani';
export const ZNACENI = 'boje-znaceni';
export const PRESUN = 'boje-presun';
export const SMAZANI = 'prvek-smazani';
export const PORADI = 'prvek-poradi';

type Kam = { serie: string; zavod: string };

export function zaradSebrani(kam: Kam, boje: number, nazev: string): void {
  // Sebrání je razítko: dvakrát zmáčknuté je pořád jedno.
  zarad(SEBRANI, `${SEBRANI}:${kam.serie}:${kam.zavod}:${boje}`, `Sebrat ${nazev}`, {
    ...kam,
    boje,
  });
}

export function zaradZnaceni(
  kam: Kam,
  boje: number,
  nazev: string,
  vstup: ZnaceniBoje,
  kdy = Date.now(),
): void {
  // Dvě přebarvení za sebou jsou dva úkony a pořadí mezi nimi rozhoduje,
  // takže klíč nese i okamžik stisku.
  zarad(ZNACENI, `${ZNACENI}:${boje}:${kdy}`, `Přebarvit ${nazev}`, { ...kam, boje, vstup });
}

export function zaradPresun(
  kam: Kam,
  nazev: string,
  vstup: PipnutiVstup,
  kdy = Date.now(),
): void {
  zarad(PRESUN, `${PRESUN}:${vstup.nahrazujeId}:${kdy}`, `Přesunout ${nazev}`, {
    ...kam,
    vstup,
  });
}

export function zaradSmazani(kam: Kam, prvek: number, popis: string): void {
  zarad(SMAZANI, `${SMAZANI}:${prvek}`, `Smazat ${popis}`, { ...kam, prvek });
}

export function zaradPoradi(kam: Kam, prvek: number, vstup: PrvekVstup): void {
  // Klíč nese i pořadí: dvě přerovnání téhož prvku jsou dva úkony.
  zarad(PORADI, `${PORADI}:${prvek}:${vstup.poradi}`, `Přerovnat prvek ${prvek}`, {
    ...kam,
    prvek,
    vstup,
  });
}

/**
 * Kdo umí který druh odeslat.
 *
 * <b>Těla jsou prostá data</b>, protože přežívají konec appky: v tabulce
 * leží jako JSON a odesílatel z nich skládá volání znovu.
 */
export const ODESILATELE: Odesilatele = {
  [SEBRANI]: (t: never) => {
    const u = t as unknown as Kam & { boje: number };
    return seberBoji(u.serie, u.zavod, u.boje);
  },
  [ZNACENI]: (t: never) => {
    const u = t as unknown as Kam & { boje: number; vstup: ZnaceniBoje };
    return znaceniBoje(u.serie, u.zavod, u.boje, u.vstup);
  },
  [PRESUN]: (t: never) => {
    const u = t as unknown as Kam & { vstup: PipnutiVstup };
    return pipni(u.serie, u.zavod, u.vstup);
  },
  [SMAZANI]: (t: never) => {
    const u = t as unknown as Kam & { prvek: number };
    return smazPrvek(u.serie, u.zavod, u.prvek);
  },
  [PORADI]: (t: never) => {
    const u = t as unknown as Kam & { prvek: number; vstup: PrvekVstup };
    return upravPrvek(u.serie, u.zavod, u.prvek, u.vstup);
  },
};

/** Pošle, co z úkonů stavitele jde. */
export const posliUkony = () => vyprazdni(ODESILATELE);
