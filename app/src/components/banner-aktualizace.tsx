import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { jePrvniNabeh, kdy, puvod, videnaVerze, zapamatuj } from '@/lib/verze';

/** Jak dlouho banner svítí, než sám zhasne. */
const SVITI_MS = 8000;
/** Jak dlouho trvá zhasnutí. */
const ZHASNUTI_MS = 600;

/**
 * Oznámení, že appka naběhla na nové verzi.
 *
 * <b>Proč to má být banner a ne jen údaj v Účtu</b> (Filip, 28. 10. 2026:
 * *„nějaký banner který tam [řekne] ze jede na nové verzi a po chvíli sam
 * zhasne"*). Údaj v Účtu odpoví tomu, kdo se ptá; aktualizace po síti ale
 * přijde, aniž by o ni kdo žádal, takže se musí ohlásit sama. Jinak se
 * appka mění pod rukama a nikdo neví, že se něco stalo — a právě o to šlo:
 * aby rozhodčí poznal, že k němu oprava dojela.
 *
 * <b>Zhasne sám a nejde ho přehlédnout omylem.</b> Osm sekund je dost na
 * přečtení dvou řádků a málo na to, aby překážel; klepnutím jde zavřít dřív.
 * Nic se za ním neschovává — kontejner má `box-none`, takže klepnutí mimo
 * banner jde do appky pod ním.
 *
 * <b>Hlásí se jen aktualizace stažené po síti</b>, ne spuštění z APK:
 * ruční instalaci dělal uživatel sám a nepotřebuje ji ohlásit zpátky.
 */
export function BannerAktualizace() {
  const t = useTheme();
  const [kdyVydano, setKdyVydano] = useState<Date | null | undefined>(undefined);
  const pruhlednost = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const p = puvod();
    if (!jePrvniNabeh(videnaVerze(), p)) return;

    // Zapamatuje se hned, ne až po zhasnutí. Kdo appku zavře během těch
    // osmi sekund, se o aktualizaci nedozví — ale oznámení ukázané podruhé
    // je horší než jedno nezahlédnuté, protože vypadá jako další novinka.
    if (p.id) zapamatuj(p.id);
    setKdyVydano(p.vydano);

    Animated.timing(pruhlednost, {
      toValue: 1, duration: ZHASNUTI_MS, useNativeDriver: true,
    }).start();

    const casovac = setTimeout(() => {
      Animated.timing(pruhlednost, {
        toValue: 0, duration: ZHASNUTI_MS, useNativeDriver: true,
      }).start(() => setKdyVydano(undefined));
    }, SVITI_MS);

    return () => clearTimeout(casovac);
  }, [pruhlednost]);

  if (kdyVydano === undefined) return null;

  const zhasni = () => {
    Animated.timing(pruhlednost, {
      toValue: 0, duration: 200, useNativeDriver: true,
    }).start(() => setKdyVydano(undefined));
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        // Dole kvůli hlavičce navigace a proto, že vršek obrazovky patří
        // tomu, co člověk právě dělá. Na iOSu je pod tím ještě ovládací
        // čárka, proto víc místa.
        bottom: Platform.OS === 'ios' ? 44 : 28,
      }}>
      <Animated.View style={{ opacity: pruhlednost }}>
        <Pressable
          onPress={zhasni}
          style={{
            backgroundColor: t.papir,
            borderWidth: 1,
            // Ohraničení, ne stín: stín je ve tmavém režimu nevidět a
            // banner by splynul s pozadím.
            borderColor: t.voda,
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 14,
          }}>
          <Text style={{ color: t.text, fontWeight: '600' }}>
            Appka se sama aktualizovala
          </Text>
          <Text style={{ color: t.tlumeny, fontSize: 13, marginTop: 2 }}>
            {kdyVydano
              ? `Jedeš na verzi z ${kdy(kdyVydano)}. Nic instalovat nemusíš.`
              : 'Jedeš na nové verzi. Nic instalovat nemusíš.'}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
