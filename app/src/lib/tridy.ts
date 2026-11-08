/**
 * Barva lodní třídy — tatáž, jakou web kreslí znaky tříd.
 *
 * <b>Proč barva, a ne jméno kategorie.</b> Na cílové obrazovce se klepe
 * na dlaždice lodí a místo tam je dražší než kdekoli jinde v appce:
 * každá řádka navíc ubere jednu loď z dohledu (Filip, 8. 11. 2026:
 * *„tady bychom mohli uspořit místo tím, že bychom kategorie značili tím
 * naším barevným okrajem"*). Kategorie je přitom informace, kterou
 * rozhodčí **nečte**, jen potřebuje vidět, že dvě lodě vedle sebe patří
 * jinam — a na to barva stačí.
 *
 * <b>Slug se počítá stejně jako na webu</b> (`web/app/tridy.tsx`):
 * bez diakritiky, malými, jen písmena a číslice. „Nad7m", „NAD7M"
 * i „nad 7 m" tak míří na týž odstín.
 *
 * <b>Neznámá třída barvu nemá</b> a je to v pořádku — vrací `null`
 * a volající nakreslí obyčejnou linku. Vymýšlet odstín pro kategorii,
 * kterou nikdo nezavedl, by znamenalo, že se dvě neznámé od sebe tváří
 * jako dvě různé třídy.
 */

import type { Barvy } from '@/constants/theme';

/** „Nad7m" → „nad7m". Tak se jmenuje znak i token. */
export function slugTridy(nazev: string): string {
  return nazev
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Barva třídy z motivu, nebo `null` u třídy, kterou paleta nezná. */
export function barvaTridy(nazev: string | null | undefined, t: Barvy): string | null {
  if (!nazev) return null;
  switch (slugTridy(nazev)) {
    case 'race':
      return t.tridaRace;
    case 'nad7m':
      return t.tridaNad7m;
    case 'pod7m':
      return t.tridaPod7m;
    default:
      return null;
  }
}
