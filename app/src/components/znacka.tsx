import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Defs, G, LinearGradient, Mask, Path, Rect, Stop } from 'react-native-svg';

import { ZNACKA } from '@/lib/znacka';

const AnimovanyG = Animated.createAnimatedComponent(G);

/**
 * Jak dlouho jeden průlet trvá a kolikrát se zopakuje.
 *
 * <b>Není to smyčka, je to uvítání</b> (Filip, 7. 11. 2026: *„prulet
 * svetel pred nim"*). Landing má rozhodčí otevřený celý den u vody a
 * animace, která nikdy neustane, je daň na baterii za ozdobu — a baterie
 * je u velitelského času věc, o které se tu vede záznam. Tři průlety při
 * otevření obrazovky efekt ukážou a pak je ticho.
 */
const PRULET_MS = 1600;
const PRULETU = 3;

/** Pauza mezi průlety, ať nejdou jeden za druhým jako blikání. */
const PAUZA_MS = 900;

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
 *
 * <b>Odlesk běží maskou, ne přes čtverec.</b> Maska má tvar značky, takže
 * světlo projede po plachtách a kruhu a mimo ně se neukáže. Bez ní by to
 * byl pruh přes obdélník, kterému by bylo vidět na okraje.
 */
export function Znacka({
  velikost = 300,
  odlesk = true,
}: {
  velikost?: number;
  /** Vypne průlet světla — pro místa, kde značka jen stojí. */
  odlesk?: boolean;
}) {
  const [, , w, h] = ZNACKA.viewBox.split(' ').map(Number);
  const posun = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!odlesk) return;

    const beh = Animated.loop(
      Animated.sequence([
        Animated.timing(posun, {
          toValue: 1,
          duration: PRULET_MS,
          easing: Easing.inOut(Easing.cubic),
          // `x` na skupině není transform ani opacity, takže nativní
          // ovladač ho neumí. Je to jedna hodnota po dobu pár vteřin,
          // ne každý snímek navždy.
          useNativeDriver: false,
        }),
        Animated.delay(PAUZA_MS),
      ]),
      { iterations: PRULETU },
    );

    beh.start();
    // Odchod z obrazovky animaci zastaví — jinak by doběhla naprázdno
    // nad komponentou, která už není vidět.
    return () => beh.stop();
  }, [odlesk, posun]);

  // Odlesk začíná za levým okrajem a končí za pravým, takže do značky
  // vjede i vyjede celý.
  const x = posun.interpolate({ inputRange: [0, 1], outputRange: [-w, w] });

  return (
    <Svg
      width={velikost}
      height={(velikost * h) / w}
      viewBox={ZNACKA.viewBox}
      accessibilityRole="image"
      accessibilityLabel="Orlický pohár">
      <Defs>
        <LinearGradient id="odlesk" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <Stop offset="0.45" stopColor="#ffffff" stopOpacity="0" />
          <Stop offset="0.5" stopColor="#ffffff" stopOpacity="0.9" />
          <Stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </LinearGradient>
        <Mask id="tvar">
          <Path d={ZNACKA.nonzero} fill="#ffffff" fillRule="nonzero" />
          <Path d={ZNACKA.evenodd} fill="#ffffff" fillRule="evenodd" />
        </Mask>
      </Defs>

      <Path d={ZNACKA.nonzero} fill={ZNACKA.barva} fillRule="nonzero" />
      <Path d={ZNACKA.evenodd} fill={ZNACKA.barva} fillRule="evenodd" />

      {odlesk ? (
        <AnimovanyG x={x} mask="url(#tvar)">
          <Rect x="0" y="0" width={w} height={h} fill="url(#odlesk)" />
        </AnimovanyG>
      ) : null}
    </Svg>
  );
}
