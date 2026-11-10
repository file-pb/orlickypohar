// Tolik Reactu Native, kolik potřebuje logika mimo obrazovku: systémový
// dialog a odkaz do nastavení. Dialog se sám nerozhodne — test na něj
// klepne přes `klepni`, aby šlo zkoušet obě odpovědi.
export const Platform = { OS: 'android', select: (v) => v.android ?? v.default };

let posledni = null;
export const Alert = {
  alert(nadpis, text, tlacitka, volby) {
    posledni = { nadpis, text, tlacitka: tlacitka ?? [], volby: volby ?? {} };
  },
};
export function posledniDialog() { return posledni; }
export function zapomenDialog() { posledni = null; }

/** Klepne na tlačítko podle jeho textu. */
export function klepni(text) {
  const t = (posledni?.tlacitka ?? []).find((x) => x.text === text);
  if (!t) throw new Error(`v dialogu není tlačítko „${text}"`);
  t.onPress?.();
}

/** Zavře dialog mimo tlačítka — na Androidu tlačítkem zpět. */
export function zavri() { posledni?.volby?.onDismiss?.(); }

export const Linking = { openSettings: async () => {} };
