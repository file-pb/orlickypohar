import Svg, { Circle, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';

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
 * Kolik plastičnosti značka unese; na kartě stačí `objem`.
 *
 * <b>`odlesk` do 22. 11. 2026 nic nedělal.</b> Typ ho nabízel, komponenta
 * ho neobsluhovala, takže kdo ho předal, dostal tiše `objem` — a to je
 * horší než hodnotu nemít: vypadá to jako volba, která se neprosadila.
 * Doplněno při srovnávání ikonek s webem, odkud je geometrie opsaná.
 */
export type Plasticita = 'zadna' | 'objem' | 'odlesk';

function ZakladniZnak({
  x,
  y,
  r = 8,
  barva,
  tvar,
  znaceni,
  vyplnPrepis,
  bezLemu = false,
  vychoziVypln,
  lem,
  silaLemu = 3,
}: {
  x: number;
  y: number;
  r?: number;
  barva?: BarvaBoje;
  tvar?: TvarBoje;
  znaceni?: DruhZnaceni;
  vyplnPrepis?: string;
  bezLemu?: boolean;
  vychoziVypln: string;
  lem: string;
  /**
   * Šířka lemu v jednotkách kresby. <b>Nestálá schválně:</b> tři
   * jednotky, které velkému náhledu sluší, ukrojí z malé siluety
   * čtvrtinu poloměru a vylezou za okraj pole. U plameňáka to narazilo
   * první a vyřešilo se to tam natvrdo (1,2); tohle je totéž pravidlo
   * pro zbytek tvarů.
   */
  silaLemu?: number;
}) {
  const vypln = vyplnPrepis ?? (barva ? BARVY[barva] : vychoziVypln);
  const spolecne = bezLemu
    ? ({ fill: vypln } as const)
    : ({ fill: vypln, stroke: lem, strokeWidth: silaLemu } as const);

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

  switch (tvar) {
    case 'Kuzelova':
      // Kužel vrcholem vzhůru, jak ho popisuje vyhláška.
      return (
        <Polygon
          points={`${x},${y - r * 1.2} ${x - r},${y + r * 0.8} ${x + r},${y + r * 0.8}`}
          {...spolecne}
        />
      );
    case 'Valcova':
      return <Rect x={x - r * 0.85} y={y - r} width={r * 1.7} height={r * 2} {...spolecne} />;
    case 'Plovatka':
      // Tyč nad hladinou, ne těleso — proto úzká a vysoká.
      return <Rect x={x - r * 0.35} y={y - r * 1.4} width={r * 0.7} height={r * 2.8} {...spolecne} />;
    case 'SferickyVrsek':
      // Poklop, ne válec s koulí nahoře. Tohle je ta, které se u Orlíku
      // říká Mimoň. Nápis se nekreslí: při osmnácti bodech by z něj byla
      // šmouha a tvar sám stačí, aby se nepletl s kulovou.
      return (
        <Path d={`M ${x - r} ${y + r * 0.5} A ${r} ${r * 0.95} 0 0 1 ${x + r} ${y + r * 0.5} Z`} {...spolecne} />
      );
    case 'Plamenak':
      // Jedna silueta, ne poskládané díly: z těla, krku a hlavy zvlášť
      // vyšla kachna, protože lem obkroužil každý kus a krk zmizel.
      // Tenčí lem než jinde — při třech jednotkách je rám širší než krk.
      return (
        <Path
          d={
            `M ${x - r} ${y + r * 0.35}` +
            ` C ${x - r} ${y - r * 0.2}, ${x - r * 0.5} ${y - r * 0.45}, ${x + r * 0.02} ${y - r * 0.4}` +
            ` C ${x + r * 0.34} ${y - r * 0.7}, ${x + r * 0.14} ${y - r}, ${x + r * 0.3} ${y - r * 1.22}` +
            ` C ${x + r * 0.36} ${y - r * 1.42}, ${x + r * 0.64} ${y - r * 1.46}, ${x + r * 0.72} ${y - r * 1.28}` +
            ` L ${x + r * 1.02} ${y - r * 0.9}` +
            ` L ${x + r * 0.68} ${y - r * 0.98}` +
            ` C ${x + r * 0.64} ${y - r * 1.1}, ${x + r * 0.56} ${y - r * 1.12}, ${x + r * 0.52} ${y - r * 1.18}` +
            ` C ${x + r * 0.42} ${y - r * 0.94}, ${x + r * 0.66} ${y - r * 0.68}, ${x + r * 0.32} ${y - r * 0.26}` +
            ` C ${x + r * 0.64} ${y + r * 0.1}, ${x + r * 0.56} ${y + r * 0.95}, ${x - r * 0.12} ${y + r}` +
            ` C ${x - r * 0.72} ${y + r * 1.04}, ${x - r} ${y + r * 0.8}, ${x - r} ${y + r * 0.35} Z`
          }
          fill={vypln}
          stroke={lem}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      );
    default:
      // Kulová, „jiný" i neuvedený tvar: kolečko. Barva nese nejvíc
      // a tvar je nepovinný schválně — na vodě se pípá jednou rukou.
      return <Circle cx={x} cy={y} r={r} {...spolecne} />;
  }
}

/**
 * Značka bóje. Plastičnost se skládá z téhož tvaru nakresleného podruhé:
 * menší, posunutý k levému hornímu okraji a bílý s nízkým krytím — proto
 * drží tvar i u kužele a válce, kde by plošné světlo přeteklo ven.
 *
 * <b>Plavidlo, objekt na břehu a plameňák zůstávají ploché</b>: do jejich
 * obrysu se zmenšená kopie netrefí a vznikla by šmouha.
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
  const zaklad = (
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
    />
  );

  const slozity = znaceni === 'Plavidlo' || znaceni === 'ObjektNaBrehu' || tvar === 'Plamenak';
  if (plasticita === 'zadna' || slozity) return zaklad;

  return (
    <G>
      {zaklad}
      <G opacity={0.3}>
        <ZakladniZnak
          x={x - r * 0.26}
          y={y - r * 0.26}
          r={r * 0.55}
          barva={barva}
          tvar={tvar}
          znaceni={znaceni}
          vychoziVypln={vychoziVypln}
          lem={lem}
          vyplnPrepis="#ffffff"
          bezLemu
        />
      </G>
      {plasticita === 'odlesk' && (
        /* Ostrý odlesk až u velkého náhledu: při osmnácti bodech je z něj
           bílá tečka, která vypadá jako chyba vykreslení. */
        <Ellipse
          cx={x - r * 0.3}
          cy={y - r * 0.38}
          rx={r * 0.26}
          ry={r * 0.17}
          fill="#ffffff"
          opacity={0.55}
        />
      )}
    </G>
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
    <Svg width={28} height={36} viewBox="0 0 28 36" accessibilityLabel={popis}>
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
  );
}
