import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { Odpocet } from '@/components/odpocet';
import { Radek } from '@/components/ui';
import {
  Chyba,
  Karta,
  Nacitani,
  Nadpis,
  Prazdno,
  Sekce,
  Stav,
  procNejsouVysledky,
} from '@/components/ui';
import { useData } from '@/hooks/use-data';
import { useTheme } from '@/hooks/use-theme';
import {
  nactiJa,
  nactiZavod,
  nactiZapis,
  type ZapisLod,
  ohlasRozjizdku,
  nactiTresty,
  oznacTrestVykonan,
  ulozTrest,
  zrusRozjizdku,
  ohlasStart,
  OdmitnutoServerem,
  provedProceduru,
  zapisPredcasnyStart,
  type UcastLodi,
  type VysledekZavodu,
  type ZavodDetail,
} from '@/lib/api';
import { veliNekde } from '@/lib/role';
import {
  nactiCekajici,
  platnyUkon,
  sCekajicim,
  ulozCekajici,
  type CekajiciUkon,
  type UkonProcedury,
} from '@/lib/cekajici-start';
import { PROCEDURA_S, DUVODY_ZRUSENI, stavStartu } from '@/lib/start';
import { rozsah } from '@/lib/datum';
import { body } from '@/lib/body';

/**
 * Jak často se zkouší odeslat podržený úkon. Deset vteřin: na vodě signál
 * přichází a odchází po chvílích, a častější dotazy by jen vybíjely
 * telefon, který musí vydržet celý závodní den.
 */
const POKUS_MS = 10_000;

