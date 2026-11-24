import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';

import { DOBA_MS, ROZKYV_NAKLON, ROZKYV_SVISLE, faze, prubeh } from '@/lib/houpani';

/**
 * Značka se houpe na hladině (Filip, 24. 11. 2026: *„dokážeme i malinkou
 * animaci jako že se houpou na vodě?"*).
 *
 * <b>Jeden běh na celou appku, ne jeden na značku.</b> Hodnota dole je
 * modulová a točí se pořád dokola; každá značka si z ní bere jiný výsek
 * podle svého pořadí. Dvacet vlastních smyček by znamenalo dvacet
 * časovačů kvůli pohybu o sedm desetin bodu.
 *
 * <b>Jede to na nativním vlákně</b> (`useNativeDriver`), takže houpání
 * nepřestane, když se zrovna počítá poloha nebo překresluje seznam —
 * a hlavně to nestojí JavaScript nic na snímek.
 *
 * <b>Omezit pohyb vypíná všechno.</b> Kdo si to v systému zapnul, má na
 * to důvod, a tahle animace je ozdoba, ne informace.
 */
const bezec = new Animated.Value(0);
let rozjeto = false;
let dalsiPoradi = 0;

function rozjed() {
  if (rozjeto) return;
  rozjeto = true;
  Animated.loop(
    Animated.timing(bezec, {
      toValue: 1,
      duration: DOBA_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    }),
  ).start();
}

/**
 * Transformace pro `Animated.View` kolem značky, nebo `null`, když se
 * houpat nemá.
 */
export function useHoupani(zapnuto = true) {
  const poradi = useRef<number | null>(null);
  if (poradi.current === null) {
    poradi.current = dalsiPoradi;
    dalsiPoradi += 1;
  }

  const [klid, setKlid] = useState(false);
  useEffect(() => {
    let zivy = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (zivy) setKlid(v);
    });
    const odber = AccessibilityInfo.addEventListener('reduceMotionChanged', setKlid);
    return () => {
      zivy = false;
      odber.remove();
    };
  }, []);

  const hybe = zapnuto && !klid;
  useEffect(() => {
    if (hybe) rozjed();
  }, [hybe]);

  return useMemo(() => {
    if (!hybe) return undefined;
    const f = faze(poradi.current ?? 0);
    const svisle = prubeh(f, ROZKYV_SVISLE);
    // Náklon o čtvrt vlny za zdvihem: bóje se nejvíc nakloní, když
    // projíždí hladinou, ne na hřebeni.
    const naklon = prubeh((f + 0.25) % 1, ROZKYV_NAKLON);
    return [
      { translateY: bezec.interpolate({ inputRange: svisle.vstup, outputRange: svisle.vystup }) },
      {
        rotate: bezec.interpolate({
          inputRange: naklon.vstup,
          outputRange: naklon.vystup.map((v) => `${v.toFixed(3)}deg`),
        }),
      },
    ];
  }, [hybe]);
}
