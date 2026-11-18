import { useLocalSearchParams, useRouter } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { Chyba, Karta, Nacitani, Nadpis, Prazdno, Stav } from '@/components/ui';
import { useData } from '@/hooks/use-data';
import { useTheme } from '@/hooks/use-theme';
import { nactiSerii } from '@/lib/api';
import { rozsah } from '@/lib/datum';
import { mojeOpravneni } from '@/lib/opravneni';
import { smiStavet } from '@/lib/role';

/**
 * Kde v tomhle ročníku stavět trať.
 *
 * <b>Proč to existuje.</b> Nabídka pod kebabem vede rovnou na zastávku jen
 * toho, kdo ji má jednu — zaškrtnutého pomocníka. Kdo má právo na celý
 * ročník, žádnou vybranou nemá, a dokud nabídka vedla na kalendář, byla to
 * slepá ulička: z regaty se ke stavbě nedostane, protože tam vchod
 * schválně není (Filip, 17. 11. 2026: *„nemá to co dělat v rozhraní pro
 * startování regaty"*). Tahle obrazovka je ten chybějící krok mezi tím.
 *
 * <b>Nabízí jen to, co server pustí.</b> Ptá se `smiStavet` na každou
 * zastávku zvlášť, tedy na tutéž trojici jako `Pomocnici.SmiStavet` —
 * obrazovka nemá slibovat, co pod ní není. Zrušená regata se nenabízí
 * vůbec: trať pro ni nikdo stavět nebude.
 */
export default function KdeStavet() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const t = useTheme();
  const router = useRouter();
  const { data, chyba, nacita, obnov } = useData(() => nactiSerii(slug), [slug]);
  const { data: ja } = useData(mojeOpravneni);

  const kde = (data?.zavody ?? []).filter(
    (z) => z.stav !== 'Zruseny' && smiStavet(ja ?? null, slug, z.slug),
  );

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={obnov} tintColor={t.voda} />}>
      <Nadpis tlumene={data?.nazev}>Kde stavíš trať?</Nadpis>

      {nacita ? <Nacitani /> : null}
      {chyba ? <Chyba text={chyba} onZkusZnovu={obnov} /> : null}

      {!nacita && !chyba && kde.length === 0 ? (
        <Prazdno text="V tomhle ročníku nemáš kde stavět. Zeptej se rozhodčího — zaškrtne tě jako pomocníka." />
      ) : null}

      {kde.map((z) => (
        <Karta
          key={z.slug}
          onPress={() => router.push(`/serie/${slug}/zavody/${z.slug}/stavba`)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            <Text style={{ color: t.text, fontWeight: '600', fontSize: 16 }}>{z.nazev}</Text>
            <Stav stav={z.stav} />
          </View>
          <Text style={{ color: t.tlumeny, marginTop: 3 }}>
            {rozsah(z.datum, z.datumKonce)}
            {z.poradatel ? ` · ${z.poradatel}` : ''}
          </Text>
        </Karta>
      ))}
    </ScrollView>
  );
}
