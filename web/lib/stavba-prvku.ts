import type { BarvaBoje, DruhZnaceni, TvarBoje } from "@/lib/boje";
import type { StranaPrvku, SvetovaStrana, TypPrvku } from "@/lib/trat";

/**
 * Pravidla průvodce stavbou prvku.
 *
 * <b>Zadání (Filip, 10. 10. 2026):</b> *„Stavitel bude potřebovat kliknout
 * na typ prvku, dostat se do obrazovky pro daný typ a tam to jen pípnout,
 * zvolit atributy, popojet, pípnout atd."* Jednotkou práce na vodě je
 * **prvek, ne bóje** — stavitel nemyslí „pokládám bóji 1 a bóji 2", ale
 * „pokládám start".
 *
 * <para>
 * <b>Typ neříká, čím prvek je — říká, kolik bodů se pípá</b> (Filip,
 * 10. 10. 2026). Otočná a průjezdní se sdružily do *jedné značky*, brána
 * a otočná linie do *dvou značek*; rozhodne se to až předpisem, který je
 * větou z vody, ne jménem z databáze.
 * </para>
 *
 * <para>
 * <b>Čistý modul bez Reactu a DOM, a to schválně</b> (Filip tamtéž:
 * *„tohle bude muset být vyladěný průvodce i do appky"*). Appka je
 * React Native, takže z webové obrazovky se tam nepřenese nic — ale
 * tohle ano. Co sem patří: kolik bodů který typ potřebuje, jak se
 * pojmenují, jaké předpisy dávají smysl a co z nich plyne pro uložení.
 * Co sem nepatří: cokoliv, co ví o tlačítku nebo o `navigator`.
 * </para>
 *
 * <para>
 * Až appka začne zapisovat, přestěhuje se tenhle soubor do balíčku
 * sdíleného oběma klienty, jako dnes `schema.d.ts`. Do té doby je tady
 * a **nesmí se do něj dostat nic webového**, jinak ta cesta zmizí.
 * </para>
 */

/** Který krok průvodce zrovna běží. */
export type Krok = "typ" | "jak" | "body" | "hotovo";

/** Jak se stopa lodi nakreslí v náhledu. Kreslí to obrazovka, rozhoduje tohle. */
export type Stopa =
  | "otoc"
  | "mine"
  | "mezi"
  | "branaOtocna"
  | "dotek"
  | "startSipka"
  | "cilSipka";

/** Jeden bod, který se u daného typu pípá. */
export type Bod = {
  /** Co se na obrazovce řekne staviteli. */
  vyzva: string;
  /** Jméno, pod kterým značka vznikne. Stavitel nic nepíše. */
  jmeno: (poradi: number) => string;
};

/**
 * Předpis: věta z vody, která teprve rozhodne, čím prvek je.
 *
 * <b>Tady se sdružení rozplétá.</b> „Otočit levobokem" uloží otočnou
 * bóji, „nechat po levoboku" průjezdní — stavitel přitom nevybral ani
 * jedno jméno, jen řekl, jak se to jede.
 */
export type Volba = {
  jmeno: string;
  detail: string;
  /** Co se doopravdy uloží. */
  typ: NonNullable<TypPrvku>;
  /** Strana, pokud ji ten typ nese. U bran je vždycky `null` — volí ji loď. */
  strana: StranaPrvku;
  stopa: Stopa;
  /** Jak se pojmenují body, když jméno závisí na předpisu. */
  jmena?: ((poradi: number) => string)[];
};

/** Typ v nabídce: kolik bodů se pípá, ne čím prvek je. */
export type TypStavby = {
  id: "Jedna" | "Dve" | "Start" | "Cil" | "Odskok";
  jmeno: string;
  popis: string;
  body: Bod[];
  /** Která sada předpisů se nabídne. */
  jak: "jedna" | "dve" | "start" | "cil";
};

const znacka = (zaklad: string) => (poradi: number) => `${zaklad} ${poradi}`;

/**
 * Nabídka typů. <b>Pět tlačítek místo sedmi</b> — stavitel nemá
 * klasifikovat dřív, než položí.
 *
 * <para>
 * <b>Předpis se volí před pípáním, ne po něm.</b> Plyne to ze sdružení:
 * dokud se neví, jestli se u značky otáčí nebo projíždí, nejde ji
 * pojmenovat — a jméno se po zápisu nepřepisuje, protože záznam značky
 * je měření. Pořadí kroků je tedy: kolik bodů → jak se to jede → pípat.
 * Náhled tím zároveň vede ruku už při prvním pípnutí.
 * </para>
 */
