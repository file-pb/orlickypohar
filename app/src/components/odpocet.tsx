import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Pressable } from 'react-native';

import { useDirigent } from '@/lib/dirigent';
import { useTheme } from '@/hooks/use-theme';
import type { Barvy } from '@/constants/theme';
import {
  dusledekUkonu,
  mmss,
  nazevUkonu,
  PROCEDURA_S,
  trvani,
  stavStartu,
  ukonyStartu,
  usekyProcedury,
  zacatekProcedury,
  type RozjizdkaProOdpocet,
  type StavStartu,
  type UkonStartu,
} from '@/lib/start';

/**
 * Panel startu: co se zrovna děje a kolik zbývá.
 *
 * <b>Odměřuje si to telefon sám</b> z vlastních hodin a času startu, který
 * dostal — ne tikáním ze serveru. Na vodě signál vypadne a odpočet je ta
 * jediná věc, která vypadnout nesmí (nález R19; Filip, 27. 10. 2026:
 * *„dokud nebude na připojení, tak si to apka odměří"*).
 *
 * <b>A nesmí uhnout, ani když přijde hovor nebo se přepne jiná appka</b>
 * (Filip, 29. 10. 2026). Proto se čas <b>nepočítá přičítáním</b>, ale
 * pokaždé znovu z hodin: na pozadí `setInterval` stojí, takže čítač by se
 * po návratu opozdil přesně o tu dobu, co appka nebyla vidět — a opozdil
 * by se tím víc, čím delší byl hovor. Takhle je po návratu správný bez
 * ohledu na to, co se mezitím dělo.
 *
 * Návrat z pozadí navíc překreslí hned, ne až s dalším tikem: vteřina
 * čekání na starý údaj je u odpočtu vteřina, kdy obrazovka lže.
 *
 * Pravidla, kdy co platí, jsou v `lib/start.ts` a mají vlastní testy; tahle
 * komponenta je jen kreslí.
 */

/** Jak často se překresluje. Vteřina stačí — odpočet se čte po vteřinách. */
const TIK_MS = 1000;

