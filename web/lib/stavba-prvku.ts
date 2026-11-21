// NEEDITUJ TENHLE SOUBOR. Je to kopie z `packages/stavba/stavba-prvku.ts`,
// kterou vyrábí `packages/stavba/rozkopiruj.sh`. Změna patří do zdroje;
// tahle kopie se při příštím běhu přepíše a CI rozdíl ohlásí.
import { vzdalenostM } from "./geo";
import type { components } from "./schema";

export { vzdalenostM };

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
 * <b>Zdroj je `packages/stavba/`, tohle je kopie.</b> Needituj ji —
 * `packages/stavba/rozkopiruj.sh` ji přepíše a CI to pozná. Proč kopie
 * a ne balíček ve workspace, stojí v tom skriptu; krátce: appka má
 * vlastní `package-lock.json` a workspace se symlinky by musel obsloužit
 * Next i Metro. Je to tatáž cesta, jakou chodí `schema.d.ts`.
 * </para>
 *
 * <para>
 * <b>Nesmí se sem dostat nic, co zná jen jeden klient.</b> Importovat jde
 * jedině `./schema` a `./geo`, protože ty leží jako sourozenci v obou
 * stromech. Jediný import z `@/` nebo z `react-native` tu kopii v druhém
 * klientovi rozbije — a pozná se to až u něj.
 * </para>
 */

/**
 * Typy z OpenAPI dokumentu. <b>Odvozují se tady znovu</b>, a ne importem
 * z `lib/boje` nebo `lib/trat`: ty existují jen ve webu. Pravdou je
 * `schema.d.ts`, které má každý klient u sebe a generuje ho tentýž
 * `packages/api-client/generuj.sh`, takže dvě jména pro tentýž tvar se
 * nemají jak rozejít.
 */
type S = components["schemas"];
type BarvaBoje = S["BarvaBoje"];
type TvarBoje = S["TvarBoje"];
type DruhZnaceni = S["DruhZnaceni"];
type TypPrvku = S["TypPrvku"];
type StranaPrvku = S["StranaPrvku"];
type SvetovaStrana = S["SvetovaStrana"];
type DruhStartu = S["DruhStartu"];

/**
 * Co o typu potřebuje vědět formulář. <b>Dva body, nebo jedna bóje</b> —
 * Filip, 10. 10. 2026: *„Tady bude vždy potřeba definovat dva body, na
 * rozdíl od ostatních typů."*
 *
 * <para>
 * <b>Bydlí tady, protože to je pravidlo prvku, ne webu.</b> Web si ho
 * dál bere z `lib/trat`, které ho odsud vyváží dál — jinak by se musela
 * přepsat pětice obrazovek, které ho tam čekají.
 * </para>
 */
export function dvaBody(typ: TypPrvku): boolean {
  return typ !== "OtocnaBoje" && typ !== "PrujezdniBoje";
}

/** Který krok průvodce zrovna běží. */
export type Krok = "typ" | "jak" | "body" | "hotovo";

/**
 * Jak se stopa lodi nakreslí v náhledu. Kreslí to obrazovka, rozhoduje tohle.
 *
 * <b>Otáčení i míjení mají variantu po každém boku</b> (Filip,
 * 11. 10. 2026). Jedna stopa pro oba boky nestačí: zrcadlením se mění
 * chiralita, takže levá otočka nakreslená u pravoboku je špatná odpověď
 * na to jediné, na co se stavitel u náhledu ptá. U bran varianty nejsou,
 * protože tam se strana nezapisuje — volí ji loď.
 */
export type Stopa =
  | "otocLevobok"
  | "otocPravobok"
  | "mineLevobok"
  | "minePravobok"
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
 * <b>Tady se sdružení rozplétá.</b> „Otočná — ponechat po levoboku"
 * uloží otočnou bóji, „nechat po levoboku" průjezdní — stavitel přitom
 * nevybral ani jedno jméno, jen řekl, jak se to jede. Obojí mluví
 * o ponechání, ne o otáčení: kam se loď točí, se nikam neukládá
 * (nález J8).
 */