export const TYPY: TypStavby[] = [
  {
    id: "Jedna",
    jmeno: "Jedna značka",
    popis: "otočná, nebo průjezdní — řekneš to v dalším kroku",
    jak: "jedna",
    body: [{ vyzva: "Pípni tu značku", jmeno: znacka("značka") }],
  },
  {
    id: "Dve",
    jmeno: "Dvě značky",
    popis: "brána, nebo otočná linie — řekneš to v dalším kroku",
    jak: "dve",
    body: [
      { vyzva: "Pípni levou značku", jmeno: znacka("značka") },
      { vyzva: "Popojeď a pípni pravou", jmeno: znacka("značka") },
    ],
  },
  {
    id: "Start",
    jmeno: "Start",
    popis: "levobok a pravobok, směr a čím je vytyčený",
    jak: "start",
    body: [
      { vyzva: "Pípni levobok startu", jmeno: () => "start levobok" },
      { vyzva: "Popojeď a pípni pravobok startu", jmeno: () => "start pravobok" },
    ],
  },
  {
    id: "Cil",
    jmeno: "Cíl",
    popis: "levobok a pravobok, směr proplutí",
    jak: "cil",
    body: [
      { vyzva: "Pípni levobok cíle", jmeno: () => "cíl levobok" },
      { vyzva: "Popojeď a pípni pravobok cíle", jmeno: () => "cíl pravobok" },
    ],
  },
  {
    id: "Odskok",
    jmeno: "Odskok",
    popis: "otočná a hned za ní odskoková — jedno místo v řadě",
    jak: "jedna",
    body: [
      { vyzva: "Pípni otočnou", jmeno: znacka("otočná") },
      { vyzva: "Popojeď a pípni odskokovou", jmeno: znacka("odskok") },
    ],
  },
];

/**
 * Předpisy podle toho, kolik bodů prvek má.
 *
 * <para>
 * <b>U brány není strana, ani u té otočné</b> (Filip, 10. 10. 2026:
 * *„stranu, okolo které točí, volí loď — prostě tou branou projede"*).
 * Zapsat ji by znamenalo vydávat rozhodnutí posádky za pravidlo trati.
 * </para>
 */
export const VOLBY: Record<TypStavby["jak"], Volba[]> = {
  jedna: [
    {
      jmeno: "Otočit levobokem",
      detail: "otočná bóje",
      typ: "OtocnaBoje",
      strana: "PoLeve",
      stopa: "otoc",
      jmena: [znacka("otočná")],
    },
    {
      jmeno: "Otočit pravobokem",
      detail: "otočná bóje",
      typ: "OtocnaBoje",
      strana: "PoPrave",
      stopa: "otoc",
      jmena: [znacka("otočná")],
    },
    {
      jmeno: "Nechat po levoboku",
      detail: "jen se míjí, netočí se",
      typ: "PrujezdniBoje",
      strana: "PoLeve",
      stopa: "mine",
      jmena: [znacka("průjezdní")],
    },
    {
      jmeno: "Nechat po pravoboku",
      detail: "jen se míjí, netočí se",
      typ: "PrujezdniBoje",
      strana: "PoPrave",
      stopa: "mine",
      jmena: [znacka("průjezdní")],
    },
  ],
  dve: [
    {
      jmeno: "Projet mezi nimi",
      detail: "brána; projede se a jede dál",
      typ: "Brana",
      strana: null,
      stopa: "mezi",
      jmena: [znacka("brána"), znacka("brána")],
    },
    {
      jmeno: "Projet a otočit se",
      detail: "otočná brána; u které značky se otočí, si vybere loď",
      typ: "OtocnaBrana",
      strana: null,
      stopa: "branaOtocna",
      jmena: [znacka("brána"), znacka("brána")],
    },
    {
      jmeno: "Stačí se jí dotknout",
      detail: "otočná linie — třeba dráty nad vodou",
      typ: "OtocnaZona",
      strana: null,
      stopa: "dotek",
      jmena: [znacka("linie"), znacka("linie")],
    },
  ],
  start: [
    {
      jmeno: "Pevná linie",
      detail: "mezi oběma body se startuje",
      typ: "Start",
      strana: null,
      stopa: "startSipka",
    },
    {
      jmeno: "Otevírající se brána",
      detail: "startovací loď jede po linii startu",
      typ: "Start",
      strana: null,
      stopa: "startSipka",
    },
  ],
  cil: [
    {
      jmeno: "Proplout cílem",
      detail: "opačný průjezd se nepočítá",
      typ: "Cil",
      strana: null,
      stopa: "cilSipka",
    },
  ],
};

