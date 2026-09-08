import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { StavZavodu } from '@/lib/api';

/** Popisky stavů drží appka stejné jako web — je to slovník, ne vzhled. */
const STAV: Record<StavZavodu, string> = {
  Planovany: 'plánováno',
  Vypsany: 'vypsáno',
  Odjety: 'odjeto',
  Zruseny: 'zrušeno',
};

export function Stitek({ text, barva }: { text: string; barva?: string }) {
  const t = useTheme();
  return (
    <View style={[s.stitek, { borderColor: barva ?? t.linka }]}>
      <Text style={{ color: barva ?? t.tlumeny, fontSize: 11 }}>{text}</Text>
    </View>
  );
}

export function Stav({ stav }: { stav: StavZavodu }) {
  const t = useTheme();
  return <Stitek text={STAV[stav]} barva={stav === 'Odjety' ? t.voda : undefined} />;
}

/** Proč nejsou výsledky. U zrušeného závodu nikdy nebudou, u vypsaného se hlásí. */
export function procNejsouVysledky(stav: StavZavodu): string {
  switch (stav) {
    case 'Zruseny':
      return 'Zastávka se nekonala. Do poháru se nepočítá.';
    case 'Planovany':
      return 'Zatím je to jen termín v kalendáři. Vypsání závodu teprve přijde.';
    case 'Vypsany':
      return 'Závod je vypsaný — přihlásit se dá u pořadatele.';
    default:
      return 'Výsledky zatím nejsou zveřejněné.';
  }
}

export function Nadpis({ children, tlumene }: { children: React.ReactNode; tlumene?: string }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[s.nadpis, { color: t.text }]}>{children}</Text>
      {tlumene ? <Text style={{ color: t.tlumeny, marginTop: 2 }}>{tlumene}</Text> : null}
    </View>
  );
}

export function Sekce({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return <Text style={[s.sekce, { color: t.tlumeny }]}>{children}</Text>;
}

export function Karta({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) {
  const t = useTheme();
  const styl = [s.karta, { backgroundColor: t.papir, borderColor: t.linka }];

  if (!onPress) return <View style={styl}>{children}</View>;
  return (
    <Pressable style={({ pressed }) => [styl, pressed && { borderColor: t.voda }]} onPress={onPress}>
      {children}
    </Pressable>
  );
}

export function Prazdno({ text }: { text: string }) {
  const t = useTheme();
  return (
    <View style={[s.prazdno, { borderColor: t.linka }]}>
      <Text style={{ color: t.tlumeny, textAlign: 'center' }}>{text}</Text>
    </View>
  );
}

export function Nacitani() {
  const t = useTheme();
  return <ActivityIndicator color={t.voda} style={{ marginTop: 40 }} />;
}

export function Chyba({ text, onZkusZnovu }: { text: string; onZkusZnovu: () => void }) {
  const t = useTheme();
  return (
    <View style={[s.prazdno, { borderColor: t.linka }]}>
      <Text style={{ color: t.text, textAlign: 'center' }}>{text}</Text>
      <Pressable onPress={onZkusZnovu} style={{ marginTop: 12 }}>
        <Text style={{ color: t.voda, textAlign: 'center' }}>Zkusit znovu</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  nadpis: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  sekce: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 24,
    marginBottom: 8,
  },
  karta: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  stitek: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 1,
    marginLeft: 6,
  },
  prazdno: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 24, marginTop: 8 },
});
