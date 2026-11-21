import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { OsaTrati, RadkaTrati } from '@/components/radka-trati';
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
  opakovaniUJmena,
  predpisRadky,
  stavRadky,
  znackyZTrati,
  type ZnackaNaOse,
} from '@/lib/radka-trati';
import {
  NAZVY_SMERU,
  SMERY,
  azimut,
  vzdalenostM,
  dlazdiceNabidky,
  ZNACENI,
  jmenaBodu,
  vyzvaBodu,
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

  // Která značka má otevřený detail. Zatím jen fakta — ta jsou na vodě ta
  // podstatná část, protože se předčítají do vysílačky (rozhodnutí 7).
  const [vybrana, setVybrana] = useState<ZnackaNaOse | null>(null);

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
  // Výzva smí záviset na předpisu (nález J5), proto ne `dalsiBod.vyzva`.
  const dalsiVyzva = typ ? vyzvaBodu(typ, volba, body.length) : null;
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
              : cekaNaSmer
                ? 'Kterým směrem'
                : vsechnyBody
                  ? 'Hotovo?'
                  : (dalsiVyzva ?? dalsiBod?.vyzva ?? 'Pípni')}
          </Sekce>

          {/* 1. <b>Jedna úplná věc na dlaždici</b> (Filip, 18. 11. 2026;
              nález 2 návrhu konzilia). Dřív to byly dva kroky — nejdřív
              kolik bodů se pípá, pak co loď udělá. Jenže stavitel veze
              v lodi žlutou bóji a ví, že to bude otočná, kterou se jede
              levobokem: jedna věc, ne dvě. „Jedna značka" byla kategorie
              vymyšlená kvůli zápisu, ne vlastnost trati.

              <b>Dva sloupce, protože dvanáct řádků se nevejde.</b> Ani bez
              mezer: 12 × 56 je 672 pt proti 596 volným. Zmenšit řádek na
              44 pt by stlačilo rozteč z 68 na 48 — a na motoráku je jeden
              člověk, který zároveň kormidluje (Filip, 18. 11. 2026), takže
              se terče zmenšovat nebudou. V mřížce vyjde seznam na zhruba
              400 pt a neroluje; rolování je v rukavicích nejhorší možná
              interakce, protože nechtěné klepnutí během něj zapíše prvek.

              Pořadí dlaždic je hitparáda podle použití — žije v `NABIDKA`
              ve sdílených pravidlech i s tím, že je to zatím odhad. */}
          {!typ ? (
            <View style={s.nabidka}>
              {dlazdiceNabidky().map((d) => (
                <Pressable
                  key={d.jmeno}
                  onPress={() => {
                    setTyp(d.typ);
                    setVolba(d.volba);
                  }}
                  style={({ pressed }) => [
                    s.dlazdice,
                    { backgroundColor: t.papir, borderColor: t.linka, opacity: pressed ? 0.6 : 1 },
                  ]}>
                  <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>{d.jmeno}</Text>
                  <Text style={{ color: t.tlumeny, fontSize: 12, marginTop: 2 }}>{d.detail}</Text>
                </Pressable>
              ))}
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
          {/* <b>Osa ukazuje značky, ne průjezdy</b> (rozhodnutí 3): táž
              bóje je ve vodě jedna, i když se po ní jede dvakrát. */}
          <OsaTrati>
            {znackyZTrati(prvky ?? []).map((z) => (
              <RadkaTrati
                key={z.boje.id}
                jmeno={z.boje.nazev}
                predpis={predpisRadky(z.predpisy)}
                opakovani={opakovaniUJmena(z.prujezdu)}
                barva={z.boje.barva ?? undefined}
                tvar={z.boje.tvar ?? undefined}
                znaceni={z.boje.znaceni ?? undefined}
                stav={stavRadky({
                  zamceno: zamcena,
                  veFronte: false,
                  chybiDruhyKonec: z.chybiDruhyKonec,
                  zPlanu: z.boje.zdroj === 'Mapa',
                  bezFotky: z.boje.fotek === 0,
                })}
                onPress={() => setVybrana(z)}
              />
            ))}
          </OsaTrati>
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

      {/* <b>Fakta nahoře, protože se předčítají</b> (rozhodnutí 7): když se
          rozhodčí na vysílačce zeptá na azimut, čte se to vestoje
          v houpající se lodi a nesmí se k tomu rolovat. Akce detailu
          (přesun, fotka, sebrání, barva, pořadí, mazání) zatím nejsou —
          jejich pravidla stojí v `lib/detail-prvku.ts` i s testy. */}
      <Modal visible={vybrana !== null} transparent animationType="fade">
        <Pressable style={s.stin} onPress={() => setVybrana(null)}>
          <View style={[s.detail, { backgroundColor: t.papir, borderColor: t.linka }]}>
            <Text style={[s.detailJmeno, { color: t.text }]}>{vybrana?.boje.nazev}</Text>
            {vybrana ? (
              <Text style={[s.detailRadek, { color: t.tlumeny }]}>
                {predpisRadky(vybrana.predpisy)}
                {vybrana.prujezdu > 1 ? ` · ${opakovaniUJmena(vybrana.prujezdu)}` : ''}
              </Text>
            ) : null}
            {vybrana ? (
              <Text style={[s.detailFakt, { color: t.text }]}>
                {vybrana.boje.sirka.toFixed(5)}, {vybrana.boje.delka.toFixed(5)}
              </Text>
            ) : null}
            {vybrana ? (
              <Text style={[s.detailRadek, { color: t.tlumeny }]}>
                {vybrana.boje.zdroj === 'Mapa' ? 'odečteno z mapy' : 'změřeno telefonem'}
                {' · '}
                {vybrana.boje.fotek === 0
                  ? 'bez fotky'
                  : `${vybrana.boje.fotek} ${vybrana.boje.fotek === 1 ? 'fotka' : 'fotky'}`}
              </Text>
            ) : null}
            {/* Azimut číslicemi, protože se čtou do vysílačky. Bez fixu
                se nekreslí nic — nepravdivé číslo je horší než žádné. */}
            {vybrana && fix ? (
              <Text style={[s.detailFakt, { color: t.text }]}>
                {Math.round(azimut(fix, vybrana.boje)).toString().padStart(3, '0')}° ·{' '}
                {Math.round(vzdalenostM(fix, vybrana.boje))} m odsud
              </Text>
            ) : null}
            <Pressable
              onPress={() => setVybrana(null)}
              style={({ pressed }) => [s.zavrit, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={[s.zavritText, { color: t.voda }]}>Zavřít</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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
    // Mřížka o dvou sloupcích. `flexBasis` pod polovinou plus `flexGrow`
    // nechá dvojici vyplnit řádek a třetí dlaždici zalomit; `gap` drží
    // odstup, který v rukavicích rozhoduje o překlepu víc než velikost.
    nabidka: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    dlazdice: {
      flexBasis: '47%',
      flexGrow: 1,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      minHeight: 56,
      justifyContent: 'center',
    },
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
    // Dvanáct, ne osm: s řádkem textu to dělá 44 pt, tedy mez, kterou
    // hlídá `tools/kontrola-dotyku.py`. Osm jich dalo 36 a kontrola to
    // chytila — v rukavicích je rozdíl mezi 36 a 44 pt rozdíl mezi
    // „trefím" a „trefím to vedlejší".
    chip: {
      borderWidth: 1,
      borderRadius: 999,
      // <b>Podlahu drží `minHeight`, ne výplň</b> (konzilium nad stavitelem
      // trati, bod 8). Samotná výplň dávala 24 pt a písmo 13 pt k tomu
      // zhruba 15,6 — dohromady 39,6, tedy pod mezí. Prošlo to proto, že
      // `kontrola-dotyku.py` připisovala každému řádku paušálních 20 pt
      // místo výšky podle písma; obojí je opravené týmž commitem.
      minHeight: 44,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    radek: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
      marginBottom: 6,
    },
    zahodit: {
      // Text bez `fontSize` jede na výchozích 14 pt, takže s výplní
      // vycházelo 40,8 — viz `chip` výš.
      minHeight: 44,
      justifyContent: "center",
      paddingVertical: 12,
      marginTop: 4,
    },
    stin: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      paddingHorizontal: 22,
    },
    detail: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 18,
    },
    // Jméno je identita za jízdy: to se říká do vysílačky a to stojí
    // v plachetní směrnici.
    detailJmeno: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
    detailRadek: { fontSize: 13, marginTop: 6 },
    // Čísla, která se předčítají, nesou váhu textu, ne popisku.
    detailFakt: { fontSize: 16, fontWeight: '600', marginTop: 10 },
    zavrit: { minHeight: 44, justifyContent: 'center', marginTop: 14 },
    zavritText: { fontSize: 16, fontWeight: '600' },
  });