export type Volba = {
  jmeno: string;
  detail: string;
  /** Co se doopravdy uloží. */
  typ: NonNullable<TypPrvku>;
  /** Strana, pokud ji ten typ nese. U bran je vždycky `null` — volí ji loď. */
  strana: StranaPrvku;
  stopa: Stopa;
  /**
   * Čím je start vytyčený. <b>Je to tentýž výběr</b> — „pevná linie"
   * nebo „otevírající se brána" je u startu zároveň odpověď na to, jak
   * se jede, takže se neptáme dvakrát. Jinde `undefined`.
   *
   * <para>
   * Dřív si to web odvozoval porovnáním `jmeno === "Otevírající se
   * brána"`. Fungovalo to, dokud byl klient jeden: přejmenování volby
   * by ten výběr tiše obrátilo na pevnou linii a nic by nespadlo.
   * </para>
   */
  druhStartu?: NonNullable<DruhStartu>;
  /** Jak se pojmenují body, když jméno závisí na předpisu. */
  jmena?: ((poradi: number) => string)[];
  /**
   * Výzvy k pípnutí, když závisí na předpisu, ne jen na typu. Potřebuje
   * to otevírající se start (nález J5): u něj žádné dva konce linie
   * nestojí, takže výzvy z <see cref="TYPY"/> by se ptaly na něco jiného,
   * než co stavitel pípá. Jinde je dává typ.
   */
  vyzvy?: string[];
};

/** Typ v nabídce: kolik bodů se pípá, ne čím prvek je. */
export type TypStavby = {
  id: "Jedna" | "Dve" | "Start" | "Cil" | "Odskok";
  jmeno: string;
  popis: string;
  body: Bod[];
  /** Která sada předpisů se nabídne. */
  jak: "jedna" | "dve" | "start" | "cil" | "odskok";
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
    popis: "oba konce, směr a čím je vytyčený",
    jak: "start",
    // <b>Linie nemá levobok a pravobok</b> (nález J4 druhého konzilia):
    // bok má loď, ne čára — linií se prochází. Konce se jmenují tím, co
    // na nich stojí: startovní plavidlo (stěžeň s oranžovou vlajkou)
    // a startovní bóje. Jméno jde ven ve veřejných datech (`Boje.Nazev`),
    // takže „start levobok" došel až k posádkám.
    body: [
      { vyzva: "Pípni konec u plavidla", jmeno: () => "start u plavidla" },
      { vyzva: "Popojeď a pípni konec u bóje", jmeno: () => "start u bóje" },
    ],
  },
  {
    id: "Cil",
    jmeno: "Cíl",
    popis: "oba konce, směr proplutí",
    jak: "cil",
    // Totéž co u startu (J4); u cíle nese plavidlo modrou vlajku.
    body: [
      { vyzva: "Pípni konec u plavidla", jmeno: () => "cíl u plavidla" },
      { vyzva: "Popojeď a pípni konec u bóje", jmeno: () => "cíl u bóje" },
    ],
  },
  {
    id: "Odskok",
    jmeno: "Odskok",
    popis: "otočná a hned za ní odskoková — jedno místo v řadě",
    // <b>Vlastní předpisy, ne ty jednobodové</b> (konzilium nad stavitelem
    // trati, bod 9). Do 18. 11. 2026 tu stálo `jak: "jedna"`, takže průvodce
    // nabídl volby, které ukládají `OtocnaBoje` — jenže pípaly se dva body
    // a `Dvoukonec(OtocnaBoje)` je na serveru `false`. Pět klepnutí tedy
    // skončilo prvkem, který server odmítne, a fronta na vodě stála.
    jak: "odskok",
    body: [
      { vyzva: "Pípni otočnou", jmeno: znacka("otočná") },
      { vyzva: "Popojeď a pípni odskokovou", jmeno: znacka("odskok") },
    ],
  },
];

