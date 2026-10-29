import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Barvy } from '@/constants/theme';
import { Chyba, Nacitani, Nadpis, Prazdno } from '@/components/ui';
import { useData } from '@/hooks/use-data';
import { useTheme } from '@/hooks/use-theme';
import {
  nactiCilZTrasovani,
  nactiZapis,
  nactiZavod,
  ukonciRozjizdku,
  ulozVysledky,
  OdmitnutoServerem,
  type ZapisLod,
  type ZapisRozjizdky,
} from '@/lib/api';
import {
  klepni,
  nactiRozepsany,
  navrhyKZobrazeni,
  odeber,
  prehod,
  plula,
  prepisCas,
  presnejsiCas,
  radky,
  radkyPriUkonceni,
  ulozRozepsany,
  vratPosledni,
  zbyva,
  zeZapisu,
  type LodVCili,
  type Misto,
  type PrujezdZTrasovani,
} from '@/lib/cil';
import { odStartu, stavStartu, trvani, PROCEDURA_S } from '@/lib/start';

/**
 * Cílová obrazovka: klepání na lodě, jak projíždějí cílem.
 *
 * <b>Rozhodčí sem nemá proklikávat</b> (Filip, 29. 10. 2026: *„start i cíl
 * musí být po zapnutí telefonu hned"*). Proto se rozjížďka nevybírá —
 * obrazovka si najde tu, která je na vodě. Jiná u cíle stejně není.
 *
 * <b>Ukončuje rozhodčí, ne hodiny.</b> Tlačítko *Ukončit rozjížďku* je tu
 * vždycky a zbylým lodím zapíše DNF; appka sama neukončí nic, ani když
 * mají dojezd všichni — jen nabídne. Časový limit podle ZPJ 35 se
 * nehlídá: plachetní směrnice poháru žádný nevypisuje.
 *
 * Pravidla pořadí (čas patří místu, ne lodi; pořadí průběžně přes
 * kategorie) jsou v `lib/cil.ts` a mají vlastní testy. Tahle obrazovka je
 * kreslí a stará se o ukládání.
 */

/** Jak často se překresluje čas jízdy. */
const TIK_MS = 1000;

/** Po jaké prodlevě od posledního klepnutí se ukládá. */
const ULOZIT_PO_MS = 400;

/** Za jak dlouho se zkouší uložení, které nedoletělo. */
const ZKUSIT_ZNOVU_MS = 8000;

/**
 * Jak často se obrazovka ptá trasování, co vidí u cíle.
 *
 * Deset vteřin. Návrh je k užitku jen ve chvíli, kdy loď projíždí, a
 * častější dotazy by stály baterii, která musí vydržet závodní den.
 */
const NAVRHY_MS = 10_000;

/** Jak často se překresluje stáří návrhů. */
const STARI_MS = 5000;

/**
 * Kolikrát po sobě se smí sada uložit přes konflikt.
 *
 * Konflikt znamená, že zápis mezitím změnil někdo jiný. Jednou dvakrát
 * je to souběh a vyhraje ten, kdo je u vody; když se to opakuje, zapisují
 * dva najednou a přepisovat by znamenalo mazat cizí opravy donekonečna.
 */
const KONFLIKTU_NEJVIC = 3;

type Ukladani = 'ulozeno' | 'ukladam' | 'ceka' | 'konflikt';

export default function CilovaObrazovka() {
  const { slug, zavod } = useLocalSearchParams<{ slug: string; zavod: string }>();
  const t = useTheme();

  const { data: zapis, chyba, nacita, obnov } = useData(
    () => nactiZapisBeziciRozjizdky(slug, zavod),
    [slug, zavod],
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Stack.Screen options={{ title: 'Cíl' }} />
      {nacita ? <Nacitani /> : null}
      {chyba ? <Chyba text={chyba} onZkusZnovu={obnov} /> : null}
      {!nacita && !chyba && !zapis ? (
        <>
          <Nadpis>Cíl</Nadpis>
          <Prazdno text={
            'Na vodě teď žádná rozjížďka není. Cíl se otevře, jakmile některá odstartuje.'} />
        </>
      ) : null}
      {zapis ? (
        <Zapisovani zapis={zapis} serie={slug} zavod={zavod} t={t} obnov={obnov} />
      ) : null}
    </ScrollView>
  );
}

