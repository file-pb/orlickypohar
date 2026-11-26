import type { components } from '@/lib/schema';

type S = components['schemas'];
type BarvaBoje = S['BarvaBoje'];
type TvarBoje = S['TvarBoje'];
type DruhZnaceni = S['DruhZnaceni'];

/**
 * Co kombinace barvy a tvaru znamená podle vyhlášky o plavebním značení.
 *
 * <b>Druhá kopie, ne sdílená knihovna</b> (pravidlo repozitáře: knihovna
 * se zakládá až u třetí). Originál je ve webu, v `web/app/znak-boje.tsx`.
 * Do appky to přišlo 22. 11. 2026 s úkolem srovnat ikonky na obou
 * klientech: appka tenhle výklad neměla vůbec, takže stavitel trati
 * ukazoval barvu a tvar, ale už neřekl, co ta volba znamená na vodě.
 *
 * <b>Proč je to tady v `lib` a ne u komponenty</b>, kde ho má web: je to
 * čisté pravidlo a dá se na něj napsat test. Komponenta importuje
 * `react-native-svg`, takže ji testovací běh v Node nenačte.
 *
 * <b>Komu to slouží:</b> ne tomu, kdo na Vltavě jezdí — ten to pozná
 * i bez věty. Slouží pořadateli, který bóji zadává a chce si ověřit, že
 * vybral správně.
 *
 * <para>
 * <b>Slovník od Filipa, 26. 11. 2026.</b> Do té doby tu byly dvě chyby,
 * obě ve prospěch mluvení tam, kde se mělo mlčet:
 * </para>
 *
 * <list type="bullet">
 * <item><b>Žlutá se sférickým vrškem není sportovní bóje.</b> Ten tvar
 * — „mimoň" — je <b>otočná bójka</b> a bývá i červená nebo zelená.
 * Sportovní zóna má týž tvar, pozná se <b>nápisem SPORT</b> uprostřed,
 * a ten se z barvy a tvaru vyčíst nedá. Proto se o něj rozhoduje podle
 * značení (`DrahaSport`), ne podle vzhledu.</item>
 * <item><b>Zákaz vplutí je žlutá <i>kuželová</i></b>, ne každá žlutá.
 * Fallback „cokoliv žlutého" hlásil zákaz i nad naší otočnou bójkou.
 * Filip, 26. 11. 2026: *„žlutá kuželová bojka vypadá moc hezky, ale je
 * to zákaz vplutí. Vždycky."*</item>
 * </list>
 *
 * <para>
 * <b>Plovatka je rovnocenná varianta</b>, ne výjimka: zelená plovatka je
 * levá strana dráhy stejně jako zelený kužel, červená pravá stejně jako
 * červený válec. (Vrcholový znak, který plovatka někdy nese — kuželík
 * vlevo, váleček vpravo — je věc kresby, ne výkladu.)
 * </para>
 */
export function znakPodleVyhlasky(
  barva?: BarvaBoje,
  tvar?: TvarBoje,
  znaceni?: DruhZnaceni,
): string | null {
  // <b>Sport se pozná nápisem, ne tvarem.</b> Proto rozhoduje značení:
  // bez něj je týž mimoň obyčejná otočná bójka.
  //
  // <b>A je vždycky žlutá</b> (Filip, 26. 11. 2026). Otočné bójky jsou
  // mimoni v barvách, jaké kdo koupil — Milošovy jsou dnes žluté, jinde
  // se jezdí přes červené, modré, zelené i bílé. Sportovní zóna tuhle
  // volnost nemá, takže zapsaná jiná barva znamená, že něco nesedí:
  // a to se nepřekřičí tvrzením o vodě.
  if (znaceni === 'DrahaSport') return barva && barva !== 'Zluta' ? null : 'sportovní bóje';

  // <b>Co není bóje, nemá výklad.</b> Startovací plavidlo ani molo
  // vyhláška jako znak nezná.
  if (znaceni === 'Plavidlo' || znaceni === 'ObjektNaBrehu') return null;

  // <b>Plameňák stojí před barvami schválně.</b> Vyhláška nafukovacího
  // ptáka nezná, takže se za její znak nesmí vydávat ani tehdy, když je
  // zrovna žlutý.
  if (tvar === 'Plamenak') return null;

  if (barva === 'Cervena' && (tvar === 'Valcova' || tvar === 'Plovatka'))
    return 'pravá strana plavební dráhy';
  if (barva === 'Zelena' && (tvar === 'Kuzelova' || tvar === 'Plovatka'))
    return 'levá strana plavební dráhy';
  if (barva === 'Zluta' && tvar === 'Kuzelova') return 'zakázaná nebo vyhrazená vodní plocha';

  // Zbytek — otočné bójky všech barev, koule, naše vlastní vymyšlenosti —
  // vyhláška nezná. Domýšlet význam je horší než mlčet.
  return null;
}
