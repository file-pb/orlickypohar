import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Chyba, Nacitani, Nadpis, Prazdno, Sekce } from '@/components/ui';
import type { Barvy } from '@/constants/theme';
import { useData } from '@/hooks/use-data';
import { usePoloha } from '@/hooks/use-poloha';
import { useTheme } from '@/hooks/use-theme';
import {
  nactiPrvkySpravy,
  nactiRozestavenouTrat,
  type PrvekSpravy,
} from '@/lib/api';
import { pismoNaVyplni } from '@/lib/kontrast';
import {
  NAZVY_SMERU,
  SMERY,
  TYPY,
  VOLBY,
  ZNACENI,
  jmenaBodu,
  kolmice,
  patriSmer,
  type Predvolba,
  type TypStavby,
  type Volba,
} from '@/lib/stavba-prvku';
import {
  cekajici,
  novyKlic,
  zahod,
  zarad,
  type CekajiciPrvek,
  type PrvekKPostaveni,
} from '@/lib/stavba/fronta';
import { odesliFrontu } from '@/lib/stavba/odesilani';
import { popisPresnosti, posud, type Fix } from '@/lib/stavba/poloha';

/**
 * Stavitel trati: pípni, popojeď, pípni.
 *
 * <b>Zadání</b> (Filip, 10. 10. 2026): *„Stavitel bude potřebovat kliknout
 * na typ prvku, dostat se do obrazovky pro daný typ a tam to jen pípnout,
 * zvolit atributy, popojet, pípnout."* A proč to má být appka a ne web:
 * *„Jede a tahá se se závažím a lany na motoráku, není dobré ho zatěžovat
 * formem a textíky."*
 *
 * <para>
 * <b>Pravidla průvodce jsou ve sdíleném modulu</b> (`lib/stavba-prvku.ts`,
 * kopie z `packages/stavba/`), tentýž, ze kterého staví web. Kolik bodů
 * který typ potřebuje, jak se jmenují a jaké předpisy dávají smysl, tedy
 * nejde v appce říct jinak než na webu. Tahle obrazovka je jen ruce.
 * </para>
 *
 * <para>
 * <b>Co appka přidává nad prohlížeč, je fronta</b>, ne obrazovky. Pípat
 * umí i prohlížeč na telefonu; co neumí, je podržet prvek, když není
 * signál, a odeslat ho, až bude. Prvek se proto staví jedním požadavkem
 * (`POST …/trat/prvky/postav`) a čeká v SQLite.
 * </para>
 *
 * <para>
 * <b>Co obrazovka vědomě neumí:</b> fotku u značky (byla by to nativní
 * závislost, tedy posunutý otisk a ruční přeinstalace APK u všech),
 * výběr bodu z mapy (ten vznikl pro člověka u počítače — na vodě telefon
 * měří) a přenastavení či sebrání značky (cesta pro zvláštní případ, ta
 * zůstává na webu).
 * </para>
 */

/** Jak se o prvku mluví v seznamu. Táž slova jako na webu. */
const NAZVY_TYPU: Record<string, string> = {
  OtocnaBoje: 'otočná bóje',
  PrujezdniBoje: 'průjezdní bóje',
  Brana: 'brána',
  OtocnaBrana: 'otočná brána',
  OtocnaZona: 'otočná zóna',
  Odskok: 'otočná s odskokem',
  Start: 'start',
  Cil: 'cíl',
};

function popisPrvku(p: PrvekSpravy): string {
  const strana = p.strana === 'PoLeve' ? 'levobokem' : p.strana === 'PoPrave' ? 'pravobokem' : null;
  const znacky = p.b ? `${p.a.nazev} – ${p.b.nazev}` : p.a.nazev;
  return [NAZVY_TYPU[p.typ ?? ''] ?? p.typ, znacky, strana].filter(Boolean).join(' · ');
}

/** Výchozí značení: naše bóje. Tatáž předvolba, jakou nabízí web. */
const VYCHOZI_ZNACENI = ZNACENI.find((z) => z.id === 'NaseBoje')!;

