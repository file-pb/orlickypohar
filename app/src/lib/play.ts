/**
 * Google Play přímo v appce — tenký obal nativního modulu `PlayAktualizace`
 * (`modules/play-aktualizace`, jen Android).
 *
 * iPhone, Expo Go, vývojový build a balíček bez modulu dostanou `nejde`
 * a appka nabídne stránku v obchodě. Modul se načítá líně: statický
 * `requireNativeModule` by v binárce bez něj shodil appku při startu.
 */
import { requireOptionalNativeModule } from 'expo';

import { zOdpovediModulu, type OdpovedModulu, type OdpovedPlay } from './verze';

/** Jak dopadl tok aktualizace. Po úspěchu nepřijde nic — Play appku restartuje. */
export type VysledekAktualizace = 'prijato' | 'zruseno' | 'selhalo' | 'nepovoleno' | 'nejde';

type Nativni = {
  zjisti(): Promise<OdpovedModulu>;
  spust(): Promise<Exclude<VysledekAktualizace, 'nejde'>>;
};

let nativni: Nativni | null | undefined;
function modul(): Nativni | null {
  if (nativni === undefined) nativni = requireOptionalNativeModule<Nativni>('PlayAktualizace');
  return nativni;
}

/**
 * Jak dlouho se čeká na Play. Dotaz jde přes službu Obchodu Play a kdyby
 * nikdy neodpověděla, viselo by na tom tlačítko i řádek v nabídce.
 */
const LIMIT_MS = 10_000;

function sLimitem<T>(slib: Promise<T>): Promise<T> {
  let casovac: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<T>((_, odmitni) => {
    casovac = setTimeout(() => odmitni(new Error('Play neodpověděl včas.')), LIMIT_MS);
  });
  return Promise.race([slib, limit]).finally(() => clearTimeout(casovac));
}

/** Co Play nabízí tomuhle telefonu. Nikdy nevyhodí: chyba je `nejde`. */
export async function zeptejSePlay(): Promise<OdpovedPlay> {
  const m = modul();
  if (!m) return { druh: 'nejde' };
  try {
    return zOdpovediModulu(await sLimitem(m.zjisti()));
  } catch {
    return { druh: 'nejde' };
  }
}

/**
 * Spustí aktualizaci přes celou obrazovku Play. Jen na klepnutí.
 *
 * Bez časového limitu schválně: po úspěchu se slib nevyřeší vůbec (Play
 * appku restartuje) a limit by uprostřed instalace hlásil chybu.
 */
export function spustAktualizaci(): Promise<VysledekAktualizace> {
  // Jeden tok naráz: dvojí klepnutí by jinak otevřelo dvě obrazovky Play
  // nad sebou (nález kontroly 27. 11. 2026). Po úspěchu se slib nevyřeší,
  // appka se restartuje — a příznak s ní zanikne.
  if (bezi) return bezi;
  bezi = (async (): Promise<VysledekAktualizace> => {
    const m = modul();
    if (!m) return 'nejde';
    try {
      return await m.spust();
    } catch {
      return 'nejde';
    }
  })().finally(() => {
    bezi = null;
  });
  return bezi;
}

let bezi: Promise<VysledekAktualizace> | null = null;
