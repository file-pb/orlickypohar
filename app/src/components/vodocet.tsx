import { Text, View } from 'react-native';

import { Karta, Nacitani } from '@/components/ui';
import { useData } from '@/hooks/use-data';
import { useTheme } from '@/hooks/use-theme';
import {
  HODIN_ZMENY,
  nactiVodocet,
  smerZmeny,
  vetaZmeny,
  zmenaCm,
} from '@/lib/vodocet';

/**
 * Widget vodočtu na domovské obrazovce.
 *
 * <b>Velké číslo a šipka</b>, jako na webu — hladina se čte na dálku,
 * cestou od auta. Graf tu zatím není: kreslit ho bez knihovny jde na webu
 * (SVG ve stránce), v React Native by to znamenalo `react-native-svg`,
 * tedy nativní závislost, a ta se přidává <b>dávkou</b>, protože po každé
 * z nich Miloš instaluje ručně (`docs/APPKA-PORADI-PRACI.md`).
 *
 * <b>Když se data nenačtou, widget není</b> — stejné pravidlo jako na
 * webu. Prázdný rámeček s pomlčkami by vypadal jako nulová hladina.
 */
export function Vodocet({ obnovSignal = 0 }: { obnovSignal?: number }) {
  const t = useTheme();
  const { data, nacita } = useData(nactiVodocet, [obnovSignal]);

  if (nacita && !data) return <Nacitani />;
  if (!data) return null;

  const zmena = zmenaCm(data.historie);
  const barvaZmeny = zmena > 0 ? t.voda : zmena < 0 ? t.vystraha : t.tlumeny;

  return (
    <Karta>
      <Text style={{ color: t.tlumeny, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 }}>
        HLADINA ORLÍKU
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
        <Text
          style={{
            color: t.text,
            fontSize: 40,
            fontWeight: '800',
            fontVariant: ['tabular-nums'],
            letterSpacing: -1,
          }}>
          {data.hladina.toFixed(2)}
        </Text>
        <Text style={{ color: t.tlumeny, fontSize: 16 }}>m n. m.</Text>
        <Text style={{ color: barvaZmeny, fontSize: 20, fontWeight: '800', marginLeft: 'auto' }}>
          {smerZmeny(zmena)}
        </Text>
      </View>

      <Text style={{ color: t.text, fontSize: 15, marginTop: 2 }}>
        {vetaZmeny(zmena, HODIN_ZMENY)}
      </Text>

      {data.pritok != null || data.odtok != null ? (
        <View style={{ flexDirection: 'row', gap: 18, marginTop: 10 }}>
          {data.pritok != null ? (
            <Text style={{ color: t.tlumeny, fontSize: 14 }}>
              přítok <Text style={{ color: t.text }}>{data.pritok.toFixed(1)} m³/s</Text>
            </Text>
          ) : null}
          {data.odtok != null ? (
            <Text style={{ color: t.tlumeny, fontSize: 14 }}>
              odtok <Text style={{ color: t.text }}>{data.odtok.toFixed(1)} m³/s</Text>
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Odkud to je. Bez toho by se čísla četla jako naše měření. */}
      <Text style={{ color: t.tlumeny, fontSize: 12, marginTop: 8 }}>{data.zdroj}</Text>
    </Karta>
  );
}
