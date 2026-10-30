/**
 * Co appka u startu řekne a kdy zatroubí — partitura, ne přehrávač.
 *
 * <b>Appka je pomocník rozhodčího, dirigent</b> (Filip, 29. 10. 2026): drží
 * takt, zatímco rozhodčí dělá to své. Neurčuje, co platí — to dělá vizuální
 * znamení podle ZPJ 26 (*„Časy musejí být brány podle vizuálních znamení; na
 * nepřítomnost zvukového znamení nesmí být brán zřetel."*) a u poháru
 * plachetní směrnice, která si zvukovou signalizaci vyhlašuje zvlášť.
 *
 * <b>Houká s rozhodčím, ne místo něj</b> (Filip tamtéž: *„Houkat musí Miloš
 * stejně, ale telefon bude houkat s ním. Díky tomu se nemusí koukat na
 * displej, protože uslyší dirigenta, co má dělat."*). Hlášený odpočet je
 * proto <b>signál pro rozhodčího, kdy zmáčknout houkačku</b> — hlášení po
 * něm slyší posádky jako vedlejší účinek, ne jako hlavní účel. Odtud plyne
 * i délka <see cref="ODPOCET_S"/>: musí stačit na reakci ruky, ne jen na
 * přečtení věty.
 *
 * <b>Proto je to tabulka, ne natvrdo zapsaný sled.</b> Směrnice dnes vypisuje
 * jediný zvuk — *„Zrušení rozjížďky: dva dlouhé zvuky"* — a ten se od ZPJ
 * (tři zvuky u vlajky N) liší. Co se troubí, je tedy vlastnost regaty a musí
 * jít změnit, aniž by se sahalo do appky.
 *
 * Pravidla zvlášť od přehrávání: tahle část se dá ověřit bez telefonu
 * i bez reproduktoru (`app/testy/hlaseni.test.ts`).
 */

import { MINUTA_S, PO_STARTU_NERUSIT_S, PRIPRAVNE_S, PROCEDURA_S } from './start';

/** Jak se troubí. */
export type Troubeni = 'kratce' | 'dlouze';

/**
 * Jak dlouho který klakson troubí, v milisekundách.
 *
 * <b>Musí sedět se zvuky v `assets/zvuky/`</b>, protože hlášení po
 * troubení čeká přesně tuhle dobu — kratší číslo pustí větu pod klakson,
 * kde ji nikdo neuslyší. Hlídá to `app/testy/zvuky.test.ts`, který čte
 * délku rovnou ze souborů.
 */
export const DELKA_TROUBENI_MS: Record<Troubeni, number> = {
  kratce: 1720,
  dlouze: 4120,
};

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
 * <b>Začíná pět vteřin předem a končí přesně na znamení</b> — „pět,
 * čtyři, tři, dva, jedna" a v tu vteřinu klakson.
 *
 * <b>Pět vteřin je minimum, ne ozdoba:</b> rozhodčí podle toho mačká
 * houkačku a ruka potřebuje čas na reakci. Kratší odpočet by ho nechal
 * zatroubit pozdě, delší by odvedl pozornost od vody.
 */
export const ODPOCET_S = 5;

/**
 * Číslovky odpočtu, každá na svou vteřinu.
 *
 * <b>Pět samostatných hlášení, ne jedna věta.</b> Jedna věta se pustí
 * pět vteřin předem a dozní, kdy dozní — podle toho, jak rychle telefon
 * mluví. Takhle padne každé číslo na svou vteřinu a poslední z nich na
 * tu, po které se troubí. To je rozdíl mezi metronomem a odhadem.
 */
const CISLOVKY = ['pět', 'čtyři', 'tři', 'dva', 'jedna'];

/**
 * Jak dlouho před znamením se ohlásí, co přijde a jakým tónem.
 *
 * Filip, 30. 10. 2026: *„jak upozorňuješ, co se bude hlásit, tak tam dodej,
 * když bude tón, tak jaký bude. Tím zajistíš, že Miloš bude vědět, co se
 * hlásí a jakým tónem, a pak 5 4 3 2 1."*
 *
 * <b>Proto je to zvlášť od odpočtu.</b> *„Jedna minuta, dlouhý tón"*
 * a hned nato *„pět, čtyři…"* by se do pěti vteřin nevešlo a odpočet by
 * se opozdil o celou větu. Deset vteřin dá hlasu čas domluvit a rozhodčímu
 * čas chytit houkačku dřív, než začne odpočet.
 */
export const OZNAMENI_S = 10;

