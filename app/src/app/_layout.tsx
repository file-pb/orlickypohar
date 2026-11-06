import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BannerAktualizace } from '@/components/banner-aktualizace';
import { ProuzekSpojeni, useProuzek } from '@/components/prouzek-spojeni';
import { Colors } from '@/constants/theme';
import { jas, pismoNaVyplni } from '@/lib/kontrast';
// Jen kvůli vedlejšímu efektu: `TaskManager.defineTask` musí být
// vyhodnocené při startu bundle. Když systém appku zabije a probudí ji
// na pozadí kvůli poloze, tohle je jediné, co se z appky spustí.
import '@/lib/tracker/uloha';

export default function Layout() {
  const tmave = useColorScheme() === 'dark';
  const t = tmave ? Colors.dark : Colors.light;

  // Proužek spojení leží nad vším a je na každé obrazovce (nález z návrhu
  // rozhraní závodníka, `docs/APPKA-NAVRH-ROZHRANI.md`). Když se nic
  // nezaznamenává, není — a pak se tady nemění vůbec nic.
  const prouzek = useProuzek();

  // <b>Co na tom není ověřené.</b> Proužek si bere horní bezpečný okraj
  // a leží nad navigací. iOS i Android počítají bezpečnou oblast podle
  // skutečné polohy pohledu, takže hlavička pod ním už žádný okraj
  // přičítat nemá — ale `headerStatusBarHeight`, kterým by se to dalo
  // vynutit, tahle verze navigace nezná. Jestli pod proužkem nevznikne
  // prázdný pruh, se u stolu nezjistí; je to první věc na podívání při
  // příští instalaci.

  // <b>Hodiny a baterie sedí na proužku</b>, takže jejich světlost se musí
  // řídit jeho výplní, ne režimem telefonu. Bez toho by na jantarové ploše
  // zmizely.
  const naProuzku = prouzek ? pismoNaVyplni(t, t[prouzek.vypln]) : null;
  const svetlostListy = naProuzku ? (jas(naProuzku) > 0.5 ? 'light' : 'dark') : undefined;

  return (
    <SafeAreaProvider>
      <StatusBar style={svetlostListy ?? (tmave ? 'light' : 'dark')} />
      <View style={{ flex: 1, backgroundColor: t.pozadi }}>
      <ProuzekSpojeni prouzek={prouzek} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.papir },
          headerTintColor: t.voda,
          headerTitleStyle: { color: t.text },
          contentStyle: { backgroundColor: t.pozadi },
        }}>
        <Stack.Screen name="index" options={{ title: 'Orlický pohár' }} />
        <Stack.Screen name="ucet" options={{ title: 'Účet' }} />
        <Stack.Screen name="klic" options={{ title: 'Klíč k lodi' }} />
        <Stack.Screen name="lode/index" options={{ title: 'Moje lodě' }} />
        <Stack.Screen name="lode/[lod]" options={{ title: 'Klíče posádky' }} />
        <Stack.Screen name="tracker/index" options={{ title: 'Trasa' }} />
        <Stack.Screen name="tracker/[id]" options={{ title: 'Trasa' }} />
      </Stack>
      {/* Až za `Stack`, aby ležel nad obsahem; sám se stará o to, kdy a jak
          dlouho je vidět. */}
      <BannerAktualizace />
      </View>
    </SafeAreaProvider>
  );
}
