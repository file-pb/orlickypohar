import { Stack, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { Chyba, Karta, Nacitani, Nadpis, Prazdno, Sekce } from '@/components/ui';
import { useData } from '@/hooks/use-data';
import { useTheme } from '@/hooks/use-theme';
import { nactiPoradi, type PoradiLodi } from '@/lib/api';

/**
 * Průběžné pořadí. Na telefonu se tabulka devíti sloupců nevejde, a hlavně
 * je nepotřeba: čtenáře zajímá jméno lodi a body. Regaty jsou proto pod
 * řádkem jako řada čísel, ne jako sloupce.
 */
export default function Poradi() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const t = useTheme();
  const { data, chyba, nacita, obnov } = useData(() => nactiPoradi(slug), [slug]);

  const prazdno = data?.kategorie.every((k) => k.lode.length === 0) ?? false;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={obnov} tintColor={t.voda} />}>
      <Stack.Screen options={{ title: 'Průběžné pořadí' }} />

      {nacita ? <Nacitani /> : null}
      {chyba ? <Chyba text={chyba} onZkusZnovu={obnov} /> : null}

      {data ? (
        <>
          <Nadpis
            tlumene={`${data.nazev} · po ${data.zastavky.length} ${
              data.zastavky.length === 1 ? 'odjeté regatě' : 'odjetých regatách'
            }`}>
            Průběžné pořadí
          </Nadpis>

          {prazdno ? <Prazdno text="Zatím není odjetá žádná regata." /> : null}

          {data.kategorie.map((k) =>
            k.lode.length === 0 ? null : (
              <View key={k.kategorie}>
                <Sekce>{k.kategorie}</Sekce>
                {k.lode.map((l) => (
                  <Radek key={l.lod} lod={l} />
                ))}
              </View>
            ),
          )}

          <Text style={{ color: t.tlumeny, fontSize: 13, marginTop: 16 }}>
            Vítěz regaty má nula bodů, takže vyhrává nejnižší součet. Velké číslo je součet
            po škrtu nejhoršího závodu, malé je součet všeho — rozhodčí vede obojí.
          </Text>
        </>
      ) : null}
    </ScrollView>
  );
}

function Radek({ lod }: { lod: PoradiLodi }) {
  const t = useTheme();

  return (
    <Karta>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ color: t.tlumeny, width: 28, fontVariant: ['tabular-nums'] }}>
          {lod.poradiPoSkrtu}.
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.text, fontWeight: '600' }}>{lod.lod}</Text>
          {lod.majitel ? (
            <Text style={{ color: t.tlumeny, fontSize: 12 }}>{lod.majitel}</Text>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={{ color: t.text, fontWeight: '700', fontSize: 18, fontVariant: ['tabular-nums'] }}>
            {lod.bodyPoSkrtu}
          </Text>
          <Text style={{ color: t.tlumeny, fontSize: 12 }}>z {lod.body}</Text>
        </View>
      </View>

      {/* Regaty jako řada čísel. Prázdné místo znamená, že tam loď nestartovala. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 }}>
        {lod.zastavky.map((b, i) => (
          <Text
            key={i}
            style={{
              color: b === null ? t.linka : t.tlumeny,
              fontSize: 12,
              fontVariant: ['tabular-nums'],
              minWidth: 18,
              textAlign: 'center',
            }}>
            {b ?? '—'}
          </Text>
        ))}
      </View>
    </Karta>
  );
}
