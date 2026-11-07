import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { dalsiTroubeni, kolikPreskocit } from '@/lib/hlaseni';
import { PROCEDURA_S, trvani } from '@/lib/start';
import { posunStartUkazky, ukazkaBezi } from '@/lib/ukazka';

/**
 * <b>Přeskočení čekání v ukázce.</b>
 *
 * Bublina je ladicí zkratka, ne vlastnost startu (Filip, 7. 11. 2026:
 * *„je to jenom abychom mohli pouštět simulaci a ladit ji rychleji"*).
 * Ukáže se jen v ukázce a jen u čekání, kde se dá ušetřit víc než dvacet
 * vteřin. Po „ano" se posune <b>čas startu</b>, ne odpočet: tím projde
 * celá partitura stejně jako u vody, jen bez čekání.
 *
 * <b>Proč je to vlastní součástka.</b> Žila uvnitř `odpocet.tsx`, tedy
 * jen na obrazovce rozhodčího. Filip, 7. 11. 2026: *„ukázku pro
 * závodníka vybav také modalem pro přeskočení času."* Posádka čeká na
 * týž start a v ukázce je to totéž čekání — kopírovat ho podruhé by
 * znamenalo dvě místa, která se rozejdou.
 */
export function Preskok({
  doStartuS,
  delkaS = PROCEDURA_S,
  poPreskoku,
}: {
  /** Kolik vteřin zbývá do startu, nebo `null`, když není co odpočítávat. */
  doStartuS: number | null;
  delkaS?: number;
  /**
   * Zavolá se po přeskoku. Obrazovka rozhodčího ho nepotřebuje — čte
   * rozjížďku přímo a posun vidí hned. Posádka má `/lod/dnes` načtené
   * jednou, takže si o ně musí říct znovu, jinak by nad posunutým startem
   * ukazovala starý čas.
   */
  poPreskoku?: () => void;
}) {
  const t = useTheme();

  const vUkazce = ukazkaBezi();
  const preskocitO =
    vUkazce && doStartuS !== null ? kolikPreskocit(doStartuS, delkaS) : null;

  // <b>Hrana, ne hodnota.</b> `preskocitO` se každou vteřinu zmenší,
  // takže klíč z něj je pokaždé jiný: „ne" platilo jedinou vteřinu
  // a bublina se hned vracela. Klíč je proto <b>nejbližší troubení</b>,
  // které se během čekání nemění — jednou na hranu, jak to stojí
  // v návrhu. Současně to zaručuje, že se zeptá u každé hrany, kde se
  // čeká dýl než mez: před procedurou i mezi přípravným znamením
  // a poslední minutou (Filip, 7. 11. 2026: *„čtyři minuty do startu
  // taky"*).
  const hrana = vUkazce && doStartuS !== null ? dalsiTroubeni(doStartuS, delkaS) : null;
  const [nabidnuto, setNabidnuto] = useState<number | null>(null);
  const ptatSe = preskocitO !== null && hrana !== null && nabidnuto !== hrana;

  return (
    <Modal visible={ptatSe} transparent animationType="fade">
      <View style={s.stin}>
        <View style={[s.bublina, { backgroundColor: t.papir, borderColor: t.linka }]}>
          <Text style={[s.nadpis, { color: t.text }]}>Přeskočit čekání?</Text>
          <Text style={[s.text, { color: t.tlumeny }]}>
            Do dalšího znamení zbývá{' '}
            {trvani(doStartuS !== null && hrana !== null ? doStartuS - hrana : 0)}. V ukázce se dá
            skočit patnáct vteřin před něj, aby stihlo začít hlášení.
          </Text>
          <View style={s.volby}>
            <Pressable
              onPress={() => setNabidnuto(hrana)}
              style={({ pressed }) => [s.volba, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={[s.volbaText, { color: t.tlumeny }]}>Ne, jeď normálně</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (preskocitO !== null) posunStartUkazky(preskocitO);
                setNabidnuto(hrana);
                poPreskoku?.();
              }}
              style={({ pressed }) => [s.volba, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={[s.volbaText, { color: t.voda }]}>Ano, přeskoč</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  stin: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  bublina: { borderWidth: 1, borderRadius: 16, padding: 20, maxWidth: 340 },
  nadpis: { fontSize: 18, fontWeight: '800' },
  text: { fontSize: 15, lineHeight: 21, marginTop: 6 },
  volby: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  volba: { minHeight: 44, minWidth: 44, paddingHorizontal: 12, justifyContent: 'center' },
  volbaText: { fontSize: 16, fontWeight: '700' },
});
