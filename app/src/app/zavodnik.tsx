import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { ActivityIndicator, Alert, AppState, Pressable } from 'react-native';

import { Baterie } from '@/components/baterie';
import { Preskok } from '@/components/preskok';
import { Karta, Nacitani, Nadpis, Prazdno } from '@/components/ui';
import { useData } from '@/hooks/use-data';
import { useTheme } from '@/hooks/use-theme';
import { nactiDnesniRegatu, type ClenPosadky, type ZavodnikDnes } from '@/lib/api';
import { posledniZnameni } from '@/lib/hlaseni';
import { pismoNaVyplni, sPruhlednosti } from '@/lib/kontrast';
import { ukazkaBezi } from '@/lib/ukazka';
import { nastavSledovani } from '@/lib/klic';
import { hlasim, obnovHlaseni, vypniHlaseni, type Hlasim } from '@/lib/tracker/hlasim-se';
import { predJakDlouho } from '@/lib/tracker/stav';
import { obnovZaznam, pozastavZaznam, bezicZaznam, otevrenyZaznam, type Zaznam } from '@/lib/tracker/zaznam';
import { spustZaznamNaPozadi, zastavZaznamNaPozadi } from '@/lib/tracker/uloha';

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
  const { data, nacita, chyba, obnov } = useData(nactiDnesniRegatu, []);

  // <b>Vteřinový tik jen kvůli ukázce.</b> Nabídka přeskoku se musí
  // přepočítat, jak se blíží další troubení, a obrazovka posádky jinak
  // běží bez taktu — hodiny v hlavičce si tikají samy. U vody by
  // překreslování celé obrazovky každou vteřinu bylo placení za nic,
  // takže tiká jen v ukázce a jen dokud je na co čekat.
  const [tik, setTik] = useState(Date.now());
  const vUkazce = ukazkaBezi();
  const doStartuS = data?.startV ? (Date.parse(data.startV) - tik) / 1000 : null;
  const tikat = vUkazce && doStartuS !== null && doStartuS > 0;
  useEffect(() => {
    if (!tikat) return;
    const id = setInterval(() => setTik(Date.now()), 1000);
    return () => clearInterval(id);
  }, [tikat]);

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
        {/* <b>Vpravo nahoře sedí kebab.</b> Nabídka se kreslí nad celým
            zásobníkem obrazovek, takže prvních ~48 pt zprava patří jí —
            7. 11. 2026 v simulátoru se z názvu regaty četlo *„Izole"* a
            zbytek mizel pod třemi tečkami. Odsazení je tedy vlastnost
            téhle první řádky, ne kosmetika. */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingRight: 48 }}>
          <Text style={{ color: naVyplni, fontSize: 13, fontWeight: '700', letterSpacing: 0.6 }}>
            {data.rozjizdka ? `ROZJÍŽĎKA ${data.rozjizdka}` : 'ZATÍM ŽÁDNÁ ROZJÍŽĎKA'}
          </Text>
          <Text
            numberOfLines={1}
            style={{ color: naVyplni, fontSize: 13, flexShrink: 1, marginLeft: 8 }}>
            {data.zavodNazev}
          </Text>
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

        {/* <b>Poslední znamení</b> (návrh `Zavodnik-svetly.dc.html`:
            *„Poslední znamení · Příprava · 14:33"*). Čas startu nad tím
            je okamžik, který teprve přijde; tohle je ten, který už byl
            slyšet — a podle něj se posádka orientuje, když houkačku
            přeslechla. Počítá se z času startu, takže nestojí dotaz.

            Po skončení rozjížďky mizí: *„poslední znamení: Start"* tři
            hodiny po dojezdu už nikomu nic neříká. */}
        {data.startV
          && data.stavRozjizdky !== 'Dokoncena'
          && data.stavRozjizdky !== 'Zrusena' ? (
          <PosledniZnameni startV={data.startV} barva={naVyplni} />
        ) : null}

        {/* <b>Běžící hodiny</b>, jak je kreslí návrh (`Zavodnik.dc.html`:
            13:58:02). Není to odpočet — ten tu schválně není —, je to
            hodina telefonu, podle které si posádka sama spočítá, kolik
            zbývá. Zpožděná by nelhala, protože hodiny nikdo neposílá po
            síti; jdou z telefonu. */}
        <Hodiny barva={naVyplni} />
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

      {/* Tohle posádka kontroluje na břehu: že telefon visí u správné lodi.
          <b>Jméno lodi na to nestačí</b> (zbytek R34) — dvě Luny na Orlíku
          nejsou nic divného, a číslo na plachtě je to, čím se loď na vodě
          pozná. Proto je velké a vedle jména. */}
      <Karta>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={{ color: t.text, fontSize: 22, fontWeight: '800' }}>{data.lod}</Text>
          {data.cisloPlachty ? (
            <Text
              style={{
                color: t.tlumeny,
                fontSize: 18,
                fontWeight: '700',
                marginLeft: 8,
                fontVariant: ['tabular-nums'],
              }}>
              {data.cisloPlachty}
            </Text>
          ) : null}
          {data.kategorie ? (
            <Text style={{ color: t.tlumeny, fontSize: 14, marginLeft: 'auto' }}>
              {data.kategorie}
            </Text>
          ) : null}
        </View>

        {/* Kdo z posádky má klíč, stojí v kartě *Telefony na lodi* —
            tam je u každého i to, jestli vysílá a kolik má baterie. Dva
            seznamy téhož by se lišily jen tím, co zamlčí. */}
      </Karta>

      <StavTelefonu nahravatOd={data.nahravatOd} posadka={data.posadka} />

      <TelefonyNaLodi posadka={data.posadka} />

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

      {/* <b>Přeskok čekání</b> (Filip, 7. 11. 2026: *„ukázku pro závodníka
          vybav také modalem pro přeskočení času"*). Táž součástka jako na
          obrazovce rozhodčího — posádka čeká na týž start a v ukázce je to
          totéž čekání. `obnov` je tu navíc: `/lod/dnes` se načítá jednou,
          takže po posunu startu by obrazovka ukazovala starý čas. */}
      <Preskok doStartuS={doStartuS} poPreskoku={obnov} />
    </ScrollView>
  );
}