export default function Zastavka() {
  const { slug, zavod } = useLocalSearchParams<{ slug: string; zavod: string }>();
  const t = useTheme();
  const router = useRouter();
  const { data, chyba, nacita, obnov } = useData(() => nactiZavod(slug, zavod), [slug, zavod]);
  const { data: ja } = useData(nactiJa);

  // Čím server poslední úkon <b>odmítl</b>. Není to „nepovedlo se
  // odeslat" — to si appka podrží a zkouší dál; tohle je věta pravidla
  // („Rozjížďka už jede. Na nový start je všeobecné odvolání."), a tu
  // musí rozhodčí vidět, protože opakování by nepomohlo.
  const [chybaStartu, setChybaStartu] = useState<string | null>(null);

  // <b>Co appka drží, dokud to neprojde.</b> Čte se ze souboru, takže to
  // přežije i konec appky: start, který se nedoručil, se nesmí ztratit
  // s procesem.
  const [ceka, setCeka] = useState<CekajiciUkon | null>(() =>
    platnyUkon(nactiCekajici(), slug, zavod, Date.now()),
  );

  const delkaS = (data?.delkaProceduryMin ?? PROCEDURA_S / 60) * 60;

  // Rozjížďky, jak je vidí odpočet: s dosazeným čekajícím úkonem. Tím
  // odpočet běží z hodin telefonu, ne z toho, co stihl potvrdit server
  // — první pravidlo pyramidy autority.
  const rozjizdky = sCekajicim(data?.rozjizdky ?? [], ceka, delkaS);

  // <b>Tresty se čtou k té rozjížďce, kterou drí panel</b> — tedy
  // k té, co se jede, nebo k nejbližší plánované. Jiné číslo by
  // znamenalo pruh, který patří jinam než dlaždice nad ním.
  const cisloVPanelu = stavStartu(rozjizdky, Date.now(), delkaS)?.cislo ?? null;
  const { data: tresty, obnov: obnovTresty } = useData(
    () => (cisloVPanelu === null ? Promise.resolve(null) : nactiTresty(slug, zavod, cisloVPanelu)),
    [slug, zavod, cisloVPanelu],
  );

  const zapisVykonani = async (trest: number) => {
    if (cisloVPanelu === null) return;
    try {
      await oznacTrestVykonan(slug, zavod, cisloVPanelu, trest);
      obnovTresty();
    } catch {
      setChybaStartu('Nepovedlo se zapsat vykonání trestu — zkus to znovu.');
    }
  };

  // <b>Zadání úkonu nečeká na odpověď.</b> Zapíše se do fronty a odpočet
  // se rozjede hned; odesílá se vedle (efekt níž). Dřív se čekalo na
  // server a bez signálu se po zmáčknutí neobjevilo nic.
  const zadej = (cislo: number, druh: UkonProcedury) => {
    const u: CekajiciUkon = { serie: slug, zavod, cislo, druh, kdy: Date.now() };
    ulozCekajici(u);
    setCeka(u);
    setChybaStartu(null);
  };

  // Odesílání fronty. Zkusí hned a pak každých pár vteřin, dokud to
  // neprojde — na vodě signál přichází a odchází.
  useEffect(() => {
    if (!ceka) return;
    let zivy = true;

    const zkus = async () => {
      try {
        await provedProceduru(
          ceka.serie,
          ceka.zavod,
          ceka.cislo,
          ceka.druh,
          new Date(ceka.kdy).toISOString(),
        );
        if (!zivy) return;
        ulozCekajici(null);
        setCeka(null);
        obnov();
      } catch (e) {
        // <b>Server odpověděl a odmítl.</b> Opakování by nepomohlo a
        // fronta by bušila donekonečna; úkon se zahodí a důvod jde na
        // obrazovku. Cokoliv jiného znamená, že to nedoletělo — zůstává
        // ve frontě a zkusí to další tik.
        if (!zivy || !(e instanceof OdmitnutoServerem)) return;
        ulozCekajici(null);
        setCeka(null);
        setChybaStartu(e.duvod ?? 'Server úkon odmítl.');
        obnov();
      }
    };

    void zkus();
    const id = setInterval(() => void zkus(), POKUS_MS);
    return () => {
      zivy = false;
      clearInterval(id);
    };
  }, [ceka, obnov]);

  // Proceduru spouští jen ten, kdo velí. Práva hlídá server; tohle jen
  // neukazuje tlačítko tomu, komu nepatří — obrazovku regaty čte každý.
  const spustit = veliNekde(ja ?? null)
    ? (cislo: number) => zadej(cislo, 'Spustit')
    : undefined;

  // <b>Start se neohlašuje rukou.</b> Odpočet doběhl, tím rozjížďka
  // odstartovala — appka to serveru řekne sama (viz `ohlasStart`).
  const ohlas = veliNekde(ja ?? null)
    ? async (cislo: number) => {
        // Posílá se čas, na který odpočet došel, ne „teď": mezi nulou
        // a doručením je latence a u vody i výpadek, a bez něj by se
        // start zapsal později, než ho posádky slyšely.
        const startV = rozjizdky.find((r) => r.cislo === cislo)?.startV;
        await ohlasStart(slug, zavod, cislo, startV ?? undefined);
        obnov();
      }
    : undefined;

  // <b>Čas startu z rozpravy</b> (K6). Jde to tou samou cestou jako
  // skutečný start — jedním endpointem, protože rozdíl mezi plánovaným
  // a padlým startem je jedině v tom, jestli ten čas už přišel
  // (`ZapisSprava`). Dvě cesty k témuž by se rozešly.
  const zapisCasStartu = veliNekde(ja ?? null)
    ? async (cislo: number, kdy: number) => {
        setChybaStartu(null);
        try {
          await ohlasStart(slug, zavod, cislo, new Date(kdy).toISOString());
          obnov();
        } catch (e) {
          setChybaStartu(
            e instanceof OdmitnutoServerem
              ? (e.duvod ?? 'Server čas startu odmítl.')
              : 'Nepovedlo se zapsat — zkus to znovu.',
          );
        }
      }
    : undefined;

  // <b>Ohlášení další rozjížďky.</b> Jediný úkon startu, který nejde
  // podržet ve frontě: číslo rozjížďky určuje server, takže bez odpovědi
  // není co očíslovat. Proto se odmítnutí i nedoručení ukazují stejně —
  // obojí znamená „nestalo se, zkus to znovu".
  const ohlasit = veliNekde(ja ?? null)
    ? async () => {
        setChybaStartu(null);
        try {
          await ohlasRozjizdku(slug, zavod);
          obnov();
        } catch (e) {
          setChybaStartu(
            e instanceof OdmitnutoServerem
              ? (e.duvod ?? 'Server rozjížďku odmítl založit.')
              : 'Nepovedlo se ohlásit — zkus to znovu.',
          );
        }
      }
    : undefined;

  // <b>Předčasný start (OCS).</b> Lodě se berou ze zápisu rozjížďky, ne
  // z detailu závodu: `prihlaskaId`, kterým se výsledek adresuje, nese
  // jen zápis. Načítá se až při otevření — na obrazovce, která je
  // otevřená celou rozjížďku, by to byl dotaz navíc o ničem.
  type ProCo = { cislo: number; ukon: 'Ocs' | 'Otacka360' | 'Otacka720' };
  const [vyber, setVyber] = useState<ProCo | null>(null);
  const [vyberLode, setVyberLode] = useState<ZapisLod[] | null>(null);
  const [vyberPosila, setVyberPosila] = useState<number | null>(null);

  // <b>Zrušení má vlastní vrstvu, ne tutéž jako výběr lodi.</b> Vybírá se
  // z důvodů, ne z lodí — sdílet jeden seznam by znamenalo rozhodovat
  // uvnitř něj, co vlastně zobrazuje.
  const [ruseni, setRuseni] = useState<number | null>(null);
  const [rusi, setRusi] = useState(false);

  const zrus = async (duvod: string) => {
    if (ruseni === null || rusi) return;
    setRusi(true);
    try {
      await zrusRozjizdku(slug, zavod, ruseni, duvod);
      setRuseni(null);
      obnov();
    } catch (e) {
      setChybaStartu(
        e instanceof OdmitnutoServerem
          ? (e.duvod ?? 'Server zrušení odmítl.')
          : 'Nepovedlo se zrušit — zkus to znovu.',
      );
    } finally {
      setRusi(false);
    }
  };

  const otevriVyber = async (cislo: number, ukon: ProCo['ukon']) => {
    setVyber({ cislo, ukon });
    setVyberLode(null);
    setChybaStartu(null);
    try {
      const zapis = await nactiZapis(slug, zavod, cislo);
      setVyberLode(zapis?.lode ?? []);
    } catch {
      setVyberLode([]);
      setChybaStartu('Nepovedlo se načíst lodě. Zkus to znovu.');
    }
  };

  const oznacLod = async (prihlaskaId: number) => {
    if (vyber === null || vyberPosila !== null) return;
    setVyberPosila(prihlaskaId);
    try {
      if (vyber.ukon === 'Ocs') {
        await zapisPredcasnyStart(slug, zavod, vyber.cislo, prihlaskaId);
      } else {
        await ulozTrest(slug, zavod, vyber.cislo, prihlaskaId, vyber.ukon);
      }
      setVyber(null);
      obnov();
    } catch (e) {
      setChybaStartu(
        e instanceof OdmitnutoServerem
          ? (e.duvod ?? 'Server zápis odmítl.')
          : 'Nepovedlo se zapsat — zkus to znovu.',
      );
    } finally {
      setVyberPosila(null);
    }
  };

  // Odložení a odvolání jdou do téže fronty jako spuštění.
  const ukon = veliNekde(ja ?? null)
    ? (cislo: number, druh: UkonProcedury) => zadej(cislo, druh)
    : undefined;

  const kategorie = [...new Set(data?.poradi.map((v) => v.kategorie) ?? [])];

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={obnov} tintColor={t.voda} />}>

      {nacita ? <Nacitani /> : null}
      {chyba ? <Chyba text={chyba} onZkusZnovu={obnov} /> : null}
      {!nacita && !chyba && !data ? <Prazdno text="Regata není zveřejněná." /> : null}

      {data ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            <Nadpis>{data.nazev}</Nadpis>
            <View style={{ marginBottom: 16 }}>
              <Stav stav={data.stav} />
            </View>
          </View>
          <Text style={{ color: t.tlumeny, marginTop: -8, marginBottom: 8 }}>
            {rozsah(data.datum, data.datumKonce)}
            {data.poradatel ? ` · pořádá ${data.poradatel}` : ''}
          </Text>

          {/* Panel startu se ukáže sám, jen když se zrovna startuje nebo jede.
              Jindy nevykreslí nic — stránka regaty tím zůstává tím, čím je. */}
          <Odpocet
            rozjizdky={rozjizdky}
            delkaProceduryMin={data.delkaProceduryMin}
            naSpusteni={spustit}
            naStartu={ohlas}
            naUkon={ukon}
            naOhlaseni={ohlasit}
            naCasStartu={zapisCasStartu}
            naPredcasnyStart={veliNekde(ja ?? null) ? (c) => otevriVyber(c, 'Ocs') : undefined}
            naTrest={veliNekde(ja ?? null) ? otevriVyber : undefined}
            tresty={tresty ?? undefined}
            naVykonano={veliNekde(ja ?? null) ? zapisVykonani : undefined}
            naZruseni={veliNekde(ja ?? null) ? setRuseni : undefined}
            naCil={
              veliNekde(ja ?? null)
                ? () => router.push(`/serie/${slug}/zavody/${zavod}/cil`)
                : undefined
            }
            naTrat={
              veliNekde(ja ?? null)
                ? () => router.push(`/serie/${slug}/zavody/${zavod}/trat`)
                : undefined
            }
            chyba={chybaStartu}
            nedoslano={ceka !== null}
          />

          {data.vysledkySkryte ? (
            // Ročník, u kterého se výsledky jednotlivých regat veřejně
            // neukazují. Bez téhle věty vypadá odjetá regata jako ta, co se
            // nejela. Pořadí seriálu veřejné zůstává, odkaz na něj je
            // o obrazovku výš.
            <>
              <Prazdno text={
                'Výsledky jednotlivých regat tohohle ročníku nejsou zveřejněné — ' +
                'vznikaly ručně a jsou v nich nesrovnalosti. Platí konečné pořadí seriálu.'} />
              <PrihlaseneLode lode={data.lode} />
            </>
          ) : data.poradi.length === 0 ? (
            <>
              <Prazdno text={procNejsouVysledky(data.stav)} />
              <PrihlaseneLode lode={data.lode} />
            </>
          ) : (
            kategorie.map((k) => (
              <View key={k}>
                <Sekce>{k}</Sekce>
                {data.poradi
                  .filter((v) => v.kategorie === k)
                  .sort((a, b) => a.poradi - b.poradi)
                  .map((v) => (
                    <Lod key={v.lod} vysledek={v} zavod={data} />
                  ))}
              </View>
            ))
          )}

          {data.poradi.length > 0 ? (
            <Text style={{ color: t.tlumeny, fontSize: 13, marginTop: 16 }}>
              Čísla pod jménem jsou body z jednotlivých rozjížděk — pořadí v této kategorii, ne
              v celém poli. Přeškrtnutá se do součtu nepočítá.
            </Text>
          ) : null}
        </>
      ) : null}
      {/* <b>Která loď startovala předčasně.</b> Druhý krok schválně:
          OCS je nevratný zápis do výsledku a na startovní lodi se klepe
          palcem (Filip, 28. 10. 2026 o nevratných úkonech). Seznam je
          ze zápisu rozjížďky, takže nese `prihlaskaId`, kterým se
          výsledek adresuje. */}
      <Modal
        visible={vyber !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setVyber(null)}>
        {/* Klepnutí vedle zavírá — tatáž plocha jako v nabídce. Rozměry
            jsou psané, ne flexem, aby je přečetla kontrola terčů. */}
        <Pressable
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
          }}
          onPress={() => setVyber(null)}
        />
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: '75%',
            backgroundColor: t.papir,
            borderTopWidth: 1,
            borderColor: t.linka,
            paddingBottom: 24,
          }}>
          <Text
            style={{
              color: t.text,
              fontSize: 17,
              fontWeight: '700',
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 4,
            }}>
            {vyber?.ukon === 'Ocs' ? 'Předčasný start' : 'Otáčkový trest'} — která loď?
          </Text>
          <Text style={{ color: t.tlumeny, paddingHorizontal: 16, paddingBottom: 8 }}>
            {vyber?.ukon === 'Ocs'
              ? 'Zapíše se OCS. Opravit se to dá v zápisu výsledků.'
              : `Zapíše se ${vyber?.ukon === 'Otacka360' ? 'jedna otáčka' : 'dvě otáčky'}. Pořadí to nemění.`}
          </Text>

          {vyberLode === null ? (
            <Nacitani />
          ) : (
            <ScrollView>
              {vyberLode.map((l) => (
                <Radek
                  key={l.prihlaskaId}
                  text={l.lod}
                  popis={l.kategorie ?? undefined}
                  hodnota={vyberPosila === l.prihlaskaId ? 'zapisuje se' : (l.kod ?? undefined)}
                  onPress={() => void oznacLod(l.prihlaskaId)}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>
      <Modal
        visible={ruseni !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRuseni(null)}>
        <Pressable
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
          }}
          onPress={() => setRuseni(null)}
        />
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: t.papir,
            borderTopWidth: 1,
            borderColor: t.linka,
            paddingBottom: 24,
          }}>
          <Text
            style={{
              color: t.text,
              fontSize: 17,
              fontWeight: '700',
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 4,
            }}>
            Zrušit rozjížďku — proč?
          </Text>
          <Text style={{ color: t.tlumeny, paddingHorizontal: 16, paddingBottom: 8 }}>
            Rozjížďka přestane platit a nejede se. Důvod uvidí i posádky.
          </Text>
          {DUVODY_ZRUSENI.map((d) => (
            <Radek key={d} text={d} onPress={() => void zrus(d)} />
          ))}
        </View>
      </Modal>
    </ScrollView>
  );
}

