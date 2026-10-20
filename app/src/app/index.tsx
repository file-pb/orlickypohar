import { Link, useRouter } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { Chyba, Karta, Nacitani, Nadpis, Prazdno } from '@/components/ui';
import { useData } from '@/hooks/use-data';
import { useTheme } from '@/hooks/use-theme';
import { nactiSerie } from '@/lib/api';

export default function Rocniky() {
  const t = useTheme();
  const router = useRouter();
  const { data, chyba, nacita, obnov } = useData(nactiSerie);

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={obnov} tintColor={t.voda} />}>
      <Nadpis tlumene="Seriál závodů plachetnic na Orlické přehradě">Ročníky</Nadpis>

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

      {/* Účet až pod ročníky: appka je pro většinu lidí čtečka a
          přihlášení potřebuje jen ten, kdo zadává. */}
      <View style={{ marginTop: 24 }}>
        <Link href="/ucet" style={{ color: t.voda }}>
          Účet a přihlášení
        </Link>
      </View>

      {/* Zkouška záznamu trasy. Nahrávání na web zatím nemá, takže tu stojí
          sama za sebe a nic jiného v appce na ní nezávisí. */}
      <View style={{ marginTop: 12 }}>
        <Link href="/tracker" style={{ color: t.voda }}>
          Záznam trasy (zkouška)
        </Link>
      </View>

      {/* Odkaz ven schválně: appka je čtečka, ne náhrada webu. */}
      <View style={{ marginTop: 16 }}>
        <Link href="https://orlickypohar.klihovka.cz" style={{ color: t.voda }}>
          orlickypohar.klihovka.cz
        </Link>
      </View>
    </ScrollView>
  );
}
