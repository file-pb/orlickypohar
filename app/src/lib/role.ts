/**
 * Kdo zapíná aplikaci — a co tedy má vidět nahoře.
 *
 * <b>Proč to existuje.</b> Rozcestník dosud nabízel všem totéž: ročníky,
 * účet, moje lodě, klíč, záznam trasy a odkaz na web, jeden pod druhým.
 * Rozhodčí v tom hledal start a závodník sledování, přičemž každý z nich
 * přišel kvůli jediné věci. Filip, 29. 10. 2026: *„rozhraní podle toho,
 * kdo ji zapíná, aby tam nebyl ten současnej pelmel."*
 *
 * Pravidla zvlášť od vykreslování, jako u startu — tohle se dá ověřit bez
 * telefonu (`app/testy/role.test.ts`).
 */

import type { Ja } from './api';

/** Co je ten člověk v aplikaci. Pořadí odpovídá tomu, co přebíjí co. */
export type Postava = 'rozhodci' | 'kapitan' | 'ctenar';

/**
 * Role, které vedou závod. Rozhodčí i organizátor mají u vody co dělat;
 * editor a správce spravují obsah od stolu, takže rozcestník nemění.
 */
const VELI: ReadonlySet<string> = new Set(['Rozhodci', 'Organizator']);

/** Velí ten člověk někde? Stačí jedno oprávnění na jedné regatě. */
export function veliNekde(ja: Ja | null): boolean {
  return (ja?.opravneni ?? []).some((o) => VELI.has(o.role));
}

/**
 * Která regata je jeho — ta, kde velí. Vrací slug ročníku a případně
 * závodu; podle toho se dá rovnou otevřít start, ne seznam ročníků.
 *
 * <b>Oprávnění na konkrétní závod vyhrává nad oprávněním na ročník.</b>
 * Kdo dostal roli na jednu regatu, přijel kvůli ní; kdo ji má na celý
 * ročník, může velet kdekoli a musí si vybrat sám.
 */
export function kdeVeli(ja: Ja | null): { serie: string; zavod: string | null } | null {
  const velici = (ja?.opravneni ?? []).filter((o) => VELI.has(o.role));
  if (velici.length === 0) return null;

  const naZavod = velici.find((o) => o.zavod);
  const vybrane = naZavod ?? velici[0];
  return { serie: vybrane.serie, zavod: vybrane.zavod ?? null };
}

/**
 * Co ten člověk je. <b>Velení přebíjí loď</b>: rozhodčí, který má i vlastní
 * plachetnici, přišel k vodě velet — a kdyby mu rozcestník nabídl nejdřív
 * sledování, hledal by start pod ním.
 *
 * <b>Nepřihlášený je vždycky čtenář</b>, i kdyby měl v telefonu klíč k lodi:
 * klíč je pro zápis za loď, ne doklad, že appku zapnul závodník.
 */
export function postava(ja: Ja | null, maLode: boolean): Postava {
  if (veliNekde(ja)) return 'rozhodci';
  if (ja && maLode) return 'kapitan';
  return 'ctenar';
}
