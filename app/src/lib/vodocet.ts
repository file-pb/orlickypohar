/**
 * Hladina Orlíku pro domovskou obrazovku.
 *
 * <b>Proč je to v appce.</b> Filip, 7. 11. 2026: domovská obrazovka má být
 * *„takový landing"* — logo a widget vodočtu. Je to první věc, na kterou
 * se u vody kouká každý, ať přijel velet, závodit, nebo se jen podívat.
 *
 * <b>Data jdou z našeho API, ne z webu.</b> `/vodocet/orlik` je veřejné
 * a appka na to API stejně míří; chodit oklikou přes Next by znamenalo
 * svázat appku s adresou webu kvůli údaji, který má o dveře vedle.
 *
 * <b>Výpočet je tentýž jako na webu</b> (`web/lib/vodocet.ts`), schválně:
 * kdyby appka počítala změnu jinak, ukazovala by u téhož jezu jiné číslo.
 * Je oddělený od vykreslování a má testy bez telefonu
 * (`app/testy/vodocet.test.ts`).
 */

import { nacti } from './api';
import type { components } from './schema';

export type Vodocet = components['schemas']['VodocetDto'];
export type BodHladiny = components['schemas']['BodHladinyDto'];

/** Za kolik hodin zpátky se změna počítá. Stejně jako na webu. */
export const HODIN_ZMENY = 6;

const minuty = (cas: string) => Math.round(new Date(cas).getTime() / 60000);

/**
 * O kolik centimetrů se hladina změnila za daný počet hodin.
 *
 * Bere <b>nejbližší naměřený bod</b> k cílovému času, ne ten přesný —
 * měření nechodí po pravidelných krocích a trvat na přesné hodině by
 * znamenalo buď nic nevrátit, nebo si bod dopočítat, a dopočítaná hladina
 * není naměřená hladina.
 */
export function zmenaCm(historie: readonly BodHladiny[], hodin = HODIN_ZMENY): number {
  if (historie.length < 2) return 0;
  const posledni = historie[historie.length - 1];
  const cil = minuty(posledni.cas) - hodin * 60;
  const drive = historie.reduce((nejbliz, m) =>
    Math.abs(minuty(m.cas) - cil) < Math.abs(minuty(nejbliz.cas) - cil) ? m : nejbliz,
  );
  return Math.round((posledni.hladina - drive.hladina) * 100);
}

/** Co se o změně napíše. Nula má vlastní větu — „stoupá o 0 cm" je nesmysl. */
export function vetaZmeny(zmena: number, hodin = HODIN_ZMENY): string {
  if (zmena === 0) return `Za ${hodin} h beze změny`;
  return `${zmena > 0 ? 'Stoupá' : 'Klesá'} o ${Math.abs(zmena)} cm za ${hodin} h`;
}

/** Šipka vedle čísla. Trojúhelníky, ne písmena — čtou se na dálku. */
export function smerZmeny(zmena: number): '▲' | '▼' | '–' {
  return zmena > 0 ? '▲' : zmena < 0 ? '▼' : '–';
}

export const nactiVodocet = () => nacti<Vodocet>('/vodocet/orlik');