/** Jak se v hlášení jmenuje ten který zvuk. */
function jakyTon(troubi: Troubeni): string {
  return troubi === 'dlouze' ? 'dlouhý tón' : 'krátký tón';
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
 * Jak dlouho před zahájením procedury si appka řekne o klid.
 *
 * Minutu (Filip, 29. 10. 2026). Ohlásí, že se přepíná do *Nerušit*, pak
 * že procedura začne — a teprve potom jede partitura. Rozhodčí tak ví,
 * že se telefon chystá ztichnout, a nepřekvapí ho to uprostřed hovoru.
 */
export const PREDEHRA_S = 60;

/** Kdy v předehře padne upozornění, že procedura za chvíli začne. */
export const OHLASENI_ZAHAJENI_S = 30;

/**
 * Celá partitura startovní procedury, od zahájení po start.
 *
 * Vrací znamení seřazená od nejranějšího; `vterinDoStartu` klesá k nule.
 * Délka procedury je vlastnost regaty (ZPJ 26 má u vyzývacího znamení
 * hvězdičku), ostatní okamžiky jsou pravidlem přibité ke startu.
 */
export function partitura(delkaS: number = PROCEDURA_S): Znameni[] {
  const znameni: Znameni[] = [];

  // Předehra: telefon řekne, že se chystá ztichnout, a pak že se začíná.
  // Troubí se v ní schválně nic — procedura ještě neběží a zvuk by
  // posádky poslal ke startu dřív, než má.
  znameni.push({
    vterinDoStartu: delkaS + PREDEHRA_S,
    rekni: 'Přepínám se do režimu Nerušit',
    troubi: null,
  });
  znameni.push({
    vterinDoStartu: delkaS + OHLASENI_ZAHAJENI_S,
    rekni: 'Za třicet vteřin bude zahájena startovní procedura',
    troubi: null,
  });

  const pridej = (vterin: number, veta: string, troubi: Troubeni) => {
    // Nejdřív co a jakým tónem, aby rozhodčí věděl, co bude mačkat…
    znameni.push({
      vterinDoStartu: vterin + OZNAMENI_S,
      rekni: `${veta}, ${jakyTon(troubi)}`,
      troubi: null,
    });
    // …pak odpočet po vteřinách, a na nule zvuk.
    CISLOVKY.forEach((cislovka, i) => {
      znameni.push({
        vterinDoStartu: vterin + CISLOVKY.length - i,
        rekni: cislovka,
        troubi: null,
      });
    });
    znameni.push({ vterinDoStartu: vterin, rekni: '', troubi });
  };

  // Vyzývací znamení. Začátek procedury — jediný okamžik, který se posouvá
  // s délkou; proto se do odpočtu hlásí jako „startovní procedura", ne
  // jako konkrétní počet minut.
  pridej(delkaS, 'Vyzývací znamení', 'kratce');
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

  // Konec okna klidu. Záporný čas znamená „po startu" — a tohle je jediné
  // znamení, které tam leží. Rozhodčí musí vědět, že telefon zase zvoní;
  // tichý návrat do normálu by znamenal, že nepozná zmeškaný hovor od
  // vypnutého telefonu.
  znameni.push({
    vterinDoStartu: -PO_STARTU_NERUSIT_S,
    rekni: 'Vypínám režim Nerušit',
    troubi: null,
  });

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

/**
 * Jak pozdě se znamení ještě smí ozvat.
 *
 * <b>Pozdní hlášení je lež, ne zpoždění.</b> Appka může být na pozadí,
 * telefon uspaný, hovor dlouhý — a po návratu by `coPrehrat` vrátila
 * všechno, co se mezitím mělo říct. Odříkat „pět minut do startu" ve
 * chvíli, kdy zbývají tři, by rozhodčího poslalo zatroubit do prázdna.
 *
 * Tři vteřiny jsou tolerance na tik hodin a na rozjezd přehrávače, ne
 * lhůta na doběhnutí: co propadlo víc, propadlo.
 */
export const NEJVIC_POZDE_S = 3;

/** Smí se tohle znamení ozvat, když do startu zbývá `doStartuTedS`? */
export function stiha(
  z: Znameni,
  doStartuTedS: number,
  nejvicPozdeS: number = NEJVIC_POZDE_S,
): boolean {
  return z.vterinDoStartu - doStartuTedS <= nejvicPozdeS;
}

/**
 * Co se má doopravdy ozvat mezi dvěma tiky — `coPrehrat` prosité časem.
 *
 * Vrací znamení <b>jednoho okamžiku</b>: toho nejpozdějšího, který ještě
 * stíhá. Když se appka vrátí z pozadí doprostřed procedury, platí to, co
 * platí teď — dohánět propadlá hlášení by rozhodčího poslalo troubit do
 * prázdna.
 *
 * <b>Jeden okamžik, ne jedno znamení,</b> a není to detail: v pátou minutu
 * i na startu má partitura dvě věci zároveň — klakson a větu. Vrátit jen
 * jednu by znamenalo, že se při běžném tiku buď netroubí, nebo nemluví.
 */
export function coOkamzik(
  doStartuPredchoziS: number,
  doStartuTedS: number,
  delkaS: number = PROCEDURA_S,
): Znameni[] {
  const stihaji = coPrehrat(doStartuPredchoziS, doStartuTedS, delkaS).filter((z) =>
    stiha(z, doStartuTedS),
  );
  if (stihaji.length === 0) return [];
  // `coPrehrat` řadí od nejranějšího; poslední je ten nejbližší teď.
  const kdy = stihaji[stihaji.length - 1].vterinDoStartu;
  return stihaji.filter((z) => z.vterinDoStartu === kdy);
}
