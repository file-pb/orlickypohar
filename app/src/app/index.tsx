import { Redirect, useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';

import { useData } from '@/hooks/use-data';
import { useTheme } from '@/hooks/use-theme';
import { useZmenaUctu } from '@/hooks/use-zmena-uctu';
import { nactiDnesniRegatu } from '@/lib/api';
import { jePrihlasen } from '@/lib/identita';
import { mojeOpravneni } from '@/lib/opravneni';
import { dlazdice, kamRovnou, type Dlazdice } from '@/lib/rozcestnik';
import { NovaVerze } from '@/components/verze-appky';

/**
 * Domovská obrazovka: rozcestník podle toho, kdo appku zapnul.
 *
 * <b>Co tu bylo předtím.</b> Od 7. 11. 2026 tu bylo jen velké logo —
 * dočasný stav, který si Filip vyžádal, než se rozhodne, co sem patří
 * (*„landing budem měnit, a tak jen teď dočasně jen s logem"*). Tohle je
 * to rozhodnutí; rozvaha a návrh jsou v `docs/ROZCESTNIK.md`
 * a `docs/navrh/rozcestnik.html`.
 *
 * <b>Pravidla jsou vedle</b> (`lib/rozcestnik.ts`), protože se dají ověřit
 * bez telefonu. Tahle obrazovka z nich jen dělá dlaždice a hlídá jednu věc,
 * o které pravidla vědět nemůžou: <b>jestli jsou data jistá</b>.
 *
 * <b>Přeskočit se smí jen podle přečtených rolí.</b> Dokud `/ja` neodpoví,
 * nebo když selže, vypadá každý jako čtenář — a kdyby se podle toho
 * přesměrovávalo, skončil by rozhodčí bez signálu na sledování a vypadalo
 * by to, že mu appka sebrala půlku funkcí. Proto se při chybě kreslí
 * rozcestník: ukázat víc, než člověk potřebuje, je menší škoda než poslat
 * ho jinam, než chtěl.
 *
 * <b>Dva dotazy, oba levné.</b> `/ja` drží minutu (`lib/opravneni.ts`),
 * `/lod/dnes` je tentýž dotaz, kterým žije obrazovka posádky. Víc jich tu
 * být nemá: tohle je první obrazovka po spuštění a na vodě je signál drahý.
 */
export default function Domu() {
  const t = useTheme();
  const tmave = useColorScheme() === 'dark';
  const router = useRouter();

  const { data: ja, chyba: chybaJa, nacita: nacitaJa, obnov: obnovJa } = useData(mojeOpravneni);
  // <b>Má ten telefon vůbec přihlášení?</b> Čte se z úložiště, bez sítě.
  const { data: prihlasen, nacita: nacitaUcet, obnov: obnovUcet } = useData(
    async () => await jePrihlasen(),
  );
  // Po napojení se sem appka vrací navigací na kořen; rozcestník přitom
  // zůstal v zásobníku, takže by se sám znovu nenačetl a ukázal by
  // nabídku nepřihlášeného nad telefonem, který už za účet jedná.
  useZmenaUctu(obnovUcet);
  useZmenaUctu(obnovJa);
  const { data: dnes, chyba: chybaDnes, nacita: nacitaDnes } = useData(nactiDnesniRegatu);

  const nacita = nacitaJa || nacitaDnes || nacitaUcet;
  // „Jisté" neznamená „něco přišlo". Nepřihlášený dostane `null` bez chyby
  // a to je plnohodnotná odpověď; chyba je naopak neznalost.
  // <b>Spor se nepřeskakuje.</b> Token v telefonu je, ale `/ja` nic
  // nevrátilo (vypršelá relace, odmítnutý token) — pak o tom člověku
  // nevíme, a přeskočit rozcestník by znamenalo poslat ho mezi čtenáře
  // bez jediného slova. Přesně to se stalo 26. 11. 2026 a hledalo se to
  // v serverových logech, protože bez tokenu se `/ja` ani neodesílá.
  const spor = prihlasen === true && ja === null;
  const jiste = !nacita && !chybaJa && !chybaDnes && !spor;

  const d = dlazdice({
    ja: ja ?? null,
    dnes: dnes ? { lod: dnes.lod, cisloPlachty: dnes.cisloPlachty } : null,
  });

  const rovnou = jiste ? kamRovnou(d) : null;
  // <b>Redirect, ne `replace` v efektu.</b> Expo Router ji má přesně na
  // tohle: *„Redirects to the href as soon as the component is mounted."*
  // (docs.expo.dev, SDK 57). Efekt by proběhl až po vykreslení, takže by
  // rozcestník na okamžik probliknul.
  if (rovnou) return <Redirect href={rovnou as Parameters<typeof router.push>[0]} />;

  // <b>Čtyři dlaždice do mřížky, tři a míň na šířku.</b> Čtvercová unese
  // dva řádky kontextu, širší řádková jeden, zato delší — a tři čtverce
  // vypadají jako čtyři s dírou.
  const mrizka = d.length === 4;

  return (
    <ScrollView
      style={{ backgroundColor: t.pozadi }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 44 }}>
        {/* <b>Ikona má dvě verze, stejně jako na ploše telefonu.</b>
            Světlá stojí na papíru, tmavá na pozadí tmavého vzhledu — bez
            toho by v tmavém režimu svítila na černé bílá dlaždice.
            `require` nejde volat podmíněně, takže se vybírá z obou. */}
        <Image
          source={
            tmave
              ? require('../../assets/images/icon-tmava.png')
              : require('../../assets/images/icon.png')
          }
          style={{ width: 44, height: 44, borderRadius: 10 }}
          accessibilityIgnoresInvertColors
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: t.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 }}>
            Orlický pohár
          </Text>
          <Text style={{ color: t.tlumeny, fontSize: 13 }}>
            {ja?.zobrazovane ?? 'Plachetnice na Orlické přehradě'}
          </Text>
        </View>
        {/* Nabídka tu nestojí: leží nad celým zásobníkem (`_layout.tsx`),
            takže je na každé obrazovce na stejném místě. */}
      </View>

      {/* <b>Pruh „dnes se jede" je tenký schválně.</b> Je to kontext, ne
          akce; jakmile dostane tlačítko, začne soupeřit s dlaždicemi
          o palec. <b>Ví o dnešku jen přes vlastní loď</b> — rozhodčí bez
          lodi ho neuvidí, dokud rozcestník nebude znát kalendář. */}
      {dnes?.zavodNazev ? (
        <View
          style={{
            marginTop: 16,
            borderLeftWidth: 3,
            borderLeftColor: t.voda,
            paddingLeft: 10,
          }}>
          <Text style={{ color: t.text, fontSize: 15, fontWeight: '700' }}>
            Dnes se jede {dnes.zavodNazev}
          </Text>
        </View>
      ) : null}

      {/* Nový nativní balíček se sám nestáhne, dokud ho Play nedoručí —
          proto tady, kde se nedá přehlédnout. Bez novinky karta není. */}
      <NovaVerze />

      {/* <b>Chyba nezhasne rozcestník.</b> Role se nepřečetly, takže nabídka
          je kratší, než by měla být — a to se musí říct, jinak to vypadá,
          že se appka zmenšila. Sledování funguje tak jako tak. */}
      {chybaJa || chybaDnes || spor ? (
        <Text style={{ color: t.vystraha, fontSize: 13, marginTop: 14 }}>
          {spor
            ? 'Přihlášení neplatí. Vystav si na webu nový kód a zadej ho přes Přihlásit nahoře.'
            : 'Co smíš, se teď nedá zjistit — nabídka proto může být kratší.'}
        </Text>
      ) : null}

      <View
        style={{
          marginTop: 18,
          flexDirection: mrizka ? 'row' : 'column',
          flexWrap: mrizka ? 'wrap' : 'nowrap',
          gap: 12,
        }}>
        {d.map((x) => (
          <Kachlik key={x.klic} d={x} mrizka={mrizka} onPress={() => jdi(router, x.cil)} />
        ))}
      </View>
    </ScrollView>
  );
}

