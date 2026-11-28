import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image, Linking, PanResponder, Pressable, StyleSheet, Text, View, type LayoutChangeEvent,
} from 'react-native';

import { Akce } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { vzdalenostM } from '@/lib/geo';
import { vCesku } from '@/lib/hranice';
import { pismoNaVyplni } from '@/lib/kontrast';
import {
  adresaDlazdice, DLAZDICE, metruNaPixel, mrizkaDlazdic, naPlose, posunuty, Z_NEJMENE, Z_NEJVIC,
  type Bod,
} from '@/lib/mapa';

/** Odkud jdou dlaždice: náš server, ne rovnou OSM (IP posádky nikam neodchází). */
const WEB = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://orlickypohar.klihovka.cz';

/**
 * Přiblížení a podklad si mapa pamatuje mezi otevřeními, dokud appka
 * běží. Modal obsah při zavření odmontuje, takže by se jinak u každého
 * bodu stavěného z domu znovu zapínal satelit a přibližovalo (nezávislá
 * kontrola, 28. 11. 2026).
 */
const pamet = { z: 15, satelit: false };

/**
 * Za jak dlouho se zkusí dlaždice, která nedorazila (`adresaDlazdice`).
 * Opakování jde novou adresou až k webu — obejde náhradní pixel uložený
 * v telefonu i v nginxu. První skoro hned: fronta webu se za chvíli
 * uvolní. Druhý po minutě, kdyby zrovna zlobil zdroj dlaždic.
 */
const PRODLEVY_MS = [2_000, 65_000];

/** Za jak dlouho přiznat, že se mapa nenačetla vůbec (bez dat na vodě). */
const BEZ_DAT_MS = 5_000;

/**
 * Výběr bodu z mapy — totéž, co umí web (`web/app/mapka-vyber.tsx`).
 *
 * <b>Proč i v appce</b> (Filip, 28. 11. 2026, mimo republiku): *„trať můžu
 * stavět prostě doma, mimo vodu. A určitě potřebuji mít možnost pípnout to
 * z mapy."* Do té doby appka výběr z mapy vědomě neměla („na vodě telefon
 * měří") — jenže mimo Česko ověření polohy pípnutí zastavilo a jiná cesta
 * nebyla.
 *
 * <b>Křížek stojí uprostřed a hýbe se mapou</b>, ne prstem po mapě: na
 * houpající se palubě se do bodu netrefíš, posunout podklad pod pevným
 * křížkem jde i jednou rukou. <b>Přibližuje se tlačítky</b>, ne štípnutím
 * — dvěma prsty v rukavicích nikdo nic nezvětší.
 *
 * <b>Bez mapové knihovny</b> a bez nativního modulu: dlaždice jsou obrázky
 * a tah je `PanResponder` z jádra React Native. Mapová knihovna by posunula
 * otisk a znamenala nový balíček přes Obchod Play pro všechny.
 */
