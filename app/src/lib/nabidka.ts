/**
 * Co je v nabídce pod kebabem — a kdy tam přibude stavba trati.
 *
 * <b>Pravidlo zvlášť od vykreslování</b>, stejně jako u rolí a u startu:
 * tohle se dá ověřit bez telefonu (`app/testy/nabidka.test.ts`).
 * Komponenta v `components/kebab.tsx` z toho jen dělá řádky.
 */
import type { Ja } from './api';
import { kdeStavi } from './role';

export type PolozkaNabidky = { text: string; cil: string; popis?: string };

/** Kam se dá odsud jít. Pořadí je podle toho, jak často se tam chodí. */
export const KAM: PolozkaNabidky[] = [
  // <b>Domů musí být v nabídce</b> (Filip, 7. 11. 2026: *„hele jak se
  // budu dostávat zpět na landing?"*). Hlavička se nekreslí, takže
  // jediná cesta zpátky bylo gesto — a z cíle rozjížďky je to gest
  // několik. Nabídka je na každé obrazovce, tak ať vede i domů.
  { text: 'Domů', cil: '/', popis: 'úvodní obrazovka' },
  // <b>Moje regata je nad ročníky.</b> Posádka na vodě se neptá „jaké
  // byly výsledky v červnu", ptá se „co se děje teď" — a ročníky jsou
  // cesta dovnitř pro zkoušení, ne obrazovka produktu.
  { text: 'Moje regata', cil: '/zavodnik', popis: 'co se dnes jede a jak tě vidí rozhodčí' },
  { text: 'Ročníky', cil: '/rocniky', popis: 'kalendář, výsledky, pořadí' },
  { text: 'Moje lodě a posádka', cil: '/lode' },
  { text: 'Klíč k lodi', cil: '/klic' },
  { text: 'Záznam trasy', cil: '/tracker' },
  { text: 'Účet a nastavení', cil: '/ucet', popis: 'oprávnění, zvuk na startu, verze appky' },
];

/**
 * Nabídka i se stavbou trati, má-li ji ten člověk kde dělat.
 *
 * <b>Proč je v nabídce, a ne jen na stránce regaty</b> (Filip,
 * 17. 11. 2026: *„udělej to spustitelné samostatně z menu"*, a pak
 * *„nemá to co dělat v rozhraní pro startování regaty"*). Stavitel ráno
 * appku zapne kvůli jediné věci a musel se k ní proklikat přes ročník
 * a regatu — přitom ta obrazovka obsluhuje rozjížďku, která se jede,
 * zatímco trať se staví dřív, než se startuje cokoliv.
 *
 * <b>Bez zastávky vede na ročník, ne na stavbu.</b> Kdo má právo na celý
 * ročník, může stavět na kterékoliv jeho zastávce — a které to jsou, ví
 * kalendář, ne nabídka. Vybrat za něj tu první by znamenalo pípat do
 * cizí regaty.
 */
export function nabidka(ja: Ja | null): PolozkaNabidky[] {
  const stavi = kdeStavi(ja);
  if (!stavi) return KAM;

  const stavba: PolozkaNabidky =
    stavi.serie && stavi.zavod
      ? {
          text: 'Stavba trati',
          cil: `/serie/${stavi.serie}/zavody/${stavi.zavod}/stavba`,
          popis: 'pípni značky z lodi',
        }
      : stavi.serie
        ? {
            text: 'Stavba trati',
            cil: `/serie/${stavi.serie}/stavba`,
            popis: 'vyber regatu, kde stavíš',
          }
        : {
            // Správce webu: ročník ani zastávku mu nemá co vybrat.
            text: 'Stavba trati',
            cil: '/rocniky',
            popis: 'vyber ročník a regatu',
          };

  // Za „Moje regata": stavba je taky věc dnešního dne, ne archiv.
  const kde = KAM.findIndex((k) => k.cil === '/zavodnik');
  return [...KAM.slice(0, kde + 1), stavba, ...KAM.slice(kde + 1)];
}
