import { useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, Text } from 'react-native';

import { Chyba, Karta, Nacitani, Nadpis, Prazdno } from '@/components/ui';
import { useData } from '@/hooks/use-data';
import { useTheme } from '@/hooks/use-theme';
import { nactiSerie } from '@/lib/api';

/**
 * Ročníky — pod kebabem, ne na domovské obrazovce.
 *
 * <b>Co to v appce je.</b> Filip, 7. 11. 2026: *„ten rozcestník tam máme
 * jen abychom simulovali regatu."* Není to obrazovka produktu; výsledky,
 * kalendář a příběhy čte veřejnost na webu. Je to cesta dovnitř, kterou se
 * při zkoušení dostaneme k regatě — a proto odsud odešla z domovské
 * obrazovky pod tři tečky.
 */
export default function Rocniky() {
  const t = useTheme();
  const router = useRouter();
  const [signal, setSignal] = useState(0);
  const { data, chyba, nacita, obnov } = useData(nactiSerie, [signal]);

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={() => setSignal((n) => n + 1)}
          tintColor={t.voda}
        />
      }>
      <Nadpis tlumene="Cesta k regatě pro zkoušení — veřejnost čte web">Ročníky</Nadpis>

      {nacita ? <Nacitani /> : null}
      {chyba ? <Chyba text={chyba} onZkusZnovu={obnov} /> : null}
      {data?.length === 0 ? <Prazdno text="Zatím není zveřejněný žádný ročník." /> : null}

      {data?.map((s) => (
        <Karta key={s.slug} onPress={() => router.push(`/serie/${s.slug}`)}>
          <Text style={{ color: t.text, fontWeight: '600', fontSize: 16 }}>{s.nazev}</Text>
          <Text style={{ color: t.tlumeny, marginTop: 2 }}>
            {s.rok} · {s.pocetZavodu} regat
          </Text>
        </Karta>
      ))}
    </ScrollView>
  );
}