export function Odpocet({
  rozjizdky,
  delkaProceduryMin,
  naSpusteni,
  naStartu,
  naUkon,
  naCil,
  naOhlaseni,
  chyba,
  nedoslano,
}: {
  rozjizdky: readonly RozjizdkaProOdpocet[];
  delkaProceduryMin?: number;
  /** Čím server poslední úkon odmítl, nebo `null`. */
  chyba?: string | null;
  /**
   * Drží appka úkon, který se ještě nepodařilo odeslat? Panel to musí
   * říct: mlčící fronta vypadá jako hotová věc.
   */
  nedoslano?: boolean;
  /**
   * Co udělat, když rozhodčí spustí proceduru. Chybí-li, tlačítko se
   * neukáže — obrazovku regaty čte i ten, kdo nevelí.
   */
  naSpusteni?: (cislo: number) => void | Promise<void>;
  /**
   * Co udělat ve chvíli, kdy odpočet dojde na nulu — appka to pošle sama.
   * Chybí-li, panel jen ukazuje, že start padl.
   */
  naStartu?: (cislo: number) => void | Promise<void>;
  /**
   * Co udělat, když rozhodčí start odloží nebo odvolá. Chybí-li, volby
   * se neukážou — obrazovku regaty čte i ten, kdo nevelí.
   */
  naUkon?: (cislo: number, ukon: UkonStartu) => void | Promise<void>;
  /**
   * Kam na cíl. Karta se ukáže, jen když rozjížďka doopravdy jede —
   * <b>start a cíl jsou dvě karty pod jménem regaty</b>, ne položky
   * v nabídce (Filip, 29. 10. 2026: *„start i cíl musí být po zapnutí
   * telefonu hned"*). Panel je tím, kdo ví, co je na vodě, takže kartu
   * drží on.
   */
  naCil?: () => void;
  /**
   * Co udělat, když rozhodčí ohlásí další rozjížďku. Chybí-li, nabídka
   * se neukáže — obrazovku regaty čte i ten, kdo nevelí.
   */
  naOhlaseni?: () => void | Promise<void>;
}) {
  const t = useTheme();
  const [ted, setTed] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setTed(Date.now()), TIK_MS);
    // Hovor, přepnutí appky, uspaný displej: `setInterval` mezitím stojí.
    // Při návratu se čas vezme z hodin dřív, než stihne tiknout.
    const posluchac = AppState.addEventListener('change', (stav) => {
      if (stav === 'active') setTed(Date.now());
    });
    return () => {
      clearInterval(id);
      posluchac.remove();
    };
  }, []);

  const delkaS = (delkaProceduryMin ?? PROCEDURA_S / 60) * 60;
  const stav = stavStartu(rozjizdky, ted, delkaS);

  // <b>Dirigent: hlas, klakson a svítící displej.</b> Jen tomu, kdo velí —
  // obrazovku regaty čte i závodník a divák, a těm by telefon začal
  // troubit bez vyzvání. Co a kdy se ozve, je partitura (`lib/hlaseni.ts`);
  // tady se jen pozná, kdo je u toho.
  const veli = Boolean(naSpusteni || naUkon);
  const dirigent = useDirigent(stav, ted, delkaS, veli);

  // <b>Start se neklepe, start padne.</b> Rozhodčí spustil proceduru,
  // odpočet doběhl — tím rozjížďka odstartovala a appka to serveru řekne
  // sama. Dřív tu bylo tlačítko „Jede se" a panel o sobě tvrdil, že čeká
  // na potvrzení startu; Filip (29. 10. 2026): *„no potvrzení startu nevím
  // co je."* Neví to nikdo, protože takový úkon na vodě není — po startu
  // se podle ZPJ 29 odvolává, nepotvrzuje.
  //
  // Posílá to appka, která odpočet drží, protože server sám nic v čase
  // nespouští: `Procedura.StavPo` nechává rozjížďku `Planovana` a bez
  // přechodu na `Probiha` nejede trať, úkony za jízdy ani polohy.
  const ohlaseno = useRef<number | null>(null);
  useEffect(() => {
    if (!naStartu || stav?.druh !== 'odstartovano') return;
    if (ohlaseno.current === stav.cislo) return;
    ohlaseno.current = stav.cislo;
    // Nepovede-li se to, zkusí to další tik — proto se číslo vrátí zpátky.
    Promise.resolve(naStartu(stav.cislo)).catch(() => {
      if (ohlaseno.current === stav.cislo) ohlaseno.current = null;
    });
  }, [naStartu, stav?.druh, stav?.druh === 'odstartovano' ? stav.cislo : null]);

  // <b>Dokud se na startu nic neděje, panel není</b> — ale veliteli se
  // místo něj nabídne ohlášení další rozjížďky. Bez toho by se na vodě
  // k další rozjížďce nedostal: appka uměla proceduru spustit, ale
  // rozjížďku, kterou by spustil, zakládal jen web (Filip, 30. 10. 2026:
  // *„a jak si tam vklepnu novou rozjížďku?"*).
  if (!stav) {
    return naOhlaseni ? <Ohlaseni t={t} naOhlaseni={naOhlaseni} chyba={chyba} /> : null;
  }

  // <b>Rozjížďka bez času startu je nástroj velitele, ne zpráva pro
  // čtenáře.</b> Takhle totiž vypadá i každá regata, které ještě nikdo
  // časy nenastavil — tedy celý ročník dopředu. Čtenář by četl „bez času
  // startu" u závodu, který se jede za půl roku; velitel je ten, kdo
  // s tím něco udělá.
  if (stav.druh === 'bezCasu' && !naSpusteni) return null;

  const panel =
    stav.druh === 'ceka' || stav.druh === 'bezCasu' ? (
      <Ceka stav={stav} delkaS={delkaS} t={t} naSpusteni={naSpusteni} />
    ) : stav.druh === 'jede' ? (
      <Jede stav={stav} t={t} />
    ) : stav.druh === 'odstartovano' ? (
      <Odstartovano stav={stav} t={t} />
    ) : (
      <Bezi stav={stav} delkaS={delkaS} t={t} />
    );

  // <b>Volby hned pod odpočtem</b> (Filip, 29. 10. 2026: *„hned pod
  // odpočet chceme tlačítka rychlých voleb odložení a zrušení"*) — ne
  // schované v nabídce. Na startovní linii se nehledá.
  return (
    <>
      {panel}

      {/* <b>Fronta se nesmí tvářit jako hotovo.</b> Odpočet běží z hodin
          telefonu, takže na obrazovce vypadá všechno v pořádku i tehdy,
          když o startu nikdo jiný neví. */}
      {/* <b>Hlas se dá vypnout, ale musí být vidět, že je zapnutý.</b>
          Rozhodčí si telefon strká do kapsy a potřebuje vědět, jestli
          z ní něco uslyší — a na vodě může chtít ticho, aniž by kvůli
          tomu zavíral obrazovku. */}
      {veli ? (
        <Pressable
          onPress={dirigent.prepni}
          style={({ pressed }) => [s.hlas, { opacity: pressed ? 0.6 : 1 }]}>
          <Text style={[s.hlasText, { color: dirigent.zapnuto ? t.jede : t.tlumeny }]}>
            {dirigent.zapnuto ? 'Hlásí a troubí — vypnout' : 'Mlčí — zapnout hlas'}
          </Text>
        </Pressable>
      ) : null}

      {/* <b>Nerušit se povoluje jednou a pak platí.</b> Nabízí se proto
          rovnou na startovní obrazovce — v nastavení appky by to rozhodčí
          nenašel a hodilo by se mu to právě tady. Klepnutí otevře
          nastavení systému; povolit to za uživatele nesmí nikdo. */}
      {dirigent.klidChybiPovoleni ? (
        <Pressable
          onPress={dirigent.povolKlid}
          style={({ pressed }) => [s.hlas, { opacity: pressed ? 0.6 : 1 }]}>
          <Text style={[s.hlasText, { color: t.vystraha }]}>
            Povolit „Nerušit" na dobu procedury — telefon by teď zazvonil
          </Text>
        </Pressable>
      ) : null}

      {/* Doinstalovat hlas umí jen uživatel v nastavení telefonu, takže
          jediné, co appka může, je říct to dřív, než na to přijde na
          vodě. */}
      {dirigent.bezCestiny ? (
        <Text style={[s.radekPodPanelem, { color: t.vystraha }]}>
          Telefon nemá český hlas — hlášení bude k nepoznání. Doinstaluje se
          v nastavení telefonu (řeč, jazyky).
        </Text>
      ) : null}

      {nedoslano ? (
        <Text style={[s.radekPodPanelem, { color: t.vystraha }]}>
          Zatím neodesláno — odpočet běží z hodin telefonu a zkouším dál.
        </Text>
      ) : null}

      {chyba ? (
        <Text style={[s.radekPodPanelem, { color: t.stavZruseny }]}>{chyba}</Text>
      ) : null}

      {naCil && (stav.druh === 'jede' || stav.druh === 'odstartovano') ? (
        <Pressable
          onPress={naCil}
          style={({ pressed }) => [
            s.cil,
            { borderColor: t.jede, backgroundColor: t.papir, opacity: pressed ? 0.6 : 1 },
          ]}>
          <Text style={[s.cilText, { color: t.jede }]}>Cíl — zapisovat dojezdy</Text>
        </Pressable>
      ) : null}

      {naUkon ? <Zastaveni stav={stav} t={t} naUkon={naUkon} /> : null}
    </>
  );
}

