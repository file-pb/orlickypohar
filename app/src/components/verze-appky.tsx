import { useEffect, useState } from 'react';
import { Alert, AppState, Linking, Platform, Pressable, Text, useColorScheme, View } from 'react-native';
import * as Updates from 'expo-updates';
import { useUpdates } from 'expo-updates';

import { prekazkyTed } from '@/components/aktualizator';
import { Akce, Karta, Sekce } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { useData } from '@/hooks/use-data';
import { useTheme } from '@/hooks/use-theme';
import { nactiPamet, popisStavuJs, pouzijVerzi, stavJs, zkontrolujTed } from '@/lib/aktualizace';
import { spustAktualizaci, zeptejSePlay } from '@/lib/play';
import { popisPrekazky, useZamky } from '@/lib/restart';
import {
  aktualizaceJdou, coNabidnout, kratkyOtisk, OBCHOD, OBCHOD_WEB, popisBalicku, popisNabidky,
  popisPuvodu, puvod, zjistiStavBalicku, type Nabidka, type StavBalicku,
} from '@/lib/verze';

/**
 * Na čem appka jede — a čím si to ověřit.
 *
 * <b>Proč to tu je</b> (Filip, 28. 10. 2026: *„Jak Milos pozná ze se mu to
 * samo aktualizovalo?"*). Banner ohlásí změnu ve chvíli, kdy nastane;
 * tahle sekce odpoví tomu, kdo se ptá později — typicky když mu něco
 * nefunguje a je potřeba vědět, jestli má vůbec tu verzi, ve které je to
 * opravené. Bez toho je každý nález od rozhodčího podmíněný.
 *
 * <b>Je vidět i nepřihlášenému.</b> Otázka „na čem jedu" s účtem nesouvisí
 * a schovat ji za přihlášení by znamenalo, že si ji nepřečte ten, komu
 * přihlášení zrovna nejde.
 */
export function VerzeAppky() {
  const t = useTheme();
  const p = puvod();
  const otisk = kratkyOtisk(p.otisk);

  return (
    <>
      <Sekce>Verze appky</Sekce>
      <Karta>
        <Text style={{ color: t.text }}>{popisPuvodu(p)}</Text>
        {otisk ? (
          // Otisk je tu pro případ, že se bude dohledávat, ze kterého
          // buildu appka je. Laikovi neříká nic, proto tlumeně a dole.
          <Text selectable style={{ color: t.tlumeny, fontSize: 12, marginTop: 6 }}>
            Otisk {otisk}
          </Text>
        ) : null}
      </Karta>
      {/* Obchod jen na Androidu: balíčky do něj staví a zapisuje CI pouze
          tam, takže na iPhonu by karta vždycky mlčela. */}
      {Platform.OS === 'android' ? <ZObchodu /> : null}
      {aktualizaceJdou ? <Hledani /> : <BezAktualizaci />}
    </>
  );
}

/** Jak dlouho se čeká na náš seznam vydání, než se nabídka ukáže bez něj. */
const LIMIT_SEZNAMU_MS = 10_000;

/**
 * Odpověď Play spojená s naším seznamem vydání.
 *
 * Seznam má vlastní limit: `fetch` v React Native jinak nečeká nikdy
 * nekonečně dlouho, a zaseknuté spojení by schovalo i to, co Play už ví
 * (nález kontroly 27. 11. 2026).
 */
async function nactiNabidku(): Promise<{ nabidka: Nabidka; nase: StavBalicku | null }> {
  const seznam = Promise.race([
    zjistiStavBalicku(),
    new Promise<null>((hotovo) => setTimeout(() => hotovo(null), LIMIT_SEZNAMU_MS)),
  ]);
  const [play, nase] = await Promise.all([zeptejSePlay(), seznam]);
  return { nabidka: coNabidnout(play, nase), nase };
}

/** Totéž pro nabídku pod tečkami a pro pruh. Jen Android. */
export function useNabidka() {
  return useData(async () => (Platform.OS === 'android' ? await nactiNabidku() : null));
}

/** Text tlačítka k nabídce, nebo `null`, když není co nabízet. */
export function tlacitkoNabidky(n: Nabidka): string | null {
  switch (n.druh) {
    case 'aktualizovat':
      return 'Aktualizovat';
    case 'dokoncit':
      return 'Zobrazit průběh';
    case 'obchod':
      return 'Otevřít Obchod Play';
    case 'nic':
      return null;
  }
}

