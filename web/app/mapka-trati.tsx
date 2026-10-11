import {
  dvaBody,
  nazevTypu,
  stranaPatri,
  type StranaPrvku,
  type SvetovaStrana,
  type TypPrvku,
} from "@/lib/trat";
import { spojniceTrati, type UzelTrati } from "@/lib/voda";
import { DLAZDICE, Z_NEJMENE, Z_NEJVIC, doPixelu } from "@/lib/mapa";
import { ZnakBoje } from "@/app/znak-boje";
import type { BarvaBoje, DruhZnaceni, TvarBoje } from "@/lib/boje";

/**
 * Prvek, jak ho mapka potřebuje. <b>Vlastní tvar schválně</b>: správa a web
 * dostávají z API dva různé tvary prvku (jeden s id a bodem navíc), a kdyby
 * si mapka vybrala jeden z nich, druhý by ji musel obelhat. Takhle oba
 * jenom popíšou, co mají, a mapka kreslí.
 */
export type PrvekNaMape = {
  klic: string | number;
  typ: TypPrvku;
  poradi: number;
  /** Jeden konec u bóje samotné, dva u prvku mezi dvěma konci. */
  konce: {
    nazev: string;
    sirka: number;
    delka: number;
    /** Jak bóje vypadá. U konce, který bóje není, chybí obojí. */
    barva?: BarvaBoje;
    tvar?: TvarBoje;
    /**
     * Čím je značka značená. <b>Bez tohohle kreslí mapa plavidlo jako
     * červenou bóji</b> — barvu ani tvar totiž nemá a kreslení by sáhlo
     * po výchozí. Závodník by pak hledal bóji, která tam neplave.
     */
    znaceni?: DruhZnaceni;
  }[];
  /** Druhý konec není bóje — kreslí se prázdným kolečkem. */
  /** Jen u startu: světová strana, podle které se kreslí šipka průjezdu. */
  smer?: SvetovaStrana;
  /**
   * Na kterém boku loď prvek míjí. Podle toho se spojnice u značky
   * zatočí, takže mapa říká i <b>kudy</b>, ne jen kam. U brány chybí
   * schválně — bok si volí posádka.
   */
  strana?: StranaPrvku;
};

/**
 * Mapka trati: bóje nad mapovým podkladem.
 *
 * <b>Zadání od Filipa (9. 10. 2026):</b> *„ja bych chtel videt mapku trati
 * s bojemi"* — a na dotaz, jestli to může být podklad z Mapy.cz nebo
 * Googlu, padla OpenStreetMap: nechce klíč ani účet s fakturací.
 *
 * <b>Dlaždice jdou přes náš server</b> (`/dlazdice/{z}/{x}/{y}`), stejně
 * jako radar ČHMÚ. Kdyby si je tahal prohlížeč, odešla by IP každého, kdo
 * obrazovku otevře, na cizí server. Zdroj se tím dá vyměnit na jednom
 * místě — přepnutí na Mapy.com je adresa a klíč, ne přepis téhle
 * komponenty.
 *
 * <b>Celé serverové, bez javascriptu.</b> Mapa se neposouvá ani
 * nepřibližuje, protože by to znamenalo mapovou knihovnu v prohlížeči a
 * zbytek správy javascript nemá. Výřez se spočítá z bójí: ukáže právě
 * trať a kus vody kolem.
 *
 * <b>Projekce je Web Mercator</b> (EPSG:3857), tedy tatáž, ve které jsou
 * dlaždice — bez toho by bóje nad podkladem seděly jen náhodou.
 */

/**
 * Šipka průjezdu. <b>Sever nahoře</b>, takže se úhel počítá od svislice
 * po směru hodinových ručiček — stejně jako na kompasu.
 */
function SipkaSmeru({ x, y, smer }: { x: number; y: number; smer: NonNullable<SvetovaStrana> }) {
  const stupne = { S: 0, SV: 45, V: 90, JV: 135, J: 180, JZ: 225, Z: 270, SZ: 315 }[smer];
  const d = 30;

  return (
    <g transform={`translate(${x} ${y}) rotate(${stupne})`}>
      {/* Kreslí se od uzlu ven, tedy odkud kam se startuje. Bílý lem
          jako u všeho ostatního — nad lesem by černá čára zmizela. */}
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={-d}
        stroke="#1a1a1a"
        strokeWidth="3"
        strokeOpacity="0.9"
      />
      <polygon points={`0,${-d - 7} -5,${-d + 3} 5,${-d + 3}`} fill="#1a1a1a" />
    </g>
  );
}