/**
 * Nabídka, která stojí na místě panelu, dokud není co odpočítávat.
 *
 * <b>„Ohlásit", ne „zahájit"</b> (Filip, 29. 10. 2026): zahájení zní,
 * jako by se tím startovalo. Ohlášení je to, co rozhodčí doopravdy dělá
 * — řekne, že se pojede další, a teprve pak se spustí procedura. Proto
 * jsou to dvě klepnutí, a mezi nimi je chvíle na rozhlédnutí po poli.
 */
function Ohlaseni({
  t,
  naOhlaseni,
  chyba,
}: {
  t: Barvy;
  naOhlaseni: () => void | Promise<void>;
  chyba?: string | null;
}) {
  const [ohlasuje, setOhlasuje] = useState(false);

  return (
    <View style={[s.panel, { backgroundColor: t.zvyrazneni, borderColor: t.linka, borderWidth: 1 }]}>
      <Text style={[s.radek, { color: t.tlumeny }]}>Žádná rozjížďka nečeká</Text>
      <Text style={[s.vetaVelka, { color: t.text }]}>Pojede se další?</Text>
      <Text style={[s.pripominka, { color: t.tlumeny }]}>
        Ohlášením se rozjížďka jen založí. Čas startu padne až na konci
        procedury, kterou spustíš potom.
      </Text>

      <Pressable
        onPress={async () => {
          if (ohlasuje) return;
          setOhlasuje(true);
          try {
            await naOhlaseni();
          } finally {
            setOhlasuje(false);
          }
        }}
        style={({ pressed }) => [
          s.spustit,
          { backgroundColor: t.voda, opacity: pressed || ohlasuje ? 0.6 : 1 },
        ]}>
        {ohlasuje ? (
          <ActivityIndicator color={t.papir} />
        ) : (
          <Text style={[s.spustitText, { color: t.papir }]}>Ohlásit rozjížďku</Text>
        )}
      </Pressable>

      {/* <b>Tohle jediné z úkonů startu se nedá podržet ve frontě.</b>
          Číslo rozjížďky určuje server, takže bez odpovědi není co
          očíslovat — a rozhodčí to musí poznat hned, ne až tím, že
          odpočet nikdy nezačne. */}
      {chyba ? (
        <Text style={[s.pripominka, { color: t.stavZruseny }]}>{chyba}</Text>
      ) : null}
    </View>
  );
}

