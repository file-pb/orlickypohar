/**
 * Co má appka na startu dělat nahlas — <b>hlas a klakson zvlášť</b>.
 *
 * <b>Proč dvě volby, ne jedna</b> (Filip, 8. 11. 2026: *„bych udělal, že
 * hlásí zvlášť a troubí taky zvlášť, ať si to může uživatel nastavit
 * sám, jak to chce"*). Do té doby to byl jeden přepínač *Hlásí a troubí*
 * — a ty dvě věci mají na vodě různý smysl. Klakson je takt pro ruku,
 * která mačká houkačku, a dá se chtít i bez mluvení; hlas naopak chce
 * ten, komu telefon leží v kapse a potřebuje slyšet, co se děje, ale
 * troubení by mu přes klubovnu znělo jako znamení, které nikdo nedal.
 *
 * <b>Proč vlastní modul a ne stav v dirigentovi.</b> Volba se nastavuje
 * na jedné obrazovce (<code>/ucet</code>) a používá na jiné (panel
 * startu), a panel se při návratu z nastavení nemusí přemontovat —
 * s `useState` v dirigentovi by tedy jel dál podle staré volby, dokud by
 * obrazovka nezmizela. Proto je to malý externí sklad a obě strany ho
 * čtou přes `useSyncExternalStore`.
 */
import { useSyncExternalStore } from 'react';

import { File, Paths } from 'expo-file-system';

/** Hlásí appka slovy, a troubí klaksonem? Obojí zvlášť. */
export type VolbaZvuku = {
  /** Mluvené hlášení a odpočet číslovkami. */
  hlas: boolean;
  /** Klakson: znamení procedury a dva dlouhé při zrušení. */
  klakson: boolean;
};

/**
 * Soubor, ve kterém si appka volbu pamatuje.
 *
 * Jméno zůstalo z doby jediného přepínače schválně: na telefonech ten
 * soubor leží a přejmenováním by se volba tiše zahodila. Starý tvar
 * <code>{ zapnuto }</code> se čte dál, viz {@link zeSouboru}.
 */
const PAMET = 'dirigent.json';

const VYCHOZI: VolbaZvuku = { hlas: true, klakson: true };

/** Co je v souboru — i ve starém tvaru s jediným přepínačem. */
function zeSouboru(): VolbaZvuku {
  try {
    const f = new File(Paths.document, PAMET);
    if (!f.exists) return VYCHOZI;
    const v = JSON.parse(f.textSync()) as Record<string, unknown>;

    // Nový tvar.
    if (typeof v?.hlas === 'boolean' || typeof v?.klakson === 'boolean') {
      return {
        hlas: typeof v.hlas === 'boolean' ? v.hlas : VYCHOZI.hlas,
        klakson: typeof v.klakson === 'boolean' ? v.klakson : VYCHOZI.klakson,
      };
    }

    // <b>Starý tvar se nezahazuje.</b> Kdo měl hlas vypnutý, chtěl ticho
    // — a po aktualizaci by mu telefon začal troubit, protože nová volba
    // má výchozí „obojí zapnuto".
    if (typeof v?.zapnuto === 'boolean') return { hlas: v.zapnuto, klakson: v.zapnuto };

    return VYCHOZI;
  } catch {
    return VYCHOZI;
  }
}

/** Zapamatuje volbu. Nepovede-li se to, platí jen pro tenhle běh. */
function doSouboru(v: VolbaZvuku): void {
  try {
    const f = new File(Paths.document, PAMET);
    if (f.exists) f.delete();
    f.create();
    f.write(JSON.stringify(v));
  } catch {
    // Volba zvuku nestojí za pád obrazovky startu.
  }
}

let volba: VolbaZvuku | null = null;
const posluchaci = new Set<() => void>();

/** Volba, jak platí teď. Ze souboru se čte jen jednou za běh appky. */
export function zvukTed(): VolbaZvuku {
  if (!volba) volba = zeSouboru();
  return volba;
}

/** Změní volbu, zapamatuje ji a řekne o tom všem, kdo ji čtou. */
export function nastavZvuk(zmena: Partial<VolbaZvuku>): VolbaZvuku {
  const nove = { ...zvukTed(), ...zmena };
  volba = nove;
  doSouboru(nove);
  posluchaci.forEach((f) => f());
  return nove;
}

function prihlas(f: () => void): () => void {
  posluchaci.add(f);
  return () => {
    posluchaci.delete(f);
  };
}

/**
 * Volba zvuku pro komponentu — překreslí ji, když ji změní někdo jiný.
 *
 * `useSyncExternalStore` schválně: panel startu a nastavení žijí vedle
 * sebe a musí ukazovat totéž, i když se mezi nimi nepřechází přes
 * odmontování.
 */
export function useZvuk(): VolbaZvuku {
  // Načteno jednou za běh, takže `zvukTed` vrací stejnou referenci,
  // dokud se volba nezmění — a to je přesně to, co tenhle hook potřebuje.
  return useSyncExternalStore(prihlas, zvukTed, zvukTed);
}
