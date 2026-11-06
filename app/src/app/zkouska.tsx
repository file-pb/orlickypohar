import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Odpocet } from '@/components/odpocet';
import { Akce, Nadpis, Sekce } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { startZUkonu, type UkonProcedury } from '@/lib/cekajici-start';

/**
 * Startovní procedura nanečisto.
 *
 * <b>Proč to existuje.</b> Filip, 7. 11. 2026: *„abychom mohli nastartovat
 * ostrý chod a nebo demo se simulací startu."* Závod je 15. května 2027.
 * Do té doby si rozhodčí nemá kde vyzkoušet, co mu telefon bude u startu
 * říkat — a vyzkoušet si to potřebuje dřív, ne na startovní lodi.
 *
 * <b>Ven nejde nic.</b> Žádná rozjížďka, žádný server, žádný zápis: panel
 * je tentýž jako u regaty, jen stav drží tahle obrazovka v paměti. Proto
 * se to smí spustit kdykoliv a komukoliv, i když zrovna žádná regata není.
 *
 * <b>Dvě minuty místo pěti</b>, protože pětiminutová zkouška se zkouší
 * jednou. Ve dvou minutách zazní obojí, co na vodě zazní: krátký tón na
 * vyzývacím znamení, dlouhý na poslední minutě a krátký na start. Pětka
 * je vedle, když chce někdo slyšet celou věc i s tím tichem uprostřed.
 */

/** Co se nabízí. Minuta má jen dvě znamení, tři jsou totéž co dvě. */
const DELKY = [2, 5];

export default function Zkouska() {
  const t = useTheme();
  const [delkaMin, setDelkaMin] = useState(DELKY[0]);
  const [startV, setStartV] = useState<string | null>(null);

  // Panel čte rozjížďky, ne jeden start — podstrčí se mu tedy jedna
  // vymyšlená. `Planovana` i po nule: stav si panel odvodí z času sám,
  // stejně jako u skutečné rozjížďky, které server ještě neodpověděl.
  const rozjizdky = [{ cislo: 1, startV, stav: 'Planovana' as const }];

  // <b>Co úkon udělá se startem, nepočítá tahle obrazovka.</b> Spuštění,
  // odložení i odvolání (ZPJ 29.2 přidá minutu) řeší `startZUkonu`, tedy
  // tatáž funkce, kterou appka u vody drží frontu nedoručených úkonů.
  // Vlastní výpočet by byl druhá pravda o témže pravidle a rozešel by se.
  const ukon = (_cislo: number, druh: UkonProcedury) =>
    setStartV(startZUkonu(druh, Date.now(), delkaMin * 60));

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Stack.Screen options={{ title: 'Zkouška startu' }} />

      <Nadpis>Startovní procedura nanečisto</Nadpis>
      <Text style={{ color: t.tlumeny, marginTop: -8, marginBottom: 16, lineHeight: 20 }}>
        Tentýž panel jako u regaty, včetně hlasu a klaksonu. Ven nejde nic —
        žádná rozjížďka se nezakládá a nikomu se nic nehlásí.
      </Text>

      <Sekce>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {DELKY.map((m) => (
            <View key={m} style={{ flex: 1 }}>
              <Akce
                text={`${m} minuty`}
                barva={m === delkaMin ? t.voda : t.tlumeny}
                onPress={() => {
                  setDelkaMin(m);
                  // Běžící zkoušku přepnutí délky zahodí: míchat partituru
                  // za chodu by dalo odpočet, který se neshoduje s ničím.
                  setStartV(null);
                }}
              />
            </View>
          ))}
        </View>

        <Odpocet
          rozjizdky={rozjizdky}
          delkaProceduryMin={delkaMin}
          naSpusteni={() => ukon(1, 'Spustit')}
          naUkon={ukon}
        />
      </Sekce>

      {startV ? (
        <View style={{ marginTop: 16 }}>
          <Akce text="Zkoušku ukončit" barva={t.stavZruseny} onPress={() => setStartV(null)} />
        </View>
      ) : null}

      <Text style={{ color: t.tlumeny, marginTop: 24, fontSize: 13, lineHeight: 19 }}>
        Hlas i klakson se řídí týmž předpisem jako u vody (ZPJ 26). Co uslyšíš
        tady, uslyšíš i tam — jen se o tom nikdo jiný nedozví.
      </Text>
    </ScrollView>
  );
}
