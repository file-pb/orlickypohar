/**
 * Falešná rozjížďka pro náčrt mapy.
 *
 * <b>Proč falešná data a ne mock:</b> náčrt má odpovědět na otázky
 * z rozpravy o zobrazení trackingu (PLAN.md, *Jak se trackování
 * zobrazuje*) — jak vypadá čtyřicet stop, které se potkají u bóje, a jestli
 * se v pomyslném pořadí vede mění dost na to, aby to někoho bavilo. Na to
 * je potřeba plné pole lodí na celé rozjížďce, a to z pilotu nebude dřív
 * než na jaře 2027.
 *
 * <b>Deterministické schválně.</b> Jedno zrno dá vždycky tutéž rozjížďku,
 * takže se dvě podoby mapy dají porovnat nad týmiž daty a snímek
 * obrazovky zůstane platný.
 *
 * <b>Co to není:</b> simulace plachtění. Lodě tu křižují podle hrubého
 * pravidla a vítr se nestáčí. Na otázku „vidím, kdo vede?" to stačí; na
 * otázku „jak dlouho trvá noha" ne.
 */

import type { BarvaBoje, DruhZnaceni, TvarBoje } from "@/lib/boje";
import { OBRYS_ORLIKU } from "@/lib/orlik-obrys";

export type Bod = { sirka: number; delka: number; cas: number };

export type Lod = {
  id: number;
  nazev: string;
  kategorie: "Race" | "Nad7m" | "Pod7m";
  body: Bod[];
  /** Index posledního bodu, který „došel na server". Zbytek je díra. */
  dosloDo: number;
};

/**
 * Značka trati tak, jak ji popisuje návrhář: jeden konec u bóje, dva
 * u startovní a cílové čáry, a ke každému barva, tvar a čím je značená.
 * Bez toho by náčrt kreslil kolečka místo trati.
 */
export type Konec = {
  sirka: number;
  delka: number;
  barva: BarvaBoje;
  tvar: TvarBoje;
  znaceni: DruhZnaceni;
};

export type Znacka = {
  poradi: number;
  nazev: string;
  /** Tytéž hodnoty jako `TypPrvku` z API; mapa se ptá jen na pár z nich. */
  typ: string;
  /** Bok, kterým se značka míjí. U čar chybí. */
  strana?: "PoLeve" | "PoPrave";
  konce: Konec[];
  /** Uzel, kterým vede dráha: bóje sama, nebo střed mezi konci. */
  sirka: number;
  delka: number;
};

/**
 * Střed závodního pole a směr jeho osy. <b>Vybrané měřením, ne od oka.</b>
 * První pokus hledal jen místo s největším podílem vody kolem a postavil
 * trať na sever — jenže Orlík je zatopené údolí, které se vine, takže
 * lodě skončily v lese. Druhý pokus proto hledá **osu**: pro každý střed
 * a každý směr, jak daleko se od něj dá jít po vodě. Vyhrálo tohle místo
 * se směrem 45°, kde je 1 180 m osy a 800 m kolmé šířky.
 *
 * Trať se pak staví v souřadnicích *podél osy* a *kolmo na ni*, ne
 * sever/jih — a tím se do údolí vejde.
 */
const STRED = { sirka: 49.53, delka: 14.16 };
const OSA_STUPNU = 45;

const METRU_NA_STUPEN = 111_320;

/** Lineární kongruentní generátor — stačí a je čitelný. */
function nahoda(zrno: number) {
  let s = zrno >>> 0;
  return () => {
    s = (s * 1_664_525 + 1_013_904_223) >>> 0;
    return s / 4_294_967_296;
  };
}

function posun(od: { sirka: number; delka: number }, vychodM: number, severM: number) {
  const kosinus = Math.cos((od.sirka * Math.PI) / 180);
  return {
    sirka: od.sirka + severM / METRU_NA_STUPEN,
    delka: od.delka + vychodM / (METRU_NA_STUPEN * kosinus),
  };
}

/** Bod v souřadnicích trati: metry podél osy a kolmo na ni. */
function naOse(podel: number, kolmo: number) {
  const u = (OSA_STUPNU * Math.PI) / 180;
  const sin = Math.sin(u);
  const cos = Math.cos(u);
  return posun(STRED, podel * sin + kolmo * cos, podel * cos - kolmo * sin);
}

/**
 * Trať: start na jednom konci osy, návětrná bóje na druhém, odpadávací
 * stranou. Klasický trojúhelník, jaký rozhodčí staví na Orlíku — jen
 * natočený podle údolí.
 */
