import { useId } from 'react';
import { Animated } from 'react-native';

import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

import { useHoupani } from '@/hooks/use-houpani';
import type { components } from '@/lib/schema';

type S = components['schemas'];
type BarvaBoje = S['BarvaBoje'];
type TvarBoje = S['TvarBoje'];
type DruhZnaceni = S['DruhZnaceni'];

/**
 * Jak bóje vypadá na vodě: barva a tvar — pro appku.
 *
 * <b>Je to druhá kopie, ne sdílená knihovna</b> (pravidlo repozitáře:
 * knihovna se zakládá až u třetí). Originál je `web/app/znak-boje.tsx`
 * a kreslí totéž; liší se jen tím, čím se kreslí — web značkami SVG,
 * appka komponentami `react-native-svg`. Geometrie je opsaná bod po
 * bodu, takže se tvar nesmí na dvou klientech lišit; když se tady něco
 * změní, musí se to změnit i tam.
 *
 * <b>Výchozí hodnoty jsou pro kartu, ne pro mapu</b> (nález B druhého
 * konzilia). Bez zapsané barvy se kreslí tlumenou, ne červenou — červená
 * znamená pravou stranu plavební dráhy a celý seznam by ji nesl, protože
 * `Barva` je nepovinná schválně. Lem se předává, protože bílý lem je na
 * `papir` 1,00:1 a žlutá, bílá, růžová i oranžová silueta by zůstaly pod
 * mezí 3:1.
 */

/**
 * Barva pro kreslení. <b>Ne proměnné motivu:</b> zelená bóje je zelená
 * i na tmavém pozadí — je to vlastnost předmětu ve vodě, ne rozhraní.
 */
export const BARVY: Record<NonNullable<BarvaBoje>, string> = {
  Cervena: '#c1121f',
  Zelena: '#1b7f4b',
  Zluta: '#e8b400',
  Oranzova: '#e8740c',
  Bila: '#ffffff',
  Modra: '#1f5fa8',
  Ruzova: '#f06ba8',
};

export const NAZVY_BAREV: Record<NonNullable<BarvaBoje>, string> = {
  Cervena: 'červená',
  Zelena: 'zelená',
  Zluta: 'žlutá',
  Oranzova: 'oranžová',
  Bila: 'bílá',
  Modra: 'modrá',
  Ruzova: 'růžová',
};

export const NAZVY_ZNACENI: Record<string, string> = {
  DrahaPrava: 'pravá strana dráhy',
  DrahaLeva: 'levá strana dráhy',
  DrahaSport: 'sport',
  DrahaZakaz: 'zákaz vplutí',
  NaseBoje: '',
  Plavidlo: 'plavidlo',
  ObjektNaBrehu: 'objekt na břehu',
  zadne: '',
};

export const NAZVY_TVARU: Record<NonNullable<TvarBoje>, string> = {
  Valcova: 'válcová',
  Kuzelova: 'kuželová',
  Kulova: 'kulová',
  SferickyVrsek: 'válec se sférickým vrškem',
  Plovatka: 'plovatka',
  Jiny: 'jiný tvar',
  Plamenak: 'plameňák',
};

/**
 * Kolik plastičnosti značka unese.
 *
 * <b>Od 24. 11. 2026 ji nedělá druhá kopie tvaru, ale přechod barvy.</b>
 * Kopie uměla objem jen u koule; u válce a kužele z ní byl bílý flek,
 * který se tvaru nedržel. Těleso teď má světlou a tmavou stranu z téže
 * barvy, šev nebo obrubu v místě, kde se láme, a stín na hladině —
 * a `plasticita` rozhoduje už jen o odlesku, který na řádce o osmnácti
 * bodech nemá kde být.
 */
export type Plasticita = 'zadna' | 'objem' | 'odlesk';

/**
 * Smíchá barvu s bílou nebo černou. Světlo a stín musí vyjít z barvy
 * samotné: pevný bílý nádech by na žluté nebyl vidět a na modré by
 * barvu přebil.
 */
