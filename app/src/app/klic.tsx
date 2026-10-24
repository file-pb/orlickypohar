import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Karta, Nadpis, Sekce } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import {
  klic as nactiKlic,
  nastavSledovani,
  sledovani,
  uplatni,
  zapomen,
  type Klic,
} from '@/lib/klic';

/**
 * Spárování telefonu s lodí.
 *
 * <b>Posádka tu nic nezakládá.</b> Kapitán dá QR, iOS i Android ho přečtou
 * systémovou kamerou a otevřou `orlickypohar://klic?kod=…` — appka pozvánku
 * uplatní sama a posádka jen uvidí, ke které lodi patří. Ruční zadání je
 * záloha pro případ, že se QR nedá naskenovat.
 *
 * Proč takhle: od posádky chceme co nejméně (Filip, 21. 10. 2026). Účet
 * potřebuje jen kapitán, kvůli kontaktu a vydávání klíčů; zbytek posádky
 * je pro nás zdvojení zdroje polohy, ne seznam registrovaných.
 */
export default function KlicObrazovka() {
  const t = useTheme();
  const { kod: kodZOdkazu } = useLocalSearchParams<{ kod?: string }>();

  const [muj, setMuj] = useState<Klic | null>(null);
  // `null` znamená „nevím" — telefon není spárovaný, nebo se server neozval.
  const [sleduje, setSleduje] = useState<boolean | null>(null);
  const [kod, setKod] = useState('');
  const [delam, setDelam] = useState(false);
  const [zprava, setZprava] = useState<string | null>(null);

  const nacti = useCallback(async () => {
    const k = await nactiKlic();
    setMuj(k);
    setSleduje(k ? await sledovani() : null);
  }, []);

  async function prepniSledovani() {
    if (sleduje === null) return;
    setDelam(true);
    setZprava(null);
    try {
      const novy = await nastavSledovani(!sleduje);
      if (novy === null) {
        setZprava('Klíč už neplatí — kapitán ho odebral. Potřebuješ novou pozvánku.');
        setSleduje(null);
        return;
      }
      setSleduje(novy);
    } catch (e) {
      setZprava(e instanceof Error ? e.message : 'Nedaří se spojit s API.');
    } finally {
      setDelam(false);
    }
  }

  useEffect(() => {
    void nacti();
  }, [nacti]);

  const uplatniKod = useCallback(
    async (hodnota: string) => {
      if (!hodnota.trim()) return;
      setDelam(true);
      setZprava(null);
      try {
        const novy = await uplatni(hodnota);
        if (novy === null) {
          setZprava('Pozvánka neplatí — je prošlá, nebo už ji někdo uplatnil. Potřebuješ novou od kapitána.');
          return;
        }
        setMuj(novy);
        setKod('');
      } catch (e) {
        setZprava(e instanceof Error ? e.message : 'Nedaří se spojit s API.');
      } finally {
        setDelam(false);
      }
    },
    [],
  );

  // Kód z odkazu se uplatní jednou. Bez téhle pojistky by ho každé
  // překreslení obrazovky poslalo znovu — a pozvánka je jednorázová,
  // takže druhý pokus by posádce ohlásil, že neplatí.
  const uplatneny = useRef<string | null>(null);
  useEffect(() => {
    if (!kodZOdkazu || uplatneny.current === kodZOdkazu) return;
    uplatneny.current = kodZOdkazu;
    void uplatniKod(kodZOdkazu);
  }, [kodZOdkazu, uplatniKod]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Nadpis tlumene="Telefon se prokazuje klíčem k lodi, ne účtem">Klíč k lodi</Nadpis>

      {muj ? (
        <>
          <Karta>
            <Text style={{ color: t.text, fontWeight: '600', fontSize: 16 }}>{muj.lodNazev}</Text>
            {muj.jmeno ? (
              <Text style={{ color: t.tlumeny, marginTop: 2 }}>{muj.jmeno}</Text>
            ) : null}
            <Text style={{ color: t.tlumeny, marginTop: 8 }}>
              Trasy z tohohle telefonu se posílají téhle lodi.
            </Text>
          </Karta>

          {/* <b>Kdo odjíždí, vypne si to sám</b> (plán, *Telefon jako mobilní
              klíč k lodi*). Je to ta půlka odebrání, která nemá čekat na
              kapitána — řeší past „telefon, který zůstal v autě" z té strany,
              kde o ní člověk ví první. */}
          <Sekce>Sledování</Sekce>
          <Karta>
            <Text style={{ color: t.text }}>
              {sleduje === null
                ? 'Nedaří se zjistit, jestli se z tohohle telefonu zaznamenává.'
                : sleduje
                  ? 'Při závodě se z tohohle telefonu zaznamenává trasa.'
                  : 'Tenhle telefon je odepnutý — trasa se z něj neposílá.'}
            </Text>
            <Text style={{ color: t.tlumeny, marginTop: 8 }}>
              Odepnutí je „tuhle regatu nejedu“, ne odchod z posádky: klíč zůstává a příští
              závod se nemusíš párovat znovu.
            </Text>
            <Pressable
              onPress={() => {
                void prepniSledovani();
              }}
              disabled={delam || sleduje === null}
              style={{ marginTop: 12 }}>
              <Text
                style={{
                  color: delam || sleduje === null ? t.tlumeny : t.voda,
                  fontWeight: '600',
                }}>
                {sleduje ? 'Odepnout se ze sledování' : 'Připnout se zpátky'}
              </Text>
            </Pressable>
          </Karta>

          <Sekce>Odpojit telefon</Sekce>
          <Karta>
            <Text style={{ color: t.tlumeny }}>
              Klíč se smaže z telefonu, ale na lodi zůstane platný — odebrat ho umí jen
              kapitán. Když jde jen o to nejet, stačí se odepnout výš.
            </Text>
            <Pressable
              onPress={() => {
                void zapomen().then(nacti);
              }}
              style={{ marginTop: 12 }}>
              <Text style={{ color: t.voda, fontWeight: '600' }}>Zapomenout klíč</Text>
            </Pressable>
          </Karta>
        </>
      ) : (
        <>
          <Karta>
            <Text style={{ color: t.text }}>
              Tenhle telefon není spárovaný s žádnou lodí. Naskenuj QR od kapitána — appka se
              otevře sama a klíč si uloží.
            </Text>
          </Karta>

          <Sekce>Nebo zadej kód z pozvánky</Sekce>
          <Karta>
            <TextInput
              value={kod}
              onChangeText={setKod}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!delam}
              placeholder="kód pozvánky"
              placeholderTextColor={t.tlumeny}
              style={{ color: t.text, paddingVertical: 8 }}
            />
            <View style={{ height: 1, backgroundColor: t.tlumeny, opacity: 0.3 }} />
            <Pressable
              onPress={() => {
                void uplatniKod(kod);
              }}
              style={{ marginTop: 12 }}>
              <Text style={{ color: delam || !kod.trim() ? t.tlumeny : t.voda, fontWeight: '600' }}>
                {delam ? 'Uplatňuji…' : 'Uplatnit pozvánku'}
              </Text>
            </Pressable>
          </Karta>
        </>
      )}

      {zprava ? <Text style={{ color: t.text, marginTop: 16 }}>{zprava}</Text> : null}
    </ScrollView>
  );
}