export function trat(): Znacka[] {
  // Startovní a cílová čára je tatáž, napříč osou — jak to bývá.
  const levy = naOse(-300, 90);
  const pravy = naOse(-300, -90);
  const cara: Konec[] = [levy, pravy].map((p) => ({
    ...p,
    barva: "Zluta" as const,
    tvar: "Valcova" as const,
    znaceni: "NaseBoje" as const,
  }));
  const stredCary = {
    sirka: (levy.sirka + pravy.sirka) / 2,
    delka: (levy.delka + pravy.delka) / 2,
  };

  const boje = (p: { sirka: number; delka: number }): Konec[] => [
    { ...p, barva: "Oranzova", tvar: "Kuzelova", znaceni: "NaseBoje" },
  ];
  const navetrna = naOse(780, 0);
  const odpadavaci = naOse(150, -330);

  return [
    { poradi: 1, nazev: "start", typ: "Start", konce: cara, ...stredCary },
    { poradi: 2, nazev: "N", typ: "OtocnaBoje", strana: "PoLeve", konce: boje(navetrna), ...navetrna },
    { poradi: 3, nazev: "O", typ: "OtocnaBoje", strana: "PoLeve", konce: boje(odpadavaci), ...odpadavaci },
    { poradi: 4, nazev: "cíl", typ: "Cil", konce: cara, ...stredCary },
  ];
}

const JMENA = [
  "LUNA", "PEZI", "AVENIR", "ORKÁN", "SIRIUS", "VLNA", "KORMORÁN", "ALBATROS",
  "MERKUR", "TRAMP", "ŠÍPEK", "NAUTILUS", "RACEK", "BOREAS", "DELFÍN", "PASÁT",
  "TRITON", "VÁNEK", "KAJMAN", "POLARIS", "ZEFÝR", "ARGO", "NEPTUN", "KOMETA",
  "BRÍZA", "SALAMANDR", "MISTRAL", "ONDINA", "FREGATA", "TULÁK",
];

const KATEGORIE: Lod["kategorie"][] = ["Race", "Nad7m", "Pod7m"];

/** Vzdálenost v metrech, placatě — na kilometru je chyba pod metr. */
function metry(a: { sirka: number; delka: number }, b: { sirka: number; delka: number }) {
  const kosinus = Math.cos((a.sirka * Math.PI) / 180);
  const dx = (b.delka - a.delka) * METRU_NA_STUPEN * kosinus;
  const dy = (b.sirka - a.sirka) * METRU_NA_STUPEN;
  return Math.hypot(dx, dy);
}

/**
 * Jedna plavba: loď objíždí značky v pořadí. Proti větru (k návětrné bóji)
 * křižuje — jede šikmo a každých pár desítek sekund změní bok. Po větru
 * míří rovnou.
 */
