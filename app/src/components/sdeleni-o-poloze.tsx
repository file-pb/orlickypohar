import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Akce, Radek } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { SDELENI, prihlasHosta } from '@/lib/tracker/sdeleni';

/**
 * Dialog, který se ukáže **před** systémovým dotazem na polohu.
 *
 * Proč vůbec je, co v něm musí stát a proč zavření neznamená souhlas,
 * stojí v `lib/tracker/sdeleni.ts`. Tahle komponenta to jen kreslí.
 *
 * <b>Leží v korzeni zásobníku</b> (`app/_layout.tsx`), ne na obrazovce
 * trasy: dotaz na polohu může přijít z víc míst a sdělení mu musí
 * předcházet všude. Dokud se nikdo nezeptá, nevykreslí se nic.
 *
 * <b>Expo radí totéž.</b> Dokumentace `requestBackgroundPermissionsAsync`
 * (docs.expo.dev, SDK 57) připomíná, že na Androidu 11 a výš ten dotaz
 * otevře systémové nastavení, a jako způsob, jak to dopředu vysvětlit,
 * uvádí právě `Modal`.
 */
export function SdeleniOPoloze() {
  const t = useTheme();
  const [odpoved, setOdpoved] = useState<((souhlas: boolean) => void) | null>(null);

  useEffect(
    () =>
      prihlasHosta((o) => {
        // Obal schválně: `useState` by holou funkci vzal jako úpravu
        // předchozí hodnoty a zavolal ji místo uložení.
        setOdpoved(() => o);
      }),
    [],
  );

  function odpovez(souhlas: boolean) {
    odpoved?.(souhlas);
    setOdpoved(null);
  }

  return (
    <Modal
      visible={odpoved !== null}
      transparent
      animationType="fade"
      // Systémové tlačítko zpět na Androidu. Je to odchod z dialogu, ne
      // souhlas — a Google žádá, aby se tak ani nebral.
      onRequestClose={() => odpovez(false)}>
      <View style={s.stin}>
        <View style={[s.dialog, { backgroundColor: t.papir }]}>
          {/* Dlouhý text na malém telefonu v krajině: tlačítka musí zůstat
              dosažitelná, jinak z dialogu není cesta dál ani zpátky. */}
          <ScrollView>
            <Text style={[s.nadpis, { color: t.text }]}>{SDELENI.nadpis}</Text>
            <Text style={[s.veta, { color: t.text }]}>{SDELENI.uvod}</Text>
            {SDELENI.ucely.map((u) => (
              <View key={u} style={s.odrazka}>
                <Text style={[s.puntik, { color: t.voda }]}>•</Text>
                <Text style={[s.veta, s.odrazkaText, { color: t.text }]}>{u}</Text>
              </View>
            ))}
            <Text style={[s.veta, { color: t.tlumeny }]}>{SDELENI.zaver}</Text>
            <Radek text={SDELENI.odkazPopis} href={SDELENI.odkaz} barva={t.voda} />
          </ScrollView>

          <Akce text={SDELENI.dal} onPress={() => odpovez(true)} />
          <Akce text={SDELENI.zrusit} barva={t.tlumeny} onPress={() => odpovez(false)} />
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  stin: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  // Výška se nefixuje: na krátkém telefonu si ji vezme obsah, na dlouhém
  // zůstane dialog dialogem a neroztáhne se na celou obrazovku.
  dialog: { borderRadius: 14, padding: 18, maxHeight: '85%' },
  nadpis: { fontSize: 19, fontWeight: '700', marginBottom: 10 },
  veta: { fontSize: 15, lineHeight: 21, marginBottom: 10 },
  odrazka: { flexDirection: 'row' },
  puntik: { fontSize: 15, lineHeight: 21, width: 16 },
  odrazkaText: { flex: 1 },
});
