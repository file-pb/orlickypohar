import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { pismoNaVyplni } from '@/lib/kontrast';
import { overSpojeni, stavSite } from '@/lib/sit';
import { stavNahravani } from '@/lib/tracker/nahravani';
import { stavProuzku, type Prouzek } from '@/lib/tracker/prouzek';
import { stavGps } from '@/lib/tracker/stav';
import { otevrenyZaznam } from '@/lib/tracker/zaznam';
import { ukazkaBezi } from '@/lib/ukazka';

/**
 * Proužek spojení pod hodinami a baterií.
 *
 * Co v něm stojí a kdy, rozhoduje `lib/tracker/prouzek.ts` a má to vlastní
 * testy; tahle komponenta to jen kreslí a čte stav z databáze.
 */

/** Jak často se stav přečte. Tři vteřiny, stejně jako na rozcestníku. */
const TIK_MS = 3000;

/**
 * Jak často se appka ptá serveru, jestli je na příjmu.
 *
 * <b>Mnohem řidčeji než tik.</b> Čtení stavu z databáze nic nestojí,
 * dotaz ven ano — a tohle běží na každé obrazovce, celý den u vody.
 * Půl minuty je kompromis mezi „proužek lže" a „appka šťouchá pořád".
 *
 * Ptá se <b>jen když neběží záznam</b>: při něm stav spojení vzniká sám
 * z odesílání stopy a druhý dotaz by byl zbytečný.
 */
const OVERENI_MS = 30000;

export function useProuzek(): Prouzek | null {
  const [p, setP] = useState<Prouzek | null>(null);

  useEffect(() => {
    const nacti = () => {
      try {
        // V ukázce se do databáze nechodí vůbec — proužek hlásí režim.
        if (ukazkaBezi()) {
          setP(stavProuzku(null, { posledniBod: null, stariMs: null, presnostM: null, pocetBodu: 0 }, null, Date.now(), true));
          return;
        }
        const z = otevrenyZaznam();
        // Bez otevřeného záznamu se do dalších dotazů vůbec nechodí: tohle
        // běží na každé obrazovce, včetně té, kde zrovna jede odpočet.
        setP(
          z
            ? stavProuzku(z, stavGps(z.id), stavNahravani(z.id))
            : stavProuzku(null, { posledniBod: null, stariMs: null, presnostM: null, pocetBodu: 0 }, null, Date.now(), false, stavSite()),
        );
      } catch {
        // Databáze nemusí být po studeném startu ještě otevřená. Proužek,
        // který appku shodí, by byl horší než proužek, který chvíli není.
        setP(null);
      }
    };
    nacti();
    const id = setInterval(nacti, TIK_MS);

    // <b>Ptá se jen bez otevřeného záznamu.</b> Při záznamu stav spojení
    // vzniká z odesílání stopy, takže by to byl dotaz navíc o ničem.
    const zeptejSe = () => {
      try {
        // <b>V ukázce se neptáme.</b> Dotaz by sice šel přes `sit` a ven
        // by neodešel, ale byl by to dotaz o ničem: ukázka `/health`
        // nezná a proužek v ní stejně hlásí režim, ne spojení.
        if (!ukazkaBezi() && !otevrenyZaznam()) void overSpojeni();
      } catch {
        // Databáze po studeném startu; příští kolo to zkusí znovu.
      }
    };
    zeptejSe();
    const idSite = setInterval(zeptejSe, OVERENI_MS);
    // Návrat z pozadí překreslí hned: tik mezitím stál, takže by proužek
    // chvíli tvrdil, co platilo před hovorem.
    const posluchac = AppState.addEventListener('change', (stav) => {
      if (stav === 'active') nacti();
    });
    return () => {
      clearInterval(id);
      clearInterval(idSite);
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
