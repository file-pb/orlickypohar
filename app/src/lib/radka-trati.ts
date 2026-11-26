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
  /** Kolikrát se po té značce jede. Promítá se do předpisu řádky. */
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

/**
 * Jak se kolem té značky jede, slovy — <b>z pohledu lodi</b>.
 *
 * <b>Sloveso musí říct, jestli se značka obeplouvá, nebo jen míjí</b>
 * (Filip, 26. 11. 2026: *„piš to z pohledu, jak to jede loď, tedy i jak
 * se objíždí nebo obeplouvá"*). Do té doby tu stálo *„ponechat po
 * levoboku"* u otočné a *„nechat po levoboku"* u průjezdní — rozdíl
 * jediného písmene mezi značkou, kolem které se točí, a značkou, kterou
 * se projede. Na vodě to nerozezná nikdo.
 *
 * <b>Bok zůstává, směr otáčení ne.</b> Nálezy J7 a J8 z konzilia: ponechat
 * znak po levoboku znamená točit doprava, a rozhodčí ani směrnice
 * neříkají, kam se točí. *„Obeplout po levoboku"* mluví o straně, ne
 * o směru, takže to pravidlo neporušuje.
 */
export function predpisPrvku(typ: string, strana?: string | null): string {
  const bok = strana === 'PoLeve' ? 'levoboku' : strana === 'PoPrave' ? 'pravoboku' : null;
  switch (typ) {
    case 'OtocnaBoje':
    case 'Odskok':
      return bok ? `obeplout po ${bok}` : 'obeplout';
    case 'PrujezdniBoje':
      return bok ? `minout po ${bok}` : 'minout';
    case 'Brana':
      return 'projet bránou';
    case 'OtocnaBrana':
      return 'projet bránou a obeplout';
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
 * Druhá řádka: <b>celá cesta kolem té značky, v pořadí, jak se jede</b>.
 *
 * <para>
 * <b>Opakování se píše větou, ne značkou `2×`</b> (Filip, 26. 11. 2026:
 * *„nepoužívej to 2×, to je matoucí"*). `2×` stávalo u jména a mohlo
 * znamenat dvě bóje stejně dobře jako dva průjezdy; *„podruhé po
 * pravoboku"* říká totéž tak, jak to loď jede.
 * </para>
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
 * <b>Maraton nemá číslo</b>: jede velké kolo a uvnitř opakovaně menší
 * okruh až do konce závodu (plán, 11. 10. 2026), takže kolikrát se kolem
 * značky pojede, se dopředu neví. Proto `porad` — vyjmenovat jde jen
 * konečné opakování.
 * </para>
 */
const RADY = ['', 'podruhé', 'potřetí', 'počtvrté', 'popáté', 'pošesté'];

export function predpisRadky(predpisy: string[], porad = false): string | null {
  if (predpisy.length === 0) return null;
  const ruzne = predpisy.filter((p, i) => i === 0 || p !== predpisy[i - 1]);

  // Pokaždé stejně. Mlčet o opakování nejde — na řádce je značka jedna
  // a kolikrát se po ní jede, z ní jinak nepoznáš.
  if (ruzne.length === 1) {
    if (porad) return `${ruzne[0]}, a tak pokaždé`;
    if (predpisy.length === 2) return `${ruzne[0]}, podruhé stejně`;
    if (predpisy.length > 2) return `${ruzne[0]}, a tak pokaždé`;
    return ruzne[0];
  }

  // <b>Další průjezd se píše jen tím, čím se liší.</b> Celé
  // „obeplout po levoboku, podruhé obeplout po pravoboku" se na řádce
  // usekne (měřeno 21. 11. 2026 na starším znění) — a opakovat sloveso
  // nic nepřidává, platí pro oba průjezdy stejně.
  //
  // Ořezává se <b>po celých slovech</b> (jinak by z „pravoboku" zbylo
  // „oku") a <b>aspoň dvě slova zůstanou</b>: samotné „podruhé pravoboku"
  // je bez předložky skřípavé a ušetří jediné písmeno.
  const slova = ruzne.map((p) => p.split(' '));
  let spolecnych = 0;
  while (slova.every((x) => x.length > spolecnych + 2 && x[spolecnych] === slova[0][spolecnych]))
    spolecnych += 1;

  const dalsi = slova
    .slice(1)
    .map((x, i) => `${RADY[i + 1] ?? 'pak'} ${x.slice(spolecnych).join(' ')}`);

  return [ruzne[0], ...dalsi].join(', ');
}
