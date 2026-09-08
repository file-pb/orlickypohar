/**
 * Barvy má appka stejné jako web — je to jeden produkt, jen dvěma dveřmi.
 * Zdroj je `web/app/globals.css`; když se změní tam, patří změnit i tady.
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
  },
  dark: {
    pozadi: '#14171a',
    papir: '#1b1f23',
    text: '#edeae5',
    tlumeny: '#9aa3ac',
    linka: '#2c3238',
    voda: '#6bb3cc',
    zvyrazneni: '#232830',
  },
} as const;

/** Světlá a tmavá sada mají stejné klíče, ale různé hodnoty — proto ne `typeof`. */
export type Barvy = Record<keyof (typeof Colors)['light'], string>;
