import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { OdberUpozorneni } from '@/components/odber-upozorneni';
import { Chyba, Karta, Nacitani, Nadpis, Prazdno, Sekce, Stav } from '@/components/ui';
import { useData } from '@/hooks/use-data';
import { useTheme } from '@/hooks/use-theme';
import { nactiSerii } from '@/lib/api';
import { rozsah } from '@/lib/datum';

export default function Rocnik() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const t = useTheme();
  const router = useRouter();
  const { data, chyba, nacita, obnov } = useData(() => nactiSerii(slug), [slug]);

  const odjete = data?.zavody.filter((z) => z.stav === 'Odjety').length ?? 0;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={obnov} tintColor={t.voda} />}>
      <Stack.Screen options={{ title: data?.nazev ?? 'Ročník' }} />

      {nacita ? <Nacitani /> : null}
      {chyba ? <Chyba text={chyba} onZkusZnovu={obnov} /> : null}
      {!nacita && !chyba && !data ? <Prazdno text="Ročník neexistuje nebo není zveřejněný." /> : null}

      {data ? (
        <>
          <Nadpis
            tlumene={`${data.zavody.length} regat · ${odjete} odjetých · ${data.prihlasky.length} lodí`}>
            {data.nazev}
          </Nadpis>

          <Karta onPress={() => router.push(`/serie/${slug}/poradi`)}>
            <Text style={{ color: t.voda, fontWeight: '600' }}>Průběžné pořadí seriálu →</Text>
          </Karta>

          <OdberUpozorneni slug={slug} />

          <Sekce>Kalendář</Sekce>
          {data.zavody.map((z) => (
            <Karta key={z.slug} onPress={() => router.push(`/serie/${slug}/zavody/${z.slug}`)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                <Text
                  style={{
                    color: t.text,
                    fontWeight: '600',
                    fontSize: 16,
                    textDecorationLine: z.stav === 'Zruseny' ? 'line-through' : 'none',
                  }}>
                  {z.nazev}
                </Text>
                <Stav stav={z.stav} />
              </View>
              <Text style={{ color: t.tlumeny, marginTop: 3 }}>
                {rozsah(z.datum, z.datumKonce)}
                {z.poradatel ? ` · ${z.poradatel}` : ''}
              </Text>
              {z.puvodniDatum ? (
                <Text style={{ color: t.tlumeny, fontSize: 12, marginTop: 2 }}>
                  přesunuto z {rozsah(z.puvodniDatum)}
                </Text>
              ) : null}
            </Karta>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}
