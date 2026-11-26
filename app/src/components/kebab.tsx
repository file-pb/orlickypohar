import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radek } from '@/components/ui';
import { otevriObchod } from '@/components/verze-appky';
import { useData } from '@/hooks/use-data';
import { useTheme } from '@/hooks/use-theme';
import { useZmenaUctu } from '@/hooks/use-zmena-uctu';
import { jePrihlasen, relaceVyprsela } from '@/lib/identita';
import { pismoNaVyplni } from '@/lib/kontrast';
import { nabidka } from '@/lib/nabidka';
import { mojeOpravneni, zapomenOpravneni } from '@/lib/opravneni';
import { kamVUkazce, ukazkaBezi, vypniUkazku, zapniUkazku } from '@/lib/ukazka';
import { puvod, verzeKratce, zjistiStavBalicku } from '@/lib/verze';

/**
 * Kebab: všechno, co není „co teď".
 *
 * <b>Proč to není na obrazovce.</b> Filip, 7. 11. 2026: *„to menu hoď pod
 * nějaký kebab, ať to neotravuje."* Účet, lodě, klíč a trasa jsou věci,
 * které se vyřizují jednou — na břehu, v klubovně, před sezónou. Na
 * obrazovce, kterou má posádka otevřenou celou rozjížďku, jsou to čtyři
 * řádky, přes které se kouká na to podstatné.
 *
 * <b>Terč má 44 pt, i když ty tři tečky jsou malé.</b> Kreslí se menší,
 * než na co se klepe — jinak by to byl přesně ten případ, který měření
 * 30. 10. 2026 našlo třicetkrát (`tools/kontrola-dotyku.py`).
 */

const WEB = 'https://orlickypohar.klihovka.cz';

