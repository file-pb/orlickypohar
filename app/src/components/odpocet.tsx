import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { Barvy } from '@/constants/theme';
import {
  mmss,
  PROCEDURA_S,
  stavStartu,
  usekyProcedury,
  zacatekProcedury,
  type RozjizdkaProOdpocet,
  type StavStartu,
} from '@/lib/start';

/**
 * Panel startu: co se zrovna děje a kolik zbývá.
 *
 * <b>Odměřuje si to telefon sám</b> z vlastních hodin a času startu, který
 * dostal — ne tikáním ze serveru. Na vodě signál vypadne a odpočet je ta
 * jediná věc, která vypadnout nesmí (nález R19; Filip, 27. 10. 2026:
 * *„dokud nebude na připojení, tak si to apka odměří"*).
 *
 * Pravidla, kdy co platí, jsou v `lib/start.ts` a mají vlastní testy; tahle
 * komponenta je jen kreslí.
 */

/** Jak často se překresluje. Vteřina stačí — odpočet se čte po vteřinách. */
const TIK_MS = 1000;

export function Odpocet({
  rozjizdky,
  delkaProceduryMin,
}: {
  rozjizdky: readonly RozjizdkaProOdpocet[];
  delkaProceduryMin?: number;
}) {
  const t = useTheme();
  const [ted, setTed] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setTed(Date.now()), TIK_MS);
    return () => clearInterval(id);
  }, []);

  const delkaS = (delkaProceduryMin ?? PROCEDURA_S / 60) * 60;
  const stav = stavStartu(rozjizdky, ted, delkaS);

  // Dokud se na startu nic neděje, panel není. Prázdný rámeček by jen
  // zabíral místo a tvrdil, že se něco chystá.
  if (!stav) return null;

  if (stav.druh === 'ceka') return <Ceka stav={stav} delkaS={delkaS} t={t} />;
  if (stav.druh === 'jede') return <Jede stav={stav} t={t} />;
  return <Bezi stav={stav} delkaS={delkaS} t={t} />;
}

/** Procedura ještě neběží: jen kdy začne. Žádný odpočet — nemá co odpočítávat. */
function Ceka({
  stav,
  delkaS,
  t,
}: {
  stav: Extract<StavStartu, { druh: 'ceka' }>;
  delkaS: number;
  t: Barvy;
}) {
  return (
    <View style={[s.panel, { backgroundColor: t.zvyrazneni, borderColor: t.linka, borderWidth: 1 }]}>
      <Text style={[s.radek, { color: t.tlumeny }]}>Rozjížďka {stav.cislo}</Text>
      <Text style={[s.vetaVelka, { color: t.text }]}>
        Procedura začne ve {zacatekProcedury(stav.startV, delkaS)}
      </Text>
    </View>
  );
}

/** Po startu: počítá se nahoru a panel zeslábne — už se nic nehlídá. */
function Jede({ stav, t }: { stav: Extract<StavStartu, { druh: 'jede' }>; t: Barvy }) {
  return (
    <View style={[s.panel, s.jede, { backgroundColor: t.papir, borderColor: t.jede }]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.radek, { color: t.jede, fontWeight: '700' }]}>
          Rozjížďka {stav.cislo} jede
        </Text>
      </View>
      <Text style={[s.casStredni, { color: t.text }]}>{mmss(stav.odStartuS)}</Text>
    </View>
  );
}

/**
 * Odpočet. V poslední minutě mění panel barvu na jantarovou — je to stav,
 * ve kterém se nejvíc chybuje, a pozná se tak i koutkem oka. Červená je
 * v appce vyhrazená zrušení rozjížďky, tedy jediné nevratné věci.
 */
function Bezi({
  stav,
  delkaS,
  t,
}: {
  stav: Extract<StavStartu, { druh: 'procedura' }>;
  delkaS: number;
  t: Barvy;
}) {
  const useky = usekyProcedury(stav.doStartuS, delkaS);
  const minuta = stav.doStartuS <= 60;
  const pozadi = minuta ? t.pozor : t.procedura;

  return (
    <View style={[s.panel, { backgroundColor: pozadi }]}>
      <View style={s.hlava}>
        <Text style={[s.radek, s.naBarve]}>
          Rozjížďka {stav.cislo} {minuta ? '— poslední minuta' : 'startuje'}
        </Text>
      </View>

      <View style={s.casRadek}>
        <Text style={[s.casVelky, s.naBarve]}>{mmss(stav.doStartuS)}</Text>
        <Text style={[s.doStartu, s.naBarveTlumene]}>do startu</Text>
      </View>

      <View style={s.useky}>
        {useky.map((u) => (
          <View key={u.faze} style={{ flex: u.delkaS }}>
            <View style={s.zlab}>
              <View
                style={{
                  width: `${Math.round(u.hotovo * 100)}%`,
                  height: '100%',
                  borderRadius: 3,
                  backgroundColor:
                    u.faze === 'vyzva'
                      ? t.vyzvaZnameni
                      : u.faze === 'priprava'
                        ? t.pripravaZnameni
                        : t.minutaZnameni,
                }}
              />
            </View>
            <Text style={[s.popisekUseku, s.naBarveTlumene]}>
              {u.faze === 'vyzva' ? 'výzva' : u.faze === 'priprava' ? 'příprava' : 'minuta'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  panel: { borderRadius: 14, padding: 16, marginBottom: 16 },
  jede: { borderWidth: 2, flexDirection: 'row', alignItems: 'center', gap: 12 },
  hlava: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  radek: { fontSize: 14, fontWeight: '600' },
  vetaVelka: { fontSize: 19, fontWeight: '700', marginTop: 3, lineHeight: 24 },
  casRadek: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 2 },
  // `fontVariant` drží číslice stejně široké, aby odpočet neposkakoval.
  casVelky: { fontSize: 60, fontWeight: '700', lineHeight: 64, fontVariant: ['tabular-nums'] },
  casStredni: { fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'] },
  doStartu: { fontSize: 15 },
  naBarve: { color: '#ffffff' },
  naBarveTlumene: { color: 'rgba(255,255,255,0.78)' },
  useky: { flexDirection: 'row', gap: 5, marginTop: 12 },
  zlab: { height: 7, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' },
  popisekUseku: { fontSize: 9, marginTop: 3 },
});
