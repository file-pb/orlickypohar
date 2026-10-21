import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Karta, Prazdno, Sekce, Stitek } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { casAMinuty, rychlost, trvani, vzdalenost } from '@/lib/tracker/formaty';
import { posliGpx } from '@/lib/tracker/gpx';
import { dokonciNahraniAsync, stavNahravani, type StavNahravani } from '@/lib/tracker/nahravani';
import {
  kolikByZmizelo,
  ostrihej,
  prehled,
  smazZaznam,
  zaznam,
  type Prehled,
  type Zaznam,
} from '@/lib/tracker/zaznam';

/** Nabídka ostříhání: tolik minut od posledního bodu se zahodí. */
const OSTRIHAT_MIN = [15, 30, 60];

export default function DetailTrasy() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [z, setZ] = useState<Zaznam | null>(null);
  const [souhrn, setSouhrn] = useState<Prehled | null>(null);
  const [nahr, setNahr] = useState<StavNahravani | null>(null);
  const [nahrava, setNahrava] = useState(false);

  const obnov = useCallback(() => {
    if (!id) return;
    setZ(zaznam(id));
    setSouhrn(prehled(id));
    setNahr(stavNahravani(id));
  }, [id]);

  useEffect(() => {
    obnov();
    // Běžící trasa přirůstá, tak ať jde přehled sledovat při záznamu.
    const timer = setInterval(obnov, 2000);
    return () => clearInterval(timer);
  }, [obnov]);

  if (!z || !souhrn) return <Prazdno text="Trasa není." />;

  function ostrihejO(minut: number) {
    if (!souhrn?.posledni || !id) return;
    const hranice = souhrn.posledni - minut * 60 * 1000;
    // Spočítat dopředu, čeho se to dotkne. Slepé „−15 min" je ten knoflík,
    // kterým si někdo po závodě ustřihne poslední rozjížďku.
    const zmizi = kolikByZmizelo(id, hranice);
    if (zmizi === 0) {
      Alert.alert('Není co ostříhat', `Po ${casAMinuty(hranice)} už žádný bod není.`);
      return;
    }
    Alert.alert(
      `Ostříhat vše po ${casAMinuty(hranice)}?`,
      `Smaže ${zmizi} z ${souhrn.pocetBodu} bodů. Trasa skončí v ${casAMinuty(hranice)}.\n\n` +
        'Je to kvůli soukromí — zapomenutý záznam jinak ukáže, kde kdo bydlí. Smazané body se nedají vrátit.',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: `Smazat ${zmizi} bodů`,
          style: 'destructive',
          onPress: () => {
            const smazano = ostrihej(id, hranice);
            obnov();
            Alert.alert('Ostříháno', `Smazalo se ${smazano} bodů.`);
          },
        },
      ],
    );
  }

  function smaz() {
    if (!id) return;
    Alert.alert('Smazat trasu?', 'Zmizí celá, i body. Vrátit se to nedá.', [
      { text: 'Zrušit', style: 'cancel' },
      {
        text: 'Smazat',
        style: 'destructive',
        onPress: () => {
          smazZaznam(id);
          router.back();
        },
      },
    ]);
  }

  const radky: [string, string][] = [
    ['Bodů', String(souhrn.pocetBodu)],
    ['Délka', vzdalenost(souhrn.delkaM)],
    [
      'Rozsah',
      souhrn.prvni && souhrn.posledni
        ? `${casAMinuty(souhrn.prvni)} – ${casAMinuty(souhrn.posledni)}`
        : '—',
    ],
    [
      'Trvání záznamu',
      souhrn.prvni && souhrn.posledni ? trvani(souhrn.posledni - souhrn.prvni) : '—',
    ],
    [
      'Vzorkování',
      souhrn.pocetBodu > 1 && souhrn.prvni && souhrn.posledni
        ? `~${Math.round((souhrn.posledni - souhrn.prvni) / 1000 / (souhrn.pocetBodu - 1))} s / bod`
        : '—',
    ],
    ['Nejvyšší rychlost', rychlost(souhrn.maxRychlostMS)],
    [
      'Nejhorší přesnost',
      souhrn.nejhorsiPresnostM == null ? '—' : `${Math.round(souhrn.nejhorsiPresnostM)} m`,
    ],
  ];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
        <Text style={{ color: t.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}>
          {z.lod}
        </Text>
        {z.zdroj === 'simulace' ? <Stitek text="simulace" /> : null}
        {z.stav === 'bezi' ? <Stitek text="běží" barva={t.stavVypsany} /> : null}
      </View>
      {z.regata ? <Text style={{ color: t.tlumeny }}>{z.regata}</Text> : null}

      <Sekce>Co se zapsalo</Sekce>
      <Karta>
        {radky.map(([k, v], i) => (
          <View
            key={k}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingVertical: 6,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: t.linka,
            }}>
            <Text style={{ color: t.tlumeny }}>{k}</Text>
            <Text style={{ color: t.text, fontWeight: '500' }}>{v}</Text>
          </View>
        ))}
      </Karta>

      {/* Čas nese trasa výhradně z telefonu, a ten se dá přestavit. Rozdíl
          proti času z polohy je jediná měřitelná stopa, kterou po sobě skok
          hodin nechá — proto je vidět, a ne schovaný v logu. */}
      {souhrn.rozptylHodinMs != null && souhrn.rozptylHodinMs > 60_000 ? (
        <Karta>
          <Text style={{ color: t.stavZruseny, fontWeight: '600' }}>Hodiny telefonu se měnily</Text>
          <Text style={{ color: t.tlumeny, marginTop: 4, fontSize: 13 }}>
            Rozdíl mezi časem z polohy a hodinami telefonu se během záznamu rozešel
            o {trvani(souhrn.rozptylHodinMs)}. Body zůstávají všechny; při nahrání se trasa
            srovná na jednu osu.
          </Text>
        </Karta>
      ) : null}

      {souhrn.vBudoucnosti > 0 ? (
        <Karta>
          <Text style={{ color: t.stavZruseny, fontWeight: '600' }}>
            {souhrn.vBudoucnosti} bodů má čas v budoucnosti
          </Text>
          <Text style={{ color: t.tlumeny, marginTop: 4, fontSize: 13 }}>
            Proti hodinám telefonu teď. Nemazat — při nahrání se opraví posunem celé trasy.
          </Text>
        </Karta>
      ) : null}

      {souhrn.podvrzenych > 0 && z.zdroj !== 'simulace' ? (
        <Karta>
          <Text style={{ color: t.stavZruseny, fontWeight: '600' }}>
            {souhrn.podvrzenych} bodů je podvržených
          </Text>
          <Text style={{ color: t.tlumeny, marginTop: 4, fontSize: 13 }}>
            Android je označil jako polohu z falešného zdroje.
          </Text>
        </Karta>
      ) : null}

      <Sekce>Soukromí</Sekce>
      <Karta>
        <Text style={{ color: t.tlumeny, fontSize: 13 }}>
          {z.ostrihano_do
            ? `Ostříháno do ${casAMinuty(z.ostrihano_do)}.`
            : 'Jestli záznam jel i po dojezdu, ostříhej konec.'}
        </Text>
        <View style={{ flexDirection: 'row', marginTop: 10, gap: 18 }}>
          {OSTRIHAT_MIN.map((m) => (
            <Pressable key={m} onPress={() => ostrihejO(m)}>
              <Text style={{ color: t.voda }}>−{m} min</Text>
              {/* Cílový čas pod tlačítkem: posádka vidí, kam to sáhne, ještě
                  než na to ťukne. */}
              <Text style={{ color: t.tlumeny, fontSize: 11 }}>
                {souhrn.posledni ? `do ${casAMinuty(souhrn.posledni - m * 60 * 1000)}` : ''}
              </Text>
            </Pressable>
          ))}
        </View>
      </Karta>

      <Sekce>Nahrání na server</Sekce>
      <Karta>
        {nahr?.hotovo ? (
          <Text style={{ color: t.stavVypsany }}>Nahráno celé.</Text>
        ) : (
          <>
            <Text style={{ color: t.text }}>
              {nahr?.ceka === 0
                ? 'Všechny body jsou na serveru, zbývá nahrání uzavřít.'
                : `Čeká ${nahr?.ceka ?? 0} bodů.`}
            </Text>
            {/* Dokud něco čeká, je trasa na serveru rozdělaná. Nahrání jde
                kdykoli dokončit — i po výpadku a po restartu appky. */}
            <Pressable
              onPress={() => {
                if (!id || nahrava) return;
                setNahrava(true);
                dokonciNahraniAsync(id)
                  .then((v) => {
                    obnov();
                    if (!v.hotovo && v.zbyva > 0) {
                      Alert.alert('Zbývá doposlat', `${v.zbyva} bodů se nepodařilo odeslat.`);
                    } else if (!v.hotovo) {
                      Alert.alert(
                        'Chybí klíč k lodi',
                        'Telefon není spárovaný s lodí. Naskenuj QR od kapitána na obrazovce Klíč k lodi.',
                      );
                    }
                  })
                  .catch((e: unknown) =>
                    Alert.alert('Nahrání se nepovedlo',
                      `${e instanceof Error ? e.message : String(e)}\n\nCo se nepotvrdilo, zůstalo v telefonu.`),
                  )
                  .finally(() => setNahrava(false));
              }}
              style={{ marginTop: 12 }}>
              <Text style={{ color: nahrava ? t.tlumeny : t.voda, fontWeight: '600' }}>
                {nahrava ? 'Nahrávám…' : 'Nahrát na server'}
              </Text>
            </Pressable>
          </>
        )}
      </Karta>

      <Sekce>Výsledek</Sekce>
      <Pressable
        onPress={() => {
          if (!id) return;
          posliGpx(id).catch((e: unknown) =>
            Alert.alert('Nešlo to poslat', e instanceof Error ? e.message : String(e)),
          );
        }}>
        <Text style={{ color: t.voda, fontWeight: '600', fontSize: 16 }}>Poslat jako GPX</Text>
      </Pressable>
      <Text style={{ color: t.tlumeny, fontSize: 12, marginTop: 4 }}>
        Nahrávání na web pilot zatím nemá — GPX otevře každá mapa.
      </Text>

      <Pressable onPress={smaz} style={{ marginTop: 28 }}>
        <Text style={{ color: t.stavZruseny }}>Smazat trasu</Text>
      </Pressable>
    </ScrollView>
  );
}
