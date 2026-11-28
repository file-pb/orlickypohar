import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Barvy } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type PrvekSpravy } from '@/lib/api';
import {
  posliUkony,
  zaradPoradi,
  zaradPresun,
  zaradSebrani,
  zaradSmazani,
  zaradZnaceni,
} from '@/lib/stavba/ukony';
import { akceDetailu } from '@/lib/detail-prvku';
import { barvaNaVyplni, pismoNaVyplni } from '@/lib/kontrast';
import type { ZnackaNaOse } from '@/lib/radka-trati';
import { MapkaVyber } from '@/components/mapka-vyber';
import { BARVY, NAZVY_BAREV, NAZVY_TVARU, SiluetaZnacky } from '@/components/znak-boje';
import { znakPodleVyhlasky } from '@/lib/znak-vyhlaska';
import { azimut, vzdalenostM } from '@/lib/stavba-prvku';
import type { Bod } from '@/lib/mapa';
import type { Fix, Posudek } from '@/lib/stavba/poloha';

/** Jak dlouho po přepnutí mapky se neberou PÍPNI ani Z mapy (dvojklep). */
const KLID_PO_MAPE_MS = 500;

/**
 * Detail značky: <b>fakta nahoře, akce pod nimi podle četnosti,
 * nevratné dole</b> (rozhodnutí 7 druhého konzilia, 21. 11. 2026).
 *
 * <para>
 * <b>Fakta jsou nahoře z jediného důvodu: nemačkají se, předčítají.</b>
 * Když se rozhodčí na vysílačce zeptá na azimut, čte se to vestoje
 * v houpající se lodi — a rolovat se k tomu nesmí.
 * </para>
 *
 * <para>
 * <b>Hlavní akcí je přesun, protože měří.</b> Drží dvě třetiny plochy
 * dole a slovo se nemění: řádka 1 `PÍPNI`, řádka 2 říká, čeho se to týká.
 * Návyk z hlavní obrazovky tím přechází beze změny. Potvrzení u něj
 * není — přesun není nevratný, starý záznam zůstává platný pro dobu,
 * kdy platil.
 * </para>
 *
 * <para>
 * <b>Třetinu vedle má Z mapy</b> (28. 11. 2026): přesun pro toho, kdo
 * staví doma nebo v cizině a pípnout nemůže. Bez polohy je PÍPNI
 * zešedlé, ne pryč — na rozdíl od fotek níž ten úkon existuje, jen teď
 * nejde, stejně jako Pípnout na hlavní obrazovce. A terče nesmějí měnit
 * místo, viz `akcePruhu`.
 * </para>
 *
 * <para>
 * <b>Co tu schválně není.</b> Fotky by znamenaly nativní závislost
 * (`expo-image-picker`), a ta mění otisk appky: vydané telefony by
 * přestaly dostávat aktualizace po síti, dokud si je někdo nepřeinstaluje.
 * Barvu a tvar zase nejde změnit na místě — API má jen pípnutí, a to by
 * kvůli kosmetice vyrobilo nový záznam měření. Obojí tedy chybí, ne
 * zešedivělé: zešedivělé tlačítko slibuje úkon, který neexistuje.
 * </para>
 */
