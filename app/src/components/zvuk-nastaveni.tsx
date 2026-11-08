/**
 * <b>Zvuk na startu</b> — hlas a klakson, každý zvlášť.
 *
 * <b>Proč je to tady a ne na panelu startu</b> (Filip, 8. 11. 2026:
 * *„to pole dáme do nějakého meníčka v settings. To nemusíme mít na
 * každý obrazovce a nemusí to tam zabírat místo"*). Na startovní linii
 * se nic nenastavuje — tam se kouká na odpočet a mačkají úkony. Volba
 * zvuku se udělá jednou a pak jen překáží.
 *
 * <b>Dvě volby, ne jedna</b> (týž den: *„bych udělal, že hlásí zvlášť
 * a troubí taky zvlášť, ať si to může uživatel nastavit sám"*). Proč
 * mají ty dvě věci na vodě různý smysl, stojí v `lib/zvuk.ts`.
 */
import { useAudioPlayer } from 'expo-audio';
import { Pressable, Switch, Text, View } from 'react-native';

import { Karta, Sekce } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { KLAKSON_KRATCE, ukazZvuk, umlkni } from '@/lib/dirigent';
import { nastavZvuk, useZvuk } from '@/lib/zvuk';

export function ZvukNastaveni() {
  const t = useTheme();
  const volba = useZvuk();
  // Vlastní přehrávač, ne dirigentův: ten žije na panelu startu a tahle
  // obrazovka o něm nic neví. Zvuk je tentýž soubor.
  const kratky = useAudioPlayer(KLAKSON_KRATCE);

  const prepni = (co: 'hlas' | 'klakson') => {
    const nove = !volba[co];
    nastavZvuk({ [co]: nove });
    if (nove) ukazZvuk(co, kratky);
    else if (co === 'hlas') umlkni();
  };

  return (
    <>
      <Sekce>Zvuk na startu</Sekce>
      <Karta>
        <Volba
          text="Hlásí"
          popis="odpočet a oznámení mluveným slovem"
          zapnuto={volba.hlas}
          naPrepnuti={() => prepni('hlas')}
        />
        <View style={{ height: 1, backgroundColor: t.linka, marginVertical: 10 }} />
        <Volba
          text="Troubí"
          popis="klakson na znamení procedury a při zrušení"
          zapnuto={volba.klakson}
          naPrepnuti={() => prepni('klakson')}
        />
      </Karta>
      <Text style={{ color: t.tlumeny, fontSize: 13, marginTop: 6, marginBottom: 4 }}>
        Platí jen pro toho, kdo velí startu — závodníkovi ani divákovi
        telefon netroubí. Zapnutí se hned ozve, ať je slyšet, jak nahlas.
      </Text>
    </>
  );
}

/**
 * Jedna volba: popis a knoflík.
 *
 * Terčem je celá řádka, ne jen knoflík — `Switch` má 51 × 31 bodů a to
 * je na houpající se lodi málo. Klepnutí na sebe si vezme sám, takže se
 * nepřepne dvakrát.
 */
function Volba({
  text,
  popis,
  zapnuto,
  naPrepnuti,
}: {
  text: string;
  popis: string;
  zapnuto: boolean;
  naPrepnuti: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={naPrepnuti}
      accessibilityRole="switch"
      accessibilityState={{ checked: zapnuto }}
      accessibilityLabel={text}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 44,
        opacity: pressed ? 0.6 : 1,
      })}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>{text}</Text>
        <Text style={{ color: t.tlumeny, fontSize: 13, marginTop: 2 }}>{popis}</Text>
      </View>
      <Switch
        value={zapnuto}
        onValueChange={naPrepnuti}
        trackColor={{ false: t.linka, true: t.voda }}
        thumbColor={t.papir}
        ios_backgroundColor={t.linka}
      />
    </Pressable>
  );
}