/** Jak velký výřez se kreslí; výška se dopočítá podle tvaru trati. */
const SIRKA = 640;
const NEJVYSSI = 640;

/** Nejmenší plocha kolem trati, aby jedna bóje nebo těsný trojúhelník
 *  nevyšly na maximální přiblížení, kde není vidět nic než voda. */
const NEJMENSI_ROZPETI_M = 250;

const METRU_NA_STUPEN = 111_320;

/**
 * Co se píše k prvku na mapě. U značky jméno bóje, u dvoukoncového prvku
 * jeho druh — „start" říká víc než „start levý – start pravý".
 */
function popisekPrvku(p: PrvekNaMape) {
  // Jednokoncový prvek je ta bóje, takže se píše její jméno. U prvku mezi
  // dvěma konci říká víc jeho druh: „start" místo „start levý – start pravý".
  if (!dvaBody(p.typ)) return p.konce[0].nazev;
  if (p.typ === "Start") return "start";
  if (p.typ === "Cil") return "cíl";
  return nazevTypu(p.typ);
}

/** Hezké číslo pro měřítko: 10, 20, 50, 100, 200, 500 m… */
function kulateMetry(hrube: number) {
  const rad = 10 ** Math.floor(Math.log10(Math.max(hrube, 1)));
  const podil = hrube / rad;
  return (podil >= 5 ? 5 : podil >= 2 ? 2 : 1) * rad;
}

