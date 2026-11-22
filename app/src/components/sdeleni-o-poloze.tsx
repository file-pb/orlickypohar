import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Akce, Radek } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { prihlasHosta, type Sdeleni } from '@/lib/tracker/sdeleni';

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
  const [ptani, setPtani] = useState<{ obsah: Sdeleni; odpoved: (souhlas: boolean) => void } | null>(
    null,
  );

  useEffect(() => prihlasHosta((obsah, odpoved) => setPtani({ obsah, odpoved })), []);

  function odpovez(souhlas: boolean) {
    ptani?.odpoved(souhlas);
    setPtani(null);
  }

  return (
    <Modal
      visible={ptani !== null}
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
            <Text style={[s.nadpis, { color: t.text }]}>{ptani?.obsah.nadpis}</Text>
            <Text style={[s.veta, { color: t.text }]}>{ptani?.obsah.uvod}</Text>
            {(ptani?.obsah.ucely ?? []).map((u) => (
              <View key={u} style={s.odrazka}>
                <Text style={[s.puntik, { color: t.voda }]}>•</Text>
                <Text style={[s.veta, s.odrazkaText, { color: t.text }]}>{u}</Text>
              </View>
            ))}
            <Text style={[s.veta, { color: t.tlumeny }]}>{ptani?.obsah.zaver}</Text>
            <Radek text={ptani?.obsah.odkazPopis ?? ""} href={(ptani?.obsah.odkaz ?? "") as never} barva={t.voda} />
          </ScrollView>

          <Akce text={ptani?.obsah.dal ?? ""} onPress={() => odpovez(true)} />
          <Akce text={ptani?.obsah.zrusit ?? ""} barva={t.tlumeny} onPress={() => odpovez(false)} />
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