/**
 * Zápis rozjížďky, která je na vodě — nebo `null`, když žádná není.
 *
 * Číslo se nebere z adresy: u cíle stojí rozhodčí nad tou jedinou
 * rozjížďkou, která jede, a vybírat ji z nabídky by byl krok navíc
 * přesně tam, kde na něj není čas.
 */
async function nactiZapisBeziciRozjizdky(serie: string, zavod: string) {
  const detail = await nactiZavod(serie, zavod);
  if (!detail) return null;

  const stav = stavStartu(
    detail.rozjizdky,
    Date.now(),
    (detail.delkaProceduryMin ?? PROCEDURA_S / 60) * 60,
  );
  if (stav?.druh !== 'jede' && stav?.druh !== 'odstartovano') return null;

  return nactiZapis(serie, zavod, stav.cislo);
}

function Zapisovani({
  zapis,
  serie,
  zavod,
  t,
  obnov,
}: {
  zapis: ZapisRozjizdky;
  serie: string;
  zavod: string;
  t: Barvy;
  /** Načtení zápisu znovu — po ukončení už rozjížďka není na vodě. */
  obnov: () => void;
}) {
  // <b>Tlačítka mají lodě na regatě</b> — přihlášené a potvrzené. Když
  // přihlášky nikdo nevede, má je celý ročník, jinak by u cíle nebylo na
  // co klepat (tutéž úvahu dělá cílová obrazovka na webu).
  const lode: LodVCili[] = useMemo(() => {
    const naRegate = zapis.lode.filter((l) => l.naRegate);
    return (naRegate.length > 0 ? naRegate : zapis.lode).map(naLodVCili);
  }, [zapis.lode]);

  // Rozepsaný zápis z téhle rozjížďky přebíjí to, co má server: jsou to
  // klepnutí, která se ještě nestihla odeslat.
  const [mista, setMista] = useState<Misto[]>(
    () => nactiRozepsany(serie, zavod, zapis.cislo)?.mista ?? zeZapisu(lode),
  );
  const [revize, setRevize] = useState(zapis.revize);
  const [stav, setStav] = useState<Ukladani>('ulozeno');
  const [vybrane, setVybrane] = useState<Misto | null>(null);
  const [ukoncuje, setUkoncuje] = useState(false);

  // Co je prokazatelně na serveru. Porovnáním s tímhle se pozná, jestli
  // je co ukládat — jinak by se ukládalo pořád dokola.
  const ulozeno = useRef(JSON.stringify(radky(zeZapisu(lode), lode)));
  const konfliktu = useRef(0);
  // Zastavené ukládání drží ref, ne stav: kdyby ho efekt četl ze stavu,
  // měnil by si vlastní závislost a pouštěl by se dokola.
  const stoji = useRef(false);

  // <b>Co u cíle vidí trasování</b> (nález R33). Je to návrh: když se
  // dotaz nepovede, obrazovka o nic nepřijde — zapisuje se dál klepáním.
  const [navrhy, setNavrhy] = useState<PrujezdZTrasovani[]>([]);
  const [tedProNavrhy, setTedProNavrhy] = useState(() => Date.now());

  useEffect(() => {
    let zivy = true;
    const nacti = async () => {
      try {
        const v = await nactiCilZTrasovani(serie, zavod, zapis.cislo);
        if (zivy && v) setNavrhy((v.prujezdy ?? []) as PrujezdZTrasovani[]);
      } catch {
        // Trasování je pomůcka, ne podmínka. Mlčky dál.
      }
    };
    void nacti();
    const id = setInterval(() => void nacti(), NAVRHY_MS);
    const stari = setInterval(() => setTedProNavrhy(Date.now()), STARI_MS);
    return () => {
      zivy = false;
      clearInterval(id);
      clearInterval(stari);
    };
  }, [serie, zavod, zapis.cislo]);

  const zmen = useCallback(
    (dalsi: Misto[]) => {
      setMista(dalsi);
      ulozRozepsany({ serie, zavod, cislo: zapis.cislo, mista: dalsi });
    },
    [serie, zavod, zapis.cislo],
  );

  // Ukládání: po klepnutí se chvíli počká, ať se série klepnutí pošle
  // jednou. Co nedoletí, zkusí se znovu — u cíle signál bývá, ale
  // „bývá" není „je".
  useEffect(() => {
    const sada = radky(mista, lode);
    const otisk = JSON.stringify(sada);
    if (otisk === ulozeno.current) {
      setStav('ulozeno');
      return;
    }
    if (stoji.current) return;

    let zivy = true;
    let znovu: ReturnType<typeof setTimeout> | null = null;

    const posli = async () => {
      setStav('ukladam');
      try {
        const po = await ulozVysledky(serie, zavod, zapis.cislo, sada, revize);
        if (!zivy) return;
        ulozeno.current = otisk;
        konfliktu.current = 0;
        // Nová revize přijde ze serveru; dopočítat ji by byl odhad.
        setRevize(po.revize);
        ulozRozepsany(null);
        setStav('ulozeno');
      } catch (e) {
        if (!zivy) return;
        // <b>Konflikt: zapisoval ještě někdo jiný.</b> Server k němu
        // přiloží současný zápis, takže se z něj vezme nová revize a
        // sada se pošle znovu — u vody stojí rozhodčí, který právě
        // viděl, kdo projel. Když se to opakuje, zapisují dva najednou
        // a přepisovat dál by mazalo cizí opravy.
        if (e instanceof OdmitnutoServerem && e.stav === 409) {
          const telo = e.telo as { zapis?: { revize?: number } } | null;
          konfliktu.current += 1;
          if (konfliktu.current >= KONFLIKTU_NEJVIC || typeof telo?.zapis?.revize !== 'number') {
            stoji.current = true;
            setStav('konflikt');
            return;
          }
          setRevize(telo.zapis.revize);
          return;
        }
        // Sada, kterou server odmítl kvůli datům, se opakováním
        // nespraví. Ostatní chyby znamenají, že to nedoletělo.
        if (e instanceof OdmitnutoServerem && e.stav === 400) {
          stoji.current = true;
          setStav('konflikt');
          return;
        }
        setStav('ceka');
        znovu = setTimeout(() => void posli(), ZKUSIT_ZNOVU_MS);
      }
    };

    const odklad = setTimeout(() => void posli(), ULOZIT_PO_MS);
    return () => {
      zivy = false;
      clearTimeout(odklad);
      if (znovu) clearTimeout(znovu);
    };
  }, [mista, lode, revize, serie, zavod, zapis.cislo]);

  const zbyvajici = zbyva(lode, mista);
  const posledni = mista[mista.length - 1];

  return (
    <>
      <Nadpis>{zapis.cislo}. rozjížďka — cíl</Nadpis>
      <Jede startV={zapis.startV ?? null} t={t} />

      <View style={s.radekStavu}>
        <Text style={[s.pocet, { color: t.tlumeny }]}>
          Dojelo {mista.length} z {lode.length}
        </Text>
        <StavUkladani stav={stav} t={t} />
      </View>

      {/* Poslední klepnutí a vrácení hned u sebe: překlep se opravuje
          vteřinu po tom, co se stane, ne v seznamu o kus níž. */}
      {posledni ? (
        <View style={[s.posledni, { borderColor: t.linka, backgroundColor: t.zvyrazneni }]}>
          <Text style={[s.poslednText, { color: t.text }]}>
            {posledni.poradi}. {jmeno(lode, posledni.prihlaskaId)}
            {'  '}
            <Text style={{ color: t.tlumeny }}>
              {casMista(zapis.startV ?? null, posledni.dojezdV)}
            </Text>
          </Text>
          <Pressable
            onPress={() => zmen(vratPosledni(mista))}
            style={({ pressed }) => [s.vratit, { borderColor: t.linka, opacity: pressed ? 0.6 : 1 }]}>
            <Text style={[s.vratitText, { color: t.text }]}>Vrátit</Text>
          </Pressable>
        </View>
      ) : null}

      {navrhyKZobrazeni(navrhy, mista, tedProNavrhy).map((n) => (
        /* <b>Návrh vypadá jako návrh.</b> Čárkovaný okraj a tlumená
           barva: dokud na něj rozhodčí neklepne, nic zapsaného není. */
        <Pressable
          key={n.prihlaskaId}
          onPress={() => zmen(klepni(mista, n.prihlaskaId, Date.parse(n.kdy)))}
          style={({ pressed }) => [
            s.navrh,
            { borderColor: t.jede, backgroundColor: t.zvyrazneni, opacity: pressed ? 0.6 : 1 },
          ]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.navrhLod, { color: t.text }]} numberOfLines={1}>{n.lod}</Text>
            <Text style={[s.navrhVeta, { color: t.tlumeny }]}>
              trasování vidí průjezd v {hodiny(n.kdy)}
            </Text>
          </View>
          <Text style={[s.navrhZapsat, { color: t.jede }]}>Zapsat</Text>
        </Pressable>
      ))}

      {zbyvajici.length === 0 ? (
        <Prazdno text="Všechny lodě mají dojezd. Rozjížďku ukonči, až budeš chtít." />
      ) : (
        <View style={s.dlazdice}>
          {zbyvajici.map((l) => (
            <Pressable
              key={l.prihlaskaId}
              onPress={() => zmen(klepni(mista, l.prihlaskaId, Date.now()))}
              style={({ pressed }) => [
                s.lod,
                { backgroundColor: t.procedura, opacity: pressed ? 0.6 : 1 },
              ]}>
              <Text style={s.lodJmeno} numberOfLines={1}>{l.lod}</Text>
              <Text style={s.lodPodtitul} numberOfLines={1}>
                {[l.cisloPlachty, l.kategorie].filter(Boolean).join(' · ')}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {mista.length > 0 ? (
        <View style={s.poradi}>
          {mista.map((m) => (
            <Pressable
              key={m.poradi}
              onPress={() => setVybrane(m)}
              style={({ pressed }) => [
                s.mistoRadek,
                { borderColor: t.linka, opacity: pressed ? 0.6 : 1 },
              ]}>
              <Text style={[s.mistoCislo, { color: t.tlumeny }]}>{m.poradi}.</Text>
              <Text style={[s.mistoLod, { color: t.text }]} numberOfLines={1}>
                {jmeno(lode, m.prihlaskaId)}
              </Text>
              <Text style={[s.mistoCas, { color: t.tlumeny }]}>
                {casMista(zapis.startV ?? null, m.dojezdV)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Pressable
        onPress={() => setUkoncuje(true)}
        style={({ pressed }) => [
          s.ukoncit,
          { borderColor: t.linka, backgroundColor: t.papir, opacity: pressed ? 0.6 : 1 },
        ]}>
        <Text style={[s.ukoncitText, { color: t.text }]}>Ukončit rozjížďku</Text>
      </Pressable>

      <OpravaMista
        misto={vybrane}
        lode={lode}
        t={t}
        zTrasovani={vybrane ? presnejsiCas(vybrane, navrhy) : null}
        vezmiCas={(m, kdy) => {
          zmen(prepisCas(mista, m.poradi, kdy));
          setVybrane(null);
        }}
        zavri={() => setVybrane(null)}
        smaz={(m) => {
          zmen(odeber(mista, m.poradi));
          setVybrane(null);
        }}
        prohod={(m) => {
          zmen(prehod(mista, m.poradi - 1, m.poradi));
          setVybrane(null);
        }}
      />

      <Ukonceni
        otevreno={ukoncuje}
        zbyva={zbyvajici.length}
        t={t}
        zavri={() => setUkoncuje(false)}
        proved={async () => {
          await ulozVysledky(serie, zavod, zapis.cislo, radkyPriUkonceni(mista, lode), revize);
          await ukonciRozjizdku(serie, zavod, zapis.cislo);
          ulozRozepsany(null);
          setUkoncuje(false);
          obnov();
        }}
      />
    </>
  );
}

/** Jak dlouho se jede. Počítá si to telefon sám, stejně jako odpočet. */
function Jede({ startV, t }: { startV: string | null; t: Barvy }) {
  const [ted, setTed] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setTed(Date.now()), TIK_MS);
    return () => clearInterval(id);
  }, []);

  const od = odStartu(startV, ted);
  if (od === null) return null;
  return (
    <Text style={[s.jede, { color: t.tlumeny }]}>
      Jede se {trvani(od > 0 ? od : 0)}
    </Text>
  );
}

function StavUkladani({ stav, t }: { stav: Ukladani; t: Barvy }) {
  if (stav === 'ulozeno') return <Text style={[s.stav, { color: t.tlumeny }]}>uloženo</Text>;
  if (stav === 'ukladam')
    return <Text style={[s.stav, { color: t.tlumeny }]}>ukládám…</Text>;
  if (stav === 'ceka')
    return <Text style={[s.stav, { color: t.vystraha }]}>zatím neodesláno</Text>;
  return <Text style={[s.stav, { color: t.stavZruseny }]}>zapisuje ještě někdo — otevři web</Text>;
}

/** Oprava jednoho místa: smazat, nebo prohodit s tím před ním. */
function OpravaMista({
  misto,
  lode,
  t,
  zTrasovani,
  vezmiCas,
  zavri,
  smaz,
  prohod,
}: {
  misto: Misto | null;
  lode: readonly LodVCili[];
  t: Barvy;
  /** Přesnější čas ze stopy, nebo `null`, když žádný nesedí. */
  zTrasovani: string | null;
  vezmiCas: (m: Misto, kdy: string) => void;
  zavri: () => void;
  smaz: (m: Misto) => void;
  prohod: (m: Misto) => void;
}) {
  return (
    <Modal visible={misto !== null} transparent animationType="fade" onRequestClose={zavri}>
      <View style={s.stin}>
        <View style={[s.dialog, { backgroundColor: t.papir }]}>
          <Text style={[s.dialogNadpis, { color: t.text }]}>
            {misto ? `${misto.poradi}. ${jmeno(lode, misto.prihlaskaId)}` : ''}
          </Text>
          <Text style={[s.dialogVeta, { color: t.tlumeny }]}>
            Čas patří místu, ne lodi: prohozením se vymění jména, časy zůstanou tam,
            kde cílem něco projelo.
          </Text>

          {/* <b>Druhá půlka nálezu R33.</b> Rozhodčí určil, kdo dojel;
              stopa nabídne, kdy — na desetiny přesněji, než stihl palec. */}
          {misto && zTrasovani ? (
            <Pressable
              onPress={() => misto && vezmiCas(misto, zTrasovani)}
              style={({ pressed }) => [s.volba, { borderColor: t.jede, opacity: pressed ? 0.6 : 1 }]}>
              <Text style={[s.volbaText, { color: t.jede }]}>
                Vzít čas z trasování ({hodiny(zTrasovani)})
              </Text>
            </Pressable>
          ) : null}

          {misto && misto.poradi > 1 ? (
            <Pressable
              onPress={() => misto && prohod(misto)}
              style={({ pressed }) => [s.volba, { borderColor: t.linka, opacity: pressed ? 0.6 : 1 }]}>
              <Text style={[s.volbaText, { color: t.text }]}>Prohodit s předchozí</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => misto && smaz(misto)}
            style={({ pressed }) => [s.volba, { borderColor: t.linka, opacity: pressed ? 0.6 : 1 }]}>
            <Text style={[s.volbaText, { color: t.stavZruseny }]}>Smazat místo</Text>
          </Pressable>

          <Pressable
            onPress={zavri}
            style={({ pressed }) => [s.volba, { borderColor: t.linka, opacity: pressed ? 0.6 : 1 }]}>
            <Text style={[s.volbaText, { color: t.text }]}>Zpátky</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/** Ukončení rozjížďky — nevratné, takže přes potvrzení. */
function Ukonceni({
  otevreno,
  zbyva,
  t,
  zavri,
  proved,
}: {
  otevreno: boolean;
  zbyva: number;
  t: Barvy;
  zavri: () => void;
  proved: () => Promise<void>;
}) {
  const [posila, setPosila] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  return (
    <Modal visible={otevreno} transparent animationType="fade" onRequestClose={zavri}>
      <View style={s.stin}>
        <View style={[s.dialog, { backgroundColor: t.papir }]}>
          <Text style={[s.dialogNadpis, { color: t.text }]}>Ukončit rozjížďku</Text>
          <Text style={[s.dialogVeta, { color: t.tlumeny }]}>
            {zbyva === 0
              ? 'Všechny lodě mají dojezd. Rozjížďka se uzavře a časomíra se zastaví.'
              : zbyva === 1
                ? 'Zbylé lodi se zapíše DNF — nedokončila. Časomíra se zastaví.'
                : `Zbylým ${zbyva} lodím se zapíše DNF — nedokončily. Časomíra se zastaví.`}
          </Text>
          {chyba ? <Text style={[s.dialogVeta, { color: t.stavZruseny }]}>{chyba}</Text> : null}

          <View style={s.dialogTlacitka}>
            <Pressable
              onPress={zavri}
              disabled={posila}
              style={({ pressed }) => [
                s.volba,
                s.volbaVedle,
                { borderColor: t.linka, opacity: pressed ? 0.6 : 1 },
              ]}>
              <Text style={[s.volbaText, { color: t.text }]}>Zpátky</Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                if (posila) return;
                setPosila(true);
                setChyba(null);
                try {
                  await proved();
                } catch (e) {
                  setChyba(
                    e instanceof OdmitnutoServerem && e.duvod
                      ? e.duvod
                      : 'Nepovedlo se odeslat. Zkus to prosím znovu.',
                  );
                } finally {
                  setPosila(false);
                }
              }}
              style={({ pressed }) => [
                s.volba,
                s.volbaVedle,
                { backgroundColor: t.vystraha, borderColor: 'transparent', opacity: pressed || posila ? 0.6 : 1 },
              ]}>
              <View style={s.obsahTlacitka}>
                {posila ? <ActivityIndicator color="#ffffff" /> : null}
                <Text style={[s.volbaText, { color: '#ffffff' }]}>
                  {posila ? 'Ukončuji…' : 'Ukončit'}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function naLodVCili(l: ZapisLod): LodVCili {
  return {
    prihlaskaId: l.prihlaskaId,
    lod: l.lod,
    cisloPlachty: l.cisloPlachty,
    kategorie: l.kategorie,
    poradiVCili: l.poradiVCili,
    kod: l.kod ?? null,
    dojezdV: l.dojezdV ?? null,
  };
}

function jmeno(lode: readonly LodVCili[], prihlaskaId: number): string {
  return lode.find((l) => l.prihlaskaId === prihlaskaId)?.lod ?? '—';
}

/** Hodina s vteřinami, v pásmu telefonu — čas, kdy něco projelo cílem. */
function hodiny(iso: string): string {
  const d = new Date(iso);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((c, i) => (i === 0 ? String(c) : String(c).padStart(2, '0')))
    .join(':');
}

/** Čas, který loď plula; bez času startu aspoň hodina dojezdu. */
function casMista(startV: string | null, dojezdV: string | null): string {
  const s = plula(startV, dojezdV);
  if (s !== null) return trvani(s);
  if (!dojezdV) return '—';
  const d = new Date(dojezdV);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const s = StyleSheet.create({
  jede: { fontSize: 15, marginTop: -8, marginBottom: 12, fontVariant: ['tabular-nums'] },
  radekStavu: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  pocet: { fontSize: 14, fontWeight: '600' },
  stav: { fontSize: 13 },

  posledni: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 14, gap: 12,
  },
  poslednText: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  vratit: { borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  vratitText: { fontSize: 15, fontWeight: '700' },

  // Dlaždice jsou velké schválně: klepe se za jízdy, jednou rukou a bez
  // dívání (nahrávka 21 — v druhé ruce je houkačka).
  dlazdice: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  lod: { flexGrow: 1, flexBasis: '46%', minHeight: 78, borderRadius: 14, padding: 14, justifyContent: 'center' },
  lodJmeno: { color: '#ffffff', fontSize: 19, fontWeight: '800' },
  lodPodtitul: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },

  navrh: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 2, borderStyle: 'dashed', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10,
  },
  navrhLod: { fontSize: 17, fontWeight: '700' },
  navrhVeta: { fontSize: 13, marginTop: 2 },
  navrhZapsat: { fontSize: 15, fontWeight: '800' },

  poradi: { marginTop: 18, gap: 6 },
  mistoRadek: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12,
  },
  mistoCislo: { fontSize: 15, fontWeight: '700', minWidth: 26, fontVariant: ['tabular-nums'] },
  mistoLod: { fontSize: 16, flex: 1 },
  mistoCas: { fontSize: 15, fontVariant: ['tabular-nums'] },

  ukoncit: { marginTop: 22, borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  ukoncitText: { fontSize: 16, fontWeight: '700' },

  stin: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  dialog: { borderRadius: 14, padding: 20, gap: 12 },
  dialogNadpis: { fontSize: 18, fontWeight: '800' },
  dialogVeta: { fontSize: 15, lineHeight: 21 },
  dialogTlacitka: { flexDirection: 'row', gap: 8, marginTop: 4 },
  // <b>Bez `flex`.</b> Tlačítka dialogu stojí pod sebou a `flex: 1` jim
  // ve sloupci srazí základnu na nulu — změřeno na simulátoru 29. 10.
  // 2026: rámečky se vykreslily, ale text v nich nebyl vidět vůbec.
  // Dělit prostor mají jen tlačítka vedle sebe, a ta mají `volbaVedle`.
  volba: {
    borderWidth: 1, borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 12, alignItems: 'center',
  },
  volbaVedle: { flex: 1 },
  volbaText: { fontWeight: '700', fontSize: 15 },
  obsahTlacitka: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