/**
 * Nabídka, jak ji vidí stavitel na vodě: <b>jedna úplná věc na dlaždici</b>.
 *
 * <para>
 * <b>Proč vedle `TYPY` a `VOLBY`, a ne místo nich</b> (konzilium nad
 * stavitelem trati, bod 3 a nález 2 návrhu). Stavitel neuvažuje v počtu
 * bodů: veze v lodi žlutou bóji a ví, že to bude *otočná, kterou se jede
 * levobokem* — jedna věc, ne dvě. „Jedna značka" je kategorie vymyšlená
 * kvůli tomu, kolikrát se pípne, tedy vlastnost zápisu, ne trati.
 * </para>
 *
 * <para>
 * Rozdělit kvůli tomu pravidla by znamenalo dvě pravdy o tomtéž — přesně
 * to, proti čemu tenhle modul vznikl. Tohle je proto <b>pohled</b>, ne
 * druhá definice: dvojice se rozsvěcejí z `TYPY` a `VOLBY` a test hlídá,
 * že nabídka pokrývá všechny volby do jedné. Webový průvodce si nechává
 * dva kroky, protože má myš a místo; na telefonu se klepe v rukavicích.
 * </para>
 *
 * <para>
 * <b>Pořadí je hitparáda podle použití</b> (Filip, 18. 11. 2026), ne
 * abeceda a ne pořadí v kódu: první dlaždice je pod palcem nejlevnější.
 * Čísla o tom, co se na Orlíku staví, ale nikde nejsou — tohle je odhad
 * z domény (otočných je na trati několik, start a cíl po jednom, otočná
 * zóna je výjimka) a od 1-ergonomie víme jen to, že <b>odskok je nejřidší
 * prvek na trati</b>. Až budou postavené tratě, přepsat se to má podle
 * nich.
 * </para>
 *
 * <para>
 * <b>Dvanáct, ne jedenáct.</b> Konzilium počítalo jedenáct úplných
 * kombinací, protože odskok tehdy neměl vlastní předpisy; po opravě bodu 9
 * nese stranu jako otočná, takže přibyla dvanáctá. Do jednoho sloupce se
 * dvanáct řádků po 56 pt nevejde ani bez mezer (672 pt proti 596 volným),
 * proto mřížka o dvou sloupcích — tu projekt volí na dotyku i v pruhu
 * dlaždic ve správě, a ze stejného důvodu.
 * </para>
 */
export const NABIDKA: {
  jmeno: string;
  /**
   * Druhý řádek dlaždice. <b>Vlastní, ne `volba.detail`</b>: ten je psaný
   * na plnou šířku webového průvodce a v mřížce 173 pt se láme na tři
   * řádky — *„otočná brána; u které značky se otočí, si vybere loď"*
   * nafoukne dlaždici z 75 na 93 pt a mřížka z 566 na dotek stropu.
   * Krátký detail říká to, co jméno neunese, a nic navíc.
   */
  detail: string;
  typ: TypStavby["id"];
  volba: string;
}[] = [
  { jmeno: "Otočná — po levoboku", detail: "jedna bóje, točí se", typ: "Jedna", volba: "Otočná — ponechat po levoboku" },
  { jmeno: "Otočná — po pravoboku", detail: "jedna bóje, točí se", typ: "Jedna", volba: "Otočná — ponechat po pravoboku" },
  { jmeno: "Start — pevná linie", detail: "mezi dvěma body", typ: "Start", volba: "Pevná linie" },
  { jmeno: "Cíl", detail: "mezi dvěma body", typ: "Cil", volba: "Proplout cílem" },
  { jmeno: "Brána", detail: "projede se a jede dál", typ: "Dve", volba: "Projet mezi nimi" },
  { jmeno: "Průjezdní — levobokem", detail: "jen se míjí", typ: "Jedna", volba: "Nechat po levoboku" },
  { jmeno: "Průjezdní — pravobokem", detail: "jen se míjí", typ: "Jedna", volba: "Nechat po pravoboku" },
  { jmeno: "Otočná brána", detail: "stranu volí loď", typ: "Dve", volba: "Projet a otočit se" },
  { jmeno: "Start — otevírající se", detail: "brána se otevírá", typ: "Start", volba: "Otevírající se brána" },
  { jmeno: "Odskok — po levoboku", detail: "s odskokovou za ní", typ: "Odskok", volba: "Ponechat po levoboku" },
  { jmeno: "Odskok — po pravoboku", detail: "s odskokovou za ní", typ: "Odskok", volba: "Ponechat po pravoboku" },
  { jmeno: "Otočná zóna", detail: "dráty nad vodou", typ: "Dve", volba: "Otočit se za linií" },
];

