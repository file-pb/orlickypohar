import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { Kalendar } from '@/components/kalendar';
import { OdberUpozorneni } from '@/components/odber-upozorneni';
import { Chyba, Karta, Nacitani, Nadpis, Prazdno, Sekce, Stav } from '@/components/ui';
import { useData } from '@/hooks/use-data';
import { useTheme } from '@/hooks/use-theme';
import { useZmenaUctu } from '@/hooks/use-zmena-uctu';
import { nactiSerie, nactiSerii } from '@/lib/api';
import { rozsah } from '@/lib/datum';
import { jePrihlasen } from '@/lib/identita';
import { ukazkaBezi } from '@/lib/ukazka';
import { kteraRegata, kterySledovat, vetaNaRade } from '@/lib/sledovani';

/**
 * Sledování — co appka ukáže tomu, kdo přišel jenom koukat.
 *
 * <b>Co tu bylo do 26. 11. 2026.</b> Seznam let, a v komentáři o sobě
 * říkal pravdu: *„cesta k regatě pro zkoušení — veřejnost čte web"*.
 * Tehdy to bylo správně, protože na domovské obrazovce byla nabídka pro
 * všechny stejná a tohle byla jen jedna její položka.
 *
 * <b>Proč to přestalo stačit.</b> Sledování je od 26. 11. <b>podlaha
 * appky</b>: je u každého a nepřihlášenému appka otevře rovnou ji, bez
 * rozcestníku (`lib/rozcestnik.ts`). Je to tedy první a u spousty lidí
 * jediná obrazovka, kterou uvidí — a seznam let, kde je jeden rok, není
 * důvod si appku nechat v telefonu. Filip, 26. 11. 2026: *„dá se použít
 * i pro toho, kdo nejede závod a ani nemá žádný login."*
 *
 * <b>Web to nenahrazuje</b> a nemá. Výsledky, příběhy a fotky čte
 * veřejnost dál na webu; tohle je ta jejich část, která se hodí mít
 * u vody v telefonu — co se dnes jede, kdy se jede příště, jak to stojí.
 *
 * <b>Dva dotazy, druhý závisí na prvním.</b> Nejdřív `/serie`, aby se
 * vědělo, který ročník ukázat, pak jeho detail. Obojí je veřejné čtení,
 * takže to funguje bez přihlášení.
 */
