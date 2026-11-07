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
import { dalsiTroubeni, kolikPreskocit } from '@/lib/hlaseni';
import { posunStartUkazky, ukazkaBezi } from '@/lib/ukazka';
import { barvaNaVyplni, pismoNaVyplni, sPruhlednosti } from '@/lib/kontrast';
import { useTheme } from '@/hooks/use-theme';
import type { Barvy } from '@/constants/theme';
import {
  dusledekUkonu,
  mmss,
  nazevUkonu,
  PROCEDURA_S,
  kolikDoStartu,
  trvani,
  stavStartu,
  ukonyStartu,
  usekyProcedury,
  casStartu,
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
  naPredcasnyStart,
  naTrest,
  naZruseni,
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
  /**
   * Předčasný start (OCS). Chybí-li, dlaždice se neukáže — stejně jako
   * u ostatních úkonů ji vidí jen ten, kdo velí.
   */
  naPredcasnyStart?: (cislo: number) => void;
  /**
   * Otáčkový trest (ZPJ 44.2). Chybí-li, dlaždice se neukážou.
   */
  naTrest?: (cislo: number, druh: 'Otacka360' | 'Otacka720') => void;
  /** Zrušení rozjížďky s důvodem (ZPJ 32.1). */
  naZruseni?: (cislo: number) => void;
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

  // <b>Zkratka jen pro ukázku</b> (Filip, 7. 11. 2026): dlouhé čekání se
  // dá přeskočit, aby se simulace dala ladit rychleji. Mimo ukázku se
  // nenabízí vůbec — u vody se nepřeskakuje nic.
  const vUkazce = ukazkaBezi();
  const doStartu = kolikDoStartu(stav, ted);
  const preskocitO =
    vUkazce && doStartu !== null ? kolikPreskocit(doStartu, delkaS) : null;
  // <b>Hrana, ne hodnota.</b> `preskocitO` se každou vteřinu zmenší,
  // takže klíč z něj je pokaždé jiný: „ne" platilo jedinou vteřinu
  // a bublina se hned vracela. Klíč je proto <b>nejbližší troubení</b>,
  // které se během čekání nemění — jednou na hranu, jak to stojí
  // v návrhu. Současně to zaručuje, že se zeptá u každé hrany, kde se
  // čeká dýl než dvě minuty: před procedurou i mezi přípravným
  // znamením a poslední minutou (Filip, 7. 11. 2026: *„čtyři minuty do
  // startu taky"*).
  const hrana = vUkazce && doStartu !== null ? dalsiTroubeni(doStartu, delkaS) : null;
  const [nabidnuto, setNabidnuto] = useState<number | null>(null);
  const ptatSe = preskocitO !== null && hrana !== null && nabidnuto !== hrana;

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

      {/* <b>Úkony jsou po ruce od chvíle, kdy je nastavený čas startu</b>
          (Filip, 7. 11. 2026, podle návrhu: *„po kliknutí na ukázkový
          režim má nastat toto"*). Rozhodčí je vidí pohromadě, ne až
          v tu fázi, kdy na ně dojde — na startovní lodi se nehledá.
          Co v dané chvíli nejde, je ztlumené, ne schované. */}
      {stav.druh !== 'bezCasu' && (naUkon || naPredcasnyStart || naZruseni) ? (
        <UkonyNaStartu
          stav={stav}
          t={t}
          naUkon={naUkon}
          naPredcasnyStart={naPredcasnyStart}
          naZruseni={naZruseni}
        />
      ) : null}

      {/* <b>Tresty jsou dostupné celou rozjížďku</b>, ne jako krok
          (Miloš, nahrávka 23: dlaždice se má *„průběžně posouvat"*).
          Dotek bóje i dotek s lodí se stane kdykoliv mezi startem
          a cílem. */}
      {naTrest && stav.druh !== 'bezCasu' ? (
        <>
          <Text style={[s.skupina, { color: t.tlumeny }]}>ZA JÍZDY</Text>
          <View style={s.mrizka}>
            <Dlazdice
              t={t}
              nadpis="360°"
              popis="dotek bóje · ZPJ 31"
              velke
              onPress={() => naTrest(stav.cislo, 'Otacka360')}
            />
            <Dlazdice
              t={t}
              nadpis="720°"
              popis="dotek s lodí · ZPJ 44.1"
              velke
              onPress={() => naTrest(stav.cislo, 'Otacka720')}
            />
          </View>
        </>
      ) : null}


      {/* <b>Bublina je ladicí zkratka, ne vlastnost startu.</b> Ukáže se
          jen v ukázce, a u každého čekání, kde se dá ušetřit víc než
          dvacet vteřin — před procedurou, mezi výzvou a přípravou,
          v přípravě i v poslední minutě. Po „ano" se posune
          čas startu, ne odpočet: tím projde celá partitura stejně jako
          u vody, jen bez čekání. */}
      <Modal visible={ptatSe} transparent animationType="fade">
        <View style={s.bublinaStin}>
          <View style={[s.bublina, { backgroundColor: t.papir, borderColor: t.linka }]}>
            <Text style={[s.bublinaNadpis, { color: t.text }]}>Přeskočit čekání?</Text>
            <Text style={[s.bublinaText, { color: t.tlumeny }]}>
              Do dalšího znamení zbývá{' '}
              {trvani(doStartu !== null && hrana !== null ? doStartu - hrana : 0)}. V ukázce se
              dá skočit patnáct vteřin před něj, aby stihlo začít hlášení.
            </Text>
            <View style={s.bublinaVolby}>
              <Pressable
                onPress={() => setNabidnuto(hrana)}
                style={({ pressed }) => [s.bublinaVolba, { opacity: pressed ? 0.6 : 1 }]}>
                <Text style={[s.bublinaVolbaText, { color: t.tlumeny }]}>Ne, jeď normálně</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (preskocitO !== null) posunStartUkazky(preskocitO);
                  setNabidnuto(hrana);
                }}
                style={({ pressed }) => [s.bublinaVolba, { opacity: pressed ? 0.6 : 1 }]}>
                <Text style={[s.bublinaVolbaText, { color: t.voda }]}>Ano, přeskoč</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
          <ActivityIndicator color={pismoNaVyplni(t, t.voda)} />
        ) : (
          <Text style={[s.spustitText, { color: pismoNaVyplni(t, t.voda) }]}>
            Ohlásit rozjížďku
          </Text>
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
/**
 * Jedna dlaždice úkonu. <b>Dvě velikosti písma, ne tři</b>: název a pod
 * ním věta, čím to je — stejně jako v návrhu. Vypnutá dlaždice se
 * ztlumí, ale zůstane: rozhodčí má vidět, co existuje, i když to zrovna
 * nejde.
 */
function Dlazdice({
  t,
  nadpis,
  popis,
  onPress,
  vypnuto,
  varovne,
  velke,
}: {
  t: Barvy;
  nadpis: string;
  popis?: string;
  onPress?: () => void;
  vypnuto?: boolean;
  /** Nevratný úkon — červený okraj i písmo. */
  varovne?: boolean;
  /** Velké číslo místo názvu (360°, 720°). */
  velke?: boolean;
}) {
  const barva = vypnuto ? t.tlumeny : varovne ? t.stavZruseny : t.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={vypnuto || !onPress}
      style={({ pressed }) => [
        s.dlazdice,
        {
          borderColor: varovne && !vypnuto ? t.stavZruseny : t.linka,
          backgroundColor: t.papir,
          opacity: pressed && !vypnuto ? 0.6 : vypnuto ? 0.55 : 1,
        },
      ]}>
      <Text style={[velke ? s.dlazdiceCislo : s.dlazdiceNadpis, { color: barva }]}>{nadpis}</Text>
      {popis ? <Text style={[s.dlazdicePopis, { color: t.tlumeny }]}>{popis}</Text> : null}
    </Pressable>
  );
}

