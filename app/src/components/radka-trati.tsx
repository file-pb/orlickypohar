import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SiluetaZnacky } from '@/components/znak-boje';
import type { Barvy } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { barvaNaVyplni } from '@/lib/kontrast';
import type { StavRadky } from '@/lib/radka-trati';
import type { components } from '@/lib/schema';

type S = components['schemas'];
type BarvaBoje = S['BarvaBoje'];
type TvarBoje = S['TvarBoje'];
type DruhZnaceni = S['DruhZnaceni'];

/**
 * Jedna řádka trati — <b>čísla, ne přívlastky</b> (rozhodnutí 2 druhého
 * konzilia, 21. 11. 2026). Míry nejsou odhad, jsou změřené v posudcích:
 *
 * | | co | míra |
 * |---|---|---|
 * | vlevo | silueta značky | 28 × 36 ve žlábku 40 |
 * | uprostřed | jméno 16/600 · předpis 13/400 `tlumeny`, až dvě řádky | 66 · 134 z 292 |
 * | vpravo | stav jedním slovem 13/600 | sloupec 114 |
 *
 * <b>Celý řádek je terč</b> a vstup do detailu. Dnes jím nebyl ani
 * v maketě, ani v kódu. Jedno klepnutí je nejnižší možná cena a nic se
 * jím nemaže — chybné klepnutí otevře cizí detail, odkud vede zpátky
 * jedno klepnutí.
 *
 * <b>Žlábek 40 dp není výplň, je to osa.</b> Silueta v něm sedí na
 * vlákně, které kreslí <see cref="OsaTrati"/>.
 */
/**
 * <b>64, ne 56</b> (26. 11. 2026). Předpis se od téhož dne čte z pohledu
 * lodi a nese i další průjezdy — *„obeplout po levoboku, podruhé po
 * pravoboku"* je 42 znaků a na jednu řádku se v 13 pt nevejde ani zdaleka
 * (sloupec má kolem 222 dp, tedy asi 35 znaků). Předtím se to neprojevilo
 * jen proto, že se předpis usekl potichu; změřeno v simulátoru týž den.
 * <b>Výška je pro všechny řádky stejná</b>, i pro ty jednořádkové: vlákno
 * osy počítá s polovinou výšky prvního a posledního řádku, a to platí jen
 * tehdy, když jsou všechny stejné.
 */
export const VYSKA = 64;
export const MEZERA = 8;
export const ZLABEK = 40;

export function RadkaTrati({
  jmeno,
  predpis,
  barva,
  tvar,
  znaceni,
  stav,
  onPress,
}: {
  jmeno: string;
  /**
   * Jak se kolem té značky jede, z pohledu lodi — i s dalšími průjezdy
   * („obeplout po levoboku, podruhé po pravoboku"). Čte se na břehu proti
   * směrnici, ne za jízdy.
   */
  predpis?: string | null;
  barva?: BarvaBoje;
  tvar?: TvarBoje;
  znaceni?: DruhZnaceni;
  /** Jedno slovo, nebo `null`. `odesláno` je mlčení. */
  stav: StavRadky;
  onPress: () => void;
}) {
  const t = useTheme();
  const s = styly(t);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${jmeno}${predpis ? `, ${predpis}` : ''}${stav ? `, ${stav}` : ''}`}
      style={({ pressed }) => [s.radek, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={s.zlabek}>
        <SiluetaZnacky
          barva={barva}
          tvar={tvar}
          znaceni={znaceni}
          // Bez zapsané barvy tlumená, ne červená: červená je pravá
          // strana plavební dráhy a `Barva` je nepovinná schválně.
          vychoziVypln={t.tlumeny}
          // Lem se počítá z podkladu karty. Bílý lem je na `papir`
          // 1,00:1, takže žlutá a bílá silueta by zmizely.
          lem={barvaNaVyplni(t, t.papir, t.tlumeny)}
        />
      </View>

      <View style={s.karta}>
        <View style={s.stred}>
          <Text style={s.jmeno} numberOfLines={1}>
            {jmeno}
          </Text>
          {predpis ? (
            <Text style={s.predpis} numberOfLines={2}>
              {predpis}
            </Text>
          ) : null}
        </View>

        {/* Prázdno je tu správná odpověď: řádka, u které je všechno
            v pořádku, neříká nic. */}
        {stav ? <Text style={s.stav}>{stav}</Text> : null}
      </View>
    </Pressable>
  );
}

/**
 * Osa pod siluetami: <b>souvislé vlákno 1,5 dp</b> v `tlumeny`
 * (rozhodnutí 4, jednomyslně).
 *
 * <b>Proč ne tečky.</b> Při rozteči 64 by ze tří teček zbyly dvě a dvě
 * tečky nejsou vzorek — přerušovaná čára potřebuje tři opakování. Vlákno
 * navíc **není prvek ve sloupci**, takže rozteč je prostě výška plus
 * mezera a zkrácení na něm není vidět. Ve žlábku stojí šest různých
 * siluet a ty potřebují tichou linku, ne druhou texturu.
 *
 * Vlákno vede <b>od prvního uzlu k poslednímu</b>, ne přes celou výšku:
 * nad prvním a pod posledním by viselo do prázdna.
 */
export function OsaTrati({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  const s = styly(t);
  return (
    <View style={s.osa}>
      <View pointerEvents="none" style={[s.vlakno, { backgroundColor: t.tlumeny }]} />
      {children}
    </View>
  );
}

const styly = (t: Barvy) =>
  StyleSheet.create({
    osa: { position: 'relative' },
    vlakno: {
      position: 'absolute',
      // Na střed žlábku: (40 − 1,5) / 2.
      left: (ZLABEK - 1.5) / 2,
      width: 1.5,
      // Od středu prvního řádku ke středu posledního.
      top: VYSKA / 2,
      bottom: VYSKA / 2,
    },
    radek: {
      flexDirection: 'row',
      alignItems: 'center',
      height: VYSKA,
      marginBottom: MEZERA,
    },
    zlabek: { width: ZLABEK, alignItems: 'center', justifyContent: 'center' },
    karta: {
      flex: 1,
      height: VYSKA,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 13,
      borderRadius: 10,
      backgroundColor: t.papir,
      borderWidth: 1,
      borderColor: t.linka,
    },
    stred: { flex: 1, paddingRight: 10 },
    jmeno: { fontSize: 16, fontWeight: '600', color: t.text },
    predpis: { fontSize: 13, fontWeight: '400', color: t.tlumeny },
    stav: { fontSize: 13, fontWeight: '600', color: t.tlumeny, textAlign: 'right' },
  });
