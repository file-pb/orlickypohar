/**
 * Barvy má appka stejné jako web — je to jeden produkt, jen dvěma dveřmi.
 * Zdroj je `web/app/globals.css`; když se změní tam, patří změnit i tady.
 * Rozchod hlídá `tools/kontrola-tokenu.py` v CI: každý klíč odsud musí být
 * na webu pod stejným jménem i hodnotou, a padne-li to, <b>nenasadí se nic</b>.
 *
 * <b>`vystraha` není webový `--pozor`.</b> Webový jantar je výplň, na které
 * stojí tmavé písmo (`--na-pozoru`); tenhle je o dva stupně tmavší, protože
 * nese <b>bílé</b> písmo na panelu poslední minuty a zároveň se sám čte na
 * papíře. Měřeno 29. 10. 2026. Proto má vlastní jméno — jedno jméno pro dvě
 * role byl ten rozchod, kvůli kterému kontrola 29. 10. odpoledne spadla.
 *
 * <b>Barvy tříd</b> (`tridaRace` a spol.) web dosud držel jen ve znacích
 * tříd. Cílová obrazovka appky jimi od 8. 11. 2026 značí kategorii lodi
 * barevným okrajem dlaždice, takže z nich musely být tokeny — a znaky na
 * webu si je teď berou odtamtud, aby barva třídy zůstala jedna.
 */

export const Colors = {
  light: {
    pozadi: '#fbfaf8',
    papir: '#ffffff',
    text: '#1a1d21',
    tlumeny: '#5d666f',
    linka: '#e2e0dc',
    voda: '#1f6f8b',
    zvyrazneni: '#f3f0ea',
    stavVypsany: '#1c7d4d',
    stavZruseny: '#a8433a',
    procedura: '#1f6f8b',
    vystraha: '#8a5000',
    jede: '#2f6b4f',
    vyzvaZnameni: '#ffffff',
    pripravaZnameni: '#f2c14e',
    minutaZnameni: '#ffffff',
    tridaRace: '#c41e3a',
    tridaNad7m: '#12344e',
    tridaPod7m: '#708090',
  },
  dark: {
    pozadi: '#14171a',
    papir: '#1b1f23',
    text: '#edeae5',
    tlumeny: '#9aa3ac',
    linka: '#2c3238',
    voda: '#6bb3cc',
    zvyrazneni: '#232830',
    stavVypsany: '#58c98c',
    stavZruseny: '#e2726a',
    procedura: '#16495c',
    vystraha: '#c9922f',
    jede: '#58c98c',
    vyzvaZnameni: '#ffffff',
    pripravaZnameni: '#f2c14e',
    minutaZnameni: '#ffffff',
    tridaRace: '#e25a6d',
    tridaNad7m: '#7fa7c9',
    tridaPod7m: '#a3b1bf',
  },
} as const;

/** Světlá a tmavá sada mají stejné klíče, ale různé hodnoty — proto ne `typeof`. */
export type Barvy = Record<keyof (typeof Colors)['light'], string>;
