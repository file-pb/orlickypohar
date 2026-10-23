import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Karta, Nacitani, Nadpis, Sekce } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { nactiMojeLode, type MojeLod } from '@/lib/api';

/**
 * Lodě přihlášeného — odkud kapitán vydává klíče posádce.
 *
 * <b>Vydávat smí jen majitel a kapitán</b> (server to kontroluje
 * v `KliceSprava.SmiVydavatAsync`). Ostatní role tu loď vidí, ale bez
 * odkazu na klíče: nabídnout tlačítko, které skončí odmítnutím, je horší
 * než ho nenabídnout.
 */
export default function MojeLode() {
  const t = useTheme();
  const [lode, setLode] = useState<MojeLod[] | null>(null);
  const [nacita, setNacita] = useState(true);
  const [chyba, setChyba] = useState<string | null>(null);

  const nacti = useCallback(async () => {
    setNacita(true);
    try {
      setLode(await nactiMojeLode());
      setChyba(null);
    } catch (e) {
      setChyba(e instanceof Error ? e.message : 'Nedaří se spojit s API.');
    } finally {
      setNacita(false);
    }
  }, []);

  useEffect(() => {
    void nacti();
  }, [nacti]);

  const smiVydavat = (role: string) => role === 'Majitel' || role === 'Kapitan';

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Nadpis tlumene="Klíče posádce vydává majitel nebo kapitán">Moje lodě</Nadpis>

      {nacita ? <Nacitani /> : null}

      {!nacita && lode === null ? (
        <Karta>
          <Text style={{ color: t.text }}>
            Nikdo není přihlášený. Lodě se načtou po přihlášení na obrazovce Účet.
          </Text>
        </Karta>
      ) : null}

      {lode?.length === 0 ? (
        <Karta>
          <Text style={{ color: t.text }}>Nejsi veden u žádné lodi.</Text>
          <Text style={{ color: t.tlumeny, marginTop: 8 }}>
            Vazba vzniká z přihlášky, kódem od pořadatele, nebo nárokem, který potvrdí kapitán.
          </Text>
        </Karta>
      ) : null}

      {lode?.map((l) => (
        <View key={l.lodId} style={{ marginBottom: 12 }}>
          <Karta>
            <Text style={{ color: t.text, fontWeight: '600', fontSize: 16 }}>{l.nazev}</Text>
            <Text style={{ color: t.tlumeny, marginTop: 2 }}>
              {l.cisloPlachty ? `${l.cisloPlachty} · ` : ''}
              {popisRole(l.role)}
            </Text>
            {smiVydavat(l.role) ? (
              <Link href={`/lode/${l.lodId}`} style={{ color: t.voda, marginTop: 12 }}>
                Klíče posádky
              </Link>
            ) : null}
          </Karta>
        </View>
      ))}

      {chyba ? <Text style={{ color: t.text, marginTop: 16 }}>{chyba}</Text> : null}

      <Sekce>K čemu to je</Sekce>
      <Karta>
        <Text style={{ color: t.tlumeny }}>
          Telefon posádky se k lodi páruje klíčem, ne účtem. Kapitán vydá pozvánku, posádka
          naskenuje QR a od té chvíle se její trasy posílají téhle lodi.
        </Text>
      </Karta>
    </ScrollView>
  );
}

function popisRole(role: string) {
  switch (role) {
    case 'Majitel':
      return 'majitel';
    case 'Kapitan':
      return 'kapitán';
    case 'Posadka':
      return 'posádka';
    default:
      return 'fanoušek';
  }
}
