import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { Odpocet } from '@/components/odpocet';
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
  ohlasRozjizdku,
  ohlasStart,
  OdmitnutoServerem,
  provedProceduru,
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
import { PROCEDURA_S } from '@/lib/start';
import { rozsah } from '@/lib/datum';

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

  // Odložení a odvolání jdou do téže fronty jako spuštění.
  const ukon = veliNekde(ja ?? null)
    ? (cislo: number, druh: UkonProcedury) => zadej(cislo, druh)
    : undefined;

  const kategorie = [...new Set(data?.poradi.map((v) => v.kategorie) ?? [])];

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={obnov} tintColor={t.voda} />}>
      <Stack.Screen options={{ title: data?.nazev ?? 'Regata' }} />

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
            naCil={
              veliNekde(ja ?? null)
                ? () => router.push(`/serie/${slug}/zavody/${zavod}/cil`)
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
          {vysledek.body}
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
              {r.body}
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
