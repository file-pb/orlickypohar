/**
 * Hlas a klakson u startu — přehrávač partitury z `hlaseni.ts`.
 *
 * <b>Proč to vzniklo.</b> Filip, 29. 10. 2026: *„Houkat musí Miloš stejně,
 * ale telefon bude houkat s ním. Díky tomu se nemusí Miloš koukat na
 * displej, protože uslyší dirigenta, co má dělat."* Hlas tedy není
 * hlášení pro posádky — je to <b>vodítko pro ruku rozhodčího</b>, kdy
 * zmáčknout houkačku. Posádky ho slyší jako vedlejší účinek.
 *
 * <b>Co se rozdělilo kam.</b> Co a kdy se má říct, je partitura
 * (`hlaseni.ts`, testy bez telefonu). Tady je jen to, co bez telefonu
 * ověřit nelze: zvuková relace, hlas, klakson a displej.
 *
 * <b>Tři věci, které tenhle soubor nedokáže</b>, a je lepší to mít
 * napsané než si to slibovat:
 *
 * <ol>
 *   <li><i>Troubit během hovoru.</i> iOS zvukovou relaci na dobu hovoru
 *       přeruší a žádná appka to neobejde. Co jde, je navázat <b>po</b>
 *       zavěšení tam, kde procedura doopravdy je — a to zajišťuje
 *       <see cref="probudRelaci"/> před každým znamením.</li>
 *   <li><i>Dozvědět se, že přerušení skončilo.</i> `expo-audio` událost
 *       o přerušení nevydává (ověřeno v `AudioModule.types.d.ts` —
 *       žádný posluchač na to není). Proto se relace nečeká, ale
 *       vyžaduje si ji appka sama před každým zvukem; partitura hraje
 *       aspoň každou minutu, takže se obnoví sama.</li>
 *   <li><i>Zajistit český hlas.</i> Když ho telefon nemá, syntéza buď
 *       mlčí, nebo čte česká slova anglicky. Appka to pozná a řekne —
 *       doinstalovat hlas umí jen uživatel v nastavení systému.</li>
 * </ol>
 *
 * <b>Zvuk na pozadí</b> stojí na `UIBackgroundModes: audio` a na
 * přehrávací službě Androidu; obojí zapíná config plugin `expo-audio`
 * v `app.json`. Bez nich telefon v kapse mlčí, a tím padá celý nápad
 * (Filip tamtéž: *„telefon nemusí být na očích"*).
 */
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { useAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Speech from 'expo-speech';
import { File, Paths } from 'expo-file-system';

import { coOkamzik, type Troubeni, type Znameni } from './hlaseni';
import { jdeTo as klidJdeTo, nastav as nastavKlid, otevriNastaveni, smime } from './nerusit';
import { kolikDoStartu, maBytKlid, PROCEDURA_S, type StavStartu } from './start';

/** Zvuky klaksonu. Krátký a dlouhý jsou dva soubory, ne jeden zkrácený:
 *  zkrácení uprostřed cvakne, protože doběh zvuku zmizí. */
const KLAKSON = {
  kratce: require('../../assets/zvuky/klakson-kratky.wav'),
  dlouze: require('../../assets/zvuky/klakson-dlouhy.wav'),
} as const;

/** Jazyk hlášení. Partitura je česká a jinak než česky nedává smysl. */
const JAZYK = 'cs-CZ';

/**
 * Jak rychle hlas mluví.
 *
 * Pod jedničkou schválně: *„za pět, čtyři, tři, dva, jedna"* musí skončit
 * přesně na znamení a výchozí tempo syntézy to odříká dřív, než je čas.
 */
const TEMPO = 0.95;

/** Soubor, ve kterém si appka pamatuje, jestli má hlásit. */
const PAMET = 'dirigent.json';

/** Co si o hlasu appka pamatuje mezi spuštěními. */
export function nactiHlas(): boolean | null {
  try {
    const f = new File(Paths.document, PAMET);
    if (!f.exists) return null;
    const v = JSON.parse(f.textSync()) as { zapnuto?: unknown };
    return typeof v?.zapnuto === 'boolean' ? v.zapnuto : null;
  } catch {
    return null;
  }
}

/** Zapamatuje volbu hlasu. Nepovede-li se to, platí jen pro tenhle běh. */
export function ulozHlas(zapnuto: boolean): void {
  try {
    const f = new File(Paths.document, PAMET);
    if (f.exists) f.delete();
    f.create();
    f.write(JSON.stringify({ zapnuto }));
  } catch {
    // Volba hlasu nestojí za pád obrazovky startu.
  }
}

/**
 * Vyžádá si zvukovou relaci pro tenhle okamžik.
 *
 * <b>Před každým znamením, ne jednou při zapnutí.</b> Hovor relaci
 * přeruší a appka se o jejím konci nedozví; tohle je ta jediná cesta,
 * jak po zavěšení zase zaznít. Volat se to může libovolně často —
 * nastavení téhož režimu je bez účinku.
 */
async function probudRelaci(): Promise<void> {
  try {
    await setAudioModeAsync({
      // Telefon v kapse bývá na tichu, a tam je klakson k ničemu.
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      // `doNotMix` kvůli dvěma věcem: hudba v telefonu se na dobu znamení
      // zastaví (ztišená by s klaksonem splývala) a Android bez něj nedá
      // přehrávání na zámku, bez kterého po třech minutách na pozadí
      // ztichne.
      interruptionMode: 'doNotMix',
      allowsRecording: false,
    });
    await setIsAudioActiveAsync(true);
  } catch {
    // Mlčící telefon je horší než hlásící, ale lepší než spadlá obrazovka
    // startu: odpočet musí doběhnout i bez zvuku.
  }
}

/** Co dirigent umí říct o sobě. */
export type Dirigent = {
  /** Hlásí appka nahlas? */
  zapnuto: boolean;
  /** Přepnout hlas a zapamatovat volbu. */
  prepni: () => void;
  /** Telefon nemá český hlas — hlášení by bylo k nepoznání. */
  bezCestiny: boolean;
  /**
   * Telefon by *Nerušit* přepnout umí, ale nemá k tomu oprávnění. Na
   * iPhonu je to vždycky `false`, protože tam to neumí vůbec.
   */
  klidChybiPovoleni: boolean;
  /** Otevře nastavení systému, kde se oprávnění pro *Nerušit* dává. */
  povolKlid: () => void;
};

/**
 * Dirigent: drží takt startovní procedury hlasem, klaksonem a displejem.
 *
 * <b>Hlásí jen tomu, kdo velí.</b> Obrazovku regaty čte i závodník
 * a divák, a těm by telefon začal troubit bez vyzvání. `veli` je proto
 * podmínka, ne volba.
 *
 * <b>Displej drží i když hlas mlčí.</b> Zhasnutý telefon uprostřed
 * procedury je potíž sám pro sebe (Miloš, 27. 10. 2026: *„mobil mi nesmí
 * usnout"*) a s hlasem nemá nic společného.
 */
export function useDirigent(
  stav: StavStartu | null,
  ted: number,
  delkaS: number = PROCEDURA_S,
  veli: boolean = false,
): Dirigent {
  const [zapnuto, setZapnuto] = useState(() => nactiHlas() ?? true);
  const [bezCestiny, setBezCestiny] = useState(false);

  const kratky = useAudioPlayer(KLAKSON.kratce);
  const dlouhy = useAudioPlayer(KLAKSON.dlouze);

  const doStartu = kolikDoStartu(stav, ted);
  const vOkne = maBytKlid(stav, ted, delkaS);
  const hlasi = veli && zapnuto;

  // <b>Displej nesmí zhasnout v okně procedury.</b> Mimo něj se o něj
  // appka nestará — svítící telefon celý den sežere baterku, kterou
  // odpočet potřebuje.
  useEffect(() => {
    if (!veli || !vOkne) return;
    activateKeepAwakeAsync(ZNACKA_DISPLEJ).catch(() => {});
    return () => {
      deactivateKeepAwake(ZNACKA_DISPLEJ).catch(() => {});
    };
  }, [veli, vOkne]);

  // Má telefon česky? Zjistí se jednou, při zapnutí hlasu.
  useEffect(() => {
    if (!hlasi) return;
    let platne = true;
    Speech.getAvailableVoicesAsync()
      .then((hlasy) => {
        if (!platne) return;
        setBezCestiny(!hlasy.some((h) => h.language?.toLowerCase().startsWith('cs')));
      })
      // Nepovedlo se zjistit: mlčet o tom je lepší než tvrdit, že čeština
      // chybí, a nechat rozhodčího hledat ji v nastavení zbytečně.
      .catch(() => {});
    return () => {
      platne = false;
    };
  }, [hlasi]);

  // <b>Zámek na Androidu</b> — bez něj zvuk na pozadí po ~3 minutách
  // umlká (omezení systému), a procedura je pětiminutová. Na iOSu to
  // řeší `UIBackgroundModes` a tahle část je zbytečná.
  useEffect(() => {
    if (Platform.OS !== 'android' || !hlasi || !vOkne) return;
    try {
      kratky.setActiveForLockScreen(true, {
        title: 'Startovní procedura',
        artist: 'Orlický pohár',
      });
    } catch {
      // Bez zámku se jen zkrátí doba, po kterou telefon v kapse mluví.
    }
    return () => {
      try {
        kratky.setActiveForLockScreen(false);
      } catch {}
    };
  }, [hlasi, vOkne, kratky]);

  // Partitura. Tiká se zvenčí (`ted` z panelu), tady se jen rozhoduje,
  // co z toho ještě stíhá — a přehrává.
  const predchozi = useRef<number | null>(null);
  useEffect(() => {
    if (doStartu === null) {
      predchozi.current = null;
      return;
    }
    const minule = predchozi.current;
    predchozi.current = doStartu;

    // První tik jen zapamatuje, kde jsme; jinak by se po otevření
    // obrazovky přehrálo všechno, co už dávno platilo.
    if (minule === null || !hlasi) return;

    const okamzik = coOkamzik(minule, doStartu, delkaS);
    if (okamzik.length > 0) prehraj(okamzik, kratky, dlouhy);
  }, [doStartu, hlasi, delkaS, kratky, dlouhy]);

  // <b>Nerušit na dobu procedury.</b> Zapíná se podle `maBytKlid`, tedy
  // od minuty před zahájením do pěti minut po startu — a appka o obou
  // koncích mluví, protože tichý návrat do normálu by znamenal, že
  // rozhodčí nepozná zmeškaný hovor od vypnutého telefonu.
  //
  // <b>Nezávisí na hlasu:</b> klid je proti vyzvánění, ne proti tichu.
  // Kdo si hlas vypnul, pořád nechce zvonit uprostřed startu.
  //
  // <b>Oprávnění se zjišťuje znovu po návratu do appky.</b> Rozhodčí
  // odejde do nastavení, povolí to a vrátí se — a kdyby se to
  // nepřepočítalo, výzva by na obrazovce zůstala a klid by se nezapnul
  // až do příští rozjížďky.
  const [smimeKlid, setSmimeKlid] = useState(() => klidJdeTo() && smime());
  useEffect(() => {
    if (!klidJdeTo()) return;
    const zjisti = () => setSmimeKlid(smime());
    zjisti();
    const posluchac = AppState.addEventListener('change', (stav) => {
      if (stav === 'active') zjisti();
    });
    return () => posluchac.remove();
  }, []);

  useEffect(() => {
    if (!veli || !vOkne || !smimeKlid) return;
    void nastavKlid(true);
    return () => {
      // Modul si předchozí režim pamatuje a vrátí ho i po pádu appky,
      // takže tohle je běžná cesta, ne jediná.
      void nastavKlid(false);
    };
  }, [veli, vOkne, smimeKlid]);

  // Vypnutí uprostřed věty musí ztichnout hned, ne až doříká.
  useEffect(() => {
    if (!hlasi) Speech.stop().catch(() => {});
  }, [hlasi]);

  return {
    zapnuto,
    bezCestiny: hlasi && bezCestiny,
    klidChybiPovoleni: veli && klidJdeTo() && !smimeKlid,
    povolKlid: () => void otevriNastaveni(),
    prepni: () => {
      // <b>Zápis ani zvuk nepatří do aktualizační funkce stavu.</b> React
      // ji smí zavolat víckrát a vedlejší efekt by se zopakoval — tahle
      // past už jednou zasekla frontu hlášek.
      const nove = !zapnuto;
      setZapnuto(nove);
      ulozHlas(nove);

      // <b>Zapnutí se musí ozvat.</b> Rozhodčí si telefon strčí do kapsy
      // a potřebuje vědět, že z ní něco uslyší — a jak nahlas. Jediná
      // chvíle, kdy se to dá zkusit, je teď: za minutu už jde o start.
      if (nove) {
        void (async () => {
          await probudRelaci();
          troub('kratce', kratky, dlouhy);
          setTimeout(() => {
            Speech.speak('Dirigent hlásí', { language: JAZYK, rate: TEMPO });
          }, DELKA_TROUBENI_MS.kratce);
        })();
      } else {
        Speech.stop().catch(() => {});
      }
    },
  };
}

/** Značka, pod kterou si panel drží displej. Vlastní, aby ji neuvolnil
 *  někdo jiný — cílová obrazovka má svou. */
const ZNACKA_DISPLEJ = 'start-procedura';

/** Jak dlouho který klakson troubí. Drží délku zvukových souborů. */
const DELKA_TROUBENI_MS: Record<Troubeni, number> = { kratce: 1000, dlouze: 4000 };

/** Přehrávač jednoho zvuku. Jen ta část, kterou dirigent potřebuje. */
type Prehravac = { seekTo: (s: number) => Promise<void>; play: () => void };

/**
 * Přehraje jeden okamžik partitury: zatroubí a řekne.
 *
 * <b>Věta jde až po doznění klaksonu</b>, ne s ním. Klakson je hlasitý
 * a mluvené hlášení by pod ním zmizelo — a přitom jsou v partituře na
 * tentýž okamžik schválně: nejdřív takt pro ruku rozhodčího, pak slovo
 * pro ty, kdo ho slyší.
 */
function prehraj(okamzik: Znameni[], kratky: Prehravac, dlouhy: Prehravac): void {
  const troubeni = okamzik.find((z) => z.troubi)?.troubi ?? null;
  const veta = okamzik.find((z) => z.rekni)?.rekni ?? '';

  void (async () => {
    await probudRelaci();

    if (troubeni) troub(troubeni, kratky, dlouhy);
    if (!veta) return;

    // Nové hlášení přebíjí staré: *„jedna minuta"* nesmí čekat, až
    // doběhne *„čtyři minuty do startu"*.
    const rekni = () => {
      Speech.stop().catch(() => {});
      Speech.speak(veta, { language: JAZYK, rate: TEMPO });
    };

    if (troubeni) setTimeout(rekni, DELKA_TROUBENI_MS[troubeni]);
    else rekni();
  })();
}

function troub(druh: Troubeni, kratky: Prehravac, dlouhy: Prehravac): void {
  const p = druh === 'dlouze' ? dlouhy : kratky;
  // Od začátku: týž přehrávač troubí znovu a znovu a po dohrání stojí na
  // konci.
  p.seekTo(0)
    .then(() => p.play())
    .catch(() => p.play());
}