function mix(barva: string, cil: string, podil: number): string {
  if (barva.length !== 7 || barva[0] !== '#') return barva;
  const slozky = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = slozky(barva);
  const b = slozky(cil);
  return `#${a
    .map((v, i) =>
      Math.round(v + (b[i] - v) * podil)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/**
 * Plameňák v souřadnicích návrhu (28 × 36); kreslí se přes transformaci.
 *
 * <b>Je to nafukovací kruh s krkem, ne stojící pták</b> (Filip poslal
 * fotku, 24. 11. 2026). Do té doby to byla silueta ptáka od země, což
 * je jiná věc než to, co na Izolepě plave: tlustý kruh na hladině,
 * z jeho levé strany vybíhá krk, hlava se dívá doleva a zobák je černý.
 *
 * Tři kusy, protože každý má jinou výplň: krk s hlavou nese přechod
 * těla, kruh taky, ale kreslí se **po** krku, aby ho zakryl, a zobák
 * je černý.
 */
const PLAMENAK_KRK =
  'M 15.6 21.2 C 13.4 17.6, 12.2 12.6, 13 9.6' +
  ' C 13.6 7.2, 12.2 5.4, 10 5.6 C 7.6 5.8, 6.4 7.6, 6.6 9.4' +
  ' L 6.9 12.3 C 7.3 14.1, 9.4 14.6, 10.2 16.2' +
  ' C 11 17.8, 11.4 19.6, 11.6 21.4 Z';

/** Kruh: vnější ovál s dírou, aby byl vidět jako duše, ne jako placka. */
const PLAMENAK_KRUH =
  'M 3.4 23.6 A 10.8 7.2 0 1 0 25 23.6 A 10.8 7.2 0 1 0 3.4 23.6 Z' +
  ' M 10.8 23.9 A 5 3.2 0 1 0 20.8 23.9 A 5 3.2 0 1 0 10.8 23.9 Z';

const PLAMENAK_ZOBAK = 'M 2.5 12.9 L 6.8 9.3 L 6.9 12.3 Z';

/**
 * Obrys tělesa. <b>Všechno sedí dolním okrajem na hladině</b>
 * (`y + 0,85 r`), ne na středu pole: řádka pod sebou tím drží vodorysku
 * a značky vypadají jako věci ve vodě, ne jako ikony na stejné ose.
 *
 * Dno je viditelný oblouk, ne rovná čára — válec ani kužel bez něj
 * nevypadají kulatě, i když kulaté jsou.
 */
function cesta(tvar: TvarBoje | undefined, x: number, y: number, r: number): string {
  const h = y + 0.85 * r;
  switch (tvar) {
    case 'Kuzelova':
      // <b>Špička skoro ostrá</b> (Filip, 24. 11. 2026): zaoblení 0,08 r.
      // Kužel je kužel; větší rádius z něj dělal nafukovací patník.
      return (
        `M ${x - 0.87 * r} ${h} L ${x - 0.08 * r} ${y - 1.1 * r}` +
        ` Q ${x} ${y - 1.2 * r} ${x + 0.08 * r} ${y - 1.1 * r} L ${x + 0.87 * r} ${h}` +
        ` A ${0.87 * r} ${0.3 * r} 0 0 1 ${x - 0.87 * r} ${h} Z`
      );
    case 'Valcova':
      return (
        `M ${x - 0.75 * r} ${h} V ${y - 0.5 * r}` +
        ` A ${0.75 * r} ${0.3 * r} 0 0 1 ${x + 0.75 * r} ${y - 0.5 * r} V ${h}` +
        ` A ${0.75 * r} ${0.3 * r} 0 0 1 ${x - 0.75 * r} ${h} Z`
      );
    case 'SferickyVrsek':
      // Poklop na sukni, ne samotná půlelipsa (Filip, 11. 10. 2026:
      // *„vypadá spíš jako polokoule poklop a uprostřed je nápis sport"*).
      // U Orlíku se jí říká Mimoň. Nápis se nekreslí: při osmnácti
      // bodech by z něj byla šmouha.
      return (
        `M ${x - 0.78 * r} ${h} V ${y}` +
        ` A ${0.78 * r} ${0.85 * r} 0 0 1 ${x + 0.78 * r} ${y} V ${h}` +
        ` A ${0.78 * r} ${0.3 * r} 0 0 1 ${x - 0.78 * r} ${h} Z`
      );
    case 'Plovatka':
      // Tyč s plovákem u hladiny, ne úzký obdélník.
      return (
        `M ${x - 0.18 * r} ${y + 0.45 * r} V ${y - 0.95 * r}` +
        ` Q ${x} ${y - 1.2 * r} ${x + 0.18 * r} ${y - 0.95 * r} V ${y + 0.45 * r} Z` +
        ` M ${x - 0.5 * r} ${y + 0.42 * r}` +
        ` A ${0.5 * r} ${0.42 * r} 0 1 0 ${x + 0.5 * r} ${y + 0.42 * r}` +
        ` A ${0.5 * r} ${0.42 * r} 0 1 0 ${x - 0.5 * r} ${y + 0.42 * r} Z`
      );
    case 'Jiny':
      // <b>Zaoblený hranol, ne kolečko.</b> Do 24. 11. 2026 kreslil
      // „jiný tvar" totéž co kulová, takže obrazovka tvrdila kouli
      // o značce, u které nikdo tvar neurčil.
      return (
        `M ${x - 0.72 * r} ${y - 0.3 * r} A ${0.45 * r} ${0.45 * r} 0 0 1 ${x - 0.27 * r} ${y - 0.75 * r}` +
        ` H ${x + 0.27 * r} A ${0.45 * r} ${0.45 * r} 0 0 1 ${x + 0.72 * r} ${y - 0.3 * r}` +
        ` V ${h - 0.45 * r} A ${0.45 * r} ${0.45 * r} 0 0 1 ${x + 0.27 * r} ${h}` +
        ` H ${x - 0.27 * r} A ${0.45 * r} ${0.45 * r} 0 0 1 ${x - 0.72 * r} ${h - 0.45 * r} Z`
      );
    default:
      // Kulová i neuvedený tvar: koule sedící na hladině.
      return (
        `M ${x - 0.85 * r} ${h - 0.85 * r}` +
        ` A ${0.85 * r} ${0.85 * r} 0 1 1 ${x + 0.85 * r} ${h - 0.85 * r}` +
        ` A ${0.85 * r} ${0.85 * r} 0 1 1 ${x - 0.85 * r} ${h - 0.85 * r} Z`
      );
  }
}

/** Čím se těleso láme: obruba válce, šev poklopu, hrana hranolu. */
function hrany(tvar: TvarBoje | undefined, x: number, y: number, r: number) {
  const tenky = { fill: 'none', stroke: 'rgba(0,0,0,0.3)', strokeWidth: Math.max(0.8, r * 0.085) } as const;
  switch (tvar) {
    case 'Valcova':
      return (
        <Ellipse
          cx={x}
          cy={y - 0.5 * r}
          rx={0.75 * r}
          ry={0.3 * r}
          fill="rgba(255,255,255,0.22)"
          stroke="rgba(0,0,0,0.25)"
          strokeWidth={Math.max(0.7, r * 0.07)}
        />
      );
    case 'SferickyVrsek':
      return <Path d={`M ${x - 0.78 * r} ${y} A ${0.78 * r} ${0.22 * r} 0 0 0 ${x + 0.78 * r} ${y}`} {...tenky} />;
    case 'Kuzelova':
      return (
        <Path
          d={`M ${x - 0.55 * r} ${y + 0.1 * r} Q ${x} ${y + 0.34 * r} ${x + 0.55 * r} ${y + 0.1 * r}`}
          {...tenky}
        />
      );
    case 'Jiny':
      return <Path d={`M ${x - 0.72 * r} ${y + 0.5 * r} H ${x + 0.72 * r}`} {...tenky} />;
    default:
      return null;
  }
}

function ZakladniZnak({
  x,
  y,
  r = 8,
  barva,
  tvar,
  znaceni,
  vychoziVypln,
  lem,
  silaLemu = 3,
  plasticita = 'objem',
}: {
  x: number;
  y: number;
  r?: number;
  barva?: BarvaBoje;
  tvar?: TvarBoje;
  znaceni?: DruhZnaceni;
  vychoziVypln: string;
  lem: string;
  /**
   * Šířka lemu v jednotkách kresby. <b>Nestálá schválně:</b> tři
   * jednotky, které velkému náhledu sluší, ukrojí z malé siluety
   * čtvrtinu poloměru a vylezou za okraj pole.
   */
  silaLemu?: number;
  plasticita?: Plasticita;
}) {
  // <b>Id přechodu musí být jedinečné na instanci.</b> Mapka kreslí
  // desítky značek do jednoho SVG a dva stejné `id` v jednom dokumentu
  // jsou nevalidní — odkaz by se svezl na ten první. Dvojtečky, které
  // `useId` vrací, se v `url(#…)` nedají použít.
  const id = `zn${useId().replace(/:/g, '')}`;
  const vypln = barva ? BARVY[barva] : vychoziVypln;

  // Plavidlo: lodička. Hýbe se a není to bóje, takže nesmí vypadat jako
  // něco zakotveného.
  if (znaceni === 'Plavidlo')
    return (
      <G>
        <Path
          d={`M ${x - r} ${y + r * 0.25} H ${x + r} L ${x + r * 0.65} ${y + r} H ${x - r * 0.6} Z`}
          fill="#dfe5ea"
          stroke={lem}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <Path d={`M ${x} ${y + r * 0.2} V ${y - r * 1.15}`} stroke={lem} strokeWidth={2.4} />
        <Path
          d={`M ${x + r * 0.16} ${y - r} L ${x + r * 0.95} ${y + r * 0.1} H ${x + r * 0.16} Z`}
          fill="#dfe5ea"
          stroke={lem}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </G>
    );

  // Objekt na břehu: kapka. Je to místo, ne těleso ve vodě.
  if (znaceni === 'ObjektNaBrehu')
    return (
      <Path
        d={
          `M ${x} ${y - r * 1.15} C ${x} ${y - r * 1.15}, ${x + r} ${y - r * 0.1}, ${x + r} ${y + r * 0.3}` +
          ` A ${r} ${r} 0 0 1 ${x - r} ${y + r * 0.3}` +
          ` C ${x - r} ${y - r * 0.1}, ${x} ${y - r * 1.15}, ${x} ${y - r * 1.15} Z`
        }
        fill="#9aa6af"
        stroke={lem}
        strokeWidth={2.4}
      />
    );

  const d = cesta(tvar, x, y, r);
  const h = y + 0.85 * r;

  // <b>Na mapce zůstává značka plochá</b> (Filip, 15. 10. 2026: *„na mapce
  // tam to musí být přehledné a jasné: jednoduchou, plochou"*). Osm pixelů
  // nad fotomapou neunese ani přechod, ani stín na hladině.
  if (plasticita === 'zadna')
    return <Path d={d} fill={vypln} stroke={lem} strokeWidth={silaLemu} strokeLinejoin="round" />;

  const lesk =
    plasticita !== 'odlesk' ? null : (
      <Ellipse
        cx={x - 0.32 * r}
        cy={y - 0.3 * r}
        rx={0.14 * r}
        ry={0.33 * r}
        fill="#ffffff"
        opacity={0.7}
        transform={`rotate(-16 ${x - 0.32 * r} ${y - 0.3 * r})`}
      />
    );

  const telo = (
    <>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={mix(vypln, '#ffffff', 0.42)} />
          <Stop offset="0.45" stopColor={vypln} />
          <Stop offset="1" stopColor={mix(vypln, '#000000', 0.38)} />
        </LinearGradient>
        <ClipPath id={`c${id}`}>
          <Path d={d} />
        </ClipPath>
      </Defs>
      <Ellipse cx={x} cy={h} rx={0.9 * r} ry={0.17 * r} fill="rgba(0,0,0,0.45)" />
    </>
  );

  if (tvar === 'Plamenak') {
    // Plameňák je kreslený v poli 28 × 36, kde vznikl; sem se dostane
    // transformací, aby se tvar nemusel přepočítávat bod po bodu
    // a rozejít se přitom s webem.
    const k = r / 12;
    return (
      <G>
        {telo}
        <G transform={`translate(${x - 14 * k} ${y - 18 * k}) scale(${k})`}>
          <Path
            d={PLAMENAK_KRK}
            fill={`url(#${id})`}
            stroke={lem}
            strokeWidth={silaLemu / k}
            strokeLinejoin="round"
          />
          <Path d={PLAMENAK_ZOBAK} fill="#1b1b1b" stroke={lem} strokeWidth={(silaLemu * 0.6) / k} strokeLinejoin="round" />
          <Path
            d={PLAMENAK_KRUH}
            fill={`url(#${id})`}
            fillRule="evenodd"
            stroke={lem}
            strokeWidth={silaLemu / k}
            strokeLinejoin="round"
          />
          {/* Oko se kreslí, jen když má kam: při dvanácti bodech poloměru
              je z bělma a zornice jedna tečka a vypadá to jako vada. */}
          {r >= 11 && (
            <>
              <Circle cx={9.3} cy={8.4} r={1.35} fill="#ffffff" />
              <Circle cx={9.1} cy={8.5} r={0.62} fill="#1b1b1b" />
            </>
          )}
        </G>
      </G>
    );
  }

  return (
    <G>
      {telo}
      <Path d={d} fill={`url(#${id})`} stroke={lem} strokeWidth={silaLemu} strokeLinejoin="round" />
      <G clipPath={`url(#c${id})`}>
        {hrany(tvar, x, y, r)}
        {lesk}
      </G>
    </G>
  );
}

/**
 * Značka bóje. Objem nese přechod barvy po tělese, ne druhá kopie tvaru
 * — ta uměla kouli a u válce z ní byl flek.
 */
export function ZnakBoje({
  x,
  y,
  r = 8,
  barva,
  tvar,
  znaceni,
  plasticita = 'zadna',
  vychoziVypln,
  lem,
  silaLemu,
}: {
  x: number;
  y: number;
  r?: number;
  barva?: BarvaBoje;
  tvar?: TvarBoje;
  znaceni?: DruhZnaceni;
  plasticita?: Plasticita;
  vychoziVypln: string;
  lem: string;
  /** Šířka lemu; viz `ZakladniZnak`. Bez ní platí tři jednotky. */
  silaLemu?: number;
}) {
  return (
    <ZakladniZnak
      x={x}
      y={y}
      r={r}
      barva={barva}
      tvar={tvar}
      znaceni={znaceni}
      vychoziVypln={vychoziVypln}
      lem={lem}
      silaLemu={silaLemu}
      plasticita={plasticita}
    />
  );
}

/**
 * Silueta do žlábku osy na řádce trati: <b>28 × 36</b>.
 *
 * <b>Proč ne menší</b> (rozhodnutí 2 druhého konzilia): při sedmnácti
 * bodech jsou od sebe tvary dva až tři body, při šestatřiceti je kužel
 * proti válci třináct.
 *
 * <b>Poloměr 13 s lemem 3 se do pole nevešel</b> (24. 11. 2026). Mez
 * „nad 13 ne" počítala s tvarem, ne s jeho obrysem, a lem leží půlkou
 * šířky vně cesty: plovatka je `2,8 r`, tedy 36,4 — sama o čtyři
 * desetiny přes pole a s lemem o **1,7 nahoře i dole**; plameňák sahá
 * do `-1,46 r` a přetékal o **1,6**. Ořezaný obrys je přesně to, kvůli
 * čemu ty ikonky vypadaly hrubě. Proto `12` a lem `1,6`: plovatka
 * končí na 0,4 od kraje, kulová má na šířku 24 z 28 a kuželi se vejde
 * i špice i s jejím sražením.
 *
 * Není to terč: klepe se na celý řádek, takže mez 44 sem neplatí —
 * platí jen čitelnost.
 */
export function SiluetaZnacky({
  barva,
  tvar,
  znaceni,
  vychoziVypln,
  lem,
}: {
  barva?: BarvaBoje;
  tvar?: TvarBoje;
  znaceni?: DruhZnaceni;
  /** Výplň bez zapsané barvy — na kartě `tlumeny`. */
  vychoziVypln: string;
  /** Lem dopočítaný z podkladu karty. */
  lem: string;
}) {
  // Hook musí běžet pokaždé, i když se nakonec nekreslí nic — pravidlo
  // pořadí hooků nezná výjimku pro prázdnou značku.
  const houpani = useHoupani();

  // <b>Bez barvy, tvaru i značení se nekreslí nic</b> (srovnání s webem,
  // 22. 11. 2026). Dosud tu vyšla tlumená silueta, tedy kolečko tvrdící,
  // že značka je kulová — a kulatá je ve skutečnosti ta neznalost.
  // Prázdno aspoň nelže; žlábek řádky si šířku drží sám.
  if (!barva && !tvar && !znaceni) return null;

  const popis =
    [NAZVY_ZNACENI[znaceni ?? 'zadne'], barva && NAZVY_BAREV[barva], tvar && NAZVY_TVARU[tvar]]
      .filter(Boolean)
      .join(', ') || 'značka';

  return (
    <Animated.View style={{ transform: houpani }} accessibilityLabel={popis}>
      <Svg width={28} height={36} viewBox="0 0 28 36">
        <ZnakBoje
          x={14}
          y={18}
          r={12}
          barva={barva}
          tvar={tvar}
          znaceni={znaceni}
          plasticita="objem"
          vychoziVypln={vychoziVypln}
          lem={lem}
          silaLemu={1.6}
        />
      </Svg>
    </Animated.View>
  );
}
