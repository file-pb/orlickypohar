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
 * <b>Smí tenhle člověk stavět trať téhle regaty?</b> Pípnout značku
 * a přečíst, co už stojí.
 *
 * <b>Proč to není `veliNekde`.</b> Karta *Stavba trati* se dosud nabízela
 * každému, kdo někde velí — a pořadatelství **kterékoliv** zastávky
 * ročníku stačí k tomu, aby ho šlo zaškrtnout jako pomocníka
 * (`Pomocnik.cs`). Pořadatel Zahájení sezóny tedy viděl stavbu i na
 * Radavě, kde mu server odmítne každý prvek. Obrazovka nemá slibovat,
 * co pod ní není.
 *
 * <b>Tytéž tři vstupy jako na serveru</b> (`Pomocnici.SmiStavet`):
 * pořadatel téhle zastávky, rozhodčí ročníku, zaškrtnutý pomocník.
 * Rozhoduje server u každého požadavku znovu — tohle jen kreslí nabídku,
 * takže smí být přísnější, nikdy volnější.
 */
export function smiStavet(ja: Ja | null, serie: string, zavod: string): boolean {
  const opravneni = ja?.opravneni ?? [];

  // Správce celého webu projde vším (`Prava.Pokryva`), a protože nemá
  // ročník, nenajde se v oprávněních na sérii.
  if ((ja?.web ?? []).includes('Spravce')) return true;

  // Organizátor: právo na ročník platí i na kteroukoliv jeho zastávku,
  // právo na jednu zastávku jen na ni.
  const poradatel = opravneni.some(
    (o) =>
      (o.role === 'Organizator' || o.role === 'Spravce') &&
      o.serie === serie &&
      (!o.zavod || o.zavod === zavod),
  );

  // Rozhodčí se žádá na celý ročník, takže právo svázané s jedinou
  // zastávkou na něj nestačí — stejně jako `Pozadavek(Role.Rozhodci,
  // rozsah.SerieId)` na serveru.
  const rozhodci = opravneni.some(
    (o) => (o.role === 'Rozhodci' || o.role === 'Spravce') && o.serie === serie && !o.zavod,
  );

  const pomaha = (ja?.kdePomaha ?? []).some((z) => z.serie === serie && z.zavod === zavod);

  return poradatel || rozhodci || pomaha;
}

/**
 * Je to <b>jen</b> pomocník — tedy někdo, kdo tu smí stavět výhradně
 * přes svůj příznak, ne z role?
 *
 * <para>
 * Rozhoduje o tom, co nabídne detail značky (rozhodnutí 10 druhého
 * konzilia): <i>Přesunout sem</i> je pípnutí, tedy měření, a to pomocník
 * smí; <i>Sebrat z vody</i>, přerovnání a mazání jsou rozhodnutí o trati
 * a zůstávají organizátorovi a rozhodčímu.
 * </para>
 *
 * <para>
 * Ptá se přes <see cref="smiStavet"/> naruby: kdo tu smí stavět, ale
 * nemá ani jednu z rolí, je pomocník. Tím se pravidlo nemůže rozejít
 * s tím, kdo se na obrazovku vůbec dostane.
 * </para>
 */
export function jePouzePomocnik(ja: Ja | null, serie: string, zavod: string): boolean {
  if (!smiStavet(ja, serie, zavod)) return false;
  if ((ja?.web ?? []).includes('Spravce')) return false;

  const opravneni = ja?.opravneni ?? [];
  const poradatel = opravneni.some(
    (o) =>
      (o.role === 'Organizator' || o.role === 'Spravce') &&
      o.serie === serie &&
      (!o.zavod || o.zavod === zavod),
  );
  const rozhodci = opravneni.some(
    (o) => (o.role === 'Rozhodci' || o.role === 'Spravce') && o.serie === serie && !o.zavod,
  );

  return !poradatel && !rozhodci;
}

/**
 * Smí stavět aspoň na jedné z těchhle zastávek?
 *
 * Ptá se `smiStavet` po jedné, protože právo je vždycky na konkrétní
 * zastávku: pořadatel jedné regaty ročníku nesmí do druhé. Zrušená se
 * nepočítá — trať pro ni nikdo stavět nebude.
 */
export function smiStavetNekde(
  ja: Ja | null,
  serie: string,
  zavody: { slug: string; stav?: string }[],
): boolean {
  return zavody.some((z) => z.stav !== 'Zruseny' && smiStavet(ja, serie, z.slug));
}

/**
 * Kde ten člověk staví trať — nebo <c>null</c>.
 *
 * <b>Nejdřív zastávka, kde je dneska zaškrtnutý jako pomocník:</b> tam
 * ho někdo dnes ráno poslal stavět, kdežto právo na celý ročník má
 * pořád. Pak zastávka, na kterou má přímo oprávnění, a nakonec ročník
 * bez zastávky — tam si musí vybrat sám, protože zastávky jsou
 * v kalendáři a nabídka je nezná.
 */
export function kdeStavi(ja: Ja | null): { serie: string | null; zavod: string | null } | null {
  const pomaha = (ja?.kdePomaha ?? [])[0];
  if (pomaha) return { serie: pomaha.serie, zavod: pomaha.zavod };

  const stavi = (ja?.opravneni ?? []).filter((o) => VELI.has(o.role) || o.role === 'Spravce');
  if (stavi.length > 0) {
    const naZavod = stavi.find((o) => o.zavod);
    const vybrane = naZavod ?? stavi[0];
    return { serie: vybrane.serie, zavod: vybrane.zavod ?? null };
  }

  // <b>Správce celého webu nemá ročník</b>, a přesto staví kdekoliv:
  // `Prava.Pokryva` dává `Spravce` i `Organizator`. Role na celý web jdou
  // klientovi zvlášť (`JaDto.Web`), ne jako oprávnění s prázdnou sérií,
  // takže se ve výčtu výš nenajdou — a dokud se tenhle případ nehlídal,
  // zmizel správci řádek stavby z nabídky úplně. Nasměrovat ho není podle
  // čeho, tak ať si ročník vybere.
  if ((ja?.web ?? []).includes('Spravce')) return { serie: null, zavod: null };

  return null;
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
