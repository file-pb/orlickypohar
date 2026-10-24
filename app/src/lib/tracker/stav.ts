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
import { ZIVE_MS } from './nahravani';
import type { Potiz, Zaznam } from './zaznam';

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

/**
 * Řádek o odesílání: co posádce říct a jakou barvou.
 *
 * <b>Tři různé důvody, ne jedna červená.</b> „Bez signálu" je stav vody,
 * „čeká na rozpravu" je stav závodu a „bez klíče" je věc, se kterou musí
 * posádka za kapitánem — jediný z těch tří, kde se dá něco udělat hned.
 */
export function stavOdesilani(
  z: Zaznam | null,
  n: { ceka: number; posledniPokus: number | null; potiz: Potiz | null; hotovo: boolean } | null,
  ted = Date.now(),
): { svetlo: Svetlo; hodnota: string } {
  if (!z || !n) return { svetlo: 'stoji', hodnota: 'nic se neodesílá' };
  if (z.stav === 'pozastaveny') {
    return { svetlo: 'pozastaveno', hodnota: `pozastaveno · ${n.ceka} bodů čeká` };
  }

  const ceka = `${n.ceka} ${n.ceka === 1 ? 'bod čeká' : 'bodů čeká'}`;
  if (n.potiz === 'bez-klice') {
    return { svetlo: 'stoji', hodnota: `bez klíče k lodi · ${ceka}` };
  }
  if (n.potiz === 'mimo-okno') {
    // Není to porucha telefonu: server trasu nevezme, dokud nebyla rozprava.
    return { svetlo: 'ceka', hodnota: `čeká na rozpravu · ${ceka}` };
  }
  if (n.potiz === 'sit') return { svetlo: 'ceka', hodnota: `bez signálu · ${ceka}` };

  if (n.posledniPokus == null) return { svetlo: 'ceka', hodnota: `zatím nic · ${ceka}` };

  const stari = ted - n.posledniPokus;
  return {
    // Dvojnásobek odesílacího intervalu: jedno vynechané kolo se stane,
    // dvě už znamenají, že se něco děje.
    svetlo: stari > 2 * ZIVE_MS ? 'ceka' : 'jede',
    hodnota: n.ceka === 0
      ? `na serveru · ${predJakDlouho(stari)}`
      : `${ceka} · naposledy ${predJakDlouho(stari)}`,
  };
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
