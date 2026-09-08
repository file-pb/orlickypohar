import { useColorScheme } from 'react-native';

import { Colors, type Barvy } from '@/constants/theme';

/** Barvy podle systémového nastavení. Web to dělá přes prefers-color-scheme. */
export function useTheme(): Barvy {
  return useColorScheme() === 'dark' ? Colors.dark : Colors.light;
}