export function MapkaVyber({
  stred,
  body = [],
  odstupM = 0,
  procBlizko,
  vyber,
  zrus,
  onPohyb,
}: {
  stred: Bod;
  /**
   * Body, které už stojí — rozdělaný prvek, nebo značka, která se
   * přesouvá. Nakreslí se, ať je vidět, kde co je, a `Vzít` se k nim
   * nepustí blíž než `odstupM`.
   */
  body?: readonly Bod[];
  odstupM?: number;
  /** Proč se bod tak blízko nebere — věta pro člověka, ne pro API. */
  procBlizko?: string;
  vyber: (bod: Bod) => void;
  zrus: () => void;
  /** Kam se mapa posunula; rodič si to drží pro omylem zavřený výběr. */
  onPohyb?: (stred: Bod) => void;
}) {
  const t = useTheme();
  const [z, setZ] = useState(pamet.z);
  const [kde, setKde] = useState(stred);
  /**
   * Podklad. <b>Satelit u bójí pomáhá</b> (Filip, 11. 10. 2026): mola,
   * ostrůvky a břehy jsou na snímku vidět, jak je člověk uvidí z lodi.
   */
  const [satelit, setSatelit] = useState(pamet.satelit);
  const [rozmer, setRozmer] = useState({ sirka: 0, vyska: 0 });

  useEffect(() => {
    pamet.z = z;
    pamet.satelit = satelit;
  }, [z, satelit]);

  // Tah čte aktuální střed a přiblížení z `ref`: PanResponder vzniká
  // jednou a stav by v něm zůstal ze chvíle vzniku.
  const kdeRef = useRef(kde);
  kdeRef.current = kde;
  const zRef = useRef(z);
  zRef.current = z;
  const onPohybRef = useRef(onPohyb);
  onPohybRef.current = onPohyb;
  const minule = useRef({ dx: 0, dy: 0 });

  const tah = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          minule.current = { dx: 0, dy: 0 };
        },
        onPanResponderMove: (_e, g) => {
          const dx = g.dx - minule.current.dx;
          const dy = g.dy - minule.current.dy;
          minule.current = { dx: g.dx, dy: g.dy };
          const novy = posunuty(kdeRef.current, zRef.current, dx, dy);
          kdeRef.current = novy;
          setKde(novy);
        },
        onPanResponderRelease: () => onPohybRef.current?.(kdeRef.current),
        onPanResponderTerminate: () => onPohybRef.current?.(kdeRef.current),
        // Tah po mapě se nevzdá ve prospěch rodiče — jinak by se mapa
        // v polovině pohybu zastavila.
        onPanResponderTerminationRequest: () => false,
      }),
    [],
  );

  // Dlaždice, které nedorazily (`PRODLEVY_MS`). `relace` dělá adresu
  // opakování jedinečnou pro tohle otevření: náhradní pixel uložený při
  // minulém otevření se tak znovu nepoužije.
  const [relace] = useState(() => Date.now().toString(36));
  const [pokusy, setPokusy] = useState<Record<string, number>>({});
  const naplanovano = useRef(new Set<string>());
  const casovace = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const vsechny = casovace.current;
    return () => vsechny.forEach(clearTimeout);
  }, []);
  const zkusZnovu = (klic: string, pokus: number) => {
    const id = `${klic}#${pokus}`;
    if (pokus >= PRODLEVY_MS.length || naplanovano.current.has(id)) return;
    naplanovano.current.add(id);
    casovace.current.push(
      setTimeout(() => setPokusy((p) => ({ ...p, [klic]: pokus + 1 })), PRODLEVY_MS[pokus]),
    );
  };

  // Bez dat se nenačte nic a mapa je šedá plocha s křížkem — to se musí
  // říct, jinak to vypadá, že se jen čeká. <b>Hlídají se dlaždice, které
  // jsou právě vidět</b>, ne pohled jako celek: satelit, přiblížení i posun
  // na místo, kde mapa ještě nebyla, se bez dat nenačtou, i když výchozí
  // výřez z paměti telefonu ano (nezávislá kontrola, 28. 11. 2026).
  const [nacteneDl, setNacteneDl] = useState<ReadonlySet<string>>(() => new Set());
  const [bezDat, setBezDat] = useState(false);

  const priblizeni = (o: number) => setZ((p) => Math.min(Z_NEJVIC, Math.max(Z_NEJMENE, p + o)));

  const dlazdice =
    rozmer.sirka > 0 ? mrizkaDlazdic(kde, z, rozmer.sirka, rozmer.vyska) : [];
  const klicDlazdice = (d: { klic: string }) => `${d.klic}-${satelit ? 's' : 'm'}`;
  const nicVidet = dlazdice.length > 0 && !dlazdice.some((d) => nacteneDl.has(klicDlazdice(d)));
  // Časovač běží, jen dokud není vidět nic. Příznak se shodí v úklidu
  // efektu, takže po návratu „nic" nezačne se starým `true` z minula.
  useEffect(() => {
    if (!nicVidet) return;
    const id = setTimeout(() => setBezDat(true), BEZ_DAT_MS);
    return () => {
      clearTimeout(id);
      setBezDat(false);
    };
  }, [nicVidet]);
  const naMetr = metruNaPixel(kde.sirka, z);
  // Mimo meze řekne tlačítko, ne až API (stejně jako web): server by
  // mluvil o prohozené šířce a délce, a u křížku se nic prohodit nedá.
  const jeVCesku = vCesku(kde.sirka, kde.delka);
  // Druhý bod otevře mapu přesně na prvním. „Vzít" bez posunu by dal dva
  // body na jednom místě — linie z nich nevznikne a brána by měla nulovou
  // šířku (nezávislá kontrola, 28. 11. 2026).
  const blizko = odstupM > 0 && body.some((b) => vzdalenostM(b, kde) < odstupM);
  const lzeVzit = jeVCesku && !blizko;
  const sx = rozmer.sirka / 2;
  const sy = rozmer.vyska / 2;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <View
          style={[s.plocha, { backgroundColor: t.linka }]}
          onLayout={(e: LayoutChangeEvent) => {
            const { width, height } = e.nativeEvent.layout;
            setRozmer({ sirka: Math.round(width), vyska: Math.round(height) });
          }}
          {...tah.panHandlers}>
          {dlazdice.map((d) => {
            const klic = klicDlazdice(d);
            const pokus = pokusy[klic] ?? 0;
            return (
              <Image
                key={klic}
                source={{ uri: adresaDlazdice(WEB, d, satelit, pokus ? `${relace}-${pokus}` : undefined) }}
                // Náhradní dlaždice je průhledný pixel 1 × 1 — po něm se
                // zkouší znovu, jako po chybě.
                onLoad={(e) => {
                  if (e.nativeEvent.source.width <= 1) zkusZnovu(klic, pokus);
                  else setNacteneDl((n) => (n.has(klic) ? n : new Set(n).add(klic)));
                }}
                onError={() => zkusZnovu(klic, pokus)}
                style={{ position: 'absolute', left: d.x, top: d.y, width: DLAZDICE, height: DLAZDICE }}
              />
            );
          })}

          {rozmer.sirka > 0 ? (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {/* Co už stojí: tečky, ne křížky — vzít se dá jen křížek. */}
              {body.map((b, i) => {
                const p = naPlose(b, kde, z, rozmer.sirka, rozmer.vyska);
                return (
                  <View
                    key={i}
                    style={[s.bod, { left: p.x - 8, top: p.y - 8, backgroundColor: t.voda, borderColor: t.papir }]}
                  />
                );
              })}
              {/* Křížek: bod, který se vezme. Neklepe se na něj, jen ukazuje. */}
              <View style={[s.cara, { left: sx - 16, top: sy - 1, width: 32, height: 2 }]} />
              <View style={[s.cara, { left: sx - 1, top: sy - 16, width: 2, height: 32 }]} />
              <View style={[s.kruh, { left: sx - 9, top: sy - 9 }]} />
            </View>
          ) : null}
        </View>

        {/* Ovládání leží na mapě, ne pod ní (Filip, 11. 10. 2026): pod mapou
            ho člověk hledá a mezitím ztratí, kam koukal.
            <b>Je to sourozenec plochy, ne její dítě</b> (nezávislá kontrola,
            28. 11. 2026). Uvnitř plochy si tah při prvním pohybu prstu
            vyžádal dotyk zpátky a Pressable ho pustil — klepnutí na + se
            zrušilo a mapa se jen cukla. Na Androidu chodí pohyb skoro
            s každým klepnutím, v rukavici vždycky. Web tomu brání
            `stopPropagation`; tady k ploše dotyk z tlačítka vůbec nedojde. */}
        {/* Proč se bod nebere, leží přes mapu, ne pod ní: řádek, který
            v panelu naskočí a zmizí, by měnil výšku plochy a křížek by
            uprostřed tahu poskočil (nezávislá kontrola, 28. 11. 2026). */}
        {jeVCesku && blizko && procBlizko ? (
          <View pointerEvents="none" style={[s.proc, { backgroundColor: t.papir, borderColor: t.linka }]}>
            <Text style={{ color: t.vystraha, fontSize: 13 }}>{procBlizko}</Text>
          </View>
        ) : null}

        <View style={s.ovladani}>
          <Tlacitko text="+" popis="Přiblížit" onPress={() => priblizeni(1)} vypnuto={z >= Z_NEJVIC} />
          <Tlacitko text="−" popis="Oddálit" onPress={() => priblizeni(-1)} vypnuto={z <= Z_NEJMENE} />
          <Tlacitko
            text={satelit ? 'Mapa' : 'Satelit'}
            popis={satelit ? 'Přepnout na mapu' : 'Přepnout na satelit'}
            onPress={() => setSatelit(!satelit)}
          />
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
        {/* Stejně dlouhá jako nápověda pod ní, ať se výměnou nemění výška
            panelu. Příčinu neříká: bez dat i výpadek zdroje vypadají stejně. */}
        {nicVidet && bezDat ? (
          <Text style={{ color: t.vystraha, fontSize: 13 }}>
            Mapa se nenačetla. Souřadnice pod křížkem platí dál.
          </Text>
        ) : (
          <Text style={{ color: t.tlumeny, fontSize: 13 }}>
            Křížek je bod, který vezmeš. Posouvej mapou pod ním.
          </Text>
        )}
        <Text selectable style={{ color: t.tlumeny, fontSize: 12, marginTop: 2 }}>
          {kde.sirka.toFixed(5)}, {kde.delka.toFixed(5)} · {naMetr < 1 ? naMetr.toFixed(1) : Math.round(naMetr)} m na pixel
        </Text>

        <Pressable
          onPress={() => vyber(kde)}
          disabled={!lzeVzit}
          accessibilityRole="button"
          style={({ pressed }) => [
            s.vzit,
            { backgroundColor: lzeVzit ? t.voda : t.linka, opacity: pressed ? 0.7 : 1 },
          ]}>
          <Text
            style={{
              color: pismoNaVyplni(t, lzeVzit ? t.voda : t.linka),
              fontSize: 18,
              fontWeight: '700',
            }}>
            {!jeVCesku ? 'Mimo Česko — posuň mapu' : blizko ? 'Moc blízko — posuň mapu' : 'Vzít tenhle bod'}
          </Text>
        </Pressable>
        <Akce text="Zpět" onPress={zrus} />

        {/* Atribuce podle podmínek zdroje. Esri chce „Powered by Esri"
            a jména zdrojů vrstvy; ta se mění (28. 11. 2026 už Vantor místo
            Maxaru), takže se ověřují v `copyrightText` služby:
            server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer?f=json */}
        {satelit ? (
          <Text style={[s.zdroj, { color: t.tlumeny }]}>
            <Text
              accessibilityRole="link"
              style={{ color: t.voda }}
              onPress={() => void Linking.openURL('https://www.esri.com')}>
              Powered by Esri
            </Text>
            {' · Zdroj: Esri, Vantor, Earthstar Geographics a GIS User Community'}
          </Text>
        ) : (
          <Text style={[s.zdroj, { color: t.tlumeny }]}>
            {'Podklad '}
            <Text
              accessibilityRole="link"
              style={{ color: t.voda }}
              onPress={() => void Linking.openURL('https://www.openstreetmap.org/copyright')}>
              © přispěvatelé OpenStreetMap
            </Text>
          </Text>
        )}
      </View>
    </View>
  );
}

/** Tlačítko na mapě: 44 pt i v rukavicích, s podkladem, ať je vidět nad satelitem. */
function Tlacitko({
  text,
  popis,
  onPress,
  vypnuto,
}: {
  text: string;
  popis: string;
  onPress: () => void;
  vypnuto?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={vypnuto}
      accessibilityRole="button"
      accessibilityLabel={popis}
      style={({ pressed }) => [
        s.tlacitko,
        { backgroundColor: t.papir, borderColor: t.linka, opacity: vypnuto ? 0.4 : pressed ? 0.6 : 1 },
      ]}>
      <Text style={{ color: t.text, fontSize: text.length > 1 ? 13 : 22, fontWeight: '700' }}>{text}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  plocha: { flex: 1, overflow: 'hidden' },
  cara: { position: 'absolute', backgroundColor: '#d0021b' },
  kruh: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#d0021b',
  },
  bod: { position: 'absolute', width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  ovladani: { position: 'absolute', top: 10, right: 10, gap: 8, alignItems: 'flex-end' },
  proc: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  tlacitko: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vzit: { borderRadius: 14, minHeight: 56, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  zdroj: { fontSize: 11, marginTop: 6 },
});