/**
 * <b>Karta stavu telefonu</b> (zbytek R34).
 *
 * Posádka má na vodě jednu otázku o telefonu: <i>jede to?</i> A je to
 * otázka, kterou si klade na břehu, ne na vodě — tam už s odpovědí nic
 * neudělá. Proto tu nestojí procenta baterie (*„to uživatel vidí na
 * telefonu nativně"*, Filip, 26. 10. 2026) ani počty bodů; stojí tu
 * <b>jestli telefon ví, co má dělat</b>.
 *
 * Tři stavy, ne dva:
 *
 * <ul>
 *   <li><b>nahrává</b> — záznam běží, stopa vzniká;</li>
 *   <li><b>hlásí se a čeká</b> — režim z klubovny (R3), nahrávání naskočí
 *       samo v T−20; souřadnice se do té chvíle nikam neposílají;</li>
 *   <li><b>nic</b> — telefon o dnešní regatě neví a někdo to musí zapnout.
 *       To je ten stav, kvůli kterému karta existuje.</li>
 * </ul>
 *
 * <b>Čte se z disku, ne z paměti</b>, protože režim i záznam žijí v SQLite
 * (úloha na pozadí se budí v jiném JS kontextu). Překresluje se po deseti
 * sekundách: je to stav, který se mění hlášením po pěti minutách, takže
 * častěji by to byla práce pro nic.
 */
