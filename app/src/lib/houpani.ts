/**
 * Houpání značek na hladině — počty, ne vykreslování.
 *
 * <b>Proč zvlášť od hooku.</b> Tohle je čistá matematika a dá se na ni
 * napsat test bez telefonu; hook vedle toho sahá na `Animated`
 * a `AccessibilityInfo`, které testovací běh v Node nenačte.
 *
 * <b>Jeden běh pro celou obrazovku.</b> Animace je jedna jediná, lineární
 * od nuly k jedničce dokola, a každá značka si z ní bere vlastní výsek.
 * Dvacet samostatných smyček by znamenalo dvacet časovačů; takhle je to
 * jeden nativní běh a dvacet interpolací, které se počítají na UI vlákně.
 */

/** Kolik bodů se ze sinu vzorkuje. Dvanáct je hladké a pořád levné. */
export const VZORKY = 12;

/**
 * Fáze podle pořadí značky. <b>Zlatý řez</b>, ne náhoda ani modulo:
 * sousední řádky se nesmějí houpat zároveň (vypadalo by to jako posun
 * celého seznamu), ale ani se nesmí opakovat po pár kusech.
 */
export function faze(poradi: number): number {
  return (poradi * 0.6180339887) % 1;
}

/**
 * Průběh jedné veličiny: vstup je lineární běh 0→1, výstup sinus
 * posunutý o fázi.
 *
 * <b>První a poslední hodnota musí sedět</b>, jinak by se smyčka po
 * každém kole viditelně cukla — proto se vzorkuje včetně koncového bodu
 * a ten je roven počátečnímu.
 */
export function prubeh(fazePosun: number, rozkyv: number): { vstup: number[]; vystup: number[] } {
  const vstup: number[] = [];
  const vystup: number[] = [];
  for (let i = 0; i <= VZORKY; i += 1) {
    const t = i / VZORKY;
    vstup.push(t);
    vystup.push(Math.sin(2 * Math.PI * (t + fazePosun)) * rozkyv);
  }
  return { vstup, vystup };
}

/** Jak daleko se značka houpe: svisle v bodech, náklon ve stupních. */
export const ROZKYV_SVISLE = 0.7;
export const ROZKYV_NAKLON = 1.5;

/** Jedno kolo. Delší než vlna na Orlíku schválně — má to být klid, ne neklid. */
export const DOBA_MS = 3200;
