import Svg, { Path } from 'react-native-svg';

import { ZNACKA } from '@/lib/znacka';

/**
 * Značka poháru, jak ji nese web.
 *
 * <b>Proč vektor a ne obrázek.</b> V `assets/images` leží jen ikony, a ty
 * jsou čtvercové, malé a vstupují do otisku appky — přidat mezi ně velké
 * logo by znamenalo, že vydané APK přestane dostávat aktualizace. Cesty
 * v `lib/znacka.ts` jsou obyčejné řetězce: na otisk nemají vliv a škálují
 * se na jakoukoliv velikost.
 *
 * <b>Obě cesty, jinak chybí plachty</b> — viz `lib/znacka.ts`.
 */
export function Znacka({ velikost = 300 }: { velikost?: number }) {
  const [, , w, h] = ZNACKA.viewBox.split(' ').map(Number);

  return (
    <Svg
      width={velikost}
      height={(velikost * h) / w}
      viewBox={ZNACKA.viewBox}
      accessibilityRole="image"
      accessibilityLabel="Orlický pohár">
      <Path d={ZNACKA.nonzero} fill={ZNACKA.barva} fillRule="nonzero" />
      <Path d={ZNACKA.evenodd} fill={ZNACKA.barva} fillRule="evenodd" />
    </Svg>
  );
}