/** Jedna dlaždice nabídky i s tím, co se po klepnutí nastaví. */
export type Dlazdice = { jmeno: string; detail: string; typ: TypStavby; volba: Volba };

/**
 * Nabídka rozsvícená na typy a předpisy. Co v <see cref="NABIDKA"/> nenajde
 * protějšek, vynechá — a test to ohlásí dřív, než se to dostane na vodu.
 */
export function dlazdiceNabidky(): Dlazdice[] {
  const ven: Dlazdice[] = [];
  for (const polozka of NABIDKA) {
    const typ = TYPY.find((t) => t.id === polozka.typ);
    const volba = typ ? VOLBY[typ.jak].find((v) => v.jmeno === polozka.volba) : undefined;
    if (typ && volba) ven.push({ jmeno: polozka.jmeno, detail: polozka.detail, typ, volba });
  }
  return ven;
}

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
      // <b>„Otočit levobokem" byla dvojznačnost</b>, kterou projekt už
      // jednou odstranil (nález J8; `PrvekTrati.cs:88–96`): ponechat znak
      // po levoboku znamená točit **doprava**. Rozhodčí ani směrnice
      // neříkají, kam se točí — říkají, kterou stranou se znak ponechává.
      jmeno: "Otočná — ponechat po levoboku",
      detail: "jedna bóje, točí se",
      typ: "OtocnaBoje",
      strana: "PoLeve",
      stopa: "otocLevobok",
      jmena: [znacka("otočná")],
    },
    {
      jmeno: "Otočná — ponechat po pravoboku",
      detail: "jedna bóje, točí se",
      typ: "OtocnaBoje",
      strana: "PoPrave",
      stopa: "otocPravobok",
      jmena: [znacka("otočná")],
    },
    {
      jmeno: "Nechat po levoboku",
      detail: "jen se míjí, netočí se",
      typ: "PrujezdniBoje",
      strana: "PoLeve",
      stopa: "mineLevobok",
      jmena: [znacka("průjezdní")],
    },
    {
      jmeno: "Nechat po pravoboku",
      detail: "jen se míjí, netočí se",
      typ: "PrujezdniBoje",
      strana: "PoPrave",
      stopa: "minePravobok",
      jmena: [znacka("průjezdní")],
    },
  ],
  // <b>Odskok má jen stranu</b>, žádnou volbu mezi otočením a minutím:
  // odskoková bóje je tam proto, aby se u otočné lodě netlačily při ostrém
  // obratu (`PrvekTrati.cs`), takže se vždycky točí. Obě značky se
  // ponechávají touž stranou — proto jedna volba na bok, ne na značku.
  // Jména bodů dává `TYPY`, na předpisu nezávisí.
  odskok: [
    {
      jmeno: "Ponechat po levoboku",
      detail: "otočná s odskokovou za ní",
      typ: "Odskok",
      strana: "PoLeve",
      stopa: "otocLevobok",
    },
    {
      jmeno: "Ponechat po pravoboku",
      detail: "otočná s odskokovou za ní",
      typ: "Odskok",
      strana: "PoPrave",
      stopa: "otocPravobok",
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
      // <b>Dotek se neposoudí</b> (nález J7): linie mezi dráty a bodem na
      // břehu je imaginární, rozhodčí ji z lodi nevidí a z trasy se pozná
      // proplutí za ni, ne dotyk. Na porovnání trasy se stavem trati
      // přitom stojí celý projekt, a tohle je zároveň slovo ze směrnice.
      jmeno: "Otočit se za linií",
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
      druhStartu: "PevnaLinie",
    },
    {
      jmeno: "Otevírající se brána",
      detail: "startovací loď jede po linii startu",
      typ: "Start",
      strana: null,
      stopa: "startSipka",
      druhStartu: "OtevirajiciSeBrana",
      // <b>Tady žádné dva konce linie nestojí</b> (nález J5): po linii
      // jede vodicí loď a branka se za ní otevírá, takže dva body
      // popisují, **kudy ta linie vede**. Bez vlastních jmen a výzev by
      // se stavitel pípal „konce", které ve vodě nejsou.
      vyzvy: ["Pípni, kde brána startuje", "Popojeď a pípni, kam dojede"],
      jmena: [() => "start brány odkud", () => "start brány kam"],
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
 * <b>U dvoubodových prvků se konce číslují, ne stranují</b> (nález J6
 * druhého konzilia). „Vlevo" a „vpravo" se u brány nemají k čemu
 * vztáhnout: směr průjezdu se u ní <b>neukládá</b> — `smer` smí být jen
 * u startu a cíle (`PrvekTrati.cs:302`) —, takže „vlevo" znamenalo jen
 * „pípnuto první", a jak se motorák otočí, je ta levá vpravo. Jméno
 * přitom jde ven ve veřejných datech.
 * </para>
 */
export function vyzvaBodu(typ: TypStavby, volba: Volba | null, i: number): string | null {
  return volba?.vyzvy?.[i] ?? typ.body[i]?.vyzva ?? null;
}

export function jmenaBodu(typ: TypStavby, volba: Volba | null, poradi: number): string[] {
  const zaklad = volba?.jmena ?? typ.body.map((b) => b.jmeno);
  const jmena = typ.body.map((_, i) => (zaklad[i] ?? zaklad[0])(poradi));

  if (jmena.length < 2 || typ.id === "Odskok" || typ.id === "Start" || typ.id === "Cil")
    return jmena;

  return [`${jmena[0]} první konec`, `${jmena[1]} druhý konec`];
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

/** Osm směrů, ne stupně: na vodě se člověk řídí rozhledem. */
export const SMERY: NonNullable<SvetovaStrana>[] = ["S", "SV", "V", "JV", "J", "JZ", "Z", "SZ"];

/**
 * Jak se směr řekne. <b>Patří sem, ne do obrazovky</b> — růžici ukazuje
 * web i appka a osm řetězců opsaných na dvou místech je přesně ten druh
 * kopie, která se rozejde: stačí, aby jeden klient říkal „na jih" a druhý
 * „jižně", a stavitel s rozhodčím si nerozumí.
 */
export const NAZVY_SMERU: Record<NonNullable<SvetovaStrana>, string> = {
  S: "na sever",
  SV: "na severovýchod",
  V: "na východ",
  JV: "na jihovýchod",
  J: "na jih",
  JZ: "na jihozápad",
  Z: "na západ",
  SZ: "na severozápad",
};

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

/**
 * Typ stavby a stopa pro <b>už postavený</b> prvek — opačný směr než
 * průvodce, který z volby teprve dělá prvek.
 *
 * <b>Proč to jde:</b> `VOLBY` je úplný soupis toho, co se dá postavit,
 * a dvojice typ + strana v něm určuje stopu jednoznačně. Veřejná stránka
 * tedy může nakreslit tentýž náhled, jaký viděl stavitel, aniž by si
 * mapování opisovala podruhé.
 *
 * <b>Když se stopa nenajde, vrací `null`</b> a náhled se nakreslí bez ní.
 * To je schválně: vymyslet si, kudy loď jede, je přesně ta lež, kvůli
 * které prvky vznikly. Do 18. 11. 2026 to platilo o odskoku, protože ten
 * `VOLBY` jako typ neznaly; od opravy bodu 9 má vlastní předpisy a stopu
 * najde jako každý jiný.
 */
export function stopaProPrvek(typ: TypPrvku, strana: StranaPrvku): Stopa | null {
  const vsechny = Object.values(VOLBY).flat();
  return (
    vsechny.find((v) => v.typ === typ && v.strana === strana)?.stopa ??
    vsechny.find((v) => v.typ === typ)?.stopa ??
    null
  );
}

/** Kolik bodů prvek má, v podobě, které rozumí náhled. */
export function typStavbyProPrvek(typ: TypPrvku): TypStavby {
  const id: TypStavby["id"] =
    typ === "Start" ? "Start" : typ === "Cil" ? "Cil" : typ === "Odskok" ? "Odskok" : dvaBody(typ) ? "Dve" : "Jedna";
  return TYPY.find((t) => t.id === id)!;
}