/**
 * Jména bodů pro zvolený typ a předpis. <b>Stavitel nepíše nic</b> —
 * jméno plyne z toho, co staví a jak se to jede.
 *
 * <para>
 * U dvoubodových prvků dostane druhý bod „vpravo" a první „vlevo": je to
 * jediné, co je u nich v tu chvíli pravda, a při čtení seznamu to stačí
 * k rozlišení.
 * </para>
 */
export function jmenaBodu(typ: TypStavby, volba: Volba | null, poradi: number): string[] {
  const zaklad = volba?.jmena ?? typ.body.map((b) => b.jmeno);
  const jmena = typ.body.map((_, i) => (zaklad[i] ?? zaklad[0])(poradi));

  if (jmena.length < 2 || typ.id === "Odskok" || typ.id === "Start" || typ.id === "Cil")
    return jmena;

  return [`${jmena[0]} vlevo`, `${jmena[1]} vpravo`];
}

/** Značení: jeden dotyk nese význam, barvu i tvar. */
export type Predvolba = {
  id: NonNullable<DruhZnaceni>;
  skupina: string;
  jmeno: string;
  detail: string;
  /** Barva, kterou předvolba nastaví. `null` u věcí, co nejsou bóje. */
  barva: BarvaBoje;
  /** Tvary, ze kterých jde vybrat. Jeden znamená, že se nevybírá. */
  tvary: NonNullable<TvarBoje>[];
  /** Smí se u téhle předvolby měnit barva? Jen u našich bójí. */
  volnaBarva?: boolean;
};

/**
 * Předvolby značení.
 *
 * <para>
 * <b>Strany plavební dráhy se berou po proudu.</b> Do obrazovky se to ale
 * nepíše (Filip, 10. 10. 2026: *„není tím potřeba zadělat projekt"*) —
 * jsme na řece a platí říční předpis, tím to končí.
 * </para>
 *
 * <para>
 * <b>Plavidlo a objekt na břehu nejsou bóje</b>, takže nemají barvu ani
 * tvar; server je u nich odmítne. Jsou tu proto, aby bod prvku nemusel
 * být bóje — start i cíl mezi lodí a molem.
 * </para>
 */
export const ZNACENI: Predvolba[] = [
  {
    id: "DrahaPrava",
    skupina: "Znak plavební dráhy",
    jmeno: "Pravá strana dráhy",
    detail: "červený válec, nebo červená plovatka",
    barva: "Cervena",
    tvary: ["Valcova", "Plovatka"],
  },
  {
    id: "DrahaLeva",
    skupina: "Znak plavební dráhy",
    jmeno: "Levá strana dráhy",
    detail: "zelený kužel, nebo zelená plovatka",
    barva: "Zelena",
    tvary: ["Kuzelova", "Plovatka"],
  },
  {
    id: "DrahaSport",
    skupina: "Znak plavební dráhy",
    jmeno: "Sport",
    detail: "žlutý válec se sférickým vrškem",
    barva: "Zluta",
    tvary: ["SferickyVrsek"],
  },
  {
    id: "DrahaZakaz",
    skupina: "Znak plavební dráhy",
    jmeno: "Zákaz vplutí",
    detail: "žlutý kužel",
    barva: "Zluta",
    tvary: ["Kuzelova"],
  },
  {
    id: "NaseBoje",
    skupina: "Dáváme ji my",
    jmeno: "Naše bóje",
    detail: "žlutá se sférickým vrškem; barvu i tvar lze změnit",
    barva: "Zluta",
    tvary: ["SferickyVrsek", "Valcova", "Kuzelova", "Kulova", "Plovatka", "Plamenak"],
    volnaBarva: true,
  },
  {
    id: "Plavidlo",
    skupina: "Není to bóje",
    jmeno: "Plavidlo",
    detail: "startovací loď, plavidlo komise",
    barva: null,
    tvary: [],
  },
  {
    id: "ObjektNaBrehu",
    skupina: "Není to bóje",
    jmeno: "Objekt na břehu",
    detail: "molo, dráty nad vodou, značka na skále",
    barva: null,
    tvary: [],
  },
];