/**
 * Udělá, co nabídka slibuje. Aktualizace — z appky i v obchodě — appku
 * po dokončení restartuje a po dobu stahování ji Play překryje, takže
 * když zrovna něco drží zámek (start, cíl, stavba, záznam), nejdřív se
 * zeptá. Nejde-li to přímo v appce, otevře obchod — nikdy neskončí mlčením.
 *
 * `nastavPracuje` dostane tlačítko, ať se nedá zmáčknout podruhé.
 */
export function nabidniAktualizaci(n: Nabidka, nastavPracuje?: (ano: boolean) => void): void {
  if (n.druh === 'nic') return;
  const proved = async () => {
    if (n.druh === 'obchod') {
      otevriObchod();
      return;
    }
    nastavPracuje?.(true);
    try {
      const v = await spustAktualizaci();
      if (v === 'nejde' || v === 'selhalo' || v === 'nepovoleno') otevriObchod();
    } finally {
      nastavPracuje?.(false);
    }
  };
  const vadi = prekazkyTed().filter((p) => p !== 'bez-site');
  if (vadi.length === 0) {
    void proved();
    return;
  }
  Alert.alert(
    'Aktualizovat teď?',
    `Právě ${vadi.map(popisPrekazky).join(', ')}. Během stahování appku překryje Obchod Play a po dokončení se restartuje — co je jen v paměti, se ztratí.`,
    [
      { text: 'Počkat', style: 'cancel' },
      { text: 'Aktualizovat', style: 'destructive', onPress: () => void proved() },
    ],
  );
}

/**
 * Je v obchodě novější balíček, než má telefon — a umí ho appka stáhnout?
 *
 * <b>Stojí nad hledáním po síti schválně.</b> Když je venku nový balíček,
 * hledání po síti pro starý otisk nic nenajde. Kdo čte odshora, musí
 * narazit nejdřív na tu pravdivou větu.
 */
export function ZObchodu() {
  const t = useTheme();
  const { data, nacita } = useData(nactiNabidku);
  const [pracuje, setPracuje] = useState(false);
  if (nacita || !data) return null;

  const { nabidka, nase } = data;
  const veta =
    popisNabidky(nabidka) ??
    (nase ? popisBalicku(nase) : 'Co je v Obchodě Play, se teď nedá zjistit.');
  if (!veta) return null;
  const tlacitko = tlacitkoNabidky(nabidka);

  return (
    <Karta>
      <Text style={{ color: t.text }}>{veta}</Text>
      {tlacitko ? (
        <Akce
          text={tlacitko}
          onPress={() => nabidniAktualizaci(nabidka, setPracuje)}
          pracuje={pracuje}
          vypnuto={pracuje}
        />
      ) : null}
    </Karta>
  );
}

/**
 * Pruh nad každou obrazovkou, když je venku nový balíček.
 *
 * <b>Proč všude, a ne jen na domovské obrazovce</b> (nález kontroly
 * 27. 11. 2026). Domov většinu lidí přeskočí — závodník jde rovnou na svou
 * obrazovku, divák na ročníky — takže karta tam by se nedala vidět. Nativní
 * balíček se přitom sám nestáhne, dokud ho Play nedoručí, a řádek pod
 * tečkami se dá týdny přehlížet (Filip, 27. 11. 2026: *„musí to být
 * naprostá samozřejmost"*).
 *
 * <b>Během startu a zápisu v cíli zmizí</b>, ať nic nepřekrývá ani nesvádí
 * ke klepnutí, které by appku restartovalo. Po návratu z pozadí se zeptá
 * znovu: kořenové rozvržení se připojí jednou za běh appky.
 */
