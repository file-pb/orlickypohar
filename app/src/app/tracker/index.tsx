import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Karta, Nadpis, Prazdno, Sekce, Stitek } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { casAMinuty, trvani, vzdalenost } from '@/lib/tracker/formaty';
import { spustSimulaci } from '@/lib/tracker/simulace';
import {
  bezinaPozadi,
  otevriNastaveni,
  propichni,
  spustZaznamNaPozadi,
  zadejOpravneni,
  zastavZaznamNaPozadi,
} from '@/lib/tracker/uloha';
import { stavNahravani } from '@/lib/tracker/nahravani';
import {
  predJakDlouho,
  stavGps,
  stavOdesilani,
  svetloGps,
  type StavGps,
  type Svetlo,
} from '@/lib/tracker/stav';
import {
  obnovZaznam,
  otevrenyZaznam,
  pozastavZaznam,
  prehled,
  seznamZaznamu,
  smazZaznam,
  ukonciZaznam,
  zalozZaznam,
  type Prehled,
  type Zaznam,
} from '@/lib/tracker/zaznam';


/**
 * Stavový panel. Ukazuje **čerstvost**, ne kontrolku: „poslední bod před 4 s,
 * přesnost 6 m" říká víc než zelené kolečko, které svítí proto, že se nikdo
 * nezeptal.
 */
function Radek({ svetlo, popis, hodnota }: { svetlo: Svetlo; popis: string; hodnota: string }) {
  const t = useTheme();
  const barva = {
    jede: t.stavVypsany,
    ceka: t.stavZruseny,
    stoji: t.tlumeny,
    // Pozastaveno není porucha, ale ani běh — proto barva textu, ne červená
    // ani zelená.
    pozastaveno: t.text,
  }[svetlo];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5 }}>
      <View
        style={{ width: 9, height: 9, borderRadius: 999, backgroundColor: barva, marginRight: 9 }}
      />
      <Text style={{ color: t.tlumeny, width: 72 }}>{popis}</Text>
      <Text style={{ color: t.text, flex: 1 }}>{hodnota}</Text>
    </View>
  );
}