export function MapkaTrati({ prvky }: { prvky: PrvekNaMape[] }) {
  if (prvky.length === 0) return null;

  const vsechnyKonce = prvky.flatMap((p) => p.konce);
  const sirky = vsechnyKonce.map((b) => b.sirka);
  const delky = vsechnyKonce.map((b) => b.delka);
  const stredSirka = (Math.min(...sirky) + Math.max(...sirky)) / 2;
  const stredDelka = (Math.min(...delky) + Math.max(...delky)) / 2;
  const kosinus = Math.cos((stredSirka * Math.PI) / 180);

  // Rozpětí trati v metrech, s rezervou na popisky a kus vody kolem.
  const rozpetiM = Math.max(
    (Math.max(...sirky) - Math.min(...sirky)) * METRU_NA_STUPEN,
    (Math.max(...delky) - Math.min(...delky)) * METRU_NA_STUPEN * kosinus,
    NEJMENSI_ROZPETI_M,
  ) * 1.4;

  // Přiblížení, při kterém se rozpětí vejde do šířky výřezu. Metrů na pixel
  // je na rovníku 156543 a s šířkou se zmenšuje o kosinus.
  const naPixelPriZ0 = 156_543.03 * kosinus;
  const idealni = Math.log2((naPixelPriZ0 * SIRKA) / rozpetiM);
  const z = Math.max(Z_NEJMENE, Math.min(Z_NEJVIC, Math.floor(idealni)));

  const stred = doPixelu(stredSirka, stredDelka, z);
  const naPlatno = (sirka: number, delka: number) => {
    const p = doPixelu(sirka, delka, z);
    return { x: p.x - stred.x + SIRKA / 2, y: p.y - stred.y };
  };

  // Prvek se kreslí svými konci a **uzlem** — tím místem, kterým vede
  // dráha. U značky je to ona sama, u brány a čáry **střed mezi konci**.
  // Dřív vedla spojnice z konce na konec, takže kreslila start jako nohu
  // trati (Filip, 9. 10. 2026).
  const body = prvky.map((prvek) => {
    const k = prvek.konce.map((x) => ({ ...x, ...naPlatno(x.sirka, x.delka) }));
    const uzel = {
      x: k.reduce((s, x) => s + x.x, 0) / k.length,
      y: k.reduce((s, x) => s + x.y, 0) / k.length,
    };
    return { prvek, konce: k, uzel };
  });

  // Výška podle toho, jak je trať vysoká — ať se nekreslí pás vody navíc.
  const rozpetiY =
    Math.max(...body.flatMap((b) => b.konce.map((k) => Math.abs(k.y)))) * 2 + 120;
  const vyska = Math.round(Math.min(NEJVYSSI, Math.max(320, rozpetiY)));
  const posunute = body.map((b) => ({
    ...b,
    konce: b.konce.map((k) => ({ ...k, y: k.y + vyska / 2 })),
    uzel: { ...b.uzel, y: b.uzel.y + vyska / 2 },
  }));

  // Dlaždice, které výřez překrývají. Levý horní roh výřezu ve světě:
  const levo = stred.x - SIRKA / 2;
  const nahore = stred.y - vyska / 2;
  const naSvete = 2 ** z;
  const odX = Math.floor(levo / DLAZDICE);
  const doX = Math.floor((levo + SIRKA) / DLAZDICE);
  const odY = Math.floor(nahore / DLAZDICE);
  const doY = Math.floor((nahore + vyska) / DLAZDICE);

  const dlazdice: { klic: string; cesta: string; x: number; y: number }[] = [];
  for (let tx = odX; tx <= doX; tx++) {
    for (let ty = odY; ty <= doY; ty++) {
      if (tx < 0 || ty < 0 || tx >= naSvete || ty >= naSvete) continue;
      dlazdice.push({
        klic: `${z}-${tx}-${ty}`,
        cesta: `/dlazdice/${z}/${tx}/${ty}`,
        x: tx * DLAZDICE - levo,
        y: ty * DLAZDICE - nahore,
      });
    }
  }

  // <b>Start a cíl bývají tytéž dvě bóje</b> a dřív se jejich popisky
  // kreslily přes sebe, takže na mapě stálo nečitelné „15cíl". Prvky se
  // stejným uzlem se proto kreslí jednou a popisek se spojí: „1. start ·
  // 5. cíl". Je to i pravda o vodě — stojí tam jedna čára, ne dvě.
  const skupiny = [
    ...posunute
      .reduce((m, b) => {
        const klic = `${b.uzel.x.toFixed(0)},${b.uzel.y.toFixed(0)}`;
        return m.set(klic, [...(m.get(klic) ?? []), b]);
      }, new Map<string, typeof posunute>())
      .values(),
  ].map((clenove) => {
    const podlePoradi = [...clenove].sort((a, b) => a.prvek.poradi - b.prvek.poradi);
    return { ...podlePoradi[0], clenove: podlePoradi };
  });

  const vPoradi = [...posunute].sort((a, b) => a.prvek.poradi - b.prvek.poradi);

  const metruNaPixel = naPixelPriZ0 / 2 ** z;

  // <b>Spojnice vede po vodě, ne přímo</b> (Filip, 11. 10. 2026: *„ta rovná
  // spojnice je hloupá, naznak trati působí přirozeněji"*). Orlík je
  // zatopené údolí, takže přímka mezi bójemi vede přes kopec častěji, než
  // by člověk řekl — naměřené podíly jsou v `lib/voda.ts`. Kde se cesta po
  // vodě nenajde, čára chybí: *„pokud by to byl problém, tak raději bez
  // čáry"*.
  const uzly: UzelTrati[] = vPoradi.map((b) => ({
    poloha: {
      sirka: b.konce.reduce((s, k) => s + k.sirka, 0) / b.konce.length,
      delka: b.konce.reduce((s, k) => s + k.delka, 0) / b.konce.length,
    },
    // Bok jen u typů, kterým patří. U brány ho data mít nemají, a kdyby
    // ho přesto přinesla, mapa by kreslila rozhodnutí, které nikdo neudělal.
    bok: stranaPatri(b.prvek.typ) ? b.prvek.strana ?? null : null,
    // Jen u otočné bóje se opravdu točí. Průjezdní se mine a odskok taky.
    otaci: b.prvek.typ === "OtocnaBoje",
  }));
  const tahy = spojniceTrati(uzly, metruNaPixel).map((tah) =>
    tah
      .map((p) => {
        const q = naPlatno(p.sirka, p.delka);
        return `${q.x.toFixed(1)},${(q.y + vyska / 2).toFixed(1)}`;
      })
      .join(" "),
  );
  const meritkoM = kulateMetry((SIRKA / 4) * metruNaPixel);
  const meritkoPx = meritkoM / metruNaPixel;

  const popis = vPoradi
    .map((b) => `${b.prvek.poradi}. ${nazevTypu(b.prvek.typ)} ${b.konce.map((k) => k.nazev).join(" – ")}`)
    .join(", ");

  return (
    <figure className="mapka-trati">
      <svg
        viewBox={`0 0 ${SIRKA} ${vyska}`}
        role="img"
        aria-labelledby="mapka-nazev mapka-popis"
        className="mapka"
      >
        <title id="mapka-nazev">Mapka trati</title>
        <desc id="mapka-popis">
          {`Bóje v pořadí: ${popis}. Sever je nahoře, měřítko ${meritkoM} m.`}
        </desc>

        {dlazdice.map((d) => (
          <image
            key={d.klic}
            href={d.cesta}
            x={d.x}
            y={d.y}
            width={DLAZDICE}
            height={DLAZDICE}
          />
        ))}

        {/* Spojnice v pořadí objíždění, po vodě a u značek s obloučkem na
            tu stranu, kterou se míjí. Čárkovaná a tenká schválně: je to
            pořadí a hrubá cesta, ne vytyčená dráha — loď křižuje a u břehu
            nejede. Tahů je víc než jeden, kdykoli nějaká noha cestu
            nenajde; tam čára prostě chybí. */}
        {tahy.map((body, i) => (
          <polyline
            key={`spojnice-${i}`}
            points={body}
            fill="none"
            stroke="#c1121f"
            strokeWidth="1.75"
            strokeDasharray="7 5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* Čára a brána jako **plná úsečka mezi konci**: tohle je ta čára,
            ne noha trati. Dráha výš se jí dotýká uprostřed.
            Šipku směru průjezdu schválně nekreslíme — směr v datech zatím
            není a vymyslet si ho by byla přesně ta lež, kvůli které prvky
            vznikly. */}
        {skupiny
          .filter((b) => b.konce.length === 2)
          .map((b) => (
            <line
              key={`konce-${b.prvek.klic}`}
              x1={b.konce[0].x}
              y1={b.konce[0].y}
              x2={b.konce[1].x}
              y2={b.konce[1].y}
              stroke="#1a1a1a"
              strokeWidth="2.5"
              strokeOpacity="0.85"
            />
          ))}

        {skupiny.map((b) => (
          <g key={b.prvek.klic}>
            {/* Bílý lem, ať je konec vidět nad vodou i nad lesem. */}
            {/* Každý konec je značka, i plavidlo a molo — ty mají svůj
                tvar podle značení. Prázdné kolečko pro „něco, co není
                bóje" tu bývalo do doby, než značení existovalo. */}
            {b.konce.map((k, i) => (
              <ZnakBoje key={i} x={k.x} y={k.y} barva={k.barva} tvar={k.tvar} znaceni={k.znaceni} />
            ))}
            {/* Šipka průjezdu u startu. Dřív se nekreslila vůbec, protože
                směr v datech nebyl a vymyslet si ho by byla lež; od
                10. 10. 2026 ho prvek nese. */}
            {b.prvek.smer && <SipkaSmeru x={b.uzel.x} y={b.uzel.y} smer={b.prvek.smer} />}
            {/* Popisek u uzlu, tedy tam, kudy se pluje. */}
            <text
              x={b.uzel.x}
              y={b.uzel.y - 15}
              textAnchor="middle"
              fontSize="14"
              fill="#1a1a1a"
              stroke="#fff"
              strokeWidth="3.5"
              paintOrder="stroke"
            >
              {b.clenove.map((c) => `${c.prvek.poradi}. ${popisekPrvku(c.prvek)}`).join(" · ")}
            </text>
          </g>
        ))}

        {/* Měřítko. Bez něj je mapka bez rozměru jen obrázek. */}
        <g stroke="#1a1a1a" strokeWidth="2" fill="#1a1a1a">
          <line x1={16} y1={vyska - 16} x2={16 + meritkoPx} y2={vyska - 16} />
          <line x1={16} y1={vyska - 21} x2={16} y2={vyska - 11} />
          <line x1={16 + meritkoPx} y1={vyska - 21} x2={16 + meritkoPx} y2={vyska - 11} />
          <text
            x={16 + meritkoPx / 2}
            y={vyska - 23}
            textAnchor="middle"
            fontSize="12"
            stroke="#fff"
            strokeWidth="3"
            paintOrder="stroke"
          >
            {meritkoM} m
          </text>
        </g>
      </svg>

      {/* Uvedení zdroje chtějí pravidla OSM a je to i slušnost. */}
      <figcaption className="detail">
        Podklad{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          © přispěvatelé OpenStreetMap
        </a>
        . Sever nahoře. Mapka se neposouvá — ukazuje právě trať a kus vody
        kolem; kde přesně bóje leží, otevře odkaz na mapu u každé z nich.
      </figcaption>
    </figure>
  );
}
