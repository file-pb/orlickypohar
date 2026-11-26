/**
 * Co appka nabídne tomu, kdo ji právě zapnul.
 *
 * <b>Odpověď na otázku „co teď budeš dělat", ne menu.</b> Menu vyjmenovává,
 * co appka umí; rozcestník nabízí to, co tenhle člověk dnes dělat může, a
 * zbytek neukazuje vůbec. Filip, 29. 10. 2026: *„rozhraní podle toho, kdo
 * ji zapíná, aby tam nebyl ten současnej pelmel."*
 *
 * <b>Pravidla zvlášť od vykreslování</b>, jako u rolí a u nabídky — tohle
 * se dá ověřit bez telefonu (`app/testy/rozcestnik.test.ts`). Rozvaha, ze
 * které to vzniklo, je v `docs/ROZCESTNIK.md`.
 *
 * <b>Nic se tu nepočítá znovu.</b> Kdo kde velí a kde smí stavět, rozhoduje
 * `lib/role.ts`; tenhle soubor z toho dělá dlaždice. Platí dál, že obrazovka
 * smí být přísnější než server, nikdy volnější — rozhoduje server u každé
 * cesty.
 */
import type { Ja } from './api';
import { kdeStavi, kdeVeli, veliNekde } from './role';

/** Čím se dlaždice pozná v testu i v `key`. */
export type KlicDlazdice = 'velim' | 'stavim' | 'zavod' | 'sledovani';

export type Dlazdice = {
  klic: KlicDlazdice;
  nazev: string;
  /** Řádek pod jménem. Zatím popis, ne stav — viz poznámka u `dlazdice`. */
  kontext: string;
  cil: string;
  /** Ta, kvůli které člověk dnes appku zapnul. Nejvýš jedna. */
  hlavni: boolean;
};

/**
 * Co appka o tom člověku ví, když kreslí rozcestník.
 *
 * `dnes` je odpověď `GET /lod/dnes` okleštěná na to, co rozcestník
 * potřebuje. Je `null` ve dvou případech, které se schválně nerozlišují:
 * telefon nemá klíč k lodi, nebo dnes loď nikde nejede.
 */
export type Stav = {
  ja: Ja | null;
  dnes: { lod: string; cisloPlachty: string | null } | null;
};

/**
 * Dlaždice shora dolů. Prázdné to nikdy není — <b>sledování je podlaha</b>.
 *
 * <b>Sledování je tu vždycky</b> (Filip, 26. 11. 2026: *„vždycky aspoň to
 * sledování zůstane"*). Appka tedy nikdy nekončí u přihlašovací obrazovky:
 * i člověk bez účtu má kam jít. Pro tenhle soubor z toho plyne, že se
 * rozcestník počítá odspodu — sledování vždycky, role nad ním jen
 * přidávají — a že prázdný stav neexistuje a nemusí se kreslit.
 *
 * <b>Velení přebíjí loď</b>, stejně jako v `postava()`: rozhodčí s vlastní
 * plachetnicí přišel k vodě velet, a kdyby byl nahoře závod, hledal by
 * start pod ním.
 *
 * <b>Kontext je zatím popis, ne stav.</b> „5 prvků stojí, dvěma chybí
 * fotka" by se musel vzít z kalendáře a ze stavby, a to je dotaz navíc na
 * obrazovce, která se otevírá jako první. Dokud se nepřidá, stojí tu, co
 * se za tou dlaždicí dělá. Jediná výjimka je *Jedu závod*: jméno lodi
 * a číslo plachty už v odpovědi `/lod/dnes` jsou.
 */
