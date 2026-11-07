import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BannerAktualizace } from '@/components/banner-aktualizace';
import { Kebab } from '@/components/kebab';
import { ProuzekSpojeni, useProuzek } from '@/components/prouzek-spojeni';
import { Colors } from '@/constants/theme';
import { jas, pismoNaVyplni } from '@/lib/kontrast';
// Jen kvůli vedlejšímu efektu: `TaskManager.defineTask` musí být
// vyhodnocené při startu bundle. Když systém appku zabije a probudí ji
// na pozadí kvůli poloze, tohle je jediné, co se z appky spustí.
import '@/lib/tracker/uloha';

export default function Layout() {
  return (
    <SafeAreaProvider>
      <Obsah />
    </SafeAreaProvider>
  );
}

/**
 * <b>Hlavička se nekreslí</b> (Filip, 7. 11. 2026: *„určitě
 * headerShown: false, zpět gestem"*). Každá obrazovka má vlastní nadpis,
 * takže se tím neztrácí nic než pruh nad ním — a zpět jde gestem od
 * hrany, na Androidu i systémovým tlačítkem.
 *
 * <b>Horní okraj proto musí dorovnat tenhle pohled.</b> Dokud hlavička
 * byla, brala si ho sama; bez ní by obsah začínal pod hodinami. Když je
 * vidět proužek spojení, vzal si ho on a tady se nepřidává.
 */
function Obsah() {
  const tmave = useColorScheme() === 'dark';
  const t = tmave ? Colors.dark : Colors.light;

  // Proužek spojení leží nad vším a je na každé obrazovce (nález z návrhu
  // rozhraní závodníka, `docs/APPKA-NAVRH-ROZHRANI.md`). Když se nic
  // nezaznamenává, není — a pak se tady nemění vůbec nic.
  const prouzek = useProuzek();

  // <b>Horní okraj se nepřičítá dvakrát — ověřeno 7. 11. 2026</b>
  // v simulátoru, na landingu i na Ročnících. Proužek si bere horní
  // bezpečný okraj a leží nad navigací; `headerStatusBarHeight`, kterým
  // by se to dalo vynutit, tahle verze navigace nezná, takže se spoléhá
  // na to, že si iOS i Android spočítají bezpečnou oblast podle skutečné
  // polohy pohledu. Spoléhá se oprávněně, pod proužkem prázdný pruh
  // nevzniká.

  // <b>Hodiny a baterie sedí na proužku</b>, takže jejich světlost se musí
  // řídit jeho výplní, ne režimem telefonu. Bez toho by na jantarové ploše
  // zmizely.
  const naProuzku = prouzek ? pismoNaVyplni(t, t[prouzek.vypln]) : null;
  const svetlostListy = naProuzku ? (jas(naProuzku) > 0.5 ? 'light' : 'dark') : undefined;
  const okraje = useSafeAreaInsets();

  return (
    <>
      <StatusBar style={svetlostListy ?? (tmave ? 'light' : 'dark')} />
      <View
        style={{
          flex: 1,
          backgroundColor: t.pozadi,
          paddingTop: prouzek ? 0 : okraje.top,
        }}>
      <ProuzekSpojeni prouzek={prouzek} />
      {/* <b>Nabídka leží nad celým zásobníkem</b> (Filip, 7. 11. 2026:
          *„odevšad se musím umět vrátit na landing"*). Dokud seděla jen
          na domovské obrazovce, vedla cesta zpátky jedině gestem — a
          z cíle rozjížďky je to gest několik. Teď je na každé obrazovce
          na témže místě a první položkou v ní je *Domů*. */}
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: t.papir },
            headerTintColor: t.voda,
            headerTitleStyle: { color: t.text },
            contentStyle: { backgroundColor: t.pozadi },
            headerShown: false,
          }}
        />
        <View style={{ position: 'absolute', top: 16, right: 12, zIndex: 10 }}>
          <Kebab />
        </View>
      </View>
      {/* Až za `Stack`, aby ležel nad obsahem; sám se stará o to, kdy a jak
          dlouho je vidět. */}
      <BannerAktualizace />
      </View>
    </>
  );
}
