import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
// Jen kvůli vedlejšímu efektu: `TaskManager.defineTask` musí být
// vyhodnocené při startu bundle. Když systém appku zabije a probudí ji
// na pozadí kvůli poloze, tohle je jediné, co se z appky spustí.
import '@/lib/tracker/uloha';

export default function Layout() {
  const tmave = useColorScheme() === 'dark';
  const t = tmave ? Colors.dark : Colors.light;

  return (
    <>
      <StatusBar style={tmave ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.papir },
          headerTintColor: t.voda,
          headerTitleStyle: { color: t.text },
          contentStyle: { backgroundColor: t.pozadi },
        }}>
        <Stack.Screen name="index" options={{ title: 'Orlický pohár' }} />
        <Stack.Screen name="ucet" options={{ title: 'Účet' }} />
        <Stack.Screen name="tracker/index" options={{ title: 'Trasa' }} />
        <Stack.Screen name="tracker/[id]" options={{ title: 'Trasa' }} />
      </Stack>
    </>
  );
}
