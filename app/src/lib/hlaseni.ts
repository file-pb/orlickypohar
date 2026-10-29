/**
 * Co appka u startu řekne a kdy zatroubí — partitura, ne přehrávač.
 *
 * <b>Appka je pomocník rozhodčího, dirigent</b> (Filip, 29. 10. 2026): drží
 * takt, zatímco rozhodčí dělá to své. Neurčuje, co platí — to dělá vizuální
 * znamení podle ZPJ 26 (*„Časy musejí být brány podle vizuálních znamení; na
 * nepřítomnost zvukového znamení nesmí být brán zřetel."*) a u poháru
 * plachetní směrnice, která si zvukovou signalizaci vyhlašuje zvlášť.
 *
 * <b>Proto je to tabulka, ne natvrdo zapsaný sled.</b> Směrnice dnes vypisuje
 * jediný zvuk — *„Zrušení rozjížďky: dva dlouhé zvuky"* — a ten se od ZPJ
 * (tři zvuky u vlajky N) liší. Co se troubí, je tedy vlastnost regaty a musí
 * jít změnit, aniž by se sahalo do appky.
 *
 * Pravidla zvlášť od přehrávání: tahle část se dá ověřit bez telefonu
 * i bez reproduktoru (`app/testy/hlaseni.test.ts`).
 */

import { MINUTA_S, PRIPRAVNE_S, PROCEDURA_S } from './start';

/** Jak se troubí. Délky drží přehrávač, tady je jen druh. */
export type Troubeni = 'kratce' | 'dlouze';

/** Jedna věc, která se má stát v určitý čas před startem. */
export type Znameni = {
  /** Kolik vteřin před startovním znamením; 0 je start. */
  vterinDoStartu: number;
  /** Co se řekne nahlas. Prázdné znamená „jen zatroubit". */
  rekni: string;
  /** Čím se zatroubí, nebo `null`, když se jen mluví. */
  troubi: Troubeni | null;
};

/**
 * Odpočet, který hlas odříká před každým znamením.
 *
 * <b>Začíná pět vteřin předem a končí přesně na znamení</b> — „za pět,
 * čtyři, tři, dva, jedna" a v tu vteřinu klakson. Posádky tak vědí, že
 * znamení přichází, a nepřekvapí je.
 */
export const ODPOCET_S = 5;

/** Co se řekne pět vteřin před znamením. */
function odpocetPred(co: string): string {
  return `${co} za pět, čtyři, tři, dva, jedna`;
}

/** „Pět minut do startu, opakuji, pět minut do startu." */
function opakovane(veta: string): string {
  return `${veta}, opakuji, ${veta}`;
}

/** Minuty slovem; hlas čte číslici jinak než slovo a na vodě se to plete. */
function minut(kolik: number): string {
  const slovem: Record<number, string> = {
    1: 'Jedna minuta',
    2: 'Dvě minuty',
    3: 'Tři minuty',
    4: 'Čtyři minuty',
    5: 'Pět minut',
    6: 'Šest minut',
    10: 'Deset minut',
  };
  return slovem[kolik] ?? `${kolik} minut`;
}

/**
 * Celá partitura startovní procedury, od zahájení po start.
 *
 * Vrací znamení seřazená od nejranějšího; `vterinDoStartu` klesá k nule.
 * Délka procedury je vlastnost regaty (ZPJ 26 má u vyzývacího znamení
 * hvězdičku), ostatní okamžiky jsou pravidlem přibité ke startu.
 */
export function partitura(delkaS: number = PROCEDURA_S): Znameni[] {
  const znameni: Znameni[] = [];

  const pridej = (vterin: number, veta: string, troubi: Troubeni) => {
    // Hlášený odpočet se vejde jen tam, kde před znamením je volno.
    znameni.push({
      vterinDoStartu: vterin + ODPOCET_S,
      rekni: odpocetPred(veta),
      troubi: null,
    });
    znameni.push({ vterinDoStartu: vterin, rekni: '', troubi });
  };

  // Vyzývací znamení. Začátek procedury — jediný okamžik, který se posouvá
  // s délkou; proto se do odpočtu hlásí jako „startovní procedura", ne
  // jako konkrétní počet minut.
  pridej(delkaS, 'Budeme zahajovat startovní proceduru', 'kratce');
  znameni.push({
    vterinDoStartu: delkaS,
    rekni: opakovane(`${minut(Math.round(delkaS / 60))} do startu`),
    troubi: null,
  });

  // Přípravné znamení, čtyři minuty před startem. U procedury kratší než
  // čtyři minuty by padlo dřív než vyzývací, takže odpadá.
  if (delkaS > PRIPRAVNE_S) {
    pridej(PRIPRAVNE_S, 'Přípravné znamení', 'kratce');
    znameni.push({
      vterinDoStartu: PRIPRAVNE_S,
      rekni: opakovane(`${minut(PRIPRAVNE_S / 60)} do startu`),
      troubi: null,
    });
  }

  // Jedna minuta. Jediné znamení, které se podle ZPJ troubí dlouze —
  // přípravná vlajka jde dolů a od téhle chvíle platí minutové pravidlo.
  if (delkaS > MINUTA_S) {
    pridej(MINUTA_S, 'Jedna minuta', 'dlouze');
    znameni.push({
      vterinDoStartu: MINUTA_S,
      rekni: opakovane('Jedna minuta do startu'),
      troubi: null,
    });
  }

  // Startovní znamení.
  pridej(0, 'Start', 'kratce');
  znameni.push({ vterinDoStartu: 0, rekni: 'Start', troubi: null });

  return znameni.sort((a, b) => b.vterinDoStartu - a.vterinDoStartu);
}

/**
 * Co se má přehrát mezi dvěma tiky hodin.
 *
 * <b>Okno, ne rovnost.</b> Tik nepřijde přesně na vteřinu a appka může být
 * chvíli na pozadí; porovnání na rovnost by znamení tiše přeskočilo. Vrací
 * se tedy vše, co leží v (`doStartuPredchozi`, `doStartuTed`] — a pokud
 * appka prospala víc, dostane je všechna najednou a přehrávač si vybere.
 */
export function coPrehrat(
  doStartuPredchoziS: number,
  doStartuTedS: number,
  delkaS: number = PROCEDURA_S,
): Znameni[] {
  return partitura(delkaS).filter(
    (z) => z.vterinDoStartu <= doStartuPredchoziS && z.vterinDoStartu > doStartuTedS,
  );
}
