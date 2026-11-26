import { useLocalSearchParams, useRouter } from 'expo-router';
import { RefreshControl, ScrollView, Text } from 'react-native';

import { Kalendar } from '@/components/kalendar';
import { OdberUpozorneni } from '@/components/odber-upozorneni';
import { Chyba, Karta, Nacitani, Nadpis, Prazdno, Sekce } from '@/components/ui';
import { useData } from '@/hooks/use-data';
import { useTheme } from '@/hooks/use-theme';
import { nactiSerii } from '@/lib/api';
import { mojeOpravneni } from '@/lib/opravneni';
import { smiStavetNekde } from '@/lib/role';

export default function Rocnik() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const t = useTheme();
  const router = useRouter();
  const { data, chyba, nacita, obnov } = useData(() => nactiSerii(slug), [slug]);
  const { data: ja } = useData(mojeOpravneni);

  const odjete = data?.zavody.filter((z) => z.stav === 'Odjety').length ?? 0;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={obnov} tintColor={t.voda} />}>

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

          {/* <b>Druhá cesta ke stavbě.</b> Nabídka pod kebabem vede přímo,
              ale správce celého webu v ní ročník nemá — projde přes
              kalendář a tady potřebuje, kudy dál. Obrazovka za tím ukáže
              jen zastávky, kam ho server pustí. */}
          {smiStavetNekde(ja ?? null, slug, data.zavody) ? (
            <Karta onPress={() => router.push(`/serie/${slug}/stavba`)}>
              <Text style={{ color: t.voda, fontWeight: '600' }}>Stavba trati →</Text>
            </Karta>
          ) : null}

          <OdberUpozorneni slug={slug} />

          <Sekce>Kalendář</Sekce>
          <Kalendar slug={slug} zavody={data.zavody} />
        </>
      ) : null}
    </ScrollView>
  );
}
