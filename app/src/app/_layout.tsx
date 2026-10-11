import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

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
      </Stack>
    </>
  );
}
