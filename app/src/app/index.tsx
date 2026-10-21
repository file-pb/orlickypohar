import { Link, useRouter } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { useEffect, useState } from 'react';

import { Chyba, Karta, Nacitani, Nadpis, Prazdno } from '@/components/ui';
import { useData } from '@/hooks/use-data';
import { useTheme } from '@/hooks/use-theme';
import { nactiSerie } from '@/lib/api';
import { predJakDlouho, stavGps, type StavGps } from '@/lib/tracker/stav';
import { otevrenyZaznam, type Zaznam } from '@/lib/tracker/zaznam';


/**
 * Stav sledování na rozcestníku. Ukáže se jen tehdy, když je co hlásit —
 * posádka by neměla hledat obrazovku Trasa, aby zjistila, že záznam běží.
 */
function Sledovani() {
  const t = useTheme();
  const router = useRouter();
  const [z, setZ] = useState<Zaznam | null>(null);
  const [gps, setGps] = useState<StavGps | null>(null);

  useEffect(() => {
    const nacti = () => {
      const o = otevrenyZaznam();
      setZ(o);
      setGps(o ? stavGps(o.id) : null);
    };
    nacti();
    const timer = setInterval(nacti, 3000);
    return () => clearInterval(timer);
  }, []);

  if (!z) return null;

  const pozastaveno = z.stav === 'pozastaveny';
  const cerstve = !pozastaveno && gps?.stariMs != null && gps.stariMs < 20_000;
  const barva = pozastaveno ? t.text : cerstve ? t.stavVypsany : t.stavZruseny;

  return (
    <Karta onPress={() => router.push('/tracker')}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{ width: 9, height: 9, borderRadius: 999, backgroundColor: barva, marginRight: 9 }}
        />
        <Text style={{ color: t.text, fontWeight: '600', flex: 1 }}>
          {pozastaveno ? 'Sledování pozastaveno' : `Sledování · ${z.lod}`}
        </Text>
        <Text style={{ color: t.tlumeny, fontSize: 13 }}>
          {pozastaveno ? `${gps?.pocetBodu ?? 0} bodů` : predJakDlouho(gps?.stariMs ?? null)}
        </Text>
      </View>
    </Karta>
  );
}

export default function Rocniky() {
  const t = useTheme();
  const router = useRouter();
  const { data, chyba, nacita, obnov } = useData(nactiSerie);

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={obnov} tintColor={t.voda} />}>
      <Nadpis tlumene="Seriál závodů plachetnic na Orlické přehradě">Ročníky</Nadpis>

      <Sledovani />

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

      {/* Klíč k lodi kousek od účtu, ale výš než trasa: bez spárování
          nemá záznam kam odejít. */}
      <View style={{ marginTop: 12 }}>
        <Link href="/klic" style={{ color: t.voda }}>
          Klíč k lodi
        </Link>
      </View>

      {/* Zkouška záznamu trasy. */}
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
