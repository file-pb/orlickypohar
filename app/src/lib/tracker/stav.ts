/**
 * Stav záznamu tak, jak ho potřebuje vidět posádka na vodě.
 *
 * Proč to není jen „zapnuto/vypnuto": kontrolka, která svítí zeleně, protože
 * se nikdo nezeptal, je horší než žádná. Posádka potřebuje vědět, **kdy
 * naposledy** něco přišlo a **jak přesně** — „poslední bod před 4 s, přesnost
 * 6 m" říká, že to jede, zatímco „před třemi minutami" je varování, i když je
 * formálně všechno zapnuté.
 */
import { databaze } from './db';
import type { Zaznam } from './zaznam';

export type StavGps = {
  /** Kdy přišel poslední bod (čas z polohy), nebo null, když žádný není. */
  posledniBod: number | null;
  /** Jak je starý, v milisekundách. */
  stariMs: number | null;
  /** Přesnost posledního bodu v metrech. */
  presnostM: number | null;
  /** Kolik bodů má běžící záznam. */
  pocetBodu: number;
};

/**
 * Po jaké době bez bodu je to podezřelé. Vzorkuje se po pěti sekundách, takže
 * tři vynechané vzorky znamenají, že se něco děje — ale jeden vynechaný je
 * běžný, GPS občas vzorek zahodí kvůli nízké kvalitě.
 */
export const PODEZRELE_MS = 20_000;

export function stavGps(zaznamId: string): StavGps {
  const r = databaze().getFirstSync<{
    posledni: number | null;
    presnost: number | null;
    pocet: number;
  }>(
    `SELECT cas_gps AS posledni, presnost, (SELECT COUNT(*) FROM bod WHERE zaznam_id = $z) AS pocet
       FROM bod WHERE zaznam_id = $z ORDER BY id DESC LIMIT 1`,
    { $z: zaznamId },
  );

  if (!r?.posledni) return { posledniBod: null, stariMs: null, presnostM: null, pocetBodu: 0 };
  return {
    posledniBod: r.posledni,
    stariMs: Date.now() - r.posledni,
    presnostM: r.presnost,
    pocetBodu: r.pocet ?? 0,
  };
}

export type Svetlo = 'jede' | 'ceka' | 'stoji' | 'pozastaveno';

/**
 * Barva řádku v panelu. Schválně tři stavy, ne dva: „čeká" je situace, kdy
 * záznam běží, ale poslední bod je starý — tedy něco mezi v pořádku a
 * rozbité, a posádka se podle toho zachová jinak než u „stojí".
 */
export function svetloGps(z: Zaznam | null, s: StavGps): Svetlo {
  // Pozastavení je vědomé rozhodnutí posádky, ne porucha — nesmí vypadat
  // stejně jako „nic nechodí".
  if (z?.stav === 'pozastaveny') return 'pozastaveno';
  if (!z || z.stav !== 'bezi') return 'stoji';
  if (s.stariMs == null || s.stariMs > PODEZRELE_MS) return 'ceka';
  return 'jede';
}

/** Lidsky „před 4 s" / „před 3 min". Vteřiny až do minuty, pak minuty. */
export function predJakDlouho(ms: number | null): string {
  if (ms == null) return 'zatím nic';
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `před ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `před ${m} min`;
  return `před ${Math.floor(m / 60)} h ${m % 60} min`;
}