export default function Sledovani() {
  const t = useTheme();
  const router = useRouter();
  const [signal, setSignal] = useState(0);

  const { data: serie, chyba, nacita, obnov } = useData(nactiSerie, [signal]);
  // <b>Je tahle obrazovka konečná, nebo jen to, co zbylo?</b> Čte se
  // z úložiště, bez sítě, takže to funguje i u vody bez signálu.
  const { data: ucet, obnov: obnovUcet } = useData(
    // V ukázce hraje appka přihlášeného Miloše. Jediné, k čemu je to
    // tady potřeba, je rezerva vpravo nahoře na tlačítko *Přihlásit*.
    async () => ({ prihlasen: ukazkaBezi() || (await jePrihlasen()) }),
    [signal],
  );
  // Tlačítko po napojení zmizí; rezerva pro ně musí zmizet s ním.
  useZmenaUctu(obnovUcet);
  const vybrany = serie ? kterySledovat(serie, new Date()) : null;
  const { data: rocnik, nacita: nacitaRocnik } = useData(
    () => (vybrany ? nactiSerii(vybrany.slug) : Promise.resolve(null)),
    [vybrany?.slug, signal],
  );

  const ostatni = (serie ?? []).filter((s) => s.slug !== vybrany?.slug);
  const naRade = rocnik ? kteraRegata(rocnik.zavody, new Date()) : null;
  const odjete = rocnik?.zavody.filter((z) => z.stav === 'Odjety').length ?? 0;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={() => setSignal((n) => n + 1)}
          tintColor={t.voda}
        />
      }>
      {/* Vpravo nahoře stojí tečky, a dokud není nikdo přihlášený, i
          tlačítko <i>Přihlásit</i>. Bez té rezervy se o ně dlouhé jméno
          ročníku uřízne. */}
      <Nadpis
        odsazeniVpravo={ucet && !ucet.prihlasen ? 150 : undefined}
        tlumene={
          rocnik
            ? `${rocnik.zavody.length} regat · ${odjete} odjetých · ${rocnik.prihlasky.length} lodí`
            : undefined
        }>
        {rocnik?.nazev ?? 'Sledování'}
      </Nadpis>

      {nacita || nacitaRocnik ? <Nacitani /> : null}
      {chyba ? <Chyba text={chyba} onZkusZnovu={obnov} /> : null}
      {!nacita && !chyba && (serie?.length ?? 0) === 0 ? (
        <Prazdno text="Zatím není zveřejněný žádný ročník." />
      ) : null}

      {/* <b>Nahoře stojí to, kvůli čemu se obrazovka otevírá.</b> Dnešní
          regata, jinak nejbližší, jinak poslední odjetá — a vždycky i to,
          která z těch tří možností to je, protože „Izolepa, 7. června" bez
          té věty neřekne, jestli už bylo, nebo teprve bude. */}
      {rocnik && naRade ? (
        <Pressable
          onPress={() =>
            router.push(`/serie/${rocnik.slug}/zavody/${naRade.zavod.slug}`)
          }
          accessibilityRole="button"
          accessibilityLabel={`${vetaNaRade(naRade.kdy)}: ${naRade.zavod.nazev}`}
          style={({ pressed }) => [
            {
              marginTop: 14,
              backgroundColor: t.zvyrazneni,
              borderColor: t.voda,
              borderWidth: 2,
              borderRadius: 14,
              padding: 14,
            },
            pressed && { opacity: 0.6 },
          ]}>
          <Text style={{ color: t.voda, fontSize: 12, fontWeight: '800', letterSpacing: 0.6 }}>
            {vetaNaRade(naRade.kdy).toUpperCase()}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
            <Text style={{ color: t.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 }}>
              {naRade.zavod.nazev}
            </Text>
            <Stav stav={naRade.zavod.stav} />
          </View>
          <Text style={{ color: t.tlumeny, marginTop: 3 }}>
            {rozsah(naRade.zavod.datum, naRade.zavod.datumKonce)}
            {naRade.zavod.poradatel ? ` · ${naRade.zavod.poradatel}` : ''}
          </Text>
        </Pressable>
      ) : null}

      {rocnik ? (
        <>
          <Karta onPress={() => router.push(`/serie/${rocnik.slug}/poradi`)}>
            <Text style={{ color: t.voda, fontWeight: '600' }}>Průběžné pořadí seriálu →</Text>
          </Karta>

          <OdberUpozorneni slug={rocnik.slug} />

          <Sekce>Kalendář</Sekce>
          <Kalendar slug={rocnik.slug} zavody={rocnik.zavody} />
        </>
      ) : null}

      {/* <b>Ostatní ročníky dole, ne nahoře.</b> Archiv je důvod, proč sem
          přijde jeden člověk ze sta; kdyby stál nad kalendářem, platili by
          za něj klepnutím ti ostatní.

          <b>„Ostatní", ne „starší".</b> Příští ročník bývá v kalendáři dřív,
          než ten letošní skončí — v listopadu 2026 vydává API 2026 i 2027 —
          takže „starší" by nadepisovalo seznam, ve kterém stojí rok, co
          teprve přijde. */}
      {ostatni.length > 0 ? (
        <>
          <Sekce>Ostatní ročníky</Sekce>
          {ostatni.map((s) => (
            <Karta key={s.slug} onPress={() => router.push(`/serie/${s.slug}`)}>
              <Text style={{ color: t.text, fontWeight: '600', fontSize: 16 }}>{s.nazev}</Text>
              <Text style={{ color: t.tlumeny, marginTop: 2 }}>
                {s.rok} · {s.pocetZavodu} regat
              </Text>
            </Karta>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}