function StavTelefonu({
  nahravatOd,
  posadka,
}: {
  nahravatOd: string | null;
  posadka: readonly ClenPosadky[];
}) {
  const t = useTheme();
  const [stav, setStav] = useState<{ hlas: Hlasim; zaznam: Zaznam | null }>({
    hlas: { zapnuto: false, lod: null, regata: null, nahravatOd: null, posledniHlaseni: 0 },
    zaznam: null,
  });

  useEffect(() => {
    const precti = () => setStav({ hlas: hlasim(), zaznam: bezicZaznam() });
    precti();
    const id = setInterval(precti, 10_000);
    return () => clearInterval(id);
  }, []);

  const [prepina, setPrepina] = useState(false);

  const nahrava = stav.zaznam !== null;
  const hlasi = stav.hlas.zapnuto;
  // Pozastaveno je vědomé rozhodnutí posádky, ne porucha — a pozná se po
  // tom, že telefon o lodi ví, ale nehlásí se a nenahrává.
  const pozastaveno = !nahrava && !hlasi && stav.hlas.lod !== null;

  /**
   * <b>Pozastavit vysílání polohy</b> — Filipova věta z plánu: *„kdo
   * odjíždí, vypne si to sám a není odkázaný na to, že na něj někdo
   * nezapomene."*
   *
   * Dělá se obojí a je to schválně. <b>Lokálně</b> se zastaví záznam i
   * odběr polohy, takže telefon polohu ani nedostává — ne že by ji jen
   * neposílal. A <b>na serveru</b> se klíč odepne ze sledování, protože
   * kdyby se to stalo na vodě bez signálu, nedoslaná dávka by se jinak
   * doposlala potom.
   */
  async function prepni(vysilat: boolean) {
    if (prepina) return;
    setPrepina(true);
    try {
      if (vysilat) {
        const z = otevrenyZaznam();
        if (z?.stav === 'pozastaveny') obnovZaznam(z.id);
        if (obnovHlaseni() || z) await spustZaznamNaPozadi();
      } else {
        const z = bezicZaznam();
        if (z) pozastavZaznam(z.id);
        if (stav.hlas.zapnuto) vypniHlaseni();
        await zastavZaznamNaPozadi();
      }

      // Až za lokální změnou: kdyby se čekalo na server a ten nebyl,
      // posádka by zmáčkla „pozastavit" a telefon by vysílal dál.
      await nastavSledovani(vysilat);
    } catch (e) {
      Alert.alert(
        vysilat ? 'Nepovedlo se zapnout' : 'Nepovedlo se úplně vypnout',
        `${e instanceof Error ? e.message : String(e)}\n\n`
          + 'Telefon už polohu nezaznamenává, ale serveru se to nepodařilo říct. '
          + 'Až chytí signál, zkus to znovu.',
      );
    } finally {
      setPrepina(false);
      setStav({ hlas: hlasim(), zaznam: bezicZaznam() });
    }
  }

  // Čas se bere z appky, když ho má — je stažený a platí i bez signálu —
  // a jinak z odpovědi serveru, aby karta řekla hodinu i telefonu, který
  // se ještě nikdy neozval.
  const zapneSe = stav.hlas.nahravatOd ?? (nahravatOd ? Date.parse(nahravatOd) : null);

  const barva = nahrava
    ? t.stavVypsany
    : hlasi
      ? t.voda
      : pozastaveno
        ? t.tlumeny
        : t.stavZruseny;
  const veta = nahrava
    ? 'Nahrává trasu'
    : hlasi
      ? 'Hlásí se a čeká na start'
      : pozastaveno
        ? 'Vysílání pozastaveno'
        : 'Nehlásí se';

  // Co o tomhle telefonu ví server. Je to jiná otázka než „co telefon
  // dělá": appka může zapisovat a přitom se k serveru nedostat.
  const ja = posadka.find((c) => c.ja);

  return (
    <Karta>
      {/* <b>„Komise tě vidí"</b> podle návrhu (`Zavodnik.dc.html`). Tohle
          je jediná věta na obrazovce, kterou neříká appka o sobě, nýbrž
          server o ní — a je to ta, na kterou se posádka ptá. */}
      {/* <b>Jeden puntík, ne dva.</b> Napoprvé tu stály dvě barevné řádky
          nad sebou — *„Komise tě vidí"* zeleně a hned pod tím *„Nehlásí
          se"* červeně — a na simulátoru se to 7. 11. 2026 četlo jako
          protimluv. Jsou to dvě různé otázky (co ví server × co dělá
          telefon), ale posádka se ptá na tu první; ta druhá je vysvětlení
          k ní, ne druhý stav. */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            backgroundColor: ja ? (ja.vysila ? t.stavVypsany : t.vystraha) : barva,
            marginRight: 9,
          }}
        />
        <Text style={{ color: t.text, fontWeight: '700', flex: 1 }}>
          {ja ? (ja.vysila ? 'Komise tě vidí' : 'Komise tě nevidí') : veta}
        </Text>
        {ja ? (
          <Text style={{ color: t.tlumeny, fontSize: 12 }}>
            {ja.ozvalSeV === null
              ? 'zatím nikdy'
              : predJakDlouho(Date.now() - Date.parse(ja.ozvalSeV))}
          </Text>
        ) : null}
      </View>

      {/* Co dělá tenhle telefon — jen když je co říct vedle toho, co už
          stojí výš. */}
      {ja ? (
        <Text style={{ color: t.tlumeny, fontSize: 13, marginTop: 6 }}>
          {veta}
          {nahrava || hlasi ? '' : ' · nikdo tu záznam nezapnul'}
        </Text>
      ) : null}

      {nahrava ? (
        <Text style={{ color: t.tlumeny, fontSize: 13, marginTop: 6 }}>
          Po dojezdu ho ukonči v Trase. Do té doby na nic klepat nemusíš.
        </Text>
      ) : hlasi ? (
        <>
          <Text style={{ color: t.tlumeny, fontSize: 13, marginTop: 6 }}>
            {zapneSe === null
              ? 'Nahrávání naskočí samo, až rozhodčí po rozpravě zapíše čas startu.'
              : `Nahrávání naskočí samo ve ${new Date(zapneSe).toLocaleTimeString('cs-CZ', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}.`}
          </Text>
          <Text style={{ color: t.tlumeny, fontSize: 12, marginTop: 4 }}>
            {stav.hlas.posledniHlaseni === 0
              ? 'zatím se neozval'
              : `naposledy se ozval ${predJakDlouho(Date.now() - stav.hlas.posledniHlaseni)}`}
          </Text>
        </>
      ) : (
        // Tahle věta je celý účel karty: na vodě už se s tím nedá nic
        // udělat, na břehu ano.
        <Text style={{ color: t.tlumeny, fontSize: 13, marginTop: 6 }}>
          {pozastaveno
            ? 'Poloha se nevysílá a nezaznamenává. Zapnout to jde jedním klepnutím.'
            : 'Telefon o dnešní regatě neví. Zapněte to v klubovně u zápisu — pak už na to '
              + 'posádka nesahá.'}
        </Text>
      )}

      {/* Jediné tlačítko na celé obrazovce posádky — a patří jí: polohu
          vysílá její telefon. Všechno ostatní tady zapsal někdo jiný. */}
      {nahrava || hlasi || pozastaveno ? (
        <Pressable
          onPress={() => {
            if (nahrava || hlasi) {
              Alert.alert(
                'Pozastavit vysílání polohy?',
                'Telefon přestane zaznamenávat i posílat. Ve stopě tím vznikne díra — '
                  + 'a při protestu je stopa to, čím se dokazuje, kde loď byla.',
                [
                  { text: 'Nechat běžet', style: 'cancel' },
                  { text: 'Pozastavit', style: 'destructive', onPress: () => void prepni(false) },
                ],
              );
            } else {
              void prepni(true);
            }
          }}
          disabled={prepina}
          style={({ pressed }) => ({
            minHeight: 44,
            marginTop: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: t.linka,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed || prepina ? 0.6 : 1,
          })}>
          {prepina ? (
            <ActivityIndicator color={t.tlumeny} />
          ) : (
            <Text style={{ color: t.text, fontWeight: '600' }}>
              {pozastaveno ? 'Zase vysílat polohu' : 'Pozastavit vysílání polohy'}
            </Text>
          )}
        </Pressable>
      ) : null}
    </Karta>
  );
}