/** Cesty se skládají z částí slugů, takže typovaná `href` je tu až tady. */
function jdi(router: ReturnType<typeof useRouter>, cil: string) {
  router.push(cil as Parameters<typeof router.push>[0]);
}

/**
 * Jedna dlaždice.
 *
 * <b>Zvýrazněná je rámečkem a barvou písma, ne výplní.</b> Výplň barvou
 * vody by z ní udělala tlačítko *Startuj* — to na téhle obrazovce není nic
 * a nemá se mu podobat.
 */
function Kachlik({
  d,
  mrizka,
  onPress,
}: {
  d: Dlazdice;
  mrizka: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${d.nazev}. ${d.kontext}`}
      style={({ pressed }) => [
        {
          // `48%` místo poloviny šířky: mezeru mezi sloupci drží `gap`,
          // takže se tu o ni nesmí počítat podruhé.
          width: mrizka ? '48%' : '100%',
          minHeight: mrizka ? 116 : 76,
          backgroundColor: d.hlavni ? t.zvyrazneni : t.papir,
          borderColor: d.hlavni ? t.voda : t.linka,
          borderWidth: d.hlavni ? 2 : 1,
          borderRadius: 14,
          padding: 14,
          // <b>Jména zarovnaná nahoru, ne na střed.</b> Na střed se
          // v mřížce rozejdou: dvouřádkový kontext posune jméno vedlejší
          // dlaždice výš a oko pak hledá dvakrát. Ověřeno v simulátoru
          // 26. 11. 2026 — *Jedu závod* sedělo níž než *Sledování*.
          justifyContent: 'flex-start',
        },
        pressed && { opacity: 0.6 },
      ]}>
      <Text
        style={{
          color: d.hlavni ? t.voda : t.text,
          fontSize: 17,
          fontWeight: '700',
        }}>
        {d.nazev}
      </Text>
      <Text style={{ color: t.tlumeny, fontSize: 13, marginTop: 4 }}>{d.kontext}</Text>
    </Pressable>
  );
}
