/**
 * Co je v nabídce pod kebabem.
 *
 * <b>Od 26. 11. 2026 je to režie, ne navigace.</b> *Moje regata*, *Stavba
 * trati* a dřívější *Ročníky* se přestěhovaly na rozcestník
 * (`lib/rozcestnik.ts`), protože to jsou odpovědi na „co teď budeš dělat".
 * Tady zůstává to, co se vyřizuje jednou za sezónu — účet, lodě, klíč —
 * a ukázky, dokud se bez nich nedá zkoušet.
 *
 * <b>Sledování zůstává na obou místech schválně.</b> Komu se rozcestník
 * přeskakuje, pro toho je nabídka jediná cesta k výsledkům.
 *
 * <b>Pravidlo zvlášť od vykreslování</b>, stejně jako u rolí a u startu:
 * tohle se dá ověřit bez telefonu (`app/testy/nabidka.test.ts`).
 * Komponenta v `components/kebab.tsx` z toho jen dělá řádky.
 */
import type { Ja } from './api';

export type PolozkaNabidky = { text: string; cil: string; popis?: string };

/** Kam se dá odsud jít. Pořadí je podle toho, jak často se tam chodí. */
export const KAM: PolozkaNabidky[] = [
  // <b>Domů musí být v nabídce</b> (Filip, 7. 11. 2026: *„hele jak se
  // budu dostávat zpět na landing?"*). Hlavička se nekreslí, takže
  // jediná cesta zpátky bylo gesto — a z cíle rozjížďky je to gest
  // několik. Nabídka je na každé obrazovce, tak ať vede i domů.
  //
  // <b>Komu se rozcestník přeskakuje, tomu Domů vede na jeho obrazovku</b>,
  // ne na rozcestí — kořen se přesměruje podle týchž pravidel. Je to tak
  // správně: pro závodníka *je* domov jeho regata.
  { text: 'Domů', cil: '/', popis: 'úvodní obrazovka' },
  // <b>Sledování, ne „Ročníky".</b> Na rozcestníku se ta věc jmenuje
  // takhle, a jedno jméno pro jednu věc je levnější než dvě pro tutéž.
  // <b>V nabídce zůstat musí</b>, i když je to zároveň dlaždice: kdo má
  // rozcestník přeskočený, nemá odsud jinou cestu k výsledkům.
  { text: 'Sledování', cil: '/rocniky', popis: 'kalendář, výsledky, pořadí seriálu' },
  { text: 'Moje lodě a posádka', cil: '/lode' },
  // <b>Mám kód je cesta dovnitř</b> (Filip, 26. 11. 2026): appka se
  // nepřihlašuje u poskytovatele, telefon se napojí kódem z webu.
  // Stojí nad klíčem k lodi, protože bez účtu se nedostaneš nikam,
  // kdežto klíč k lodi řeší jednu věc.
  { text: 'Mám kód', cil: '/mam-kod', popis: 'napojit telefon na účet z webu' },
  { text: 'Klíč k lodi', cil: '/klic' },
  { text: 'Záznam trasy', cil: '/tracker' },
  { text: 'Účet a nastavení', cil: '/ucet', popis: 'oprávnění, zvuk na startu, verze appky' },
];

/**
 * Nabídka. <b>Na oprávněních už nezávisí</b> — všechno, co se podle rolí
 * měnilo, je na rozcestníku.
 *
 * Parametr tu zůstává schválně: `components/kebab.tsx` si `/ja` načítá tak
 * jako tak kvůli jménu, a až sem přibude něco, co role rozlišují (zakládání
 * účtů, pozvánky), bude kam sáhnout bez přepisování volajících.
 */
export function nabidka(_ja: Ja | null): PolozkaNabidky[] {
  return KAM;
}
