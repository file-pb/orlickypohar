import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, RefreshControl, ScrollView, Text, View } from 'react-native';

import { Kebab } from '@/components/kebab';
import { Karta } from '@/components/ui';
import { useData } from '@/hooks/use-data';
import { useTheme } from '@/hooks/use-theme';
import { nactiJa, nactiZavod, type ZavodDetail } from '@/lib/api';
import { kdeVeli } from '@/lib/role';
import { predJakDlouho, stavGps, type StavGps } from '@/lib/tracker/stav';
import { otevrenyZaznam, type Zaznam } from '@/lib/tracker/zaznam';

/**
 * Domovská obrazovka: landing.
 *
 * <b>Co se změnilo 7. 11. 2026.</b> Býval tu rozcestník — ročníky, účet,
 * lodě, klíč, trasa a odkaz na web, jeden pod druhým. Filip to rozpustil
 * třemi větami: *„to menu hoď pod nějaký kebab, ať to neotravuje"*,
 * *„ten rozcestník tam máme jen abychom simulovali regatu"* a *„na
 * rozcestník zatím jen vodočet a logo … to bude takový landing."*
 *
 * Takže: nahoře logo a pod ním <b>co teď</b>, když nějaké je: rozhodčí
 * velení, posádka běžící sledování. Všechno ostatní je pod třemi tečkami.
 *
 * <b>Vodočet tu byl a není</b> (Filip, 7. 11. 2026: *„ten vodočet v apce
 * je blbost, to vyhoď"*). Hladina je věc webu; v appce by to byl údaj,
 * kvůli kterému nikdo appku nezapne.
 *
 * <b>Co sem teprve přijde.</b> Na soutěžní den stavová obrazovka
 * závodníka, mimo něj kalendář (Filip: *„ale teď ne"*).
 */

/**
 * Stav sledování. Ukáže se, jen když je co hlásit — posádka by neměla
 * hledat obrazovku Trasa, aby zjistila, že záznam běží.
 *
 * <b>Proč tu zůstal, když je proužek nahoře.</b> Proužek říká, jestli se
 * stopa dostane ven; tahle karta říká, které lodi se zapisuje, a vede
 * k trase. Jsou to dvě různé otázky a jen jedna z nich se vejde pod
 * hodiny.
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
 * start hledat pod ročníky, bylo by to špatně postavené.
 */
function Velení({ ja }: { ja: Parameters<typeof kdeVeli>[0] }) {
  const t = useTheme();
  const router = useRouter();
  const kde = kdeVeli(ja);

  // Jméno regaty, ne její adresa. `kdeVeli` zná jen slug — a „jarni-vitr"
  // vypadá jako chyba, ne jako název (zjištěno na telefonu 29. 10. 2026).
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

export default function Domu() {
  const t = useTheme();
  const [signal, setSignal] = useState(0);
  const { data: ja } = useData(nactiJa, [signal]);

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
      {/* Logo, jméno a kebab na jednom řádku. Hlavička se od 7. 11. 2026
          nekreslí (`headerShown: false`, zpět gestem), takže tyhle tři
          tečky jsou jediná cesta odsud jinam. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <Image
          source={require('../../assets/images/icon.png')}
          style={{ width: 44, height: 44, borderRadius: 10 }}
          accessibilityIgnoresInvertColors
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: t.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 }}>
            Orlický pohár
          </Text>
          <Text style={{ color: t.tlumeny, fontSize: 13 }}>Plachetnice na Orlické přehradě</Text>
        </View>
        <Kebab />
      </View>

      <Velení ja={ja ?? null} />
      <Sledovani />
    </ScrollView>
  );
}