export function dlazdice({ ja, dnes }: Stav): Dlazdice[] {
  const d: Omit<Dlazdice, 'hlavni'>[] = [];

  if (veliNekde(ja)) {
    const kde = kdeVeli(ja)!;
    d.push({
      klic: 'velim',
      nazev: 'Velím regatě',
      kontext: kde.zavod ? 'start, cíl, rozjížďky' : 'vyber regatu, které velíš',
      cil: kde.zavod ? `/serie/${kde.serie}/zavody/${kde.zavod}` : `/serie/${kde.serie}`,
    });
  }

  // Stavba má tytéž tři případy jako v nabídce pod kebabem: zastávka,
  // ročník bez zastávky, a správce webu bez ročníku. Vybrat za člověka
  // první regatu ročníku by znamenalo pípat do cizí.
  const stavi = kdeStavi(ja);
  if (stavi) {
    d.push({
      klic: 'stavim',
      nazev: 'Stavím trať',
      kontext: stavi.zavod
        ? 'pípni značky z lodi'
        : stavi.serie
          ? 'vyber regatu, kde stavíš'
          : 'vyber ročník a regatu',
      cil:
        stavi.serie && stavi.zavod
          ? `/serie/${stavi.serie}/zavody/${stavi.zavod}/stavba`
          : stavi.serie
            ? `/serie/${stavi.serie}/stavba`
            : '/rocniky',
    });
  }

  // <b>Závod se nabízí podle dnešního dne, ne podle vlastnictví lodi.</b>
  // Rozcestník odpovídá na „co teď", a majitel, jehož loď dnes nikde
  // nejede, tam nemá co dělat — jeho lodě zůstávají pod kebabem.
  if (dnes) {
    d.push({
      klic: 'zavod',
      nazev: 'Jedu závod',
      kontext: [dnes.lod, dnes.cisloPlachty].filter(Boolean).join(' · '),
      cil: '/zavodnik',
    });
  }

  d.push({
    klic: 'sledovani',
    nazev: 'Sledování',
    kontext: 'kalendář, výsledky, pořadí seriálu',
    cil: '/rocniky',
  });

  // <b>Zvýrazněná je vždycky jen jedna</b>, a jen když je z čeho vybírat:
  // nad jedinou dlaždicí by zvýraznění nic neodlišovalo. Sledování se
  // nezvýrazňuje nikdy — je to podlaha, ne důvod, proč někdo appku zapnul.
  return d.map((x, i) => ({ ...x, hlavni: i === 0 && d.length > 1 && x.klic !== 'sledovani' }));
}

/**
 * Kam appka otevře rovnou, místo aby rozcestník kreslila — nebo `null`,
 * když se má ukázat.
 *
 * <b>Pravidlo jediné možnosti</b> (Filip, 26. 11. 2026: *„v okamžiku, kdy
 * to bude jenom závodník, tak vlastně ani nepotřebuje zobrazovat ten
 * rozcestník"*). Rozcestí se kreslí jen tomu, kdo má z čeho vybírat.
 *
 * <b>Sledování se do toho počítání nebere.</b> Je to podlaha, kterou má
 * každý, takže by s ním měl dvě položky i závodník, který má ve skutečnosti
 * jednu věc na práci. Rozhoduje počet dlaždic <b>nad</b> podlahou: žádná →
 * jde se na sledování, jedna → rovnou na ni, dvě a víc → rozcestník.
 *
 * <b>Volá se až tehdy, když se role doopravdy přečetly.</b> Kdyby se
 * zavolalo nad neznámým stavem, poslalo by to rozhodčího bez signálu na
 * sledování — a vypadalo by to, že mu appka sebrala půlku funkcí. Hlídá to
 * obrazovka (`app/src/app/index.tsx`), ne tahle funkce: ta o tom, jestli
 * jsou data jistá, neví nic.
 */
export function kamRovnou(d: Dlazdice[]): string | null {
  const nadPodlahou = d.filter((x) => x.klic !== 'sledovani');
  if (nadPodlahou.length === 0) return d[0]?.cil ?? '/rocniky';
  if (nadPodlahou.length === 1) return nadPodlahou[0].cil;
  return null;
}