export function Kebab() {
  const t = useTheme();
  const router = useRouter();
  const okraje = useSafeAreaInsets();
  const [otevreno, setOtevreno] = useState(false);
  const [vUkazce, setVUkazce] = useState(ukazkaBezi());
  // Oprávnění se drží minutu (`lib/opravneni.ts`); nabídka je na každé
  // obrazovce a dotaz za přechod by na vodě stál čekání u každého klepnutí.
  const { data: ja, obnov: obnovOpravneni } = useData(mojeOpravneni);
  const { data: ucet, obnov: obnovUcet } = useData(async () => ({
    prihlasen: ukazkaBezi() || (await jePrihlasen()),
    vyprselo: !ukazkaBezi() && (await relaceVyprsela()),
  }));

  /**
   * <b>Napojí-li se telefon jinde, header to musí vědět hned.</b> Kebab se
   * připojí jednou za běh appky, takže bez tohohle by „Přihlásit" svítilo
   * dál nad telefonem, který už za účet jedná — až do prvního otevření
   * nabídky. Oprávnění jdou s ním: co účet smí, je důvod se napojovat.
   */
  useZmenaUctu(obnovUcet);
  useZmenaUctu(obnovOpravneni);

  // Balíček v obchodě jen na Androidu — jinde ho CI nezapisuje a dotaz by
  // byl zbytečný. Obnovuje se při otevření nabídky, stejně jako oprávnění.
  const { data: balicek, obnov: obnovBalicek } = useData(async () =>
    Platform.OS === 'android' ? await zjistiStavBalicku() : null,
  );
  const verze = verzeKratce(balicek ?? null, puvod().otisk);

  // Zavřít dřív, než se někam jde: jinak by nabídka zůstala viset nad
  // obrazovkou, na kterou se právě přešlo.
  const jdi = (cil: string) => {
    setOtevreno(false);
    // <b>Domů se nevrší, nahrazuje.</b> `push` by z páté obrazovky
    // udělal šestou a gesto zpět by vedlo tam, odkud člověk právě utekl;
    // `navigate` na kořen zásobník srovná.
    if (cil === '/') router.navigate('/');
    else router.push(cil as Parameters<typeof router.push>[0]);
  };

  return (
    <View style={s.rada}>
      {/* <b>Přihlášení patří na header, vedle teček</b> (Filip, 26. 11.
          2026). Ne do nabídky pod nimi: tam ho v hospodě marně hledal,
          zatímco appka mlčky ukazovala jen sledování. Je vidět na každé
          obrazovce a zmizí, jakmile telefon za někoho jedná — pak už
          místo nahoře nezabírá nic.

          <b>Vede na *Mám kód*, ne na poskytovatele</b> (rozhodnuto
          26. 11. 2026, `docs/ROZCESTNIK.md`, *Přihlášení bez cesty na
          Zitadel*, bod 4). Do té doby otevíralo stránku `ucty.klihovka.cz`
          s heslem, které pořadatel nemá. Slovo „Přihlásit" zůstává, protože
          ho lidé hledají; obrazovka za ním řekne, že se to dělá kódem
          z webu. Neplatí na něj `prihlasovaniJde`: kód na poskytovateli
          nezávisí, a appka bez jeho adresy by se jinak nenapojila vůbec. */}
      {ucet && !ucet.prihlasen ? (
        <Pressable
          onPress={() => jdi('/mam-kod')}
          accessibilityRole="button"
          accessibilityLabel="Přihlásit se kódem z webu"
          style={({ pressed }) => [
            s.prihlasit,
            { backgroundColor: t.voda, borderColor: t.voda },
            pressed && { opacity: 0.6 },
          ]}>
          <Text style={[s.prihlasitText, { color: pismoNaVyplni(t, t.voda) }]}>
            {ucet.vyprselo ? 'Přihlásit znovu' : 'Přihlásit'}
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => {
          setOtevreno(true);
          // <b>Ptát se až při otevření, ne jednou při startu.</b> Kebab
          // visí v kořenovém rozvržení, takže se připojí jedinkrát za běh
          // aplikace — a `useData` načítá právě tehdy. Kdo v tu chvíli
          // ještě nebyl přihlášený (klíč ze SecureStore se čte asynchronně)
          // nebo zapnul ukázku až potom, měl nabídku bez oprávnění do
          // konce běhu. Měřeno v simulátoru 18. 11. 2026: v ukázce
          // s pořadatelem závodu řádek *Stavba trati* chyběl.
          // Opakované otevření nestojí dotaz — drží ho `mojeOpravneni`.
          void obnovOpravneni();
          void obnovUcet();
          void obnovBalicek();
        }}
        accessibilityRole="button"
        accessibilityLabel="Nabídka"
        style={({ pressed }) => [s.terc, pressed && { opacity: 0.5 }]}>
        {/* <b>Tečky potřebují podklad.</b> Nabídka visí nad vším, takže
            pod ní může být cokoliv — na tmavě tyrkysovém pruhu stavu
            z nich 7. 11. 2026 v simulátoru nebylo vidět nic. Podklad má
            barvu papíru a 34 pt; terč zůstává 44. */}
        <View style={[s.podklad, { backgroundColor: t.papir, borderColor: t.linka }]}>
          <View style={[s.tecka, { backgroundColor: t.tlumeny }]} />
          <View style={[s.tecka, { backgroundColor: t.tlumeny }]} />
          <View style={[s.tecka, { backgroundColor: t.tlumeny }]} />
        </View>
      </Pressable>

      <Modal
        visible={otevreno}
        transparent
        animationType="fade"
        onRequestClose={() => setOtevreno(false)}>
        {/* Klepnutí vedle zavírá. Je to větší terč než cokoliv v nabídce,
            a tedy nejsnazší cesta zpátky. */}
        <Pressable style={s.stin} onPress={() => setOtevreno(false)} />
        <View
          style={[
            s.panel,
            { backgroundColor: t.papir, borderColor: t.linka, paddingTop: okraje.top + 8 },
          ]}>
          {/* <b>Nová verze nahoře, ne v patičce.</b> Po nativní změně se
              appka sama neaktualizuje, a kdo tu řádku nevidí, jede dál na
              starém balíčku — přesně ten stav, kvůli kterému to vzniklo
              (Filip, 26. 11. 2026: *„aby se to nemuselo odhadovat"*). */}
          {balicek?.druh === 'novejsi' ? (
            <Radek
              text="Nová verze v Obchodě Play"
              popis={`balíček č. ${balicek.posledni.cisloBalicku} — sama se nestáhne`}
              hodnota="aktualizovat"
              barvaHodnoty={t.voda}
              onPress={() => {
                setOtevreno(false);
                otevriObchod();
              }}
            />
          ) : null}
          {nabidka(ja ?? null).map((k) => (
            <Radek key={k.cil} text={k.text} popis={k.popis} onPress={() => jdi(k.cil)} />
          ))}
          {/* <b>Ukázkový režim.</b> Appka se odpojí od serveru a jede
              z přibalených dat; nahoře o sobě dá vědět proužkem. Po
              přepnutí se zásobník obrazovek zahodí — jinak by na nich
              zůstala data z toho druhého světa.

              <b>Zapnutí vede na závod, ne domů.</b> Vedlo domů, a tam je
              od 7. 11. 2026 jen logo — takže člověk klepl na *Ukázkový
              režim*, dostal proužek *„UKÁZKA — NIC SE NEODESÍLÁ"* nad
              prázdnou obrazovkou a neměl co číst než to, že ukázka běží
              a neukazuje nic. (Filip, 7. 11. 2026, se snímkem: *„Ukázka
              tvrdí že běží ale neběží nic."*) Komentář o kus níž na tuhle
              past upozorňoval a řešil ji druhou položkou — jenže první
              zůstala slepá a klepne se na ni dřív.

              <b>Vede na obrazovku rozhodčího</b>, ne posádky (Filip,
              7. 11. 2026: *„za tímto odkazem má být ukázkový režim pro
              rozhodčího"*). Ukázka stojí na jedné identitě, `Organizator`
              jednoho závodu, a start, cíl a trať jsou to, co se v ní dá
              dělat; posádka má vlastní položku hned pod tím. Cestu
              odvozuje `kamVUkazce()` ze snímku, aby se nerozešla, až se
              snímek pořídí znovu.

              Vypnutí vede domů dál: tam se člověk vrací do appky, ne do
              ukázky. */}
          <Radek
            text={vUkazce ? 'Ukončit ukázku' : 'Ukázkový režim'}
            popis={
              vUkazce
                ? 'vrátí appku na server'
                : 'appka bez serveru, z přibalených dat'
            }
            hodnota={vUkazce ? 'běží' : undefined}
            barvaHodnoty={vUkazce ? t.voda : undefined}
            onPress={() => {
              setOtevreno(false);
              if (vUkazce) vypniUkazku();
              else zapniUkazku();
              // Ukázka má vlastní identitu, takže držená odpověď `/ja`
              // po přepnutí platit přestane.
              zapomenOpravneni();
              setVUkazce(ukazkaBezi());
              // <b>`dismissAll` jen když je co zavřít.</b> Bez té
              // podmínky vyhodí navigace *„The action 'POP_TO_TOP' was
              // not handled"* a `replace` za ní se nemusí provést — pak
              // se režim přepne uvnitř, ale obrazovka o tom neví.
              // Viděno v simulátoru 7. 11. 2026.
              if (router.canDismiss()) router.dismissAll();
              const zavod = vUkazce ? null : kamVUkazce();
              if (zavod)
                router.replace({
                  pathname: '/serie/[slug]/zavody/[zavod]',
                  params: { slug: zavod.serie, zavod: zavod.zavod },
                });
              else router.replace(vUkazce ? '/' : '/zavodnik');
            }}
          />

          {/* <b>Ukázka očima posádky.</b> Filip, 7. 11. 2026: *„do kebabu
              asi dej i odkaz na ukázku aplikace závodníka."* Jedna cesta
              rovnou na obrazovku posádky — a když ukázka už běží, jen tam
              přejde.

              Přepínač výš míří na závod, tedy na tutéž ukázku očima
              rozhodčího; tahle položka je ta druhá polovina a je potřeba
              i uvnitř běžící ukázky, kdy přepínač výš naopak vypíná. */}
          <Radek
            text="Ukázka pro závodníka"
            popis="jak appku vidí posádka na vodě"
            onPress={() => {
              setOtevreno(false);
              if (!ukazkaBezi()) zapniUkazku();
              setVUkazce(true);
              if (router.canDismiss()) router.dismissAll();
              router.replace('/zavodnik');
            }}
          />

          <Radek
            text="orlickypohar.klihovka.cz"
            hodnota="web"
            onPress={() => {
              setOtevreno(false);
              void Linking.openURL(WEB);
            }}
          />
          {/* Na čem appka jede, bez hledání o dvě obrazovky hloub. Klepnutí
              vede na *Účet a nastavení*, kde je celá sekce i hledání novinek. */}
          {verze ? (
            <Pressable
              onPress={() => jdi('/ucet')}
              accessibilityRole="button"
              style={({ pressed }) => [s.verze, pressed && { opacity: 0.5 }]}>
              <Text style={[s.verzeText, { color: t.tlumeny }]}>{verze}</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => setOtevreno(false)}
            style={({ pressed }) => [s.zavrit, pressed && { opacity: 0.5 }]}>
            <Text style={[s.zavritText, { color: t.voda }]}>Zavřít</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  // Terč je 44 pt, tečky uvnitř mají dohromady 16.
  terc: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  podklad: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tecka: { width: 4, height: 4, borderRadius: 2 },

  stin: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  // Tečky a tlačítko v jedné řadě, zarovnané doprava od kotvy
  // v `app/_layout.tsx`.
  rada: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // <b>Terč je 44 pt na výšku jako tečky</b> — táž mez
  // (`tools/kontrola-dotyku.py`). Napoprvé tu stálo 36 a kontrola to
  // v CI zastavila; komentář přitom tvrdil 44. Měřená mez je k tomu, aby
  // se takhle nedalo lhát ani sobě.
  prihlasit: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
  },
  prihlasitText: { fontSize: 14, fontWeight: '700' },

  // Řádek s verzí je klepací, takže 44 pt i přes drobné písmo.
  verze: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  verzeText: { fontSize: 12 },
  zavrit: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  zavritText: { fontSize: 16, fontWeight: '700' },
});
