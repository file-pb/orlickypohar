import { Link, useRouter } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { useEffect, useState } from 'react';

import { Chyba, Karta, Nacitani, Nadpis, Prazdno } from '@/components/ui';
import { useData } from '@/hooks/use-data';
import { useTheme } from '@/hooks/use-theme';
import { nactiJa, nactiMojeLode, nactiSerie, nactiZavod, type ZavodDetail } from '@/lib/api';
import { kdeVeli, postava } from '@/lib/role';
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

/**
 * Co má ten člověk nahoře. <b>Rozhodčí přijel velet</b>, a kdyby musel
 * start hledat pod seznamem ročníků, bylo by to špatně postavené.
 */
function Velení({ ja }: { ja: Parameters<typeof kdeVeli>[0] }) {
  const t = useTheme();
  const router = useRouter();
  const kde = kdeVeli(ja);

  // Jméno regaty, ne její adresa. `kdeVeli` zná jen slug — a „jarni-vitr"
  // na rozcestníku vypadá jako chyba, ne jako název (zjištěno na telefonu
  // 29. 10. 2026). Detail se proto dotáhne; než dorazí, stojí tam slug,
  // protože prázdná karta by byla horší než ošklivé jméno.
  const { data: detail } = useData<ZavodDetail | null>(
    () => (kde?.zavod ? nactiZavod(kde.serie, kde.zavod) : Promise.resolve(null)),
    [kde?.serie, kde?.zavod],
  );

  if (!kde) return null;

  return (
    <Karta
      onPress={() =>
        router.push(kde.zavod ? `/serie/${kde.serie}/zavody/${kde.zavod}` : `/serie/${kde.serie}`)
      }>
      <Text style={{ color: t.tlumeny, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 }}>
        VELÍŠ
      </Text>
      <Text style={{ color: t.text, fontWeight: '700', fontSize: 17, marginTop: 2 }}>
        {detail?.nazev ?? kde.zavod ?? kde.serie}
      </Text>
      <Text style={{ color: t.tlumeny, marginTop: 2 }}>
        {kde.zavod ? 'start a cíl' : 'vyber regatu, které velíš'}
      </Text>
    </Karta>
  );
}

export default function Rocniky() {
  const t = useTheme();
  const router = useRouter();
  const { data, chyba, nacita, obnov } = useData(nactiSerie);
  const { data: ja } = useData(nactiJa);
  const { data: mojeLode } = useData(nactiMojeLode);

  const kdo = postava(ja ?? null, (mojeLode?.length ?? 0) > 0);

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={obnov} tintColor={t.voda} />}>
      <Nadpis tlumene="Seriál závodů plachetnic na Orlické přehradě">Ročníky</Nadpis>

      {/* Nahoře stojí to, kvůli čemu ten člověk aplikaci zapnul. Rozhodčí
          velení, kapitán běžící sledování; čtenář nemá ani jedno, a tak
          mu rovnou začínají ročníky. */}
      {kdo === 'rozhodci' ? <Velení ja={ja ?? null} /> : null}
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

      {/* Kapitánovi se vlastní lodě nabízejí rovnou: odsud vydává klíče
          posádce a bez nich se nikdo nepřipojí. Ostatním by to byl další
          odkaz, který nikam nevede. */}
      {kdo === 'kapitan' ? (
        <View style={{ marginTop: 24 }}>
          <Link href="/lode" style={{ color: t.voda }}>
            Moje lodě
          </Link>
        </View>
      ) : null}

      {/* Účet, klíč a záznam trasy bývaly na rozcestníku vedle sebe se
          vším ostatním. Hledal se v tom start i sledování, takže odešly
          pod účet — tam je najde ten, kdo je potřebuje. */}
      <View style={{ marginTop: kdo === 'kapitan' ? 12 : 24 }}>
        <Link href="/ucet" style={{ color: t.voda }}>
          {ja ? 'Účet a nastavení' : 'Účet a přihlášení'}
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
