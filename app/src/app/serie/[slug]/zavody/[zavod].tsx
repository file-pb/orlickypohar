import { Stack, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import {
  Chyba,
  Karta,
  Nacitani,
  Nadpis,
  Prazdno,
  Sekce,
  Stav,
  procNejsouVysledky,
} from '@/components/ui';
import { useData } from '@/hooks/use-data';
import { useTheme } from '@/hooks/use-theme';
import { nactiZavod, type UcastLodi, type VysledekZavodu, type ZavodDetail } from '@/lib/api';
import { rozsah } from '@/lib/datum';

export default function Zastavka() {
  const { slug, zavod } = useLocalSearchParams<{ slug: string; zavod: string }>();
  const t = useTheme();
  const { data, chyba, nacita, obnov } = useData(() => nactiZavod(slug, zavod), [slug, zavod]);

  const kategorie = [...new Set(data?.poradi.map((v) => v.kategorie) ?? [])];

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={obnov} tintColor={t.voda} />}>
      <Stack.Screen options={{ title: data?.nazev ?? 'Zastávka' }} />

      {nacita ? <Nacitani /> : null}
      {chyba ? <Chyba text={chyba} onZkusZnovu={obnov} /> : null}
      {!nacita && !chyba && !data ? <Prazdno text="Zastávka není zveřejněná." /> : null}

      {data ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            <Nadpis>{data.nazev}</Nadpis>
            <View style={{ marginBottom: 16 }}>
              <Stav stav={data.stav} />
            </View>
          </View>
          <Text style={{ color: t.tlumeny, marginTop: -8, marginBottom: 8 }}>
            {rozsah(data.datum, data.datumKonce)}
            {data.poradatel ? ` · pořádá ${data.poradatel}` : ''}
          </Text>

          {data.poradi.length === 0 ? (
            <>
              <Prazdno text={procNejsouVysledky(data.stav)} />
              <PrihlaseneLode lode={data.lode} />
            </>
          ) : (
            kategorie.map((k) => (
              <View key={k}>
                <Sekce>{k}</Sekce>
                {data.poradi
                  .filter((v) => v.kategorie === k)
                  .sort((a, b) => a.poradi - b.poradi)
                  .map((v) => (
                    <Lod key={v.lod} vysledek={v} zavod={data} />
                  ))}
              </View>
            ))
          )}

          {data.poradi.length > 0 ? (
            <Text style={{ color: t.tlumeny, fontSize: 13, marginTop: 16 }}>
              Čísla pod jménem jsou body z jednotlivých rozjížděk — pořadí v této kategorii, ne
              v celém poli. Přeškrtnutá se do součtu nepočítá.
            </Text>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

function Lod({ vysledek, zavod }: { vysledek: VysledekZavodu; zavod: ZavodDetail }) {
  const t = useTheme();

  // Kód se ukazuje u bodů, ne místo nich: body platí, kód říká, odkud jsou.
  const kod = (cislo: number) =>
    zavod.rozjizdky
      .find((r) => r.cislo === cislo)
      ?.vysledky.find((v) => v.lod === vysledek.lod)?.kod;

  return (
    <Karta>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ color: t.tlumeny, width: 28, fontVariant: ['tabular-nums'] }}>
          {vysledek.poradi}.
        </Text>
        <Text style={{ color: t.text, fontWeight: '600', flex: 1 }}>{vysledek.lod}</Text>
        <Text
          style={{ color: t.text, fontWeight: '700', fontSize: 18, fontVariant: ['tabular-nums'] }}>
          {vysledek.body}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 10 }}>
        {vysledek.rozjizdky.map((r) => (
          <View key={r.cislo} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
            <Text
              style={{
                color: t.tlumeny,
                fontSize: 13,
                fontVariant: ['tabular-nums'],
                textDecorationLine: r.skrtnuto ? 'line-through' : 'none',
              }}>
              {r.body}
            </Text>
            {kod(r.cislo) ? (
              <Text style={{ color: t.tlumeny, fontSize: 10 }}>{kod(r.cislo)!.toUpperCase()}</Text>
            ) : null}
          </View>
        ))}
      </View>
    </Karta>
  );
}

/** U zastávky, která se teprve pojede, je seznam lodí jediné, co je známo. */
function PrihlaseneLode({ lode }: { lode: UcastLodi[] }) {
  const t = useTheme();
  if (lode.length === 0) return null;

  const kategorie = [...new Set(lode.map((l) => l.kategorie))];

  return (
    <>
      <Sekce>Přihlášené lodě ({lode.length})</Sekce>
      {kategorie.map((k) => (
        <View key={k} style={{ marginBottom: 12 }}>
          <Text style={{ color: t.tlumeny, fontSize: 13, marginBottom: 6 }}>{k}</Text>
          {lode
            .filter((l) => l.kategorie === k)
            .map((l) => (
              <View key={l.lod} style={{ flexDirection: 'row', paddingVertical: 4 }}>
                <Text style={{ color: t.text, flex: 1 }}>{l.lod}</Text>
                <Text style={{ color: t.tlumeny, fontSize: 13 }}>{l.kormidelnik ?? '—'}</Text>
              </View>
            ))}
        </View>
      ))}
    </>
  );
}
