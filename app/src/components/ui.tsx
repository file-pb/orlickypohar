import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { StavZavodu } from '@/lib/api';

/** Popisky stavů drží appka stejné jako web — je to slovník, ne vzhled. */
const STAV: Record<StavZavodu, string> = {
  Planovany: 'plánováno',
  Potvrzeny: 'termín platí',
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
  // Stejné barvy jako na webu: odjetá modrá (má výsledky), vypsaná zelená
  // (dá se hlásit), plánovaná tlumená, zrušená červená.
  const barvy: Record<StavZavodu, string> = {
    Odjety: t.voda,
    Vypsany: t.stavVypsany,
    // Potvrzený termín je jistý, ale ještě se nedá hlásit — proto barva
    // textu, ne zelená vypsaného a ne tlumená plánovaného.
    Potvrzeny: t.text,
    Planovany: t.tlumeny,
    Zruseny: t.stavZruseny,
  };
  return <Stitek text={STAV[stav]} barva={barvy[stav]} />;
}

/** Proč nejsou výsledky. U zrušeného závodu nikdy nebudou, u vypsaného se hlásí. */
export function procNejsouVysledky(stav: StavZavodu): string {
  switch (stav) {
    case 'Zruseny':
      return 'Regata se nekonala. Do poháru se nepočítá.';
    case 'Planovany':
      return 'Zatím je to jen termín v kalendáři. Vypsání závodu teprve přijde.';
    case 'Potvrzeny':
      return 'Termín platí. Pořadatel závod ještě nevypsal.';
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
      <Akce text="Zkusit znovu" onPress={onZkusZnovu} />
    </View>
  );
}

/**
 * <b>Tři velikosti akce a nic mezi nimi.</b>
 *
 * Měření 30. 10. 2026 (`tools/kontrola-dotyku.py`) našlo 34 z 52 klepacích
 * míst pod mezí 44 pt a třicet z nich byl holý odkaz vysoký jen jako řádek
 * textu. Není to zanedbání, jsou to dvě zadání v jednom produktu: start
 * a cíl se stavěly pro ruku u vody a mají 56 pt, kdežto účet, lodě, klíč
 * a trasa jsou z doby, kdy byla appka čtečka.
 *
 * Jediné rozhodnutí u každého tlačítka je, <b>která ze tří</b> — a to je
 * rozhodnutí o úkonu, ne o vzhledu:
 *
 * - <b>56 pt, plná barva</b> (`s.spustit` v `odpocet.tsx`) — co se dělá teď;
 * - <b>48 pt, obtažená</b> (`Akce`) — co se dá udělat;
 * - <b>44 pt s linkou</b> (`Radek`) — kam se dá jít.
 *
 * <b>Řádková je 44, ne 40, schválně:</b> 44 pt je mez Apple HIG a Android
 * Material žádá 48 dp, takže na 44 projde iOS a na Android zbývá jedna
 * úprava, ne dvě. <b>Čtvrtá velikost se nezavádí</b> — každá další je další
 * rozhodnutí u každého tlačítka.
 */
const TERC = 44;
const TLACITKO = 48;

/**
 * Co je uvnitř klepacího místa. S `href` to vede jinam, bez něj to něco
 * udělá.
 *
 * <b>`asChild` schválně:</b> adresa zůstane na `Link`u, takže vnější odkazy
 * i dlouhý stisk fungují jako dřív, ale terč kreslí `Pressable` — kdyby
 * `Link` nesl styl sám, zůstal by vysoký jako řádek textu, a přesně to
 * měření našlo.
 */
function Klepaci({
  href,
  onPress,
  vypnuto,
  styl,
  children,
}: {
  href?: React.ComponentProps<typeof Link>['href'];
  onPress?: () => void;
  vypnuto?: boolean;
  styl: object[];
  children: React.ReactNode;
}) {
  const obsah = (
    <Pressable
      onPress={onPress}
      disabled={vypnuto}
      style={({ pressed }) => [s.terc, ...styl, pressed && !vypnuto ? { opacity: 0.6 } : null]}>
      {children}
    </Pressable>
  );
  return href ? (
    <Link href={href} asChild>
      {obsah}
    </Link>
  ) : (
    obsah
  );
}

/** Běžná akce, 48 pt: co se dá udělat. */
export function Akce({
  text,
  onPress,
  href,
  barva,
  vypnuto,
  pracuje,
}: {
  text: string;
  onPress?: () => void;
  href?: React.ComponentProps<typeof Link>['href'];
  /** Písmo a okraj. Výchozí je `voda`; nevratný úkon dostane `stavZruseny`. */
  barva?: string;
  vypnuto?: boolean;
  /** Běží to a čeká se — stisk musí být vidět, jinak se zmáčkne podruhé. */
  pracuje?: boolean;
}) {
  const t = useTheme();
  const b = vypnuto ? t.tlumeny : (barva ?? t.voda);
  return (
    <Klepaci
      href={href}
      onPress={onPress}
      vypnuto={vypnuto || pracuje}
      styl={[s.akce, { borderColor: vypnuto ? t.linka : b }]}>
      {pracuje ? <ActivityIndicator color={b} /> : null}
      <Text style={[s.akceText, { color: b }]}>{text}</Text>
    </Klepaci>
  );
}

/**
 * Řádková akce, 44 pt: kam se dá jít.
 *
 * <b>Hodnota vpravo je součást řádku, ne ozdoba:</b> řádek tím řekne, co za
 * ním je („JOY", „běží"), a nemusí se tam chodit zjistit.
 */
export function Radek({
  text,
  popis,
  hodnota,
  barvaHodnoty,
  onPress,
  href,
  barva,
  vedleSebe,
}: {
  text: string;
  /** Druhý řádek: co to udělá, ne co to je. */
  popis?: string;
  hodnota?: string;
  barvaHodnoty?: string;
  onPress?: () => void;
  href?: React.ComponentProps<typeof Link>['href'];
  barva?: string;
  /** Drobná akce v řadě s dalšími: bez linky a bez roztažení na šířku. */
  vedleSebe?: boolean;
}) {
  const t = useTheme();
  return (
    <Klepaci
      href={href}
      onPress={onPress}
      styl={[s.radek, vedleSebe ? s.radekVedleSebe : { borderBottomColor: t.linka }]}>
      <View style={{ flex: vedleSebe ? 0 : 1 }}>
        <Text style={[s.radekText, { color: barva ?? t.text }]}>{text}</Text>
        {popis ? <Text style={[s.radekPopis, { color: t.tlumeny }]}>{popis}</Text> : null}
      </View>
      {hodnota ? (
        <Text style={[s.radekHodnota, { color: barvaHodnoty ?? t.tlumeny }]}>{hodnota}</Text>
      ) : null}
    </Klepaci>
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

  // Podlaha pod každým klepacím místem, ať mu styl výš dá cokoliv.
  terc: { minHeight: TERC },

  akce: {
    minHeight: TLACITKO,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  akceText: { fontSize: 16, fontWeight: '700' },

  radek: {
    minHeight: TERC,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
  },
  // V řadě s dalšími: linka by řadu rozsekala, a terč drží výplň po stranách.
  radekVedleSebe: { borderBottomWidth: 0, paddingHorizontal: 10, marginHorizontal: -10 },
  radekText: { fontSize: 16 },
  radekPopis: { fontSize: 13, marginTop: 1 },
  radekHodnota: { fontSize: 14 },
});