/** Čím je ten úkon na dlaždici — druhý řádek, jako v návrhu. */
function popisUkonu(ukon: UkonStartu): string {
  return ukon === 'Odlozit'
    ? 'vlajka AP · zeptá se na nový čas'
    : 'ZPJ 29.2 · přidá minutu a jede znovu';
}

function UkonyNaStartu({
  stav,
  t,
  naUkon,
  naPredcasnyStart,
  naZruseni,
}: {
  stav: StavStartu;
  t: Barvy;
  naUkon?: (cislo: number, ukon: UkonStartu) => void | Promise<void>;
  naPredcasnyStart?: (cislo: number) => void;
  naZruseni?: (cislo: number) => void;
}) {
  const [potvrzuje, setPotvrzuje] = useState<UkonStartu | null>(null);
  const [posila, setPosila] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  // <b>Ukážou se oba, nejde vždycky oba.</b> Odklad patří před start,
  // všeobecné odvolání po něm (ZPJ 29.2) — `ukonyStartu` proto vrací
  // jen ten, který v téhle fázi platí. Návrh je ale kreslí vedle sebe,
  // a to je lepší: rozhodčí vidí, co vůbec existuje. Ten druhý je
  // ztlumený, ne schovaný.
  const lze = ukonyStartu(stav);

  const posli = async (ukon: UkonStartu) => {
    if (posila || !naUkon) return;
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

  const ukonDlazdice = (u: UkonStartu) => (
    <Dlazdice
      key={u}
      t={t}
      nadpis={nazevUkonu(u)}
      popis={popisUkonu(u)}
      vypnuto={!naUkon || !lze.includes(u)}
      onPress={() => setPotvrzuje(u)}
    />
  );

  return (
    <>
      <Text style={[s.skupina, { color: t.tlumeny }]}>NA STARTU</Text>
      <View style={s.mrizka}>
        {ukonDlazdice('Odlozit')}
        <Dlazdice
          t={t}
          nadpis="OCS"
          popis="předčasný start · vybereš loď"
          vypnuto={!naPredcasnyStart}
          onPress={() => naPredcasnyStart?.(stav.cislo)}
        />
        {ukonDlazdice('Odvolat')}
        <Dlazdice
          t={t}
          nadpis="Zrušit rozjížďku"
          popis="řekne se důvod"
          varovne
          vypnuto={!naZruseni}
          onPress={() => naZruseni?.(stav.cislo)}
        />
      </View>

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
                  {posila ? <ActivityIndicator color={pismoNaVyplni(t, t.vystraha)} /> : null}
                  <Text style={[s.volbaText, { color: pismoNaVyplni(t, t.vystraha) }]}>
                    {posila ? 'Posílám…' : 'Provést'}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
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

      {/* <b>Čas startu a to, že se o odpočet nikdo nemusí starat</b> —
          oboje kreslí návrh (`Ceka.dc.html`) a oboje chybělo. Rozhodčí
          se podle hodiny domlouvá s ostatními; bez té věty o odpočtu
          navíc nevidí, jestli se má k panelu ještě vracet. */}
      {stav.druh === 'ceka' ? (
        <Text style={[s.pripominka, { color: t.tlumeny }]}>
          start ve {casStartu(stav.startV)} · odpočet naskočí sám
        </Text>
      ) : null}

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
              {spousti ? <ActivityIndicator color={pismoNaVyplni(t, t.procedura)} /> : null}
              <Text style={[s.spustitText, { color: pismoNaVyplni(t, t.procedura) }]}>
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
  // Bílá tu byla napevno a v tmavé sadě dávala 2,07:1 — `jede` je tam
  // světlá zelená. Písmo se proto bere podle výplně (`lib/kontrast.ts`).
  const pismo = pismoNaVyplni(t, t.jede);
  return (
    <View style={[s.panel, { backgroundColor: t.jede }]}>
      <Text style={[s.radek, { color: pismo }]}>Rozjížďka {stav.cislo} — start padl</Text>
      <View style={s.casRadek}>
        <Text style={[s.casVelky, { color: pismo }]}>{mmss(stav.odStartuS)}</Text>
        <Text style={[s.doStartu, s.tlumeneNaVyplni, { color: pismo }]}>od startu</Text>
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
  // Dvě různé výplně, a v tmavé sadě chce každá opačné písmo: `procedura`
  // je tmavá modrá, `vystraha` světlý jantar (na něm bílá 2,75:1).
  const pismo = pismoNaVyplni(t, pozadi);
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
        <Text style={[s.radek, { color: pismo }]}>
          Rozjížďka {stav.cislo} {minuta ? '— poslední minuta' : 'startuje'}
        </Text>
        {/* Návrh (`Main.dc.html`) má hodinu startu v pravém rohu panelu.
            Odpočet říká za jak dlouho, tohle na kolik — a to druhé je
            to, co rozhodčí říká do megafonu. */}
        <Text style={[s.radek, s.tlumeneNaVyplni, { color: pismo }]}>
          start {casStartu(stav.startV)}
        </Text>
      </View>

      <View style={s.casRadek}>
        <Text style={[s.casVelky, { color: pismo }]}>{mmss(stav.doStartuS)}</Text>
        <Text style={[s.doStartu, s.tlumeneNaVyplni, { color: pismo }]}>do startu</Text>
      </View>

      <View style={s.useky}>
        {useky.map((u) => (
          <View key={u.faze} style={{ flex: u.delkaS }}>
            <View
              style={[
                s.zlab,
                { backgroundColor: sPruhlednosti(pismo, 0.3) },
                u.faze === 'minuta' && minuta ? s.zlabMinuta : null,
              ]}>
              <View
                style={{
                  width: `${Math.round(u.hotovo * 100)}%`,
                  height: '100%',
                  borderRadius: 3,
                  // Barvy znamení zůstávají, dokud je plocha pod nimi
                  // unese. Na jantaru poslední minuty v tmavé sadě by
                  // zmizely (2,75:1 a 1,64:1 proti mezi 3:1), takže tam
                  // ustoupí písmu panelu — pevná barva pro obě plochy
                  // neexistuje, viz `lib/kontrast.ts`.
                  backgroundColor: barvaNaVyplni(
                    t,
                    pozadi,
                    u.faze === 'vyzva'
                      ? t.vyzvaZnameni
                      : u.faze === 'priprava'
                        ? t.pripravaZnameni
                        : t.minutaZnameni,
                  ),
                }}
              />
            </View>
            <Text style={[s.popisekUseku, s.tlumeneNaVyplni, { color: pismo }]}>
              {u.faze === 'vyzva' ? 'výzva' : u.faze === 'priprava' ? 'příprava' : 'minuta'}
            </Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  skupina: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginTop: 18, marginBottom: 8 },
  mrizka: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  // Dvě na řádek; 80 pt je tolik, aby se na lodi netrefilo vedle.
  dlazdice: { flexGrow: 1, flexBasis: '46%', minHeight: 80, borderWidth: 1, borderRadius: 14, padding: 12, justifyContent: 'center' },
  dlazdiceNadpis: { fontSize: 16, fontWeight: '700' },
  dlazdiceCislo: { fontSize: 20, fontWeight: '800' },
  dlazdicePopis: { fontSize: 11, marginTop: 3, lineHeight: 15 },
  bublinaStin: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  bublina: { borderWidth: 1, borderRadius: 16, padding: 20, maxWidth: 340 },
  bublinaNadpis: { fontSize: 18, fontWeight: '800' },
  bublinaText: { fontSize: 15, lineHeight: 21, marginTop: 6 },
  bublinaVolby: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  bublinaVolba: { minHeight: 44, minWidth: 44, paddingHorizontal: 12, justifyContent: 'center' },
  bublinaVolbaText: { fontSize: 16, fontWeight: '700' },
  tresty: { flexDirection: 'row', gap: 10, marginTop: 10 },
  // Dlaždice, ne řádek: na vodě se do nich klepe palcem a 80 pt je
  // tolik, aby se netrefil vedle.
  trest: { flex: 1, minHeight: 80, borderWidth: 1, borderRadius: 14, padding: 12, justifyContent: 'center' },
  trestCislo: { fontSize: 20, fontWeight: '800' },
  trestPopis: { fontSize: 11, marginTop: 3, lineHeight: 15 },
  panel: { borderRadius: 14, padding: 16, marginBottom: 16 },

  // Volby sedí hned pod panelem — proto se záporným okrajem vracejí
  // zpátky k němu a odstup drží až pod sebou.
  volby: { flexDirection: 'row', gap: 8, marginTop: -8, marginBottom: 16 },
  cil: { borderWidth: 2, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: -8, marginBottom: 16 },
  cilText: { fontSize: 16, fontWeight: '700' },
  radekPodPanelem: { fontSize: 13, fontWeight: '600', marginTop: -8, marginBottom: 12, lineHeight: 18 },

  // Přepínač hlasu je řádek, ne tlačítko: mačká se jednou za den, kdežto
  // volby pod ním rozhodují o startu a musí být větší terč.
  hlas: { alignSelf: 'flex-start', paddingVertical: 12, marginTop: -14, marginBottom: 4 },
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
  // Tlumená varianta se dělá průhledností, ne druhou barvou: jinak by
  // k výběru písma podle výplně musel existovat i výběr jeho zeslabení.
  tlumeneNaVyplni: { opacity: 0.85 },
  useky: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, marginTop: 12 },
  // Barvu žlábku dosazuje komponenta: bílá napevno byla na jantarovém
  // panelu v tmavé sadě k nerozeznání od plochy.
  zlab: { height: 7, borderRadius: 3, overflow: 'hidden' },

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
  spustitText: { fontSize: 17, fontWeight: '700' },
  pripominka: { fontSize: 12, marginTop: 8, lineHeight: 16 },
});