/**
 * <b>Které znamení padlo naposledy</b> — řádek z návrhu
 * (`Zavodnik-svetly.dc.html`: *„Poslední znamení · Příprava · 14:33"*).
 *
 * <b>Proč vlastní součástka s vlastním tikem.</b> Obrazovka posádky se
 * překresluje jen při načtení dat; kdyby se znamení počítalo tam, zůstalo
 * by stát na tom, co platilo ve chvíli otevření. Tiká proto sama, stejně
 * jako {@link Hodiny} vedle ní — a při návratu z pozadí si čas přečte,
 * aby po zhasnutém displeji neukazovala starou minutu.
 *
 * <b>Mez, kterou nelze z dat odstranit.</b> `GET /lod/dnes` nenese délku
 * startovní procedury, takže se počítá s výchozími pěti minutami
 * (`PROCEDURA_S`). Přípravné znamení, poslední minuta i start leží podle
 * ZPJ 26 pevně — čtyři minuty, minuta, nula —, takže jsou správně vždy.
 * Chybně může vyjít jedině <b>vyzývací</b>, a jedině u regaty, které
 * pořadatel délku procedury změnil. Napravit to jde přidáním
 * `delkaProceduryMin` do `ZavodnikDto`, ne tady.
 */
function PosledniZnameni({ startV, barva }: { startV: string; barva: string }) {
  const [ted, setTed] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setTed(Date.now()), 1000);
    const posluchac = AppState.addEventListener('change', (stav) => {
      if (stav === 'active') setTed(Date.now());
    });
    return () => {
      clearInterval(id);
      posluchac.remove();
    };
  }, []);

  const start = Date.parse(startV);
  const znameni = posledniZnameni((start - ted) / 1000);
  if (!znameni) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderColor: sPruhlednosti(barva, 0.3),
      }}>
      <Text style={{ color: sPruhlednosti(barva, 0.85), fontSize: 14 }}>Poslední znamení</Text>
      <Text style={{ color: barva, fontSize: 20, fontWeight: '700' }}>{znameni.jmeno}</Text>
      <Text
        style={{
          color: barva,
          fontSize: 20,
          fontWeight: '700',
          marginLeft: 'auto',
          fontVariant: ['tabular-nums'],
        }}>
        {new Date(start - znameni.vterinDoStartu * 1000).toLocaleTimeString('cs-CZ', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );
}