export default function StavbaTrati() {
  const { slug, zavod } = useLocalSearchParams<{ slug: string; zavod: string }>();
  const router = useRouter();
  const t = useTheme();
  const s = styly(t);

  const { fix, opravneni } = usePoloha(true);

  const { data: zavodData, chyba: chybaZavodu, nacita, obnov } = useData(
    useCallback(() => nactiRozestavenouTrat(slug, zavod), [slug, zavod]),
  );

  const [prvky, setPrvky] = useState<PrvekSpravy[] | null>(null);
  const [fronta, setFronta] = useState<CekajiciPrvek[]>([]);
  const [hlaska, setHlaska] = useState<string | null>(null);
  const [posila, setPosila] = useState(false);

  // Průvodce. Stav je schválně plochý: každý krok plyne z toho, co je
  // vyplněné, takže se nedá dostat do stavu, který nikam nevede.
  const [typ, setTyp] = useState<TypStavby | null>(null);
  const [volba, setVolba] = useState<Volba | null>(null);
  const [znaceni, setZnaceni] = useState<Predvolba>(VYCHOZI_ZNACENI);
  const [body, setBody] = useState<Fix[]>([]);
  const [smer, setSmer] = useState<(typeof SMERY)[number] | null>(null);

  const nactiPrvky = useCallback(async () => {
    setPrvky(await nactiPrvkySpravy(slug, zavod));
  }, [slug, zavod]);

  const obnovFrontu = useCallback(() => {
    setFronta(cekajici(slug, zavod));
  }, [slug, zavod]);

  useEffect(() => {
    void nactiPrvky();
    obnovFrontu();
  }, [nactiPrvky, obnovFrontu]);

  /**
   * Zkusí vyprázdnit frontu. <b>Volá se i při otevření obrazovky</b>:
   * stavitel se k signálu vrátí dřív, než postaví další prvek, a čekat
   * s odesláním na jeho další klepnutí by nedávalo smysl.
   */
  const posliCoJde = useCallback(async () => {
    if (posila) return;
    setPosila(true);
    try {
      const vysledek = await odesliFrontu(slug, zavod);
      obnovFrontu();
      if (vysledek.odeslano > 0) await nactiPrvky();
    } finally {
      setPosila(false);
    }
  }, [slug, zavod, posila, obnovFrontu, nactiPrvky]);

  useEffect(() => {
    void posliCoJde();
    // Jen při otevření obrazovky; dál se posílá po každém postaveném prvku.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, zavod]);

  const zamcena = zavodData?.stav === 'Prijato';
  const posudek = posud(fix, Date.now());

  // Kolikátý prvek se staví — jen do automatických jmen. Počítá se
  // i s tím, co čeká ve frontě: jinak by dvě značky postavené bez signálu
  // dostaly totéž jméno.
  const dalsiPoradi = (prvky?.length ?? 0) + fronta.length + 1;
  const jmena = typ ? jmenaBodu(typ, volba, dalsiPoradi) : [];
  const dalsiBod = typ ? typ.body[body.length] : null;
  const vsechnyBody = typ ? body.length >= typ.body.length : false;
  const cekaNaSmer = typ ? patriSmer(typ) && vsechnyBody && smer === null : false;

  const vycisti = () => {
    setTyp(null);
    setVolba(null);
    setZnaceni(VYCHOZI_ZNACENI);
    setBody([]);
    setSmer(null);
  };

  /**
   * Zapíše bod. <b>Poloha se bere znovu při každém doteku</b> — mezi
   * dvěma body se popojede, takže držet jedno měření by druhou značku
   * položilo tam, kde stála první. Jestli je fix čerstvý, rozhoduje
   * `posud`, ne tahle funkce.
   */
  const pipni = () => {
    if (!fix || !posudek.ok || !typ) return;
    setBody([...body, fix]);
    setHlaska(null);
  };

  /** Složí prvek, zařadí ho do fronty a hned zkusí odeslat. */
  const postav = async () => {
    if (!typ || !volba || !vsechnyBody) return;

    const vstup: PrvekKPostaveni = {
      klic: novyKlic(),
      typ: volba.typ,
      body: body.map((b, i) => ({
        nazev: jmena[i] ?? `značka ${dalsiPoradi}`,
        sirka: b.sirka,
        delka: b.delka,
        // Přesnost hlásí jen měření. Když ji telefon neudá, neposílá se
        // nic — vymyslet k poloze metry by byla lež v záznamu.
        presnostM: b.presnostM,
        zdroj: 'Telefon',
        barva: znaceni.barva,
        tvar: znaceni.tvary[0] ?? null,
        znaceni: znaceni.id,
        // Kdy se značka postavila, ne kdy to doputovalo na server.
        postavenaV: new Date(b.kdy).toISOString(),
      })),
      strana: volba.strana,
      smer: patriSmer(typ) ? smer : null,
      druhStartu: volba.druhStartu ?? null,
    };

    const popis = `${dalsiPoradi}. ${volba.detail}`;
    zarad(slug, zavod, popis, vstup);
    obnovFrontu();
    vycisti();
    setHlaska(`${popis} — zařazeno.`);
    await posliCoJde();
  };

  const zahodCekajici = (id: number) => {
    zahod(id);
    obnovFrontu();
    void posliCoJde();
  };

  if (nacita && !zavodData && prvky === null) return <Nacitani />;
  if (chybaZavodu && !zavodData && prvky === null) {
    return <Chyba text={chybaZavodu} onZkusZnovu={obnov} />;
  }

  const stojici = fronta.find((f) => f.odmitnuto) ?? null;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={() => {
            void nactiPrvky();
            void posliCoJde();
            obnov();
          }}
          tintColor={t.voda}
        />
      }>
      <Nadpis naZpet={() => router.back()} zpetKam="Stavba trati — zpět na regatu">
        Stavba trati
      </Nadpis>

      {/* Zámek se ukazuje nahoře, ne až jako chyba od serveru: dozvědět se
          o něm z odmítnutého prvku je na vodě o dvě klepnutí navíc — a ten
          prvek by do té doby seděl ve frontě a držel ji. */}
      {zamcena ? (
        <View style={[s.pas, { backgroundColor: t.zvyrazneni, borderColor: t.vystraha }]}>
          <Text style={{ color: t.text, fontWeight: '600' }}>
            Trať je přijatá rozhodčím a zamčená.
          </Text>
          <Text style={{ color: t.tlumeny, marginTop: 2 }}>
            Stavět do ní nejde. Odemkne ji přestavba — ta se veřejně hlásí.
          </Text>
        </View>
      ) : null}

      {opravneni === 'ne' ? (
        <View style={[s.pas, { backgroundColor: t.zvyrazneni, borderColor: t.stavZruseny }]}>
          <Text style={{ color: t.text, fontWeight: '600' }}>Appka nemá přístup k poloze.</Text>
          <Text style={{ color: t.tlumeny, marginTop: 2 }}>
            Bez ní se pípnout nedá. Povol ji v nastavení telefonu.
          </Text>
        </View>
      ) : null}

      {fronta.length > 0 ? (
        <View style={[s.pas, { backgroundColor: t.papir, borderColor: t.linka }]}>
          <Text style={{ color: t.text, fontWeight: '600' }}>
            {fronta.length === 1 ? '1 prvek čeká na odeslání' : `${fronta.length} prvků čeká na odeslání`}
            {posila ? ' — posílám…' : ''}
          </Text>
          {stojici ? (
            <>
              <Text style={{ color: t.stavZruseny, marginTop: 4 }}>{stojici.potiz}</Text>
              <Text style={{ color: t.tlumeny, marginTop: 2, fontSize: 13 }}>
                Dokud tenhle prvek stojí, čeká i všechno za ním — pořadí na trati
                určuje server podle pořadí, v jakém prvky dorazí.
              </Text>
              <Pressable onPress={() => zahodCekajici(stojici.id)} style={s.zahodit}>
                <Text style={{ color: t.stavZruseny, fontWeight: '600' }}>
                  Zahodit „{stojici.popis}"
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      ) : null}

      {hlaska ? <Text style={{ color: t.jede, marginBottom: 12 }}>{hlaska}</Text> : null}

      {zamcena ? null : (
        <>
          <Sekce>
            {!typ
              ? 'Co stavíš'
              : !volba
                ? 'Jak se to jede'
                : cekaNaSmer
                  ? 'Kterým směrem'
                  : vsechnyBody
                    ? 'Hotovo?'
                    : (dalsiBod?.vyzva ?? 'Pípni')}
          </Sekce>

          {/* 1. Typ říká, kolik bodů se pípá — ne čím prvek je. To
              rozhodne až předpis v dalším kroku. */}
          {!typ ? (
            <View>
              {TYPY.map((x) => (
                <Pressable
                  key={x.id}
                  onPress={() => setTyp(x)}
                  style={({ pressed }) => [
                    s.velke,
                    { backgroundColor: t.papir, borderColor: t.linka, opacity: pressed ? 0.6 : 1 },
                  ]}>
                  <Text style={{ color: t.text, fontSize: 18, fontWeight: '600' }}>{x.jmeno}</Text>
                  <Text style={{ color: t.tlumeny, marginTop: 2 }}>{x.popis}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {/* 2. Předpis. Volí se před pípáním, protože na něm závisí
              jméno značky — a to se po zápisu nepřepisuje. */}
          {typ && !volba ? (
            <View>
              {VOLBY[typ.jak].map((v) => (
                <Pressable
                  key={v.jmeno}
                  onPress={() => setVolba(v)}
                  style={({ pressed }) => [
                    s.velke,
                    { backgroundColor: t.papir, borderColor: t.linka, opacity: pressed ? 0.6 : 1 },
                  ]}>
                  <Text style={{ color: t.text, fontSize: 18, fontWeight: '600' }}>{v.jmeno}</Text>
                  <Text style={{ color: t.tlumeny, marginTop: 2 }}>{v.detail}</Text>
                </Pressable>
              ))}
              <Pressable onPress={vycisti} style={s.zpet}>
                <Text style={{ color: t.tlumeny }}>Zpátky na výběr</Text>
              </Pressable>
            </View>
          ) : null}

          {/* 3. Pípání. Značení má rozumnou výchozí hodnotu, takže nic
              nečeká na volbu — tlačítko je odemčené od začátku. */}
          {typ && volba && !vsechnyBody ? (
            <View>
              <View style={s.znaceni}>
                {ZNACENI.map((z) => (
                  <Pressable
                    key={z.id}
                    onPress={() => setZnaceni(z)}
                    style={[
                      s.chip,
                      {
                        borderColor: znaceni.id === z.id ? t.voda : t.linka,
                        backgroundColor: znaceni.id === z.id ? t.voda : t.papir,
                      },
                    ]}>
                    <Text
                      style={{
                        color: znaceni.id === z.id ? pismoNaVyplni(t, t.voda) : t.tlumeny,
                        fontWeight: '600',
                        fontSize: 13,
                      }}>
                      {z.jmeno}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={{ color: t.tlumeny, marginBottom: 4 }}>
                {jmena[body.length]} · {popisPresnosti(fix)}
              </Text>
              {!posudek.ok ? (
                <Text style={{ color: t.vystraha, marginBottom: 8 }}>{posudek.proc}</Text>
              ) : posudek.varovani ? (
                <Text style={{ color: t.vystraha, marginBottom: 8 }}>{posudek.varovani}</Text>
              ) : null}

              <Pressable
                onPress={pipni}
                disabled={!posudek.ok}
                style={({ pressed }) => [
                  s.pipnout,
                  {
                    backgroundColor: posudek.ok ? t.voda : t.linka,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}>
                <Text style={{ color: pismoNaVyplni(t, posudek.ok ? t.voda : t.linka), fontSize: 22, fontWeight: '700' }}>
                  Pípnout
                </Text>
              </Pressable>

              <Pressable onPress={vycisti} style={s.zpet}>
                <Text style={{ color: t.tlumeny }}>Zahodit rozdělaný prvek</Text>
              </Pressable>
            </View>
          ) : null}

          {/* 4. Růžice u startu a cíle. Nabízí dvě možnosti, ne osm:
              šipka je vždycky kolmá na linii, takže třetí by nemohla
              být správně. */}
          {typ && volba && cekaNaSmer ? (
            <View>
              {(kolmice(body[0], body[1]) ?? []).map((sm) => (
                <Pressable
                  key={sm}
                  onPress={() => setSmer(sm)}
                  style={({ pressed }) => [
                    s.velke,
                    { backgroundColor: t.papir, borderColor: t.linka, opacity: pressed ? 0.6 : 1 },
                  ]}>
                  <Text style={{ color: t.text, fontSize: 18, fontWeight: '600' }}>
                    {NAZVY_SMERU[sm]}
                  </Text>
                </Pressable>
              ))}
              {kolmice(body[0], body[1]) === null ? (
                <Prazdno text="Oba body leží skoro na sobě, takže z nich linie nevyjde. Pípni je znovu dál od sebe." />
              ) : null}
              <Pressable onPress={vycisti} style={s.zpet}>
                <Text style={{ color: t.tlumeny }}>Zahodit rozdělaný prvek</Text>
              </Pressable>
            </View>
          ) : null}

          {/* 5. Potvrzení. U typů bez růžice by prvek mohl vzniknout
              posledním pípnutím, ale jedno klepnutí navíc je proti
              špatně postavenému prvku nic. */}
          {typ && volba && vsechnyBody && !cekaNaSmer ? (
            <View>
              <Text style={{ color: t.text, marginBottom: 8 }}>
                {dalsiPoradi}. {volba.jmeno.toLowerCase()} — {jmena.join(' a ')}
                {smer ? `, ${NAZVY_SMERU[smer]}` : ''}
              </Text>
              <Pressable
                onPress={() => void postav()}
                style={({ pressed }) => [
                  s.pipnout,
                  { backgroundColor: t.jede, opacity: pressed ? 0.7 : 1 },
                ]}>
                <Text style={{ color: pismoNaVyplni(t, t.jede), fontSize: 20, fontWeight: '700' }}>
                  Postavit prvek
                </Text>
              </Pressable>
              <Pressable onPress={vycisti} style={s.zpet}>
                <Text style={{ color: t.tlumeny }}>Zahodit rozdělaný prvek</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      )}

      <Sekce>Co už stojí</Sekce>
      {prvky === null && fronta.length === 0 ? (
        <Prazdno text="Trať se zatím nenačetla. Bez signálu se stavět dá, jen nevidíš, co na ní je." />
      ) : (prvky?.length ?? 0) + fronta.length === 0 ? (
        <Prazdno text="Na trati zatím nic nestojí. Začni prvním prvkem." />
      ) : (
        <>
          {(prvky ?? []).map((p) => (
            <View key={p.id} style={[s.radek, { borderColor: t.linka, backgroundColor: t.papir }]}>
              <Text style={{ color: t.text }}>
                {p.poradi}. {popisPrvku(p)}
              </Text>
            </View>
          ))}
          {fronta.map((f) => (
            <View
              key={f.id}
              style={[s.radek, { borderColor: t.linka, backgroundColor: t.zvyrazneni }]}>
              <Text style={{ color: t.text }}>{f.popis}</Text>
              <Text style={{ color: f.odmitnuto ? t.stavZruseny : t.tlumeny, fontSize: 13 }}>
                {f.odmitnuto ? (f.potiz ?? 'server prvek odmítl') : 'čeká na odeslání'}
              </Text>
            </View>
          ))}
        </>
      )}

      {posila ? <ActivityIndicator color={t.tlumeny} style={{ marginTop: 12 }} /> : null}
    </ScrollView>
  );
}

const styly = (t: Barvy) =>
  StyleSheet.create({
    pas: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    },
    // Velké cíle schválně: na palubě v rukavicích se do malého tlačítka
    // nikdo netrefí a gesta jsou v nich ještě horší než klepání.
    velke: {
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 18,
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    pipnout: {
      borderRadius: 14,
      paddingVertical: 24,
      alignItems: 'center',
      marginTop: 4,
    },
    zpet: {
      paddingVertical: 14,
      alignItems: 'center',
    },
    znaceni: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 10,
    },
    chip: {
      borderWidth: 1,
      borderRadius: 999,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    radek: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
      marginBottom: 6,
    },
    zahodit: {
      paddingVertical: 12,
      marginTop: 4,
    },
  });
