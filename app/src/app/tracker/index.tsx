import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Karta, Nadpis, Prazdno, Sekce, Stitek } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { casAMinuty, trvani, vzdalenost } from '@/lib/tracker/formaty';
import { spustSimulaci } from '@/lib/tracker/simulace';
import {
  bezinaPozadi,
  spustZaznamNaPozadi,
  zadejOpravneni,
  zastavZaznamNaPozadi,
} from '@/lib/tracker/uloha';
import {
  bezicZaznam,
  prehled,
  seznamZaznamu,
  smazZaznam,
  ukonciZaznam,
  zalozZaznam,
  type Prehled,
  type Zaznam,
} from '@/lib/tracker/zaznam';

/** Po dvanácti hodinách je pravděpodobnější, že se zapomnělo, než že se jede. */
const DLOUHO_MS = 12 * 3600 * 1000;

export default function Tracker() {
  const t = useTheme();
  const router = useRouter();
  const [bezi, setBezi] = useState<Zaznam | null>(null);
  const [souhrn, setSouhrn] = useState<Prehled | null>(null);
  const [trasy, setTrasy] = useState<Zaznam[]>([]);
  const [lod, setLod] = useState('');
  const [regata, setRegata] = useState('');
  const [naPozadi, setNaPozadi] = useState(false);
  // Simulace běží v tomhle kontextu, takže si na ni musíme podržet ruku.
  const simulace = useRef<{ stop: () => void } | null>(null);

  const obnov = useCallback(() => {
    const z = bezicZaznam();
    setBezi(z);
    setSouhrn(z ? prehled(z.id) : null);
    setTrasy(seznamZaznamu());
  }, []);

  useEffect(() => {
    obnov();
    void bezinaPozadi()
      .then(setNaPozadi)
      .catch(() => setNaPozadi(false));
    // Stav se čte z databáze, ne z paměti — po restartu procesu je to jediné
    // místo, kde se o běžícím záznamu dá dozvědět.
    const timer = setInterval(() => {
      obnov();
      void bezinaPozadi()
      .then(setNaPozadi)
      .catch(() => setNaPozadi(false));
    }, 2000);
    return () => clearInterval(timer);
  }, [obnov]);

  async function spust(zdroj: 'gps' | 'simulace') {
    const jmeno = lod.trim();
    if (!jmeno) {
      Alert.alert('Chybí loď', 'Napiš jméno lodi, pro kterou se trasa zaznamenává.');
      return;
    }

    if (zdroj === 'gps') {
      const stav = await zadejOpravneni();
      if (stav === 'bez-popredi') {
        Alert.alert('Bez polohy to nejde', 'Appka potřebuje přístup k poloze telefonu.');
        return;
      }
      if (stav === 'bez-pozadi') {
        Alert.alert(
          'Potřebuje polohu „Vždy"',
          Platform.OS === 'android'
            ? 'V nastavení appky vyber u polohy „Povolit vždy". Jinak záznam skončí, jak se zhasne displej.'
            : 'V nastavení appky vyber u polohy „Vždy". Jinak záznam skončí, jak se zhasne displej.',
        );
        return;
      }
    }

    // Přejímací podmínka č. 6: telefon přiřazený ke špatné lodi. Potvrzení
    // jména při startu je to nejmenší, co ji pokrývá.
    Alert.alert(
      zdroj === 'simulace' ? 'Spustit simulaci?' : 'Zaznamenávat trasu?',
      `Loď: ${jmeno}${regata.trim() ? `\nRegata: ${regata.trim()}` : ''}`,
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Je to správná loď',
          onPress: async () => {
            let id: string;
            try {
              id = zalozZaznam({ lod: jmeno, regata: regata.trim() || null, zdroj });
            } catch (e) {
              Alert.alert('Nešlo to', e instanceof Error ? e.message : String(e));
              return;
            }

            if (zdroj === 'simulace') {
              simulace.current = spustSimulaci(id);
              obnov();
              return;
            }

            try {
              await spustZaznamNaPozadi();
            } catch (e) {
              // Záznam, který se tváří, že běží, a přitom nic nezapisuje, je
              // horší než žádný — posádka by se na něj celý závod spoléhala.
              // Proto se po selhání startu zahodí.
              ukonciZaznam(id);
              smazZaznam(id);
              obnov();
              Alert.alert(
                'Záznam nezačal',
                `${e instanceof Error ? e.message : String(e)}\n\nV Expo Go to je očekávané — poloha na pozadí tam není. Zkoušej to v APK nebo ve vlastním buildu.`,
              );
              return;
            }
            obnov();
          },
        },
      ],
    );
  }

  function ukonci(z: Zaznam) {
    Alert.alert(
      'Ukončit záznam?',
      'Pokud jste dojeli dřív a appka jela dál, ostříhej konec v detailu trasy — jinak zůstane zapsaná cesta domů.',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Dojel jsem teď',
          onPress: () => {
            simulace.current?.stop();
            simulace.current = null;
            void zastavZaznamNaPozadi().catch(() => {});
            ukonciZaznam(z.id);
            obnov();
          },
        },
        {
          text: 'Dojel jsem dřív',
          onPress: () => {
            simulace.current?.stop();
            simulace.current = null;
            void zastavZaznamNaPozadi().catch(() => {});
            ukonciZaznam(z.id);
            obnov();
            router.push(`/tracker/${z.id}`);
          },
        },
      ],
    );
  }

  const dlouho = bezi ? Date.now() - bezi.zacatek > DLOUHO_MS : false;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Nadpis tlumene="Zkouška záznamu trasy. Zatím bez nahrávání na web.">Trasa</Nadpis>

      {bezi ? (
        <Karta>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: t.text, fontWeight: '700', fontSize: 17 }}>{bezi.lod}</Text>
            <Stitek
              text={bezi.zdroj === 'simulace' ? 'simulace' : 'záznam běží'}
              barva={bezi.zdroj === 'simulace' ? t.tlumeny : t.stavVypsany}
            />
          </View>
          {bezi.regata ? (
            <Text style={{ color: t.tlumeny, marginTop: 2 }}>{bezi.regata}</Text>
          ) : null}

          <Text style={{ color: t.text, marginTop: 10 }}>
            {souhrn?.pocetBodu ?? 0} bodů · {vzdalenost(souhrn?.delkaM ?? 0)} ·{' '}
            {trvani(Date.now() - bezi.zacatek)}
          </Text>
          <Text style={{ color: t.tlumeny, marginTop: 2, fontSize: 13 }}>
            od {casAMinuty(bezi.zacatek)}
          </Text>

          {bezi.zdroj === 'gps' && !naPozadi ? (
            <Text style={{ color: t.stavZruseny, marginTop: 8, fontSize: 13 }}>
              Úloha na pozadí neběží. V Expo Go to je očekávané — poloha na pozadí tam není;
              zkoušej to v APK.
            </Text>
          ) : null}

          {dlouho ? (
            <Text style={{ color: t.stavZruseny, marginTop: 8, fontSize: 13 }}>
              Záznam běží {trvani(Date.now() - bezi.zacatek)}. Jestli jste dojeli, ukonči ho —
              trasa jinak pokračuje domů.
            </Text>
          ) : null}

          <Pressable onPress={() => ukonci(bezi)} style={{ marginTop: 14 }}>
            <Text style={{ color: t.voda, fontWeight: '600' }}>Ukončit záznam</Text>
          </Pressable>
        </Karta>
      ) : (
        <Karta>
          <Text style={{ color: t.tlumeny, fontSize: 13, marginBottom: 6 }}>Loď</Text>
          <TextInput
            value={lod}
            onChangeText={setLod}
            placeholder="jméno lodi"
            placeholderTextColor={t.tlumeny}
            style={{
              color: t.text,
              borderWidth: 1,
              borderColor: t.linka,
              borderRadius: 8,
              padding: 10,
            }}
          />
          <Text style={{ color: t.tlumeny, fontSize: 13, marginTop: 12, marginBottom: 6 }}>
            Regata (nepovinné)
          </Text>
          <TextInput
            value={regata}
            onChangeText={setRegata}
            placeholder="např. Radavská regata"
            placeholderTextColor={t.tlumeny}
            style={{
              color: t.text,
              borderWidth: 1,
              borderColor: t.linka,
              borderRadius: 8,
              padding: 10,
            }}
          />

          <Pressable onPress={() => void spust('gps')} style={{ marginTop: 16 }}>
            <Text style={{ color: t.voda, fontWeight: '700', fontSize: 16 }}>
              Spustit záznam trasy
            </Text>
          </Pressable>
          <Pressable onPress={() => void spust('simulace')} style={{ marginTop: 14 }}>
            <Text style={{ color: t.tlumeny }}>Spustit simulovanou plavbu</Text>
          </Pressable>
          <Text style={{ color: t.tlumeny, fontSize: 12, marginTop: 4 }}>
            Simulace je na ladění — zapisuje stejnou cestou jako GPS, ale body jsou vymyšlené.
          </Text>
        </Karta>
      )}

      <Sekce>Zaznamenané trasy</Sekce>
      {trasy.length === 0 ? <Prazdno text="Zatím žádná trasa." /> : null}
      {trasy.map((z) => (
        <Karta key={z.id} onPress={() => router.push(`/tracker/${z.id}`)}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: t.text, fontWeight: '600' }}>{z.lod}</Text>
            {z.zdroj === 'simulace' ? <Stitek text="simulace" /> : null}
            {z.stav === 'bezi' ? <Stitek text="běží" barva={t.stavVypsany} /> : null}
          </View>
          <Text style={{ color: t.tlumeny, marginTop: 2, fontSize: 13 }}>
            {casAMinuty(z.zacatek)}
            {z.konec ? ` · ${trvani(z.konec - z.zacatek)}` : ''}
            {z.regata ? ` · ${z.regata}` : ''}
          </Text>
        </Karta>
      ))}
    </ScrollView>
  );
}
