import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';

import { Pressable } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { Barvy } from '@/constants/theme';
import {
  mmss,
  PROCEDURA_S,
  trvani,
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
 * <b>A nesmí uhnout, ani když přijde hovor nebo se přepne jiná appka</b>
 * (Filip, 29. 10. 2026). Proto se čas <b>nepočítá přičítáním</b>, ale
 * pokaždé znovu z hodin: na pozadí `setInterval` stojí, takže čítač by se
 * po návratu opozdil přesně o tu dobu, co appka nebyla vidět — a opozdil
 * by se tím víc, čím delší byl hovor. Takhle je po návratu správný bez
 * ohledu na to, co se mezitím dělo.
 *
 * Návrat z pozadí navíc překreslí hned, ne až s dalším tikem: vteřina
 * čekání na starý údaj je u odpočtu vteřina, kdy obrazovka lže.
 *
 * Pravidla, kdy co platí, jsou v `lib/start.ts` a mají vlastní testy; tahle
 * komponenta je jen kreslí.
 */

/** Jak často se překresluje. Vteřina stačí — odpočet se čte po vteřinách. */
const TIK_MS = 1000;

export function Odpocet({
  rozjizdky,
  delkaProceduryMin,
  naSpusteni,
  chyba,
}: {
  rozjizdky: readonly RozjizdkaProOdpocet[];
  delkaProceduryMin?: number;
  /** Co se nepovedlo při posledním pokusu o spuštění, nebo `null`. */
  chyba?: string | null;
  /**
   * Co udělat, když rozhodčí spustí proceduru. Chybí-li, tlačítko se
   * neukáže — obrazovku regaty čte i ten, kdo nevelí.
   */
  naSpusteni?: (cislo: number) => void | Promise<void>;
}) {
  const t = useTheme();
  const [ted, setTed] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setTed(Date.now()), TIK_MS);
    // Hovor, přepnutí appky, uspaný displej: `setInterval` mezitím stojí.
    // Při návratu se čas vezme z hodin dřív, než stihne tiknout.
    const posluchac = AppState.addEventListener('change', (stav) => {
      if (stav === 'active') setTed(Date.now());
    });
    return () => {
      clearInterval(id);
      posluchac.remove();
    };
  }, []);

  const delkaS = (delkaProceduryMin ?? PROCEDURA_S / 60) * 60;
  const stav = stavStartu(rozjizdky, ted, delkaS);

  // Dokud se na startu nic neděje, panel není. Prázdný rámeček by jen
  // zabíral místo a tvrdil, že se něco chystá.
  if (!stav) return null;

  if (stav.druh === 'ceka')
    return <Ceka stav={stav} delkaS={delkaS} t={t} naSpusteni={naSpusteni} chyba={chyba} />;
  if (stav.druh === 'jede') return <Jede stav={stav} t={t} />;
  return <Bezi stav={stav} delkaS={delkaS} t={t} />;
}

/** Procedura ještě neběží: jen kdy začne. Žádný odpočet — nemá co odpočítávat. */
function Ceka({
  stav,
  delkaS,
  t,
  naSpusteni,
  chyba,
}: {
  stav: Extract<StavStartu, { druh: 'ceka' }>;
  delkaS: number;
  t: Barvy;
  naSpusteni?: (cislo: number) => void | Promise<void>;
  chyba?: string | null;
}) {
  const [spousti, setSpousti] = useState(false);

  return (
    <View style={[s.panel, { backgroundColor: t.zvyrazneni, borderColor: t.linka, borderWidth: 1 }]}>
      <Text style={[s.radek, { color: t.tlumeny }]}>Rozjížďka {stav.cislo}</Text>
      <Text style={[s.vetaVelka, { color: t.text }]}>
        Procedura začne ve {zacatekProcedury(stav.startV, delkaS)}
      </Text>

      {naSpusteni ? (
        <>
          {/* <b>Stisk musí být vidět a čekání taky.</b> Bez toho tlačítko
              „vypadalo jako nefunkční" (Filip na telefonu, 29. 10. 2026):
              po klepnutí se chvíli nic neděje, protože se čeká na server,
              a rozhodčí to zmáčkne podruhé. */}
          <Pressable
            onPress={async () => {
              if (spousti) return;
              setSpousti(true);
              try {
                await naSpusteni(stav.cislo);
              } finally {
                setSpousti(false);
              }
            }}
            disabled={spousti}
            style={({ pressed }) => [
              s.spustit,
              { backgroundColor: t.procedura, opacity: pressed || spousti ? 0.6 : 1 },
            ]}>
            <View style={s.spustitObsah}>
              {spousti ? <ActivityIndicator color="#ffffff" /> : null}
              <Text style={s.spustitText}>
                {spousti ? 'Spouštím…' : 'Spustit startovní proceduru'}
              </Text>
            </View>
          </Pressable>

          {/* Jediná pojistka, kterou appka sama nezařídí: hovor přeruší
              hlášení a iOS to neobejde. Připomíná se tady, protože tohle
              je poslední klidná chvíle před procedurou. */}
          <Text style={[s.pripominka, { color: t.pozor }]}>
            Zapni si Nerušit — hovor přeruší hlášení.
          </Text>

          {chyba ? (
            <Text style={[s.pripominka, { color: t.stavZruseny, fontWeight: '600' }]}>
              {chyba}
            </Text>
          ) : null}
        </>
      ) : null}
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
      <Text style={[s.casStredni, { color: t.text }]}>{trvani(stav.odStartuS)}</Text>
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
  naBarveTlumene: { color: 'rgba(255,255,255,0.85)' },
  useky: { flexDirection: 'row', gap: 5, marginTop: 12 },
  zlab: { height: 7, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  popisekUseku: { fontSize: 9, marginTop: 3 },
  spustit: { marginTop: 14, minHeight: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  spustitObsah: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spustitText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  pripominka: { fontSize: 12, marginTop: 8, lineHeight: 16 },
});