function Panel({
  bezi,
  gps,
  naPozadi,
  onPrepni,
}: {
  bezi: Zaznam;
  gps: StavGps;
  naPozadi: boolean;
  onPrepni: () => void;
}) {
  const t = useTheme();
  const [propich, setPropich] = useState<string | null>(null);
  const [propichaSe, setPropichaSe] = useState(false);
  const odesilani = stavOdesilani(bezi, stavNahravani(bezi.id));

  async function zkus() {
    setPropichaSe(true);
    setPropich(null);
    try {
      const v = await propichni();
      setPropich(
        `poloha za ${(v.trvaloMs / 1000).toFixed(1)} s` +
          (v.presnostM == null ? '' : `, přesnost ${Math.round(v.presnostM)} m`),
      );
    } catch (e) {
      setPropich(`nepovedlo se: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setPropichaSe(false);
    }
  }

  return (
    <Karta>
      <Radek
        svetlo={svetloGps(bezi, gps)}
        popis="GPS"
        hodnota={
          gps.posledniBod == null
            ? 'čeká na první bod'
            : `${predJakDlouho(gps.stariMs)}` +
              (gps.presnostM == null ? '' : ` · přesnost ${Math.round(gps.presnostM)} m`)
        }
      />
      <Radek
        svetlo={
          bezi.stav === 'pozastaveny'
            ? 'pozastaveno'
            : bezi.zdroj === 'simulace' || naPozadi
              ? 'jede'
              : 'ceka'
        }
        popis="Zápis"
        hodnota={
          bezi.stav === 'pozastaveny'
            ? `pozastaveno · ${gps.pocetBodu} bodů zapsáno`
            : `${gps.pocetBodu} bodů · od ${casAMinuty(bezi.zacatek)}`
        }
      />
      {/* Odesílá se průběžně, po minutě, a dělá to úloha na pozadí — na
          posádce nesmí viset nic než spuštění záznamu. Řádek ukazuje, kdy
          se naposledy ozvalo a proč případně ne. */}
      <Radek {...odesilani} popis="Odesílání" />

      {/* Pozastavení je páka pro posádku, ne pro pořadatele: někdy je potřeba
          soukromí vynutit. V trase vznikne díra a to je záměr. */}
      <Pressable onPress={onPrepni} style={{ marginTop: 14 }}>
        <Text style={{ color: t.voda, fontWeight: '600' }}>
          {bezi.stav === 'pozastaveny' ? 'Pokračovat ve sledování' : 'Pozastavit sledování'}
        </Text>
      </Pressable>
      {bezi.stav === 'pozastaveny' ? (
        <Text style={{ color: t.tlumeny, fontSize: 12, marginTop: 4 }}>
          Trasa se nezahodila — v místě pauzy v ní bude mezera.
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 20 }}>
        <Pressable onPress={() => void zkus()} disabled={propichaSe}>
          <Text style={{ color: propichaSe ? t.tlumeny : t.voda, fontWeight: '600' }}>
            {propichaSe ? 'Zkouším…' : 'Propíchnout'}
          </Text>
        </Pressable>
        <Pressable onPress={() => void otevriNastaveni()}>
          <Text style={{ color: t.tlumeny }}>Nastavení polohy</Text>
        </Pressable>
      </View>
      {propich ? (
        <Text style={{ color: t.tlumeny, fontSize: 13, marginTop: 6 }}>{propich}</Text>
      ) : null}
    </Karta>
  );
}

/** Po dvanácti hodinách je pravděpodobnější, že se zapomnělo, než že se jede. */
const DLOUHO_MS = 12 * 3600 * 1000;

export default function Tracker() {
  const t = useTheme();
  const router = useRouter();
  const [bezi, setBezi] = useState<Zaznam | null>(null);
  const [souhrn, setSouhrn] = useState<Prehled | null>(null);
  const [gps, setGps] = useState<StavGps>({
    posledniBod: null,
    stariMs: null,
    presnostM: null,
    pocetBodu: 0,
  });
  const [trasy, setTrasy] = useState<Zaznam[]>([]);
  const [lod, setLod] = useState('');
  const [regata, setRegata] = useState('');
  const [naPozadi, setNaPozadi] = useState(false);
  // Simulace běží v tomhle kontextu, takže si na ni musíme podržet ruku.
  const simulace = useRef<{ stop: () => void } | null>(null);

  const obnov = useCallback(() => {
    const z = otevrenyZaznam();
    setBezi(z);
    setSouhrn(z ? prehled(z.id) : null);
    if (z) setGps(stavGps(z.id));
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

  function prepniSledovani() {
    const z = otevrenyZaznam();
    if (!z) return;
    if (z.stav === 'pozastaveny') {
      obnovZaznam(z.id);
      if (z.zdroj === 'gps') {
        void spustZaznamNaPozadi().catch((e: unknown) =>
          Alert.alert('Nešlo pokračovat', e instanceof Error ? e.message : String(e)),
        );
      } else {
        simulace.current = spustSimulaci(z.id);
      }
    } else {
      pozastavZaznam(z.id);
      // Odběr polohy se zastaví, aby při pauze nejela GPS. Není to jen
      // „nezapisujeme" — telefon polohu ani nedostává.
      simulace.current?.stop();
      simulace.current = null;
      void zastavZaznamNaPozadi().catch(() => {});
    }
    obnov();
  }

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
                `${e instanceof Error ? e.message : String(e)}\n\nV Expo Go poloha na pozadí není vůbec — tam to čekat nelze. Jinak zkontroluj, že je povolená poloha „Vždy".`,
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
      <Nadpis tlumene="Záznam se nahrává lodi, ke které je telefon spárovaný">Trasa</Nadpis>

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
              Úloha na pozadí neběží — se zhasnutým displejem se nic nezapíše. Zkus záznam
              ukončit a spustit znovu; pokud to nepomůže, zkontroluj v nastavení polohu
              „Vždy".
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
      ) : null}

      {/* Sledování je jiná otázka než trasa: trasa je výsledek, tohle je stav
          tady a teď. Proto vlastní nadpis a ne přílepek ke kartě záznamu. */}
      {bezi ? (
        <>
          <Sekce>Sledování</Sekce>
          <Panel bezi={bezi} gps={gps} naPozadi={naPozadi} onPrepni={prepniSledovani} />
        </>
      ) : null}

      {!bezi ? (
        <Karta>
          <Text style={{ color: t.tlumeny, fontSize: 13, marginBottom: 6 }}>Loď</Text>
          <TextInput
            value={lod}
            // Jméno lodi je jeden řádek. Bez tohohle se do pole vejde
            // vložený odstavec a roztáhne obrazovku; jméno lodi přitom
            // jde do požadavku na server, kde zalomení nemá co dělat.
            onChangeText={(v) => setLod(v.replace(/\s+/g, ' ').trimStart())}
            maxLength={40}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
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
      ) : null}

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