function plavba(zrno: number, znacky: Znacka[], rychlostUzlu: number): Bod[] {
  const r = nahoda(zrno);
  const body: Bod[] = [];
  let kde = { sirka: znacky[0].sirka, delka: znacky[0].delka };
  // <b>Každá loď hlásí v jiný okamžik.</b> Bez téhle fáze by všechny body
  // padly na tytéž vteřiny a stáří polohy by na obrazovce bylo pořád nula
  // — tedy právě ten údaj, kvůli kterému se na mapu kouká.
  let cas = Math.floor(r() * 10);
  const krok = 10; // sekund mezi body
  let bok = r() > 0.5 ? 1 : -1;
  let doObratu = 40 + r() * 60;

  for (let i = 1; i < znacky.length; i++) {
    const cil = znacky[i];
    const navetrna = cil.typ === "OtocnaBoje" && cil.poradi === 2;
    let dost = 0;

    while (metry(kde, cil) > 40 && dost < 400) {
      dost++;
      const kosinus = Math.cos((kde.sirka * Math.PI) / 180);
      const dx = (cil.delka - kde.delka) * METRU_NA_STUPEN * kosinus;
      const dy = (cil.sirka - kde.sirka) * METRU_NA_STUPEN;
      const delka = Math.hypot(dx, dy) || 1;
      let smerX = dx / delka;
      let smerY = dy / delka;

      if (navetrna) {
        // Křižování: odchylka 45° od přímého směru, bok se střídá.
        const uhel = (bok * 45 * Math.PI) / 180;
        const nx = smerX * Math.cos(uhel) - smerY * Math.sin(uhel);
        const ny = smerX * Math.sin(uhel) + smerY * Math.cos(uhel);
        smerX = nx;
        smerY = ny;
        doObratu -= krok;
        if (doObratu <= 0) {
          bok = -bok;
          doObratu = 40 + r() * 80;
        }
      }

      // Rychlost kolísá, aby se lodě nedržely v zástupu.
      const m = rychlostUzlu * 0.5144 * krok * (0.85 + r() * 0.3);
      const dal = posun(kde, smerX * m, smerY * m);

      // <b>Od břehu se loď odrazí.</b> Křižování v zatopeném údolí končí
      // u lesa dřív než u lay line, takže se obrátí a jede zpátky — a bez
      // toho by stopy na náčrtu ležely na kopci, což je přesně ten druh
      // lži, kvůli které `lib/voda.ts` vůbec vznikl.
      if (!naVode(dal)) {
        bok = -bok;
        doObratu = 40 + r() * 80;
        continue;
      }

      kde = dal;
      cas += krok;
      body.push({ ...kde, cas });
    }

    /**
     * <b>Bóji je potřeba objet, ne se k ní jen přiblížit</b> (Filip,
     * 26. 10. 2026: *„koukám, že ti ty lodičky v simulaci nedodrží ty
     * objezdy bójek"*). Smyčka výš končí čtyřicet metrů před značkou
     * a dřív se rovnou mířilo na další — stopy se tak lámaly před bójí
     * a kolem ní nevedly vůbec. Loď teď opíše oblouk tím bokem, který
     * trať předepisuje.
     */
    const dalsi = znacky[i + 1];
    if (dalsi && cil.typ !== "Cil") {
      const uhelK = (z: { sirka: number; delka: number }) => {
        const kosinus = Math.cos((cil.sirka * Math.PI) / 180);
        return Math.atan2(z.sirka - cil.sirka, (z.delka - cil.delka) * kosinus);
      };
      const od = uhelK(kde);
      const k = uhelK(dalsi);
      // Značka se míjí levobokem, nebo pravobokem — tím je dán i směr
      // objezdu. Bez údaje se vybere kratší oblouk.
      const smer = cil.strana === "PoLeve" ? 1 : cil.strana === "PoPrave" ? -1 : Math.sign(((k - od + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) || 1;
      let rozdil = (k - od) * smer;
      while (rozdil < 0) rozdil += 2 * Math.PI;
      const polomer = Math.max(25, metry(kde, cil));
      const kroku = Math.max(3, Math.round((rozdil / Math.PI) * 6));
      for (let q = 1; q <= kroku; q++) {
        const uhel = od + smer * (rozdil * q) / kroku;
        const kosinus = Math.cos((cil.sirka * Math.PI) / 180);
        const naOblouku = {
          sirka: cil.sirka + (Math.sin(uhel) * polomer) / METRU_NA_STUPEN,
          delka: cil.delka + (Math.cos(uhel) * polomer) / (METRU_NA_STUPEN * kosinus),
        };
        if (!naVode(naOblouku)) continue;
        kde = naOblouku;
        cas += krok;
        body.push({ ...kde, cas });
      }
    }
  }
  return body;
}

/** Leží bod ve vodě? Hrubý test bodem v mnohoúhelníku nad obrysem nádrže. */
export function naVode(p: { sirka: number; delka: number }): boolean {
  for (const prstenec of OBRYS_ORLIKU) {
    let uvnitr = false;
    for (let i = 0, j = prstenec.length - 1; i < prstenec.length; j = i++) {
      const [xi, yi] = prstenec[i];
      const [xj, yj] = prstenec[j];
      if (yi > p.sirka !== yj > p.sirka) {
        const x = ((xj - xi) * (p.sirka - yi)) / (yj - yi) + xi;
        if (p.delka < x) uvnitr = !uvnitr;
      }
    }
    if (uvnitr) return true;
  }
  return false;
}

/**
 * Pole lodí na trati.
 *
 * <b>Trať i jména se dají předat zvenku</b> (Filip, 24. 10. 2026): tabule
 * tím ukáže ukázkové plavby po **skutečné** trati závodu a se jmény ze
 * startovní listiny, dokud nikdo neposílá polohy. Je to návrh, ne provoz,
 * a tabule to u sebe píše — vydávat vymyšlené polohy za skutečné by byla
 * lež, ne ukázka.
 */
export function pole(
  kolik = 24,
  znackyZvenku?: Znacka[],
  jmena?: string[],
): { znacky: Znacka[]; lode: Lod[] } {
  const znacky = znackyZvenku && znackyZvenku.length >= 2 ? znackyZvenku : trat();
  const r = nahoda(7);
  const lode: Lod[] = [];

  for (let i = 0; i < kolik; i++) {
    const body = plavba(100 + i * 17, znacky, 4.2 + r() * 1.6);
    // Většina lodí hlásí až do konce; pár jich má díru nebo mlčí úplně.
    const los = r();
    const dosloDo =
      los < 0.08 ? 0 : los < 0.2 ? Math.floor(body.length * (0.3 + r() * 0.4)) : body.length;
    lode.push({
      id: i,
      nazev: jmena?.[i] ?? JMENA[i % JMENA.length],
      kategorie: KATEGORIE[i % KATEGORIE.length],
      body,
      dosloDo,
    });
  }
  return { znacky, lode };
}
