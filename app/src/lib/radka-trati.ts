/**
 * Co stojí v pravém sloupci řádky trati — <b>jedno slovo, nebo nic</b>.
 *
 * <b>Rozhodnutí 2 druhého konzilia (21. 11. 2026).</b> Dnešní maketa dává
 * zelenou fajfku všem řádkám, tedy nejčastějšímu stavu nejvíc inkoustu.
 * Tady je to obráceně: stav, u kterého je všechno v pořádku, **mlčí**.
 *
 * <para>
 * <b>Pořadí neplyne ze závažnosti, ale z toho, co každý stav dovoluje.</b>
 * Zamčená trať nedovolí nic, takže přebíjí všechno ostatní — oznamovat
 * u ní chybějící fotku znamená poslat stavitele k úkonu, který mu server
 * odmítne. Fronta je další: dokud prvek nedošel na server, nemá serverová
 * čísla a fotka ani přesun u něj nejsou (rozhodnutí 7). Teprve pak jdou
 * stavy, se kterými se dá něco dělat, a mezi nimi je dřív ten, který brání
 * dokončení trati, než ten, který jen chybí k dokladu.
 * </para>
 *
 * <para>
 * <b>Pravidla jsou oddělená od vykreslování schválně.</b> Je to jediná
 * věc na té obrazovce, která se dá rozhodnout bez telefonu, takže má
 * testy (`app/testy/radka-trati.test.ts`).
 * </para>
 */
export type StavRadky =
  | 'čeká na odemčení'
  | 'čeká'
  | 'chybí druhý konec'
  | 'z plánu'
  | 'chybí fotka'
  | null;

export type VstupRadky = {
  /** Trať je přijatá rozhodčím. Nedovolí žádný úkon, takže přebíjí vše. */
  zamceno: boolean;
  /** Prvek čeká ve frontě, na server ještě nedošel. */
  veFronte: boolean;
  /** Dvoubodový prvek má jen jeden konec — trať s ním nejde dohlásit. */
  chybiDruhyKonec: boolean;
  /** Poloha je odečtená z mapy, ne změřená u bóje. Je to práce: jeď a pípni. */
  zPlanu: boolean;
  /** U značky není ani jedna fotka. */
  bezFotky: boolean;
};

export function stavRadky(v: VstupRadky): StavRadky {
  if (v.zamceno) return 'čeká na odemčení';
  if (v.veFronte) return 'čeká';
  if (v.chybiDruhyKonec) return 'chybí druhý konec';
  if (v.zPlanu) return 'z plánu';
  if (v.bezFotky) return 'chybí fotka';
  return null;
}

/**
 * Značka, po které se jede víckrát, nese <b>`2×` u jména</b>, nikdy ve
 * sloupci stavu: opakování je vlastnost prvků, ne bóje, a sloupec stavu
 * mluví o bóji.
 *
 * <para>
 * <b>Maraton nemá číslo.</b> Jede velké kolo a uvnitř opakovaně menší
 * okruh až do konce závodu (plán, 11. 10. 2026), takže kolikrát se kolem
 * té značky pojede, se dopředu neví. Vyjmenovat jde jen konečné
 * opakování; pro to druhé je tu `pořád`.
 * </para>
 */
export function opakovaniUJmena(kolikrat: number | 'porad'): string | null {
  if (kolikrat === 'porad') return 'pořád';
  return kolikrat > 1 ? `${kolikrat}×` : null;
}