function Lod({ vysledek, zavod }: { vysledek: VysledekZavodu; zavod: ZavodDetail }) {
  const t = useTheme();

  // Kód se ukazuje u bodů, ne místo nich: body platí, kód říká, odkud jsou.
  const kod = (cislo: number) =>
    zavod.rozjizdky
      .find((r) => r.cislo === cislo)
      ?.vysledky.find((v) => v.lod === vysledek.lod)?.kod;

  return (
    <Karta>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ color: t.tlumeny, width: 28, fontVariant: ['tabular-nums'] }}>
          {vysledek.poradi}.
        </Text>
        <Text style={{ color: t.text, fontWeight: '600', flex: 1 }}>{vysledek.lod}</Text>
        <Text
          style={{ color: t.text, fontWeight: '700', fontSize: 18, fontVariant: ['tabular-nums'] }}>
          {body(vysledek.body)}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 10 }}>
        {vysledek.rozjizdky.map((r) => (
          <View key={r.cislo} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
            <Text
              style={{
                color: t.tlumeny,
                fontSize: 13,
                fontVariant: ['tabular-nums'],
                textDecorationLine: r.skrtnuto ? 'line-through' : 'none',
              }}>
              {body(r.body)}
            </Text>
            {kod(r.cislo) ? (
              <Text style={{ color: t.tlumeny, fontSize: 10 }}>{kod(r.cislo)!.toUpperCase()}</Text>
            ) : null}
          </View>
        ))}
      </View>
    </Karta>
  );
}

