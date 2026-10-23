import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Karta, Nacitani, Nadpis, Sekce } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import {
  nactiKliceLodi,
  nactiMojeLode,
  odeberKlic,
  pozviKlicem,
  prepniSledovani,
  type KlicLodi,
  type Pozvanka,
} from '@/lib/api';
import { adresaKlice } from '@/lib/klic';
import { casAMinuty } from '@/lib/tracker/formaty';

/**
 * Klíče jedné lodi — kapitánova obrazovka.
 *
 * <b>Kód pozvánky se vrací jen jednou.</b> Server si ho neukládá, drží jen
 * otisk, takže co zmizí z téhle obrazovky, to už nikdo nezjistí; posádka pak
 * potřebuje novou pozvánku. Proto se QR ukazuje hned a zůstane na obrazovce,
 * dokud ho kapitán sám nezavře.
 *
 * QR vede na **web**, ne rovnou do appky. Čte ho systémová kamera, takže
 * appka nepotřebuje přístup ke kameře ani vlastní čtečku. A kdo appku ještě
 * nemá, neskončí ve slepé uličce: adresa `orlickypohar://` by u něj neudělala
 * nic, kdežto stránka na webu ho pošle dál (Filip, 23. 10. 2026).
 */
export default function KliceLodi() {
  const t = useTheme();
  const { lod } = useLocalSearchParams<{ lod: string }>();
  const lodId = Number(lod);

  const [klice, setKlice] = useState<KlicLodi[] | null>(null);
  const [nacita, setNacita] = useState(true);
  const [pozvanka, setPozvanka] = useState<Pozvanka | null>(null);
  const [delam, setDelam] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  // Vydat klíč smí i posádka, ale sáhnout na cizí klíč jen kapitán
  // a majitel. Bez téhle znalosti by obrazovka nabízela tlačítka,
  // která server odmítne.
  const [smiSpravovat, setSmiSpravovat] = useState(false);

  const nacti = useCallback(async () => {
    if (!Number.isFinite(lodId)) return;
    setNacita(true);
    try {
      const [k, lode] = await Promise.all([nactiKliceLodi(lodId), nactiMojeLode()]);
      setKlice(k);
      const moje = lode?.find((l) => l.lodId === lodId);
      setSmiSpravovat(moje?.role === 'Majitel' || moje?.role === 'Kapitan');
      setChyba(null);
    } catch (e) {
      setChyba(e instanceof Error ? e.message : 'Nedaří se spojit s API.');
    } finally {
      setNacita(false);
    }
  }, [lodId]);

  useEffect(() => {
    void nacti();
  }, [nacti]);

  async function pozvi() {
    setDelam(true);
    try {
      const p = await pozviKlicem(lodId, null);
      if (p === null) {
        setChyba('Nikdo není přihlášený — přihlas se na obrazovce Účet.');
        return;
      }
      setPozvanka(p);
      await nacti();
    } catch (e) {
      setChyba(e instanceof Error ? e.message : 'Pozvánku se nepodařilo vystavit.');
    } finally {
      setDelam(false);
    }
  }

  const zive = klice?.filter((k) => !k.odebran) ?? [];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Nadpis tlumene="Posádka naskenuje QR a telefon se spáruje s lodí">Klíče posádky</Nadpis>

      {pozvanka ? (
        <>
          <Karta>
            <Text style={{ color: t.text, fontWeight: '600' }}>Naskenuj foťákem</Text>
            <Text style={{ color: t.tlumeny, marginTop: 4, marginBottom: 16 }}>
              Platí do {casAMinuty(Date.parse(pozvanka.platiDo))} a jen pro jeden telefon.
            </Text>
            {/* Bílé pozadí schválně i v tmavém režimu: čtečky počítají
                s tmavým kódem na světlém podkladu. */}
            <View style={{ alignSelf: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12 }}>
              <QRCode value={adresaKlice(pozvanka.kod)} size={220} />
            </View>
            <Text style={{ color: t.tlumeny, marginTop: 16, fontSize: 12 }}>
              Kód uvidíš jenom teď — server si ho neukládá. Když obrazovku zavřeš, vystav novou
              pozvánku. Komu appka chybí, tomu se na té adrese ukáže, kde ji vzít.
            </Text>
            <Pressable onPress={() => setPozvanka(null)} style={{ marginTop: 12 }}>
              <Text style={{ color: t.voda, fontWeight: '600' }}>Hotovo</Text>
            </Pressable>
          </Karta>
        </>
      ) : (
        <Karta>
          <Text style={{ color: t.text }}>
            Pozvánka platí 48 hodin a dá se uplatnit jednou. Každý telefon potřebuje svou.
          </Text>
          <Pressable onPress={() => void pozvi()} disabled={delam} style={{ marginTop: 12 }}>
            <Text style={{ color: delam ? t.tlumeny : t.voda, fontWeight: '600', fontSize: 16 }}>
              {delam ? 'Vystavuji…' : 'Vystavit pozvánku'}
            </Text>
          </Pressable>
        </Karta>
      )}

      <Sekce>Spárované telefony</Sekce>

      {nacita ? <Nacitani /> : null}

      {!nacita && zive.length === 0 ? (
        <Karta>
          <Text style={{ color: t.tlumeny }}>Zatím žádný. Vystav pozvánku a dej ji posádce.</Text>
        </Karta>
      ) : null}

      {zive.map((k) => (
        <View key={k.id} style={{ marginBottom: 12 }}>
          <Karta>
            <Text style={{ color: t.text, fontWeight: '600' }}>
              {k.jmeno ?? `Telefon #${k.id}`}
            </Text>
            <Text style={{ color: t.tlumeny, marginTop: 2, fontSize: 13 }}>
              spárován {casAMinuty(Date.parse(k.vydanV))}
              {k.posledniPouzitiV
                ? ` · naposled se ozval ${casAMinuty(Date.parse(k.posledniPouzitiV))}`
                : ' · zatím se neozval'}
            </Text>

            <Text style={{ color: k.sleduje ? t.stavVypsany : t.tlumeny, marginTop: 8 }}>
              {k.sleduje ? 'Sleduje se' : 'Sledování vypnuté'}
            </Text>

            {smiSpravovat ? (
            <View style={{ flexDirection: 'row', gap: 20, marginTop: 12 }}>
              {/* Vypnout sledování je vratné: na tuhle regatu nejede, ale
                  v posádce zůstává a příště se nemusí párovat znovu. */}
              <Pressable
                onPress={() => {
                  void prepniSledovani(lodId, k.id, !k.sleduje)
                    .then(nacti)
                    .catch((e: unknown) =>
                      Alert.alert('Nešlo to', e instanceof Error ? e.message : String(e)),
                    );
                }}>
                <Text style={{ color: t.voda }}>
                  {k.sleduje ? 'Vypnout sledování' : 'Zapnout sledování'}
                </Text>
              </Pressable>

              <Pressable onPress={() => potvrdOdebrani(k)}>
                <Text style={{ color: t.stavZruseny }}>Odebrat</Text>
              </Pressable>
            </View>
            ) : null}
          </Karta>
        </View>
      ))}

      {chyba ? <Text style={{ color: t.text, marginTop: 16 }}>{chyba}</Text> : null}
    </ScrollView>
  );

  function potvrdOdebrani(k: KlicLodi) {
    Alert.alert(
      'Odebrat klíč?',
      'Klíč zanikne a nedá se oživit — telefon se bude muset spárovat znovu. '
        + 'Pro jednu regatu stačí vypnout sledování.',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Odebrat',
          style: 'destructive',
          onPress: () => {
            void odeberKlic(lodId, k.id)
              .then(nacti)
              .catch((e: unknown) =>
                Alert.alert('Nešlo to', e instanceof Error ? e.message : String(e)),
              );
          },
        },
      ],
    );
  }
}