export function DetailZnacky({
  znacka,
  prvky,
  serie,
  zavod,
  fix,
  posudek,
  zamcena,
  jePomocnik,
  onZavri,
  onZmena,
}: {
  znacka: ZnackaNaOse;
  /** Celá trať: přerovnání potřebuje souseda, ne jen tenhle prvek. */
  prvky: PrvekSpravy[];
  serie: string;
  zavod: string;
  fix: Fix | null;
  posudek: Posudek;
  zamcena: boolean;
  jePomocnik: boolean;
  onZavri: () => void;
  /** Zavolá se po každém zápisu — obrazovka si načte trať znovu. */
  onZmena: () => void | Promise<void>;
}) {
  const t = useTheme();
  const s = styly(t);
  // Modal si bezpečnou zónu nebere sám — bez tohohle leží odkaz zpátky
  // pod hodinami ve stavovém řádku (viděno v simulátoru 21. 11. 2026).
  const okraje = useSafeAreaInsets();

  const [pracuje, setPracuje] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  // Mazání má dvě fáze: první klepnutí jen řekne, co se stane.
  const [mazeSe, setMazeSe] = useState(false);
  // Barva a tvar se mění jednou za ráno, z jedné krabice bójí — proto
  // jsou schované, dokud o ně někdo nepožádá.
  const [prebarvuje, setPrebarvuje] = useState(false);
  // Přesun z mapy: mapka se položí přes detail, ne jako další Modal nad
  // Modalem. Detail pod ní zůstane, jak byl, i s tím, kam byl odrolovaný.
  const [zMapy, setZMapy] = useState(false);
  // Kam se mapa naposledy posunula: omylem zavřená (tah od kraje je na
  // Androidu s gesty systémové Zpět) se otevře tam, kde byla.
  const [stredMapy, setStredMapy] = useState<Bod | null>(null);
  /**
   * <b>Klid po přepnutí mapky</b> (nezávislá kontrola, 28. 11. 2026).
   * Překryv mizí bez animace a jeho „Zpět" leží přesně nad PÍPNI: druhé
   * klepnutí dvojklepu z houpnutí lodi by přesunulo značku na loď, bez
   * potvrzení. Do té doby se PÍPNI ani Z mapy neberou.
   */
  const klidDo = useRef(0);
  const prepniMapu = (otevrit: boolean) => {
    klidDo.current = Date.now() + KLID_PO_MAPE_MS;
    setZMapy(otevrit);
  };
  const vKlidu = () => Date.now() < klidDo.current;
  // Čtečka obrazovky: po otevření na nadpis mapky, po zavření zpátky na
  // tlačítko, které ji otevřelo. Při prvním vykreslení nic — detail má
  // začít nahoře.
  const nadpisMapy = useRef<Text>(null);
  const tlacitkoMapy = useRef<View>(null);
  const prvni = useRef(true);
  useEffect(() => {
    if (prvni.current) {
      prvni.current = false;
      return;
    }
    const cil = zMapy ? nadpisMapy.current : tlacitkoMapy.current;
    if (cil) AccessibilityInfo.sendAccessibilityEvent(cil, 'focus');
  }, [zMapy]);

  const akce = akceDetailu({
    naServeru: znacka.prvky.every((p) => p.id !== undefined),
    zamceno: zamcena,
    opakuje: znacka.prujezdu > 1,
    jePomocnik,
  });

  // Prvek, na který akce míří. U značky s opakováním je jich víc, a
  // právě proto se u ní mazání ani přerovnání nenabízí.
  const prvek = znacka.prvky.length === 1 ? znacka.prvky[0] : null;

  /**
   * Zařadí úkon do fronty a hned ho zkusí poslat.
   *
   * <para>
   * <b>Bez signálu se nic neztratí.</b> Do 22. 11. 2026 tudy šlo volání
   * API napřímo, takže na vodě spadlo a stavitel dostal „nepovedlo se
   * to" — jenže signál se mu nevrátí tím, že to zkusí potřetí. Úkon se
   * teď zapíše na disk a odejde, až bude kam.
   * </para>
   *
   * <para>
   * <b>Rozdíl mezi vadou a okolností nese obrazovku.</b> Když server
   * úkon odmítne větou pravidla, detail zůstane otevřený i s tou větou:
   * rozhodnout musí člověk. Když chybí signál, je úkon zapsaný a není na
   * co čekat — zavře se stejně jako při úspěchu a čeká se ve frontě.
   * </para>
   *
   * <b>Zavírá se jen u toho, co detail vyčerpá.</b> Barvu a tvar člověk
   * mění jedním dechem; zavřít mu obrazovku po prvním klepnutí by
   * znamenalo otevřít ji znovu kvůli druhému.
   */
  const udelej = async (zarad: () => void, zavri = true) => {
    if (pracuje) return;
    setPracuje(true);
    setChyba(null);
    try {
      zarad();
      const v = await posliUkony();
      const odmitnuty = v.stoji.find((x) => x.odmitnuto);
      if (odmitnuty) {
        setChyba(odmitnuty.proc);
        return;
      }
      await onZmena();
      if (zavri) onZavri();
    } catch (e) {
      setChyba(e instanceof Error ? e.message : 'Nepovedlo se to. Zkus to znovu.');
    } finally {
      setPracuje(false);
    }
  };

  const presun = () => {
    if (vKlidu()) return;
    void udelej(() => {
      if (!fix) throw new Error('Bez polohy se přesunout nedá.');
      // Jméno, barva, tvar i značení si přenastavená bóje přebírá po té
      // staré — je to tentýž kus plastu, jen jinde. Pořadí nechává
      // server: `poradi: 0` znamená „po té staré".
      //
      // <b>Čas stisku jde s sebou</b>: bez signálu úkon poleží a serverový
      // čas zápisu by byl čas, kdy telefon chytil síť.
      zaradPresun({ serie, zavod }, znacka.boje.nazev, {
        nazev: znacka.boje.nazev,
        poradi: 0,
        sirka: fix.sirka,
        delka: fix.delka,
        presnostM: fix.presnostM ?? null,
        nahrazujeId: znacka.boje.id,
        zdroj: 'Telefon',
        postavenaV: new Date().toISOString(),
      });
    });
  };

  /**
   * Přesun na bod z mapy (nezávislá kontrola, 28. 11. 2026). Kdo staví
   * doma nebo v zahraničí, pípnout nemůže — a značku vzatou vedle by
   * jinak neopravil: pomocník ji nesmí smazat ani přerovnat a zbyla by
   * mu jen druhá značka vedle té špatné. Přesnost bod z mapy nemá
   * a server ji u zdroje `Mapa` ani nepřijme.
   */
  const presunZMapy = (bod: Bod) => {
    prepniMapu(false);
    void udelej(() => {
      zaradPresun({ serie, zavod }, znacka.boje.nazev, {
        nazev: znacka.boje.nazev,
        poradi: 0,
        sirka: bod.sirka,
        delka: bod.delka,
        presnostM: null,
        nahrazujeId: znacka.boje.id,
        zdroj: 'Mapa',
        postavenaV: new Date().toISOString(),
      });
    });
  };

  const prerovnej = (nahoru: boolean) =>
    udelej(() => {
      if (!prvek?.id) throw new Error('Tenhle prvek ještě nedošel na server.');
      const serazene = [...prvky].sort((x, y) => x.poradi - y.poradi);
      const kde = serazene.findIndex((p) => p.id === prvek.id);
      const kam = nahoru ? kde - 1 : kde + 1;
      if (kde < 0 || kam < 0 || kam >= serazene.length) return;

      [serazene[kde], serazene[kam]] = [serazene[kam], serazene[kde]];
      // Posílá se celý tvar prvku, protože server sadu přepisuje celou;
      // mění se jen ty dva, kterým pořadí nesedí. Oba jdou do fronty
      // jako dva úkony téhož druhu, takže dojdou v pořadí.
      for (const [i, p] of serazene.entries()) {
        if (p.poradi === i + 1) continue;
        zaradPoradi({ serie, zavod }, p.id, {
          typ: p.typ,
          poradi: i + 1,
          bojeAId: p.a.id,
          bojeBId: p.b?.id ?? null,
          strana: p.strana ?? null,
          poznamka: p.poznamka ?? null,
          smer: p.smer ?? null,
          druhStartu: p.druhStartu ?? null,
        });
      }
    });

  return (
    <Modal
      visible
      transparent={false}
      animationType="slide"
      // Zpět z mapy vede do detailu, ne rovnou na trať.
      onRequestClose={zMapy ? () => prepniMapu(false) : onZavri}>
      <View style={[s.obal, { backgroundColor: t.pozadi }]}>
        <ScrollView
          // Pod mapkou detail čtečka obrazovky nečte.
          importantForAccessibility={zMapy ? 'no-hide-descendants' : 'auto'}
          accessibilityElementsHidden={zMapy}
          contentContainerStyle={[s.obsah, { paddingTop: okraje.top + 10 }]}>
          <Pressable
            onPress={onZavri}
            accessibilityRole="button"
            accessibilityLabel="Zpátky na trať"
            style={({ pressed }) => [s.zpet, { opacity: pressed ? 0.6 : 1 }]}>
            <Text style={[s.zpetText, { color: t.voda }]}>‹ Trať</Text>
          </Pressable>

          {/* <b>Bez `2×` u jména</b> (Filip, 26. 11. 2026). Kolikrát se
              po té značce jede, je vidět ze seznamu průjezdů hned pod
              tím — a ten to navíc říká i s tím, čím se který liší. */}
          <Text style={[s.jmeno, { color: t.text }]}>{znacka.boje.nazev}</Text>

          {/* Průjezdy po jednom a celé: tahle řádka se porovnává
              s textem plachetní směrnice. */}
          {znacka.predpisy.map((p, i) => (
            <Text key={i} style={[s.radek, { color: t.tlumeny }]}>
              {znacka.predpisy.length > 1 ? `${i + 1}. průjezd · ` : ''}
              {p}
            </Text>
          ))}

          <Text style={[s.fakt, { color: t.text }]}>
            {znacka.boje.sirka.toFixed(5)}, {znacka.boje.delka.toFixed(5)}
          </Text>
          <Text style={[s.radek, { color: t.tlumeny }]}>
            {znacka.boje.zdroj === 'Mapa' ? 'odečteno z mapy' : 'změřeno telefonem'}
            {' · '}
            {znacka.boje.fotek === 0
              ? 'bez fotky'
              : `${znacka.boje.fotek} ${znacka.boje.fotek === 1 ? 'fotka' : 'fotky'}`}
          </Text>

          {/* Azimut číslicemi, protože se čte do vysílačky. Bez fixu se
              nekreslí nic — nepravdivé číslo je horší než žádné. */}
          {fix ? (
            <Text style={[s.fakt, { color: t.text }]}>
              {Math.round(azimut(fix, znacka.boje)).toString().padStart(3, '0')}° ·{' '}
              {Math.round(vzdalenostM(fix, znacka.boje))} m odsud
            </Text>
          ) : null}

          {chyba ? <Text style={[s.chyba, { color: t.stavZruseny }]}>{chyba}</Text> : null}

          {akce.includes('sebrat') ? (
            <Pressable
              disabled={pracuje}
              onPress={() =>
                udelej(() => zaradSebrani({ serie, zavod }, znacka.boje.id, znacka.boje.nazev))
              }
              style={({ pressed }) => [
                s.obrysovy,
                { borderColor: t.linka, opacity: pressed ? 0.6 : 1 },
              ]}>
              <Text style={[s.obrysovyText, { color: t.text }]}>Sebrat z vody</Text>
            </Pressable>
          ) : null}

          {/* <b>Barva a tvar: jednou za ráno, z jedné krabice bójí</b>
              (rozhodnutí 11). Vzorky jsou dvě řady po čtyřech, 56 × 56,
              a osmé pole je *neuvedeno*, protože `Barva` je nepovinná
              schválně — ne každá bójka se zapisuje barevně.

              Přepíše se jen značení. Měření zůstává: tohle je vlastnost
              toho kusu plastu, ne záznamu o jeho poloze. */}
          {akce.includes('barva-a-tvar') ? (
            prebarvuje ? (
              <View style={s.prebarveni}>
                <Text style={[s.radek, { color: t.tlumeny }]}>Barva</Text>
                <View style={s.vzorky}>
                  {([...Object.keys(BARVY), null] as (keyof typeof BARVY | null)[]).map(
                    (b) => (
                      <Pressable
                        key={b ?? 'nic'}
                        disabled={pracuje}
                        onPress={() =>
                          udelej(
                            () =>
                              zaradZnaceni({ serie, zavod }, znacka.boje.id, znacka.boje.nazev, {
                                barva: b,
                                tvar: znacka.boje.tvar,
                                znaceni: znacka.boje.znaceni,
                              }),
                            false,
                          )
                        }
                        accessibilityRole="button"
                        accessibilityLabel={b ? NAZVY_BAREV[b] : 'neuvedeno'}
                        style={({ pressed }) => [
                          s.vzorek,
                          {
                            backgroundColor: b ? BARVY[b] : 'transparent',
                            // Lem dopočítaný z výplně — bílá bójka by se
                            // na papíře jinak ztratila.
                            borderColor:
                              b === znacka.boje.barva
                                ? t.voda
                                : barvaNaVyplni(t, b ? BARVY[b] : t.papir, t.tlumeny),
                            borderWidth: b === znacka.boje.barva ? 3 : 1,
                            opacity: pressed ? 0.6 : 1,
                          },
                        ]}>
                        {b ? null : (
                          <Text
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            style={{ color: t.tlumeny, fontSize: 11, paddingHorizontal: 4 }}>
                            neuvedeno
                          </Text>
                        )}
                      </Pressable>
                    ),
                  )}
                </View>

                <Text style={[s.radek, { color: t.tlumeny }]}>Tvar</Text>
                <View style={s.tvary}>
                  {([...Object.keys(NAZVY_TVARU), null] as (keyof typeof NAZVY_TVARU | null)[]).map(
                    (tv) => (
                      <Pressable
                        key={tv ?? 'nic'}
                        disabled={pracuje}
                        onPress={() =>
                          udelej(
                            () =>
                              zaradZnaceni({ serie, zavod }, znacka.boje.id, znacka.boje.nazev, {
                                barva: znacka.boje.barva,
                                tvar: tv,
                                znaceni: znacka.boje.znaceni,
                              }),
                            false,
                          )
                        }
                        style={({ pressed }) => [
                          s.tvarChip,
                          {
                            borderColor: tv === znacka.boje.tvar ? t.voda : t.linka,
                            opacity: pressed ? 0.6 : 1,
                          },
                        ]}>
                        <Text style={{ color: t.text, fontSize: 13 }}>
                          {tv ? NAZVY_TVARU[tv] : 'neuvedeno'}
                        </Text>
                      </Pressable>
                    ),
                  )}
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => setPrebarvuje(true)}
                style={({ pressed }) => [
                  s.obrysovy,
                  { borderColor: t.linka, opacity: pressed ? 0.6 : 1 },
                ]}>
                <View style={s.barvaRadek}>
                  <SiluetaZnacky
                    barva={znacka.boje.barva}
                    tvar={znacka.boje.tvar}
                    znaceni={znacka.boje.znaceni}
                    vychoziVypln={t.tlumeny}
                    lem={barvaNaVyplni(t, t.papir, t.tlumeny)}
                  />
                  <Text style={[s.obrysovyText, { color: t.text }]}>
                    {znacka.boje.barva ? NAZVY_BAREV[znacka.boje.barva] : 'barva neuvedena'}
                    {znacka.boje.tvar ? `, ${NAZVY_TVARU[znacka.boje.tvar]}` : ''}
                  </Text>
                </View>

                {/* <b>Co ta kombinace znamená na vodě</b> (doplněno
                    22. 11. 2026 srovnáním s webem, který to říká od
                    začátku). Kdo na Vltavě jezdí, pozná to i bez věty;
                    je to pro toho, kdo bóji zadává a chce si ověřit, že
                    vybral správně. Když vyhláška kombinaci nezná, nestojí
                    tu nic — domýšlet význam je horší než mlčet. */}
                {znakPodleVyhlasky(znacka.boje.barva, znacka.boje.tvar, znacka.boje.znaceni) ? (
                  <Text style={[s.radek, { color: t.tlumeny }]}>
                    Podle vyhlášky:{' '}
                    <Text style={{ color: t.text }}>
                      {znakPodleVyhlasky(znacka.boje.barva, znacka.boje.tvar, znacka.boje.znaceni)}
                    </Text>
                  </Text>
                ) : null}
              </Pressable>
            )
          ) : null}

          {akce.includes('vys') && prvek ? (
            <View style={s.poradi}>
              <Pressable
                disabled={pracuje}
                onPress={() => prerovnej(true)}
                style={({ pressed }) => [
                  s.sipka,
                  { borderColor: t.linka, opacity: pressed ? 0.6 : 1 },
                ]}>
                <Text style={[s.obrysovyText, { color: t.text }]}>↑ výš</Text>
              </Pressable>
              <Pressable
                disabled={pracuje}
                onPress={() => prerovnej(false)}
                style={({ pressed }) => [
                  s.sipka,
                  { borderColor: t.linka, opacity: pressed ? 0.6 : 1 },
                ]}>
                <Text style={[s.obrysovyText, { color: t.text }]}>↓ níž</Text>
              </Pressable>
            </View>
          ) : null}

          {/* <b>Nejnevratnější věc na obrazovce, tedy dole a nejslabším
              tvarem.</b> Dvě fáze, a věta musí říct, že měření zůstává:
              bez toho si člověk myslí, že maže polohu, a sáhne místo toho
              po přesunu — tedy po tom jediném úkonu, který historii trati
              doopravdy přepíše. */}
          {akce.includes('smazat') && prvek?.id ? (
            mazeSe ? (
              <View style={s.mazani}>
                <Text style={[s.radek, { color: t.tlumeny }]}>
                  Smaže se <Text style={{ color: t.text }}>rozhodnutí o trati</Text>, ne
                  měření: záznam bóje zůstává a dál říká, kde ta značka stála.
                </Text>
                <View style={s.poradi}>
                  <Pressable
                    disabled={pracuje}
                    onPress={() =>
                      udelej(() =>
                        zaradSmazani({ serie, zavod }, prvek.id!, znacka.boje.nazev),
                      )
                    }
                    style={({ pressed }) => [
                      s.sipka,
                      { borderColor: t.stavZruseny, opacity: pressed ? 0.6 : 1 },
                    ]}>
                    <Text style={[s.obrysovyText, { color: t.stavZruseny }]}>Ano, smaž</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setMazeSe(false)}
                    style={({ pressed }) => [
                      s.sipka,
                      { borderColor: t.linka, opacity: pressed ? 0.6 : 1 },
                    ]}>
                    <Text style={[s.obrysovyText, { color: t.text }]}>Nechat</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => setMazeSe(true)}
                style={({ pressed }) => [s.smazat, { opacity: pressed ? 0.6 : 1 }]}>
                <Text style={[s.smazatText, { color: t.tlumeny }]}>Smazat prvek z trati</Text>
              </Pressable>
            )
          ) : null}
        </ScrollView>

        {/* <b>Dolní pruh je ven z rolovaného obsahu</b>, aby hlavní práce
            dne nikdy neodrolovala pod hranu displeje. */}
        {akce.includes('presunout') ? (
          <View
            importantForAccessibility={zMapy ? 'no-hide-descendants' : 'auto'}
            accessibilityElementsHidden={zMapy}
            style={[
              s.pruh,
              {
                borderColor: t.linka,
                backgroundColor: t.papir,
                paddingBottom: Math.max(okraje.bottom, 16) + 10,
              },
            ]}>
            {posudek.ok ? null : (
              <Text style={[s.radek, { color: t.tlumeny, textAlign: 'center' }]}>
                {posudek.proc}
              </Text>
            )}
            {/* Pořadí jako na hlavní obrazovce: Pípni vlevo a širší, Z mapy
                vpravo. <b>Obě stojí pořád na svém místě</b> (nezávislá
                kontrola, 28. 11. 2026): poloha kolísá kolem meze, a kdyby
                Pípni bez ní mizelo a Z mapy se roztahovalo přes celou šířku,
                prst mířící na mapu by po návratu polohy trefil Pípni — a
                přesunul značku na loď, bez potvrzení. Bez polohy je proto
                Pípni zešedlé a Z mapy plné. */}
            <View style={s.akcePruhu}>
              <Pressable
                disabled={pracuje || !posudek.ok}
                onPress={presun}
                accessibilityRole="button"
                accessibilityLabel={`Pípni sem místo ${znacka.boje.nazev}`}
                style={({ pressed }) => [
                  s.pipni,
                  { backgroundColor: posudek.ok ? t.voda : t.linka, opacity: pressed ? 0.7 : 1 },
                ]}>
                <Text style={[s.pipniText, { color: pismoNaVyplni(t, posudek.ok ? t.voda : t.linka) }]}>
                  PÍPNI
                </Text>
                <Text
                  style={[s.pipniPodtext, { color: pismoNaVyplni(t, posudek.ok ? t.voda : t.linka) }]}>
                  sem místo {znacka.boje.nazev}
                </Text>
              </Pressable>
              <Pressable
                ref={tlacitkoMapy}
                disabled={pracuje}
                onPress={() => {
                  if (!vKlidu()) prepniMapu(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Přesunout ${znacka.boje.nazev} z mapy`}
                style={({ pressed }) => [
                  s.zMapy,
                  {
                    borderColor: t.voda,
                    backgroundColor: posudek.ok ? t.papir : t.voda,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}>
                <Text
                  style={{
                    color: posudek.ok ? t.voda : pismoNaVyplni(t, t.voda),
                    fontSize: 18,
                    fontWeight: '700',
                  }}>
                  Z mapy
                </Text>
              </Pressable>
            </View>
            <Text style={[s.pozn, { color: t.tlumeny }]}>
              Přesun není oprava překlepu: starý záznam zůstává platný pro dobu, kdy platil.
            </Text>
          </View>
        ) : null}

        {zMapy ? (
          <View
            accessibilityViewIsModal
            onAccessibilityEscape={() => prepniMapu(false)}
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: t.pozadi,
                paddingTop: okraje.top,
                paddingBottom: Math.max(12, okraje.bottom),
              },
            ]}>
            <Text ref={nadpisMapy} accessibilityRole="header" style={[s.mapaNadpis, { color: t.text }]}>
              Přesunout z mapy: {znacka.boje.nazev}
            </Text>
            <MapkaVyber
              stred={stredMapy ?? { sirka: znacka.boje.sirka, delka: znacka.boje.delka }}
              onPohyb={setStredMapy}
              body={[znacka.boje]}
              odstupM={1}
              procBlizko="Tady značka stojí teď — posuň mapu tam, kam ji přesouváš."
              vyber={presunZMapy}
              zrus={() => prepniMapu(false)}
            />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styly = (t: Barvy) =>
  StyleSheet.create({
    obal: { flex: 1 },
    obsah: { padding: 22, paddingBottom: 30 },
    zpet: { minHeight: 44, justifyContent: 'center' },
    zpetText: { fontSize: 16, fontWeight: '600' },
    jmeno: { fontSize: 20, fontWeight: '700', marginTop: 4 },
    radek: { fontSize: 13, marginTop: 6 },
    fakt: { fontSize: 16, fontWeight: '600', marginTop: 12 },
    chyba: { fontSize: 13, marginTop: 14 },
    obrysovy: {
      minHeight: 48,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 10,
      marginTop: 18,
    },
    obrysovyText: { fontSize: 16, fontWeight: '600' },
    poradi: { flexDirection: 'row', gap: 10, marginTop: 12 },
    prebarveni: { marginTop: 18 },
    // Dvě řady po čtyřech, 56 x 56: obrazovka se otevře jednou za ráno,
    // takže je to nejlevnější místo, kde se dá platit velikostí.
    // <b>Dvě řady po čtyřech</b> (rozhodnutí 11). Šířka je spočítaná,
    // ne odhadnutá: 4 x 56 + 3 x 10 mezery = 254, takže se pátý vzorek
    // nevejde ani na širším telefonu a mřížka zůstane, jak se rozhodlo.
    vzorky: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6, maxWidth: 254 },
    tvary: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
    vzorek: {
      width: 56,
      height: 56,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tvarChip: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: 12,
      borderWidth: 1,
      borderRadius: 10,
    },
    barvaRadek: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sipka: {
      flex: 1,
      minHeight: 48,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 10,
    },
    mazani: { marginTop: 22 },
    smazat: { minHeight: 48, justifyContent: 'center', marginTop: 26 },
    smazatText: { fontSize: 15 },
    pruh: { borderTopWidth: 1, paddingHorizontal: 22, paddingTop: 10 },
    // Plná plocha 86 vysoká na témž místě jako `Pípnout` na hlavní
    // obrazovce — měří polohu tady a teď, takže váhu 1 nese právem.
    // Dvě třetiny šířky, třetinu vedle má Z mapy (28. 11. 2026).
    // `minHeight`, ne `height`: větší písmo by se do pevných 86 nevešlo.
    pipni: { flex: 2, minHeight: 86, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    akcePruhu: { flexDirection: 'row', gap: 12 },
    zMapy: {
      flex: 1,
      minHeight: 56,
      borderRadius: 12,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mapaNadpis: { fontSize: 18, fontWeight: '700', paddingHorizontal: 16, paddingVertical: 12 },
    pipniText: { fontSize: 26, fontWeight: '800' },
    pipniPodtext: { fontSize: 15, fontWeight: '600', marginTop: 2 },
    pozn: { fontSize: 12, marginTop: 10, textAlign: 'center' },
  });