/** U regaty, která se teprve pojede, je seznam lodí jediné, co je známo. */
/**
 * Kdo na regatě startuje, a kdo je zatím jen přihlášený.
 *
 * <b>Startovní listina je ten, kdo startuje</b> (nález R10 oponentury
 * rozhodčího; Filip 27. 10. 2026: *„To bude startovní listina"*). Web to
 * má takhle od 28. 10. 2026 a appka je **tytéž dveře do téhož produktu**,
 * takže se to nesmí rozejít: do té doby tu stál jeden seznam všech lodí,
 * ve kterém vyloučená loď vypadala stejně jako ta, co za chvíli
 * odstartuje.
 *
 * Loď *„čeká na potvrzení"* ani *„vyloučená ze závodu"* na listině nemá co
 * dělat — ale zmizet nesmí, jinak kapitán nepozná, že jeho přihláška
 * dorazila. Proto dva seznamy pod sebou, stejně jako na webu.
 */
function PrihlaseneLode({ lode }: { lode: UcastLodi[] }) {
  const t = useTheme();
  if (lode.length === 0) return null;

  // Starší API pole `potvrzena` nemá; tam loď platí, jako dřív.
  const startuje = (l: UcastLodi) => !l.vyloucena && l.potvrzena !== false;
  const listina = lode.filter(startuje);
  const prihlasky = lode.filter((l) => !startuje(l));

  // Třídy jen z listiny: třída, ve které nikdo nestartuje, by jinak dala
  // prázdný nadpis a loď by zůstala jen v seznamu pod ním.
  const kategorie = [...new Set(listina.map((l) => l.kategorie))];

  return (
    <>
      <Sekce>Startovní listina ({listina.length})</Sekce>
      {kategorie.map((k) => (
        <View key={k} style={{ marginBottom: 12 }}>
          <Text style={{ color: t.tlumeny, fontSize: 13, marginBottom: 6 }}>{k}</Text>
          {listina
            .filter((l) => l.kategorie === k)
            .map((l) => (
              <View key={l.lod} style={{ flexDirection: 'row', paddingVertical: 4 }}>
                <Text style={{ color: t.text, flex: 1 }}>{l.lod}</Text>
                <Text style={{ color: t.tlumeny, fontSize: 13 }}>{l.kormidelnik ?? '—'}</Text>
              </View>
            ))}
        </View>
      ))}

      {prihlasky.length > 0 ? (
        <>
          <Sekce>Přihlášené, ještě ne na listině ({prihlasky.length})</Sekce>
          {prihlasky.map((l) => (
            <View key={l.lod} style={{ flexDirection: 'row', paddingVertical: 4 }}>
              <Text style={{ color: t.text, flex: 1 }}>{l.lod}</Text>
              <Text style={{ color: t.tlumeny, fontSize: 13 }}>
                {l.vyloucena ? 'vyloučená ze závodu' : 'čeká na potvrzení'}
              </Text>
            </View>
          ))}
        </>
      ) : null}
    </>
  );
}
