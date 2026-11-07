import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radek } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { ukazkaBezi, vypniUkazku, zapniUkazku } from '@/lib/ukazka';

/**
 * Kebab: všechno, co není „co teď".
 *
 * <b>Proč to není na obrazovce.</b> Filip, 7. 11. 2026: *„to menu hoď pod
 * nějaký kebab, ať to neotravuje."* Účet, lodě, klíč a trasa jsou věci,
 * které se vyřizují jednou — na břehu, v klubovně, před sezónou. Na
 * obrazovce, kterou má posádka otevřenou celou rozjížďku, jsou to čtyři
 * řádky, přes které se kouká na to podstatné.
 *
 * <b>Terč má 44 pt, i když ty tři tečky jsou malé.</b> Kreslí se menší,
 * než na co se klepe — jinak by to byl přesně ten případ, který měření
 * 30. 10. 2026 našlo třicetkrát (`tools/kontrola-dotyku.py`).
 */

/** Kam se dá odsud jít. Pořadí je podle toho, jak často se tam chodí. */
const KAM: { text: string; cil: string; popis?: string }[] = [
  // <b>Domů musí být v nabídce</b> (Filip, 7. 11. 2026: *„hele jak se
  // budu dostávat zpět na landing?"*). Hlavička se nekreslí, takže
  // jediná cesta zpátky bylo gesto — a z cíle rozjížďky je to gest
  // několik. Nabídka je na každé obrazovce, tak ať vede i domů.
  { text: 'Domů', cil: '/', popis: 'úvodní obrazovka' },
  // <b>Moje regata je nad ročníky.</b> Posádka na vodě se neptá „jaké
  // byly výsledky v červnu", ptá se „co se děje teď" — a ročníky jsou
  // cesta dovnitř pro zkoušení, ne obrazovka produktu.
  { text: 'Moje regata', cil: '/zavodnik', popis: 'co se dnes jede a jak tě vidí rozhodčí' },
  { text: 'Ročníky', cil: '/rocniky', popis: 'kalendář, výsledky, pořadí' },
  { text: 'Moje lodě a posádka', cil: '/lode' },
  { text: 'Klíč k lodi', cil: '/klic' },
  { text: 'Záznam trasy', cil: '/tracker' },
  { text: 'Účet a oprávnění', cil: '/ucet' },
];

const WEB = 'https://orlickypohar.klihovka.cz';

export function Kebab() {
  const t = useTheme();
  const router = useRouter();
  const okraje = useSafeAreaInsets();
  const [otevreno, setOtevreno] = useState(false);
  const [vUkazce, setVUkazce] = useState(ukazkaBezi());

  // Zavřít dřív, než se někam jde: jinak by nabídka zůstala viset nad
  // obrazovkou, na kterou se právě přešlo.
  const jdi = (cil: string) => {
    setOtevreno(false);
    // <b>Domů se nevrší, nahrazuje.</b> `push` by z páté obrazovky
    // udělal šestou a gesto zpět by vedlo tam, odkud člověk právě utekl;
    // `navigate` na kořen zásobník srovná.
    if (cil === '/') router.navigate('/');
    else router.push(cil as Parameters<typeof router.push>[0]);
  };

  return (
    <>
      <Pressable
        onPress={() => setOtevreno(true)}
        accessibilityRole="button"
        accessibilityLabel="Nabídka"
        style={({ pressed }) => [s.terc, pressed && { opacity: 0.5 }]}>
        <View style={[s.tecka, { backgroundColor: t.tlumeny }]} />
        <View style={[s.tecka, { backgroundColor: t.tlumeny }]} />
        <View style={[s.tecka, { backgroundColor: t.tlumeny }]} />
      </Pressable>

      <Modal
        visible={otevreno}
        transparent
        animationType="fade"
        onRequestClose={() => setOtevreno(false)}>
        {/* Klepnutí vedle zavírá. Je to větší terč než cokoliv v nabídce,
            a tedy nejsnazší cesta zpátky. */}
        <Pressable style={s.stin} onPress={() => setOtevreno(false)} />
        <View
          style={[
            s.panel,
            { backgroundColor: t.papir, borderColor: t.linka, paddingTop: okraje.top + 8 },
          ]}>
          {KAM.map((k) => (
            <Radek key={k.cil} text={k.text} popis={k.popis} onPress={() => jdi(k.cil)} />
          ))}
          {/* <b>Ukázkový režim.</b> Appka se odpojí od serveru a jede
              z přibalených dat; nahoře o sobě dá vědět proužkem. Po
              přepnutí se zásobník obrazovek zahodí — jinak by na nich
              zůstala data z toho druhého světa. */}
          <Radek
            text={vUkazce ? 'Ukončit ukázku' : 'Ukázkový režim'}
            popis={
              vUkazce
                ? 'vrátí appku na server'
                : 'appka bez serveru, z přibalených dat'
            }
            hodnota={vUkazce ? 'běží' : undefined}
            barvaHodnoty={vUkazce ? t.voda : undefined}
            onPress={() => {
              setOtevreno(false);
              if (vUkazce) vypniUkazku();
              else zapniUkazku();
              setVUkazce(ukazkaBezi());
              // <b>`dismissAll` jen když je co zavřít.</b> Bez té
              // podmínky vyhodí navigace *„The action 'POP_TO_TOP' was
              // not handled"* a `replace` za ní se nemusí provést — pak
              // se režim přepne uvnitř, ale obrazovka o tom neví.
              // Viděno v simulátoru 7. 11. 2026.
              if (router.canDismiss()) router.dismissAll();
              router.replace('/');
            }}
          />

          <Radek
            text="orlickypohar.klihovka.cz"
            hodnota="web"
            onPress={() => {
              setOtevreno(false);
              void Linking.openURL(WEB);
            }}
          />
          <Pressable
            onPress={() => setOtevreno(false)}
            style={({ pressed }) => [s.zavrit, pressed && { opacity: 0.5 }]}>
            <Text style={[s.zavritText, { color: t.voda }]}>Zavřít</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  // Terč je 44 pt, tečky uvnitř mají dohromady 16.
  terc: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tecka: { width: 4, height: 4, borderRadius: 2 },

  stin: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  zavrit: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  zavritText: { fontSize: 16, fontWeight: '700' },
});
