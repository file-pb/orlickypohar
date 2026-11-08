import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams } from 'expo-router';
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
import { barvaTridy } from '@/lib/tridy';
import {
  klepni,
  nactiRozepsany,
  navrhyKZobrazeni,
  odeber,
  posun,
  prepisCas,
  prepniShodu,
  presnejsiCas,
  radky,
  radkyPriUkonceni,
  rozdel,
  skupiny,
  ulozRozepsany,
  vratPosledni,
  zbyva,
  zeZapisu,
  type LodVCili,
  type Misto,
  type PrujezdZTrasovani,
} from '@/lib/cil';
import { pismoNaVyplni } from '@/lib/kontrast';
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

  // <b>Displej nezhasne, dokud je cílovka otevřená.</b> Mezi dojezdy bývá
  // minuty klidu a telefon by se mezitím uspal; probudit ho a odemknout
  // trvá vteřiny, které u cíle nejsou. Panel startu má vlastní okno
  // (`lib/dirigent.ts`), tady je to po celou dobu — obrazovka je sama
  // dokladem, že se zapisuje.
  useKeepAwake('cil');

  const { data: zapis, chyba, nacita, obnov } = useData(
    () => nactiZapisBeziciRozjizdky(slug, zavod),
    [slug, zavod],
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
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

  // <b>Návrhy, které rozhodčí odmítl.</b> Drží se klíčem loď + okamžik,
  // ne jen lodí: trasování může tutéž loď vidět u cíle znovu a to už je
  // jiný průjezd, o kterém se nerozhodovalo. Je to paměť obrazovky, ne
  // zápisu — odmítnutí nic neukládá, protože zapsáno nic nebylo.
  const [odmitnute, setOdmitnute] = useState<string[]>([]);

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
  const rady = skupiny(mista);
  const kNabidnuti = navrhyKZobrazeni(navrhy, mista, tedProNavrhy).filter(
    (n) => !odmitnute.includes(klicNavrhu(n)),
  );

  return (
    <>
      {/* <b>Hlavička jedna řádka, ne nadpis přes půl obrazovky</b>
          (Filip, 8. 11. 2026: *„ta hlavička cílové obrazovky je také
          zbytečně veliká"*) — a návrh (`Cil.dc.html`) to tak kreslí:
          nahoře úzký pruh, hned pod ním to, na co se klepe.

          Co obrazovka říká, zůstalo celé: které rozjížďky je to cíl,
          jak dlouho se jede, kolik lodí dojelo a jestli je zapsáno. Jen
          to drží na dvou řádcích místo na pěti. */}
      <View style={s.hlavicka}>
        <Text style={[s.hlavickaNadpis, { color: t.text }]} numberOfLines={1}>
          {zapis.cislo}. rozjížďka — cíl
        </Text>
        <Jede startV={zapis.startV ?? null} t={t} />
      </View>

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
            <Text style={{ color: t.tlumeny }}>{casMista(posledni.dojezdV)}</Text>
          </Text>
          <Pressable
            onPress={() => zmen(vratPosledni(mista))}
            style={({ pressed }) => [s.vratit, { borderColor: t.linka, opacity: pressed ? 0.6 : 1 }]}>
            <Text style={[s.vratitText, { color: t.text }]}>Vrátit</Text>
          </Pressable>
        </View>
      ) : null}

      {zbyvajici.length === 0 ? (
        <Prazdno text="Všechny lodě mají dojezd. Rozjížďku ukonči, až budeš chtít." />
      ) : (
        /* <b>Kategorie barevným okrajem, ne řádkou textu</b> (Filip,
           8. 11. 2026). Jméno třídy zabíralo na každé dlaždici celou
           řádku a nikdo ho nečetl — rozhodčí potřebuje poznat, že loď
           vedle patří jinam, a na to stačí pruh v barvě třídy
           (`lib/tridy.ts`, tytéž odstíny jako znaky tříd na webu).
           Ušetřené místo šlo do třetího sloupce, jak ho kreslí návrh
           (`Cil.dc.html`), takže se na obrazovku vejde půldruhá řada
           lodí navíc.

           Číslo plachty zůstává: na vodě se loď pozná podle něj dřív
           než podle jména. Třída, kterou paleta nezná, okraj nedostane
           — vymýšlet jí odstín by znamenalo tvářit se, že ho má. */
        <View style={s.dlazdice}>
          {zbyvajici.map((l) => {
            const barva = barvaTridy(l.kategorie, t);
            return (
              <Pressable
                key={l.prihlaskaId}
                onPress={() => zmen(klepni(mista, l.prihlaskaId, Date.now()))}
                accessibilityRole="button"
                accessibilityLabel={[l.lod, l.cisloPlachty, l.kategorie]
                  .filter(Boolean)
                  .join(', ')}
                style={({ pressed }) => [
                  s.lod,
                  {
                    backgroundColor: t.procedura,
                    opacity: pressed ? 0.6 : 1,
                    borderLeftWidth: barva ? 6 : 0,
                    borderLeftColor: barva ?? 'transparent',
                  },
                ]}>
                <Text
                  style={[s.lodJmeno, { color: pismoNaVyplni(t, t.procedura) }]}
                  numberOfLines={2}>
                  {l.lod}
                </Text>
                {l.cisloPlachty ? (
                  <Text
                    style={[
                      s.lodPodtitul,
                      s.tlumeneNaVyplni,
                      { color: pismoNaVyplni(t, t.procedura) },
                    ]}
                    numberOfLines={1}>
                    {l.cisloPlachty}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}

      {mista.length > 0 || kNabidnuti.length > 0 ? (
        <View style={s.poradi}>
          {rady.map((sk, i) => (
            <View
              // Klíč je první loď řádky, ne pořadí (K7): shodná místa mají
              // totéž číslo a React by dvě řádky považoval za jednu.
              key={sk.mista[0].prihlaskaId}
              style={[
                s.mistoRadek,
                { borderColor: sk.mista.length > 1 ? t.voda : t.linka },
              ]}>
              <Text style={[s.mistoCislo, { color: t.tlumeny }]}>{sk.poradi}.</Text>

              <View style={s.mistoJmena}>
                {sk.mista.map((m) => (
                  /* Jméno otevírá opravy, které se nevejdou na řádku:
                     smazat, vzít čas z trasování, spojit shodu. */
                  <Pressable
                    key={m.prihlaskaId}
                    onPress={() => setVybrane(m)}
                    accessibilityRole="button"
                    accessibilityLabel={`${jmeno(lode, m.prihlaskaId)} — opravit místo`}
                    style={({ pressed }) => [s.mistoJmeno, { opacity: pressed ? 0.6 : 1 }]}>
                    <Text style={[s.mistoLod, { color: t.text }]} numberOfLines={1}>
                      {jmeno(lode, m.prihlaskaId)}
                    </Text>
                  </Pressable>
                ))}

                {/* <b>Shoda je jedna řádka se dvěma jmény</b>, jak ji kreslí
                    návrh — ne dvě řádky, z nichž druhá má místo čísla
                    rovnítko. Rovnítko řeklo, že číslo není překlep;
                    neřeklo, že ty lodě patří k sobě a že se jim body dělí
                    (K7, ZPJ A7). */}
                {sk.mista.length > 1 ? (
                  <View style={s.shoda}>
                    <Text style={[s.shodaVeta, { color: t.tlumeny }]}>
                      dojely spolu · body se dělí (A7)
                    </Text>
                    <Pressable
                      onPress={() => zmen(rozdel(mista, sk.mista[0].prihlaskaId))}
                      style={({ pressed }) => [s.rozdelit, { opacity: pressed ? 0.6 : 1 }]}>
                      <Text style={[s.shodaVeta, s.rozdelitText, { color: t.text }]}>
                        rozdělit
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>

              <Text style={[s.mistoCas, { color: t.tlumeny }]}>
                {casMista(sk.mista[0].dojezdV)}
              </Text>

              {/* <b>Šipky na řádce</b> místo „prohodit s předchozí"
                  v dialogu. Oprava pořadí je to, co se u cíle dělá
                  nejčastěji hned po klepnutí, a jde oběma směry —
                  dialog uměl jen nahoru. */}
              <View style={s.sipky}>
                <Sipka
                  t={t}
                  smer={-1}
                  lod={jmeno(lode, sk.mista[0].prihlaskaId)}
                  jde={i > 0}
                  stiskni={() => zmen(posun(mista, sk.mista[0].prihlaskaId, -1))}
                />
                <Sipka
                  t={t}
                  smer={1}
                  lod={jmeno(lode, sk.mista[0].prihlaskaId)}
                  jde={i < rady.length - 1}
                  stiskni={() => zmen(posun(mista, sk.mista[0].prihlaskaId, 1))}
                />
              </View>
            </View>
          ))}

          {/* <b>Návrh stojí v pořadí, na místě, které by loď zabrala</b>
              (návrh `Cil.dc.html`). Dokud se nad seznamem tvářil jako
              samostatná karta, neříkal to podstatné — kolikátá by ta loď
              byla. Čárkovaný okraj drží rozdíl: zapsané to není, dokud
              rozhodčí neřekne „beru". */}
          {kNabidnuti.map((n, i) => (
            <View
              key={n.prihlaskaId}
              style={[s.navrh, { borderColor: t.jede, backgroundColor: t.zvyrazneni }]}>
              <Text style={[s.mistoCislo, { color: t.jede }]}>{mista.length + 1 + i}.</Text>
              <View style={s.mistoJmena}>
                <Text style={[s.navrhLod, { color: t.text }]} numberOfLines={1}>
                  {n.lod}
                </Text>
                <Text style={[s.navrhVeta, { color: t.jede }]}>
                  navrhuje trasování · {hodiny(n.kdy)}
                </Text>
              </View>
              <Pressable
                onPress={() => zmen(klepni(mista, n.prihlaskaId, Date.parse(n.kdy)))}
                style={({ pressed }) => [
                  s.beru,
                  { backgroundColor: t.jede, opacity: pressed ? 0.6 : 1 },
                ]}>
                <Text style={[s.beruText, { color: pismoNaVyplni(t, t.jede) }]}>Beru</Text>
              </Pressable>
              {/* <b>Odmítnout jde taky.</b> Dokud šel návrh jen přijmout,
                  mizel sám stářím a rozhodčí u něj nemohl udělat nic —
                  a přitom je to on, kdo ví, že to byla jiná loď. */}
              <Pressable
                onPress={() => setOdmitnute((p) => [...p, klicNavrhu(n)])}
                style={({ pressed }) => [
                  s.odmitnout,
                  { borderColor: t.linka, opacity: pressed ? 0.6 : 1 },
                ]}>
                <Text style={[s.beruText, { color: t.tlumeny }]}>Ne</Text>
              </Pressable>
            </View>
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
          zmen(prepisCas(mista, m.prihlaskaId, kdy));
          setVybrane(null);
        }}
        zavri={() => setVybrane(null)}
        smaz={(m) => {
          zmen(odeber(mista, m.prihlaskaId));
          setVybrane(null);
        }}
        shoda={(m) => {
          zmen(prepniShodu(mista, m.prihlaskaId));
          setVybrane(null);
        }}
        prvniVRade={
          vybrane !== null && mista[0]?.prihlaskaId === vybrane.prihlaskaId
        }
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
    <Text style={[s.jede, { color: t.tlumeny }]}>jede se {trvani(od > 0 ? od : 0)}</Text>
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
  shoda,
  prvniVRade,
}: {
  misto: Misto | null;
  lode: readonly LodVCili[];
  t: Barvy;
  /** Přesnější čas ze stopy, nebo `null`, když žádný nesedí. */
  zTrasovani: string | null;
  vezmiCas: (m: Misto, kdy: string) => void;
  zavri: () => void;
  smaz: (m: Misto) => void;
  /** Spojí tuhle loď s předchozí do shody, nebo shodu zruší (K7). */
  shoda: (m: Misto) => void;
  /** Je to první loď v řadě? S ničím před sebou se spojit nedá. */
  prvniVRade: boolean;
}) {
  return (
    <Modal visible={misto !== null} transparent animationType="fade" onRequestClose={zavri}>
      <View style={s.stin}>
        <View style={[s.dialog, { backgroundColor: t.papir }]}>
          <Text style={[s.dialogNadpis, { color: t.text }]}>
            {misto ? `${misto.poradi}. ${jmeno(lode, misto.prihlaskaId)}` : ''}
          </Text>
          <Text style={[s.dialogVeta, { color: t.tlumeny }]}>
            Čas patří místu, ne lodi: šipkami se vymění jména, časy zůstanou tam,
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

          {/* <b>Shoda v cíli</b> (K7, ZPJ A7). Je to oprava, ne základní
              gesto: shoda je vzácná a klepání musí zůstat jedno klepnutí
              na loď. Rozhodčí tedy klepne na obě lodě po sobě a teprve pak
              řekne, že projely spolu. */}
          {misto && !prvniVRade ? (
            <Pressable
              onPress={() => misto && shoda(misto)}
              style={({ pressed }) => [s.volba, { borderColor: t.linka, opacity: pressed ? 0.6 : 1 }]}>
              <Text style={[s.volbaText, { color: t.text }]}>
                {misto.shodneSPredchozim
                  ? 'Zrušit shodu s předchozí'
                  : 'Dojela shodně s předchozí'}
              </Text>
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
                {/* Jantar je v tmavé sadě světlý, takže bílá na něm dává
                    2,75:1. Písmo se bere podle výplně (`lib/kontrast.ts`). */}
                {posila ? <ActivityIndicator color={pismoNaVyplni(t, t.vystraha)} /> : null}
                <Text style={[s.volbaText, { color: pismoNaVyplni(t, t.vystraha) }]}>
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

/**
 * Kdy loď projela cílem.
 *
 * <b>Hodina průjezdu, ne doba jízdy</b> — jak to kreslí návrh
 * (`Cil.dc.html`: *14:09:52*). Do 7. 11. 2026 tu stála doba od startu
 * a byla to odpověď na otázku, kterou si u cíle nikdo neklade: jak dlouho
 * se jede, říká řádek nad seznamem, a jak dlouho plula která loď, se
 * počítá až ve výsledcích. Rozhodčí se u cíle domlouvá s ostatními,
 * a to jde jedině podle hodin.
 */
function casMista(dojezdV: string | null): string {
  return dojezdV ? hodiny(dojezdV) : '—';
}

/** Čím se pozná jeden návrh trasování: loď a okamžik, ne jen loď. */
function klicNavrhu(n: PrujezdZTrasovani): string {
  return `${n.prihlaskaId}@${n.kdy}`;
}

/**
 * Šipka u řádky pořadí.
 *
 * <b>Co nejde, je ztlumené, ne schované</b> — tatáž úvaha jako u úkonů
 * na startu. Mizející šipka u první řádky by seznamu měnila šířku a oko
 * by pak hledalo tu druhou jinde, než ji nechalo.
 */
function Sipka({
  t,
  smer,
  lod,
  jde,
  stiskni,
}: {
  t: Barvy;
  smer: -1 | 1;
  /** Jméno lodi — jen pro čtečku; na obrazovce je vidět vedle. */
  lod: string;
  jde: boolean;
  stiskni: () => void;
}) {
  return (
    <Pressable
      disabled={!jde}
      onPress={stiskni}
      accessibilityRole="button"
      accessibilityLabel={`${lod} — posunout ${smer === -1 ? 'výš' : 'níž'}`}
      style={({ pressed }) => [
        s.sipka,
        { borderColor: t.linka, opacity: !jde ? 0.3 : pressed ? 0.6 : 1 },
      ]}>
      <Text style={[s.sipkaZnak, { color: t.text }]}>{smer === -1 ? '↑' : '↓'}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  hlavicka: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  hlavickaNadpis: { fontSize: 17, fontWeight: '800', flexShrink: 1 },
  jede: { fontSize: 15, fontVariant: ['tabular-nums'] },
  radekStavu: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  pocet: { fontSize: 14, fontWeight: '600' },
  stav: { fontSize: 13 },

  posledni: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 14, gap: 12,
  },
  poslednText: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  vratit: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14 },
  vratitText: { fontSize: 15, fontWeight: '700' },

  // Dlaždice jsou velké schválně: klepe se za jízdy, jednou rukou a bez
  // dívání (nahrávka 21 — v druhé ruce je houkačka).
  dlazdice: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  // Tři sloupce místo dvou — ušetřilo je zrušení řádky s kategorií.
  // Výška 64 je pořád o polovinu nad mezí terče (44 pt) a na houpající
  // se lodi se do ní trefí palec.
  lod: { flexGrow: 1, flexBasis: '30%', minHeight: 64, borderRadius: 14, padding: 10, justifyContent: 'center' },
  lodJmeno: { fontSize: 16, fontWeight: '800' },
  lodPodtitul: { fontSize: 12, marginTop: 2 },
  tlumeneNaVyplni: { opacity: 0.85 },

  navrh: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 2, borderStyle: 'dashed', borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 10,
  },
  navrhLod: { fontSize: 16, fontWeight: '700' },
  navrhVeta: { fontSize: 12, marginTop: 1 },
  beru: { minHeight: 44, minWidth: 44, borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
  odmitnout: { minHeight: 44, minWidth: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, justifyContent: 'center', alignItems: 'center' },
  beruText: { fontSize: 15, fontWeight: '700' },

  poradi: { marginTop: 18, gap: 6 },
  // <b>Shora, ne na střed.</b> Na řádce se dvěma jmény by číslo
  // vycentrované na celou výšku stálo mezi nimi a vypadalo by, že patří
  // tomu druhému. Číslo i čas proto sedí na prvním jméně — `lineHeight`
  // je táž podlaha 44 pt, takže na řádce o jedné lodi se nic nemění.
  mistoRadek: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderWidth: 1, borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10,
  },
  mistoCislo: {
    fontSize: 15, fontWeight: '700', minWidth: 26, lineHeight: 44,
    fontVariant: ['tabular-nums'],
  },
  mistoJmena: { flex: 1 },
  // Jméno je terč — otevírá opravy —, takže má svou podlahu 44 pt.
  mistoJmeno: { minHeight: 44, justifyContent: 'center' },
  mistoLod: { fontSize: 16 },
  mistoCas: { fontSize: 15, lineHeight: 44, fontVariant: ['tabular-nums'] },

  shoda: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 6 },
  shodaVeta: { fontSize: 12 },
  rozdelit: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
  rozdelitText: { fontWeight: '700', textDecorationLine: 'underline' },

  // <b>Vedle sebe, ne pod sebou.</b> Návrh je kreslí nad sebou po 22 pt;
  // mez terče je 44, a dvě taková tlačítka ve sloupci by každé řádce
  // seznamu daly 88 pt. Vedle sebe se řádka drží na výšce jména.
  sipky: { flexDirection: 'row', gap: 4 },
  sipka: {
    minHeight: 44, minWidth: 44, borderWidth: 1, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  sipkaZnak: { fontSize: 17, fontWeight: '700' },

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