/**
 * Hodiny s vteřinami, jak je kreslí návrh.
 *
 * <b>Netiká to po vteřině zbytečně:</b> `setInterval` stojí, když je appka
 * na pozadí nebo displej zhasne, a po návratu by hodiny ukazovaly starý
 * čas, dokud nepřijde tik. Proto se při návratu čas přečte z hodin dřív,
 * než stihne tiknout — tentýž vzorec jako v `odpocet.tsx`.
 */
function Hodiny({ barva }: { barva: string }) {
  const [ted, setTed] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setTed(Date.now()), 1000);
    const posluchac = AppState.addEventListener('change', (stav) => {
      if (stav === 'active') setTed(Date.now());
    });
    return () => {
      clearInterval(id);
      posluchac.remove();
    };
  }, []);

  return (
    <Text
      style={{
        color: barva,
        fontSize: 15,
        fontWeight: '700',
        marginTop: 8,
        opacity: 0.85,
        fontVariant: ['tabular-nums'],
      }}>
      {new Date(ted).toLocaleTimeString('cs-CZ', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}
    </Text>
  );
}

/**
 * <b>Telefony na lodi</b> — karta z návrhu (`Zavodnik.dc.html`).
 *
 * Posádka se na břehu ptá na dvě věci a karta odpovídá na obě naráz:
 * <i>hlásí se všichni?</i> (počet v hlavičce) a <i>vydrží nám telefony?</i>
 * (baterie po řádcích). Na vodě už se s odpovědí nedá nic udělat, takže
 * karta není pro vodu — je pro klubovnu.
 *
 * <b>Vlastní baterie se tu ukazuje taky</b>, ačkoliv ji telefon umí sám:
 * řádek bez ní by v seznamu vypadal jako chybějící údaj a posádka by
 * hledala, co je s ním. Slovo *„tvůj"* říká, který řádek je čí — tak to
 * kreslí návrh.
 *
 * <b>Kdo se nehlásí, má místo baterie čas.</b> Procenta telefonu, který se
 * neozval, jsou stará a tvrdila by víc, než se ví; *„nehlásí se 12 min"* je
 * to, co se s tím dá dělat.
 */
function TelefonyNaLodi({ posadka }: { posadka: readonly ClenPosadky[] }) {
  const t = useTheme();
  if (posadka.length === 0) return null;

  const vysila = posadka.filter((c) => c.vysila).length;

  return (
    <Karta>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 }}>
        <Text style={{ color: t.tlumeny, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>
          TELEFONY NA LODI
        </Text>
        <Text
          style={{ color: t.text, fontSize: 13, fontWeight: '700', marginLeft: 'auto' }}>
          {/* „vysílá" a „vysílají", ne „vysílá" + „jí": na simulátoru se
              7. 11. 2026 četlo *„2 ze 3 vysílájí"*. */}
          {`${vysila} ze ${posadka.length} ${vysila === 1 ? 'vysílá' : 'vysílají'}`}
        </Text>
      </View>

      {posadka.map((c, i) => (
        <View
          key={`${c.jmeno ?? 'bez-jmena'}-${i}`}
          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5, gap: 9 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              backgroundColor: c.vysila ? t.stavVypsany : t.vystraha,
            }}
          />
          <Text style={{ color: t.text, fontSize: 14, flex: 1 }}>
            {c.jmeno ?? 'bez jména'}
          </Text>

          {c.vysila ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              {c.ja ? <Text style={{ color: t.tlumeny, fontSize: 12 }}>tvůj</Text> : null}
              {c.baterieProcent !== null ? (
                <>
                  <Baterie procent={c.baterieProcent} t={t} />
                  <Text
                    style={{ color: t.tlumeny, fontSize: 12, fontVariant: ['tabular-nums'] }}>
                    {c.baterieProcent} %
                  </Text>
                </>
              ) : (
                <Text style={{ color: t.tlumeny, fontSize: 12 }}>baterii neříká</Text>
              )}
            </View>
          ) : (
            <Text style={{ color: t.vystraha, fontSize: 12 }}>
              {c.ozvalSeV === null
                ? 'zatím se neozval'
                : `nehlásí se ${predJakDlouho(Date.now() - Date.parse(c.ozvalSeV)).replace('před ', '')}`}
            </Text>
          )}
        </View>
      ))}
    </Karta>
  );
}