export function PruhNoveVerze() {
  const t = useTheme();
  const zamky = useZamky();
  const { data, obnov } = useNabidka();
  const [pracuje, setPracuje] = useState(false);

  useEffect(() => {
    const odber = AppState.addEventListener('change', (s) => {
      if (s === 'active') void obnov();
    });
    return () => odber.remove();
  }, [obnov]);

  const n = data?.nabidka;
  if (!n || n.druh === 'nic') return null;
  if (zamky.includes('start') || zamky.includes('cil')) return null;
  const tlacitko = tlacitkoNabidky(n);

  return (
    <Pressable
      onPress={() => nabidniAktualizaci(n, setPracuje)}
      disabled={pracuje}
      accessibilityRole="button"
      accessibilityLabel={`Nová verze appky. ${tlacitko ?? ''}`}
      style={({ pressed }) => ({
        minHeight: 44,
        paddingHorizontal: 16,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: t.papir,
        borderBottomWidth: 1,
        borderBottomColor: t.linka,
        opacity: pressed || pracuje ? 0.6 : 1,
      })}>
      <Text style={{ color: t.text, flex: 1, fontWeight: '600' }} numberOfLines={2}>
        Nová verze appky
        <Text style={{ color: t.tlumeny, fontWeight: '400' }}>
          {n.druh === 'dokoncit' ? ' · stahuje se' : n.cisloBalicku ? ` · balíček č. ${n.cisloBalicku}` : ''}
        </Text>
      </Text>
      <Text style={{ color: t.voda, fontWeight: '700' }}>{pracuje ? 'Pracuji…' : tlacitko}</Text>
    </Pressable>
  );
}

/** Aplikace obchodu, a když na telefonu není, stránka v prohlížeči. */
export function otevriObchod() {
  void Linking.openURL(OBCHOD).catch(() => Linking.openURL(OBCHOD_WEB));
}

/**
 * Stav JavaScriptu a tlačítko k němu.
 *
 * <b>Nikde „aktuální" bez úspěšné kontroly</b> (26. 11. 2026). Dřív tu
 * stálo „Appka je aktuální.", kdykoliv appka zrovna nic nehledala — i když
 * kontrola spadla nebo proběhla před týdnem. Teď věta říká, kdy se
 * naposledy úspěšně ověřilo, nebo že se ověřit nepodařilo.
 */
function Hledani() {
  const t = useTheme();
  const stav = useUpdates();
  const tmave = useColorScheme() === 'dark';
  const [pracuje, setPracuje] = useState(false);
  const [pamet, setPamet] = useState(nactiPamet);

  const ted = Date.now();
  const s = stavJs({
    zapnute: true,
    nouzove: Updates.isEmergencyLaunch,
    pripravena: stav.isUpdatePending,
    hleda: stav.isChecking || stav.isDownloading || pracuje,
    odmitnuta: pamet.odmitnuta !== null,
    chyba: stav.checkError?.message ?? stav.downloadError?.message ?? null,
    kontrola: pamet.kontrola,
  });

  const podivejSe = async () => {
    setPracuje(true);
    try {
      await zkontrolujTed();
    } finally {
      setPamet(nactiPamet());
      setPracuje(false);
    }
  };

  const pouzij = () => {
    const id = stav.downloadedUpdate?.updateId;
    if (!id) return;
    const proved = () => void pouzijVerzi(id, (tmave ? Colors.dark : Colors.light).pozadi);
    const vadi = prekazkyTed().filter((p) => p !== 'bez-site');
    if (vadi.length === 0) return proved();
    Alert.alert(
      'Restartovat teď?',
      `Appka se restartuje do nové verze, a právě ${vadi.map(popisPrekazky).join(', ')}. Co je jen v paměti, se ztratí. Sama by počkala.`,
      [
        { text: 'Počkat', style: 'cancel' },
        { text: 'Restartovat', style: 'destructive', onPress: proved },
      ],
    );
  };

  return (
    <Karta>
      <Text style={{ color: t.text }}>{popisStavuJs(s, ted)}</Text>
      {s.druh === 'neovereno' && s.chyba ? (
        <Text style={{ color: t.tlumeny, fontSize: 13, marginTop: 6 }}>{s.chyba}</Text>
      ) : null}

      {stav.isUpdatePending ? (
        <Akce text="Použít novou verzi teď" onPress={pouzij} />
      ) : (
        <Akce
          text={pracuje ? 'Koukám…' : 'Podívat se teď'}
          onPress={() => void podivejSe()}
          pracuje={pracuje}
          vypnuto={stav.isChecking || stav.isDownloading}
        />
      )}
    </Karta>
  );
}

/**
 * Co říct tam, kde aktualizace po síti nejdou — v Expo Go a ve vývojovém
 * buildu. Mlčet by vypadalo stejně jako „appka je aktuální", a to je rozdíl,
 * na kterém se dá při ladění ztratit půl večera.
 */
function BezAktualizaci() {
  const t = useTheme();
  return (
    <Karta>
      <Text style={{ color: t.tlumeny }}>
        Aktualizace po síti v téhle verzi nejdou — appka běží z Expo Go nebo
        z vývojového buildu. V APK k rozdávání fungují.
      </Text>
    </Karta>
  );
}
