import type { components } from '@/lib/schema';

type S = components['schemas'];
type BarvaBoje = S['BarvaBoje'];
type TvarBoje = S['TvarBoje'];

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
 */
export function znakPodleVyhlasky(barva?: BarvaBoje, tvar?: TvarBoje): string | null {
  if (barva === 'Cervena' && tvar === 'Valcova') return 'pravá strana plavební dráhy';
  if (barva === 'Zelena' && tvar === 'Kuzelova') return 'levá strana plavební dráhy';
  if (barva === 'Zluta' && tvar === 'SferickyVrsek') return 'sportovní bóje';

  // <b>Plameňák stojí před žlutou schválně.</b> Vyhláška ho nezná, takže
  // se za její znak nesmí vydávat ani tehdy, když je zrovna žlutý —
  // jinak by nafukovací pták hlásil zakázanou vodní plochu.
  if (tvar === 'Plamenak') return null;

  if (barva === 'Zluta') return 'zakázaná nebo vyhrazená vodní plocha';
  return null;
}
