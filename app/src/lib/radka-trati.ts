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
import type { components } from '@/lib/schema';

type S = components['schemas'];

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

/**
 * <b>Osa ukazuje značky, ne průjezdy</b> (rozhodnutí 3, došly k němu tři
 * obory nezávisle).
 *
 * <para>
 * Dvoukolová trať se v modelu zapisuje <b>opakováním prvku</b>, takže na
 * jednu bóji vyjdou dva řádky — a *Přesunout sem* na jednom z nich sáhne
 * na kus plastu, který je ve vodě jeden. Stavy na řádce jsou přitom
 * vlastnosti <b>bóje</b>: jedna bóje nemůže mít fotku na druhém řádku
 * a nemít ji na prvním. Na maratonu, kde se krouží do konce závodu, by
 * těch řádků na jednu bóji byly desítky.
 * </para>
 */
export type KonecProRadku = {
  id: number;
  nazev: string;
  sirka: number;
  delka: number;
  barva?: S['BarvaBoje'];
  tvar?: S['TvarBoje'];
  znaceni?: S['DruhZnaceni'];
  /** `Telefon`, `Mapa`, `Qr`. Z mapy znamená „jeď tam a pípni". */
  zdroj: string;
  fotek: number;
};

export type PrvekProRadku = {
  /** Id prvku. Akce detailu míří na prvek, ne na bóji. */
  id?: number;
  poradi: number;
  typ: string;
  strana?: string | null;
  a: KonecProRadku;
  b?: KonecProRadku | null;
};

export type ZnackaNaOse = {
  boje: KonecProRadku;
  /** Kolikrát se po té značce jede. Jedna je běžná, víc dělá `2×`. */
  prujezdu: number;
  /** Předpisy v pořadí jetí. Víc různých znamená, že se liší bok. */
  predpisy: string[];
  /** Stojí v prvku, kterému chybí druhý konec. */
  chybiDruhyKonec: boolean;
  /**
   * Prvky, ve kterých ta značka stojí, v pořadí jetí.
   *
   * <b>Akce detailu míří na prvek, ne na značku</b> — smazat a přerovnat
   * se dá prvek. U značky, po které se jede víckrát, je jich víc, a
   * právě proto se u ní obojí nenabízí: dotaz „který průjezd" patří
   * kamkoliv, jen ne na nejnevratnější terč obrazovky.
   */
  prvky: PrvekProRadku[];
};

/**
 * Má ten typ dva konce? <b>Opsáno ze serveru</b>
 * (`PrvekTrati.Dvoukonec`: *„typ is not (OtocnaBoje or PrujezdniBoje)"*),
 * i s tím, že je to pravidlo negativní — nový typ je dvoukoncový, dokud
 * se neřekne jinak.
 */
export function dvoukonec(typ: string): boolean {
  return typ !== 'OtocnaBoje' && typ !== 'PrujezdniBoje';
}

/** Jak se ten průjezd jede, slovy. Jména podle nálezů J7 a J8. */
export function predpisPrvku(typ: string, strana?: string | null): string {
  const bok = strana === 'PoLeve' ? 'levoboku' : strana === 'PoPrave' ? 'pravoboku' : null;
  switch (typ) {
    case 'OtocnaBoje':
    case 'Odskok':
      // Ne „otočit levobokem": ponechat znak po levoboku znamená točit
      // doprava, a rozhodčí ani směrnice neříkají, kam se točí.
      return bok ? `ponechat po ${bok}` : 'otočná';
    case 'PrujezdniBoje':
      return bok ? `nechat po ${bok}` : 'průjezdní';
    case 'Brana':
      return 'projet mezi nimi';
    case 'OtocnaBrana':
      return 'projet a otočit se';
    case 'OtocnaZona':
      // Dotek z trasy nikdo neposoudí; ze směrnice je „otočit se za linií".
      return 'otočit se za linií';
    case 'Start':
      return 'start';
    case 'Cil':
      return 'cíl';
    default:
      return typ;
  }
}

export function znackyZTrati(prvky: PrvekProRadku[]): ZnackaNaOse[] {
  const poradi: number[] = [];
  const podleId = new Map<number, ZnackaNaOse>();

  const pridej = (
    boje: KonecProRadku,
    predpis: string,
    chybiKonec: boolean,
    prvek: PrvekProRadku,
  ) => {
    let z = podleId.get(boje.id);
    if (!z) {
      z = { boje, prujezdu: 0, predpisy: [], chybiDruhyKonec: false, prvky: [] };
      podleId.set(boje.id, z);
      poradi.push(boje.id);
    }
    z.prujezdu += 1;
    z.predpisy.push(predpis);
    z.prvky.push(prvek);
    if (chybiKonec) z.chybiDruhyKonec = true;
  };

  for (const p of [...prvky].sort((x, y) => x.poradi - y.poradi)) {
    const predpis = predpisPrvku(p.typ, p.strana);
    const chybiKonec = dvoukonec(p.typ) && !p.b;
    pridej(p.a, predpis, chybiKonec, p);
    if (p.b) pridej(p.b, predpis, false, p);
  }

  return poradi.map((id) => podleId.get(id)!);
}

/**
 * Druhá řádka: <b>ne předpis, ale rozdíl mezi průjezdy</b>.
 *
 * <para>
 * Předpis patří k <b>průjezdu</b>, kdežto řádka je po rozhodnutí 3 jedna
 * na <b>značku</b> — a značka se po obrátce může na zpáteční cestě jet
 * opačnou stranou (Filip, 21. 11. 2026; model s tím počítá, `Strana`
 * sedí na prvku). Jeden vypsaný předpis by tedy o druhém průjezdu lhal,
 * a je to právě ta řádka, která se porovnává s textem plachetní
 * směrnice.
 * </para>
 *
 * <para>
 * Shodné průjezdy se slévají do jednoho předpisu, různé se spojí slovem
 * <i>pak</i>. Jednotlivé průjezdy i s předpisy patří do detailu.
 * </para>
 */
export function predpisRadky(predpisy: string[]): string | null {
  const ruzne = predpisy.filter((p, i) => i === 0 || p !== predpisy[i - 1]);
  if (ruzne.length === 0) return null;
  if (ruzne.length === 1) return ruzne[0];

  // <b>Druhý průjezd se píše jen tím, čím se liší.</b> Celé
  // „ponechat po levoboku, pak ponechat po pravoboku" má 44 znaků
  // a na řádce se useklo (ověřeno v simulátoru 21. 11. 2026) — přitom
  // opakovat „ponechat" nic nepřidává.
  //
  // Ořezává se <b>po celých slovech</b> (jinak by z „pravoboku" zbylo
  // „oku") a <b>aspoň dvě slova zůstanou</b>: samotné „pak pravoboku"
  // je bez předložky skřípavé a ušetří jediné písmeno.
  const slova = ruzne.map((p) => p.split(' '));
  let spolecnych = 0;
  while (slova.every((x) => x.length > spolecnych + 2 && x[spolecnych] === slova[0][spolecnych]))
    spolecnych += 1;

  return [
    ruzne[0],
    ...slova.slice(1).map((x) => x.slice(spolecnych).join(' ')),
  ].join(', pak ');
}