/**
 * Čím se běžící start zastaví.
 *
 * <b>Potvrzení, ne přímé klepnutí</b> (Filip, 28. 10. 2026 o nevratných
 * úkonech: *„dej to nějak, aby se do toho nahodou nekleplo a dej tam
 * potvrzení offcanvas nebo modal."*) — odvolání startu vrací celé
 * soutěžní pole na začátek procedury a omylem se to stát nesmí.
 */
function Zastaveni({
  stav,
  t,
  naUkon,
}: {
  stav: StavStartu;
  t: Barvy;
  naUkon: (cislo: number, ukon: UkonStartu) => void | Promise<void>;
}) {
  const [potvrzuje, setPotvrzuje] = useState<UkonStartu | null>(null);
  const [posila, setPosila] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const ukony = ukonyStartu(stav);
  if (ukony.length === 0) return null;

  const posli = async (ukon: UkonStartu) => {
    if (posila) return;
    setPosila(true);
    setChyba(null);
    try {
      await naUkon(stav.cislo, ukon);
      setPotvrzuje(null);
    } catch {
      setChyba('Nepovedlo se odeslat. Zkus to prosím znovu.');
    } finally {
      setPosila(false);
    }
  };

  return (
    <View style={s.volby}>
      {ukony.map((u) => (
        <Pressable
          key={u}
          onPress={() => setPotvrzuje(u)}
          style={({ pressed }) => [
            s.volba,
            { borderColor: t.linka, backgroundColor: t.papir, opacity: pressed ? 0.6 : 1 },
          ]}>
          <Text style={[s.volbaText, { color: t.text }]}>{nazevUkonu(u)}</Text>
        </Pressable>
      ))}

      <Modal
        visible={potvrzuje !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPotvrzuje(null)}>
        <View style={s.stin}>
          <View style={[s.dialog, { backgroundColor: t.papir }]}>
            <Text style={[s.dialogNadpis, { color: t.text }]}>
              {potvrzuje ? nazevUkonu(potvrzuje) : ''} — rozjížďka {stav.cislo}
            </Text>
            <Text style={[s.dialogVeta, { color: t.tlumeny }]}>
              {potvrzuje ? dusledekUkonu(potvrzuje) : ''}
            </Text>
            {chyba ? <Text style={[s.dialogVeta, { color: t.vystraha }]}>{chyba}</Text> : null}

            <View style={s.dialogTlacitka}>
              <Pressable
                onPress={() => setPotvrzuje(null)}
                disabled={posila}
                style={({ pressed }) => [s.volba, { borderColor: t.linka, opacity: pressed ? 0.6 : 1 }]}>
                <Text style={[s.volbaText, { color: t.text }]}>Zpátky</Text>
              </Pressable>
              <Pressable
                onPress={() => potvrzuje && posli(potvrzuje)}
                disabled={posila}
                style={({ pressed }) => [
                  s.volba,
                  s.volbaHlavni,
                  { backgroundColor: t.vystraha, opacity: pressed || posila ? 0.6 : 1 },
                ]}>
                <View style={s.spustitObsah}>
                  {posila ? <ActivityIndicator color="#ffffff" /> : null}
                  <Text style={[s.volbaText, s.naBarve]}>{posila ? 'Posílám…' : 'Provést'}</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/**
 * Čeká se. Žádný odpočet — nemá co odpočítávat. Dva důvody, jeden panel:
 * <ul>
 *   <li>čas startu je nastavený a procedura ještě nezačala — ukáže se,
 *       kdy začne;</li>
 *   <li>čas startu žádný není, což je stav po odložení (ZPJ 27.3) —
 *       ukáže se, že se na něj čeká.</li>
 * </ul>
 *
 * <b>Tlačítko je v obou případech totéž, protože i úkon je tentýž:</b>
 * spustit proceduru. Tím se po odložení volí nový čas — pravidlo ho
 * nedopočítává, takže ho určuje chvíle, kdy startér zmáčkne.
 */
function Ceka({
  stav,
  delkaS,
  t,
  naSpusteni,
}: {
  stav: Extract<StavStartu, { druh: 'ceka' | 'bezCasu' }>;
  delkaS: number;
  t: Barvy;
  naSpusteni?: (cislo: number) => void | Promise<void>;
}) {
  const [spousti, setSpousti] = useState(false);

  return (
    <View style={[s.panel, { backgroundColor: t.zvyrazneni, borderColor: t.linka, borderWidth: 1 }]}>
      <Text style={[s.radek, { color: t.tlumeny }]}>Rozjížďka {stav.cislo}</Text>
      <Text style={[s.vetaVelka, { color: t.text }]}>
        {stav.druh === 'bezCasu'
          ? 'Bez času startu'
          : `Procedura začne ve ${zacatekProcedury(stav.startV, delkaS)}`}
      </Text>

      {/* Po odložení musí být z obrazovky poznat, odkud se vezme nový
          čas — jinak rozhodčí hledá, kde se zadává, a zadat se nikde
          nedá: vezme se z chvíle, kdy zmáčkne. */}
      {stav.druh === 'bezCasu' ? (
        <Text style={[s.pripominka, { color: t.tlumeny }]}>
          Nový čas se nedopočítává (ZPJ 27.3) — start padne na konci procedury,
          tedy {delkaS / 60} min po spuštění.
        </Text>
      ) : null}

      {naSpusteni ? (
        <>
          {/* <b>Stisk musí být vidět a čekání taky.</b> Bez toho tlačítko
              „vypadalo jako nefunkční" (Filip na telefonu, 29. 10. 2026):
              po klepnutí se chvíli nic neděje, protože se čeká na server,
              a rozhodčí to zmáčkne podruhé. */}
          <Pressable
            onPress={async () => {
              if (spousti) return;
              setSpousti(true);
              try {
                await naSpusteni(stav.cislo);
              } finally {
                setSpousti(false);
              }
            }}
            disabled={spousti}
            style={({ pressed }) => [
              s.spustit,
              { backgroundColor: t.procedura, opacity: pressed || spousti ? 0.6 : 1 },
            ]}>
            <View style={s.spustitObsah}>
              {spousti ? <ActivityIndicator color="#ffffff" /> : null}
              <Text style={s.spustitText}>
                {spousti ? 'Spouštím…' : 'Spustit startovní proceduru'}
              </Text>
            </View>
          </Pressable>

          {/* Jediná pojistka, kterou appka sama nezařídí: hovor přeruší
              hlášení a iOS to neobejde. Připomíná se tady, protože tohle
              je poslední klidná chvíle před procedurou. */}
          <Text style={[s.pripominka, { color: t.vystraha }]}>
            Zapni si Nerušit — hovor přeruší hlášení.
          </Text>
        </>
      ) : null}
    </View>
  );
}

/**
 * Odpočet doběhl: start padl a běží čas rozjížďky.
 *
 * <b>Panel nesmí zmizet.</b> Změřeno 29. 10. 2026 na telefonu: po startu
 * se obrazovka vyprázdnila a rozhodčí neměl co zmáčknout. Miloš to přitom
 * řekl rovnou (nahrávka 21): *„pokud ty dlaždice nevyužiju, tak by se měla
 * objevit kolonka start nebo odstartováno."*
 *
 * <b>Nic se tu neklepe.</b> Panel drží jen tu chvíli, než server potvrdí
 * přechod rozjížďky na „probíhá"; pak ji vystřídá `Jede`.
 */
function Odstartovano({
  stav,
  t,
}: {
  stav: Extract<StavStartu, { druh: 'odstartovano' }>;
  t: Barvy;
}) {
  return (
    <View style={[s.panel, { backgroundColor: t.jede }]}>
      <Text style={[s.radek, s.naBarve]}>Rozjížďka {stav.cislo} — start padl</Text>
      <View style={s.casRadek}>
        <Text style={[s.casVelky, s.naBarve]}>{mmss(stav.odStartuS)}</Text>
        <Text style={[s.doStartu, s.naBarveTlumene]}>od startu</Text>
      </View>
    </View>
  );
}

/** Po startu: počítá se nahoru a panel zeslábne — už se nic nehlídá. */
function Jede({ stav, t }: { stav: Extract<StavStartu, { druh: 'jede' }>; t: Barvy }) {
  return (
    <View style={[s.panel, s.jede, { backgroundColor: t.papir, borderColor: t.jede }]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.radek, { color: t.jede, fontWeight: '700' }]}>
          Rozjížďka {stav.cislo} jede
        </Text>
      </View>
      <Text style={[s.casStredni, { color: t.text }]}>{trvani(stav.odStartuS)}</Text>
    </View>
  );
}

/**
 * Odpočet. V poslední minutě mění panel barvu na jantarovou — je to stav,
 * ve kterém se nejvíc chybuje, a pozná se tak i koutkem oka. Červená je
 * v appce vyhrazená zrušení rozjížďky, tedy jediné nevratné věci.
 */
/**
 * Posledních deset vteřin. Tady už se nečte čas, jen se čeká na výstřel —
 * a panel to dává najevo tepem, ne další barvou. Barev je v appce tak
 * akorát a další odstín by se pletl; pohyb zahlédne oko i tehdy, když
 * se rozhodčí dívá na vodu.
 */
const TEP_OD_S = 10;

function Bezi({
  stav,
  delkaS,
  t,
}: {
  stav: Extract<StavStartu, { druh: 'procedura' }>;
  delkaS: number;
  t: Barvy;
}) {
  const useky = usekyProcedury(stav.doStartuS, delkaS);
  const minuta = stav.doStartuS <= 60;
  const pozadi = minuta ? t.vystraha : t.procedura;
  const tep = useRef(new Animated.Value(1)).current;
  const tepe = stav.doStartuS <= TEP_OD_S;

  useEffect(() => {
    if (!tepe) {
      tep.setValue(1);
      return;
    }
    // Jedna vteřina na tep: sedne si to na odpočet, takže puls a číslo
    // jdou spolu, ne proti sobě.
    const smycka = Animated.loop(
      Animated.sequence([
        Animated.timing(tep, { toValue: 0.72, duration: 500, useNativeDriver: true }),
        Animated.timing(tep, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    smycka.start();
    return () => smycka.stop();
  }, [tepe, tep]);

  return (
    <Animated.View style={[s.panel, { backgroundColor: pozadi, opacity: tep }]}>
      <View style={s.hlava}>
        <Text style={[s.radek, s.naBarve]}>
          Rozjížďka {stav.cislo} {minuta ? '— poslední minuta' : 'startuje'}
        </Text>
      </View>

      <View style={s.casRadek}>
        <Text style={[s.casVelky, s.naBarve]}>{mmss(stav.doStartuS)}</Text>
        <Text style={[s.doStartu, s.naBarveTlumene]}>do startu</Text>
      </View>

      <View style={s.useky}>
        {useky.map((u) => (
          <View key={u.faze} style={{ flex: u.delkaS }}>
            <View style={[s.zlab, u.faze === 'minuta' && minuta ? s.zlabMinuta : null]}>
              <View
                style={{
                  width: `${Math.round(u.hotovo * 100)}%`,
                  height: '100%',
                  borderRadius: 3,
                  backgroundColor:
                    u.faze === 'vyzva'
                      ? t.vyzvaZnameni
                      : u.faze === 'priprava'
                        ? t.pripravaZnameni
                        : t.minutaZnameni,
                }}
              />
            </View>
            <Text style={[s.popisekUseku, s.naBarveTlumene]}>
              {u.faze === 'vyzva' ? 'výzva' : u.faze === 'priprava' ? 'příprava' : 'minuta'}
            </Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  panel: { borderRadius: 14, padding: 16, marginBottom: 16 },

  // Volby sedí hned pod panelem — proto se záporným okrajem vracejí
  // zpátky k němu a odstup drží až pod sebou.
  volby: { flexDirection: 'row', gap: 8, marginTop: -8, marginBottom: 16 },
  cil: { borderWidth: 2, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: -8, marginBottom: 16 },
  cilText: { fontSize: 16, fontWeight: '700' },
  radekPodPanelem: { fontSize: 13, fontWeight: '600', marginTop: -8, marginBottom: 12, lineHeight: 18 },

  // Přepínač hlasu je řádek, ne tlačítko: mačká se jednou za den, kdežto
  // volby pod ním rozhodují o startu a musí být větší terč.
  hlas: { alignSelf: 'flex-start', paddingVertical: 6, marginTop: -8, marginBottom: 10 },
  hlasText: { fontSize: 13, fontWeight: '700' },
  volba: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  volbaHlavni: { borderColor: 'transparent' },
  volbaText: { fontWeight: '700', fontSize: 15 },

  stin: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: { borderRadius: 14, padding: 20, gap: 12 },
  dialogNadpis: { fontSize: 18, fontWeight: '800' },
  dialogVeta: { fontSize: 15, lineHeight: 21 },
  dialogTlacitka: { flexDirection: 'row', gap: 8, marginTop: 4 },
  jede: { borderWidth: 2, flexDirection: 'row', alignItems: 'center', gap: 12 },
  hlava: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  radek: { fontSize: 14, fontWeight: '600' },
  vetaVelka: { fontSize: 19, fontWeight: '700', marginTop: 3, lineHeight: 24 },
  casRadek: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 2 },
  // `fontVariant` drží číslice stejně široké, aby odpočet neposkakoval.
  casVelky: { fontSize: 60, fontWeight: '700', lineHeight: 64, fontVariant: ['tabular-nums'] },
  casStredni: { fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'] },
  doStartu: { fontSize: 15 },
  naBarve: { color: '#ffffff' },
  naBarveTlumene: { color: 'rgba(255,255,255,0.85)' },
  useky: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, marginTop: 12 },
  zlab: { height: 7, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },

  // <b>Poslední minuta se pozná tvarem, ne barvou.</b> Filip chtěl na ní
  // červenou (29. 10. 2026) a lososová, která z toho vyšla, mu neseděla
  // — *„lososová nic moc ale tepání je fajn."* Měřeno na jantarovém
  // panelu `#8a5000`: žádná červená se nedostane nad 2.33:1, a grafický
  // prvek chce podle WCAG 3:1. Místo odstínu, který nejde, proto roste
  // výška — a hraje to s tím, co se povedlo: tep si taky všimne oko
  // koutkem, když se rozhodčí dívá na vodu.
  zlabMinuta: { height: 14, borderRadius: 5 },
  popisekUseku: { fontSize: 9, marginTop: 3 },
  spustit: { marginTop: 14, minHeight: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  spustitObsah: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spustitText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  pripominka: { fontSize: 12, marginTop: 8, lineHeight: 16 },
});
