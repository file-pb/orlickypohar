import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { pismoNaVyplni } from '@/lib/kontrast';
import { stavNahravani } from '@/lib/tracker/nahravani';
import { stavProuzku, type Prouzek } from '@/lib/tracker/prouzek';
import { stavGps } from '@/lib/tracker/stav';
import { otevrenyZaznam } from '@/lib/tracker/zaznam';

/**
 * Proužek spojení pod hodinami a baterií.
 *
 * Co v něm stojí a kdy, rozhoduje `lib/tracker/prouzek.ts` a má to vlastní
 * testy; tahle komponenta to jen kreslí a čte stav z databáze.
 */

/** Jak často se stav přečte. Tři vteřiny, stejně jako na rozcestníku. */
const TIK_MS = 3000;

export function useProuzek(): Prouzek | null {
  const [p, setP] = useState<Prouzek | null>(null);

  useEffect(() => {
    const nacti = () => {
      try {
        const z = otevrenyZaznam();
        // Bez otevřeného záznamu se do dalších dotazů vůbec nechodí: tohle
        // běží na každé obrazovce, včetně té, kde zrovna jede odpočet.
        setP(z ? stavProuzku(z, stavGps(z.id), stavNahravani(z.id)) : null);
      } catch {
        // Databáze nemusí být po studeném startu ještě otevřená. Proužek,
        // který appku shodí, by byl horší než proužek, který chvíli není.
        setP(null);
      }
    };
    nacti();
    const id = setInterval(nacti, TIK_MS);
    // Návrat z pozadí překreslí hned: tik mezitím stál, takže by proužek
    // chvíli tvrdil, co platilo před hovorem.
    const posluchac = AppState.addEventListener('change', (stav) => {
      if (stav === 'active') nacti();
    });
    return () => {
      clearInterval(id);
      posluchac.remove();
    };
  }, []);

  return p;
}

export function ProuzekSpojeni({ prouzek }: { prouzek: Prouzek | null }) {
  const t = useTheme();
  const okraje = useSafeAreaInsets();

  if (!prouzek) return null;

  const vypln = t[prouzek.vypln];
  return (
    // <b>Výplň sahá až nahoru pod hodiny</b>, aby to byl jeden pruh a ne
    // barevná linka pod systémovou lištou. Psát se dá až pod ni: střed
    // horního okraje zabírá na novějších iPhonech výřez.
    <View style={{ backgroundColor: vypln, paddingTop: okraje.top }}>
      <View style={s.pas}>
        <Text style={[s.text, { color: pismoNaVyplni(t, vypln) }]} numberOfLines={1}>
          {prouzek.text}
        </Text>
      </View>
      {/* <b>Mezera pod proužkem</b> (Filip, 7. 11. 2026: *„jen bych to od
          stavu oddělil malinko"*). Bez ní splyne se vším, co má pod sebou
          tutéž barvu — a to je u „vysílá se" nad jedoucí rozjížďkou
          přesně ten případ. */}
      <View style={{ height: 3, backgroundColor: t.pozadi }} />
    </View>
  );
}

const s = StyleSheet.create({
  pas: { height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  text: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
});
