import { Stack } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { Karta, Nacitani, Nadpis, Prazdno } from '@/components/ui';
import { useData } from '@/hooks/use-data';
import { useTheme } from '@/hooks/use-theme';
import { nactiDnesniRegatu, type ZavodnikDnes } from '@/lib/api';
import { pismoNaVyplni } from '@/lib/kontrast';

/**
 * Co vidí posádka na vodě.
 *
 * <b>Odpočet tu schválně není</b> (nález R34, rozhodnuto 29. 10. 2026):
 * *„odpočet u posádek není v prvních verzích potřeba, navíc je to zdroj
 * problémů."* Zpožděný odpočet na lodi lže; barva stavu se zpožděním
 * nelže, jen zestárne. Řídit se má znameními komise, ne telefonem.
 * <b>Ale na obrazovce to nestojí.</b> 7. 11. 2026: *„tohle tam nedávej,
 * co je závodníkům do toho."* Proč tu odpočet není, je naše věc; posádce
 * se ukazuje stav, ne omluva za to, co chybí.
 *
 * <b>Není to na klepání.</b> Všechno tady zapsal někdo jiný — rozhodčí
 * nebo komise. Posádka to jen vidí; potvrzovat vykonání trestu si Miloš
 * sám odmítl: *„abychom jim nekomplikovali život."*
 *
 * <b>Jeden dotaz.</b> Celá obrazovka jde z `GET /lod/dnes`, protože na
 * vodě je signál drahý a čtyři volání znamenají čtyři příležitosti
 * skončit s půlkou obrazovky.
 */

/** Jak se stav rozjížďky řekne posádce — slovem, ne kódem. */
function vetaStavu(d: ZavodnikDnes): string {
  if (d.stavRozjizdky === 'Probiha') return 'Jede se';
  if (d.stavRozjizdky === 'Zrusena') return 'Zrušeno';
  if (d.stavRozjizdky === 'Dokoncena') return 'Dojeto';
  // Plánovaná s časem startu znamená, že se na vodě chystá start;
  // plánovaná bez času znamená, že se čeká na rozhodčího.
  return d.startV ? 'Startuje se' : 'Čeká se';
}

export default function Zavodnik() {
  const t = useTheme();
  const { data, nacita, chyba } = useData(nactiDnesniRegatu, []);

  if (nacita && !data) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Stack.Screen options={{ title: 'Moje regata' }} />
        <Nacitani />
      </ScrollView>
    );
  }

  if (!data) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Stack.Screen options={{ title: 'Moje regata' }} />
        <Nadpis>Moje regata</Nadpis>
        {/* <b>Dva důvody, jedna věta.</b> Telefon bez klíče a den bez
            regaty vypadají pro posádku stejně: není co ukázat. Rozlišit
            je by znamenalo dva prázdné stavy tam, kde stačí jeden —
            a klíč se řeší na břehu, ne tady. */}
        <Prazdno
          text={
            chyba
              ? 'Nepovedlo se zjistit, co se dnes jede.'
              : 'Dnes tvoje loď nikde nejede. Klíč k lodi vydá kapitán.'
          }
        />
      </ScrollView>
    );
  }

  // Barva nese stav na dálku. Na světlé ploše tmavé písmo a naopak —
  // bílá na světle zelené dává 2,07:1, tedy hluboko pod mezí.
  const vypln =
    data.stavRozjizdky === 'Probiha'
      ? t.jede
      : data.stavRozjizdky === 'Zrusena'
        ? t.stavZruseny
        : data.startV
          ? t.voda
          : t.zvyrazneni;
  const naVyplni = pismoNaVyplni(t, vypln);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Stack.Screen options={{ title: data.zavodNazev }} />

      <View style={{ backgroundColor: vypln, borderRadius: 14, padding: 18, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: naVyplni, fontSize: 13, fontWeight: '700', letterSpacing: 0.6 }}>
            {data.rozjizdka ? `ROZJÍŽĎKA ${data.rozjizdka}` : 'ZATÍM ŽÁDNÁ ROZJÍŽĎKA'}
          </Text>
          <Text style={{ color: naVyplni, fontSize: 13 }}>{data.zavodNazev}</Text>
        </View>

        <Text
          style={{
            color: naVyplni,
            fontSize: 42,
            fontWeight: '800',
            letterSpacing: -1,
            marginTop: 6,
          }}>
          {vetaStavu(data)}
        </Text>

        {/* <b>Kdy to nastane</b> (Filip, 7. 11. 2026: *„nerozumím téhle
            obrazovce — kdy nastane"*). Hodina, ne odpočet: hodina se
            zpožděním zestárne, odpočet lže. Po startu se ukazuje, kdy
            se odstartovalo — posádka podle toho pozná, jestli vidí svou
            rozjížďku, nebo tu předí. */}
        {data.startV ? (
          <Text style={{ color: naVyplni, fontSize: 20, fontWeight: '700', marginTop: 8 }}>
            {data.stavRozjizdky === 'Probiha' ? 'Odstartováno v ' : 'Start v '}
            {new Date(data.startV).toLocaleTimeString('cs-CZ', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        ) : null}
      </View>

      {/* Pokyn komise je tu, jen když nějaký je — a nezmizí sám. */}
      {data.pokyny.map((p) => (
        <View
          key={`${p.druh}-${p.vyhlasenoV}`}
          style={{
            backgroundColor: t.papir,
            borderWidth: 1,
            borderColor: t.linka,
            borderLeftWidth: 5,
            borderLeftColor: t.vystraha,
            borderRadius: 12,
            padding: 14,
            marginBottom: 10,
          }}>
          <Text style={{ color: t.vystraha, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 }}>
            POKYN ZÁVODNÍ KOMISE
          </Text>
          <Text style={{ color: t.text, fontSize: 18, fontWeight: '700', marginTop: 4 }}>
            {p.veta}
          </Text>
          <Text style={{ color: t.tlumeny, fontSize: 13, marginTop: 6 }}>
            Vyhlášeno {new Date(p.vyhlasenoV).toLocaleTimeString('cs-CZ', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      ))}

      {/* Tohle posádka kontroluje na břehu: že telefon visí u správné lodi. */}
      <Karta>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={{ color: t.text, fontSize: 22, fontWeight: '800' }}>{data.lod}</Text>
          {data.kategorie ? (
            <Text style={{ color: t.tlumeny, fontSize: 14, marginLeft: 'auto' }}>
              {data.kategorie}
            </Text>
          ) : null}
        </View>
      </Karta>

      {/* <b>Jak loď eviduje rozhodčí.</b> Jediné místo v appce, kde se
          posádka dozví, co o ní zapsal někdo jiný. Není to na klepání. */}
      {data.stavLodi ? (
        <View
          style={{
            backgroundColor: t.text,
            borderRadius: 12,
            padding: 14,
            marginTop: 10,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
          <Text
            style={{
              color: pismoNaVyplni(t, t.text),
              fontSize: 15,
              fontWeight: '700',
              flex: 1,
            }}>
            {data.stavLodi.veta}
          </Text>
          {data.stavLodi.kdy ? (
            <Text style={{ color: pismoNaVyplni(t, t.text), fontSize: 13, opacity: 0.72 }}>
              {new Date(data.stavLodi.kdy).toLocaleTimeString('cs-CZ', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}