/** Předvolba podle jména, nebo `null`. */
export function predvolba(id: DruhZnaceni): Predvolba | null {
  return ZNACENI.find((z) => z.id === id) ?? null;
}

/** Je ta značka bóje? Stejné pravidlo jako `Pipnuti.JeBoje` na serveru. */
export function jeBoje(id: DruhZnaceni): boolean {
  return id !== "Plavidlo" && id !== "ObjektNaBrehu";
}

const SMERY: NonNullable<SvetovaStrana>[] = ["S", "SV", "V", "JV", "J", "JZ", "Z", "SZ"];

/**
 * Azimut spojnice dvou bodů ve stupních od severu.
 *
 * <b>Na délce je potřeba kosinus šířky</b>: stupeň délky je na Orlíku
 * zhruba dvě třetiny stupně šířky, a bez téhle opravy by vycházel
 * azimut stočený k východu. Pro linii dlouhou stovky metrů je rovinná
 * aproximace dost přesná — osm světových stran má krok 45°.
 */
export function azimut(
  a: { sirka: number; delka: number },
  b: { sirka: number; delka: number },
): number {
  const stred = ((a.sirka + b.sirka) / 2) * (Math.PI / 180);
  const x = (b.delka - a.delka) * Math.cos(stred);
  const y = b.sirka - a.sirka;
  const stupnu = (Math.atan2(x, y) * 180) / Math.PI;
  return (stupnu + 360) % 360;
}

/** Nejbližší z osmi světových stran. */
export function nejblizsiStrana(stupnu: number): NonNullable<SvetovaStrana> {
  const a = ((stupnu % 360) + 360) % 360;
  return SMERY[Math.round(a / 45) % 8];
}

/**
 * Dvě strany, kterými se dá linií proplout.
 *
 * <b>Šipka startu i cíle je vždycky kolmá na linii</b> (Filip,
 * 10. 10. 2026), takže to není volba z osmi, ale ze dvou — a žádná třetí
 * možnost se nenabízí, protože by nemohla být správně.
 *
 * <para>
 * Vrací je v pořadí, ve kterém je rozumné je ukázat: první je ta blíž
 * k severu, aby se pořadí tlačítek neměnilo podle toho, kterým směrem
 * se zrovna linie pípla.
 * </para>
 */
export const NEJKRATSI_LINIE_M = 5;

/**
 * Jak daleko od sebe ty dva body jsou, v metrech. Rovinná aproximace —
 * na linii dlouhé desítky až stovky metrů bohatě stačí.
 */
export function vzdalenostM(
  a: { sirka: number; delka: number },
  b: { sirka: number; delka: number },
): number {
  const stred = ((a.sirka + b.sirka) / 2) * (Math.PI / 180);
  const dx = (b.delka - a.delka) * Math.cos(stred) * 111_320;
  const dy = (b.sirka - a.sirka) * 111_320;
  return Math.hypot(dx, dy);
}

export function kolmice(
  a: { sirka: number; delka: number },
  b: { sirka: number; delka: number },
): [NonNullable<SvetovaStrana>, NonNullable<SvetovaStrana>] | null {
  // Dva body na jednom místě linii netvoří a azimut z nich nevyjde:
  // `atan2(0, 0)` je nula, takže by růžice vážně nabídla sever a jih.
  // Radši se přizná, že neví.
  if (vzdalenostM(a, b) < NEJKRATSI_LINIE_M) return null;

  const smer = azimut(a, b);
  const prvni = nejblizsiStrana(smer - 90);
  const druha = nejblizsiStrana(smer + 90);
  const odSeveru = (s: NonNullable<SvetovaStrana>) => {
    const u = SMERY.indexOf(s) * 45;
    return Math.min(u, 360 - u);
  };
  return odSeveru(prvni) <= odSeveru(druha) ? [prvni, druha] : [druha, prvni];
}

/** Nese ten předpis směr, který se vybírá z růžice? */
export function patriSmer(typ: TypStavby): boolean {
  return typ.jak === "start" || typ.jak === "cil";
}

/** Nese ten typ druh startu? */
export function patriDruhStartu(typ: TypStavby): boolean {
  return typ.jak === "start";
}
