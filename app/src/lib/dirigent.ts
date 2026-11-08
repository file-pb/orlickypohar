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
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { useAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Speech from 'expo-speech';

import {
  casHlasem,
  coOkamzik,
  coZazni,
  DELKA_PINGU_MS,
  DELKA_TROUBENI_MS,
  nejblizsiOkamzik,
  type Troubeni,
  type Znameni,
} from './hlaseni';
import { jdeTo as klidJdeTo, nastav as nastavKlid, otevriNastaveni, smime } from './nerusit';
import { kolikDoStartu, maBytKlid, PROCEDURA_S, type StavStartu } from './start';
import { nastavZvuk, useZvuk } from './zvuk';

/** Zvuky klaksonu. Krátký a dlouhý jsou dva soubory, ne jeden zkrácený:
 *  zkrácení uprostřed cvakne, protože doběh zvuku zmizí. */
const KLAKSON = {
  kratce: require('../../assets/zvuky/klakson-kratky.wav'),
  dlouze: require('../../assets/zvuky/klakson-dlouhy.wav'),
} as const;

/**
 * <b>Ping</b>, kterým se ohlašuje odklad a všeobecné odvolání
 * (`scripts/ping.py`). Schválně nic společného s klaksonem: dva čisté
 * tóny vysoko nad pásmem houkačky a desetina jeho délky. Znamení
 * u startu jsou vyhlášená ve směrnici a tyhle dva úkony v ní nejsou —
 * ping tedy neoznamuje poli nic, jen rozhodčímu, že úkon prošel.
 */
const PING = require('../../assets/zvuky/ping.wav');

/**
 * <b>Číslovky odpočtu jako nahrávky, ne syntéza.</b>
 *
 * Filip, 7. 11. 2026: *„odpočet je nepravidelný, někdy není sekunda jako
 * sekunda. Tři dost často hlas divně prodlouží."* Obojí mělo svou
 * příčinu a žádná nebyla v plánování:
 *
 * <ul>
 *   <li><b>Začátek zvuku</b> ležel za probuzením zvukové relace a za
 *       režií syntetizátoru, takže se posouval pokaždé jinak. Relace se
 *       proto budí napřed (viz {@link PROBUZENI_PREDEM_MS}) a nahrávka
 *       začne hrát hned.</li>
 *   <li><b>Délka slova.</b> Každá číslovka byla samostatná jednoslovná
 *       věta a syntetizátor na konci věty protahuje — u *„tři"*
 *       nejvíc. Nahrávka má aspoň délku pevnou, tedy stejnou pokaždé.</li>
 * </ul>
 *
 * <b>Navíc zazní i bez českého hlasu v telefonu.</b> Appka dosud uměla
 * jen varovat, že hlášení bude k nepoznání; odpočet, na kterém u vody
 * záleží nejvíc, teď na tom hlasu nestojí.
 *
 * <b>Protažení samo tu zůstává</b> a ví se proč: *phrase-final
 * lengthening*. Dotáhnout slova na stejnou délku zkusil 8. 11. 2026
 * druhý pokus a byl horší — odpočet se začal rozjíždět, protože každé
 * slovo mluvilo jiným tempem. Pořádně to řeší jedině číslovka
 * vystřižená zprostřed nosné fráze, na kterou `say` nemá hranice slov,
 * nebo hlas živého člověka; Filip to 8. 11. 2026 odložil (*„necháme
 * syntézu a třeba časem pošlu"*) s tím, že podstatné je, aby číslovka
 * padla přesně na vteřinu. To drží tenhle soubor, ne nahrávka. Celá
 * rozprava je v hlavičce `tools/zvuky-cislovek.py`.
 *
 * Vyrábí je `tools/zvuky-cislovek.py` týmž syntetizátorem, jaký by
 * použil iOS, takže se od zbytku hlášení nepoznají. `assets/zvuky`
 * nečte `@expo/fingerprint`, takže nové soubory dojdou do vydaných
 * buildů aktualizací po síti.
 */
const CISLOVKY = {
  pět: require('../../assets/zvuky/cislovka-pet.wav'),
  čtyři: require('../../assets/zvuky/cislovka-ctyri.wav'),
  tři: require('../../assets/zvuky/cislovka-tri.wav'),
  dva: require('../../assets/zvuky/cislovka-dva.wav'),
  jedna: require('../../assets/zvuky/cislovka-jedna.wav'),
} as const;

/**
 * Jak dlouho před znamením si appka vyžádá zvukovou relaci.
 *
 * <b>Napřed, ne v okamžiku.</b> Probuzení jsou dvě nativní volání
 * (`setAudioModeAsync`, `setIsAudioActiveAsync`) a do 7. 11. 2026 stála
 * před každým zvukem — klakson i číslovka tedy začínaly o tu dobu
 * později, a pokaždé o jinou. Vlastnost, kvůli které se budí pořád
 * dokola (hovor relaci zabije a appka se to nedozví), tím nemizí:
 * jen se přesune o čtyři desetiny vteřiny dopředu.
 */
const PROBUZENI_PREDEM_MS = 400;

/**
 * Jak čerstvá smí relace být, aby se nebudila znovu.
 *
 * Během odpočtu padne pět číslovek po vteřině a budit relaci před každou
 * by bylo deset nativních volání pro nic. Mezery mezi skupinami znamení
 * jsou nejkratší deset vteřin (`OZNAMENI_S`), takže se mez vejde mezi
 * ně: uvnitř odpočtu se nebudí, před další skupinou ano.
 */
const RELACE_CERSTVA_MS = 3000;

/** Jazyk hlášení. Partitura je česká a jinak než česky nedává smysl. */
const JAZYK = 'cs-CZ';

/**
 * Jak rychle hlas mluví.
 *
 * Pod jedničkou schválně: *„za pět, čtyři, tři, dva, jedna"* musí skončit
 * přesně na znamení a výchozí tempo syntézy to odříká dřív, než je čas.
 */
const TEMPO = 0.95;

/**
 * Jak daleko dopředu se zvuk plánuje.
 *
 * Musí být delší než tik panelu (vteřina), jinak by mezi dvěma tiky
 * znamení propadlo. Delší okno nic nezlepší — plán se stejně přepíše
 * dalším tikem.
 */
const OKNO_PLANU_S = 1.5;

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
  /** Mluví appka — hlášení a odpočet číslovkami? */
  hlas: boolean;
  /** Troubí appka klaksonem? */
  klakson: boolean;

  /** Telefon nemá český hlas — hlášení by bylo k nepoznání. */
  bezCestiny: boolean;
  /**
   * Telefon by *Nerušit* přepnout umí, ale nemá k tomu oprávnění. Na
   * iPhonu je to vždycky `false`, protože tam to neumí vůbec.
   */
  klidChybiPovoleni: boolean;
  /** Otevře nastavení systému, kde se oprávnění pro *Nerušit* dává. */
  povolKlid: () => void;
  /**
   * <b>Zrušení rozjížďky: dva dlouhé zvuky.</b>
   *
   * Tohle číslo nestojí v ZPJ, ale v <b>plachetní směrnici poháru</b>
   * — a ta ho tam má celou dobu (nález R23: *„Zrušení rozjížďky: dva
   * dlouhé zvuky"*, v aplikaci dosud *„nikde"*). Obecná pravidla mají
   * pro zrušení po startu vlajku N a <b>tři</b> zvuky; směrnice to pro
   * tenhle seriál mění na dva, a směrnice je ta, podle které se na
   * Orlíku jede. Proto je to dvojka — a proto je tu tahle věta, aby to
   * příště nikdo „neopravil" na tři.
   *
   * Nespouští se klepnutím, ale přechodem rozjížďky do zrušeného stavu,
   * takže zazní i tehdy, když rozjížďku zrušil někdo jiný z webu.
   */
  zruseno: (cislo: number) => void;
  /**
   * <b>Odklad nebo všeobecné odvolání.</b> Ping a věta — ne klakson,
   * viz implementace. `kdy` je nový čas startu (pražský, „15:06"), nebo
   * `null`, když se odkládá bez času.
   */
  prerusen: (druh: 'odklad' | 'odvolani', cislo: number, kdy: string | null) => void;
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
  const volba = useZvuk();
  const [bezCestiny, setBezCestiny] = useState(false);

  const kratky = useAudioPlayer(KLAKSON.kratce);
  const dlouhy = useAudioPlayer(KLAKSON.dlouze);
  const ping = useAudioPlayer(PING);

  // Pět přehrávačů, každý se svou číslovkou. Vypsané jeden po druhém,
  // protože hooky se nedají volat ve smyčce nad objektem — a i kdyby
  // šly, pořadí hooků musí být neměnné.
  const pet = useAudioPlayer(CISLOVKY.pět);
  const ctyri = useAudioPlayer(CISLOVKY.čtyři);
  const tri = useAudioPlayer(CISLOVKY.tři);
  const dva = useAudioPlayer(CISLOVKY.dva);
  const jedna = useAudioPlayer(CISLOVKY.jedna);

  // <b>Drží to ref, ne proměnná.</b> Nový objekt při každém překreslení
  // by byl nová závislost efektu, a ten se na vteřinovém tiku překresluje
  // pořád — plánoval by se znovu a znovu pro nic. Přehrávače samy se
  // nemění.
  const cislovky = useRef<Record<string, Prehravac>>({});
  cislovky.current = { pět: pet, čtyři: ctyri, tři: tri, dva, jedna };

  const doStartu = kolikDoStartu(stav, ted);
  const vOkne = maBytKlid(stav, ted, delkaS);

  // <b>Dvě nezávislé věci, ne jedna.</b> Klakson je takt pro ruku, která
  // mačká houkačku; hlas je pro toho, kdo má telefon v kapse. Dá se
  // chtít jen jedno z nich (Filip, 8. 11. 2026). `veli` je u obojího
  // podmínka, ne volba: obrazovku regaty čte i závodník a divák.
  const mluvi = veli && volba.hlas;
  const troubi = veli && volba.klakson;
  /** Zní z telefonu vůbec něco? Pro to, co platí pro obojí stejně. */
  const zni = mluvi || troubi;

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

  // Má telefon česky? Zjistí se jednou, při zapnutí hlasu. Klaksonu je
  // to jedno, takže se na něj nekouká.
  useEffect(() => {
    if (!mluvi) return;
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
  }, [mluvi]);

  // <b>Zámek na Androidu</b> — bez něj zvuk na pozadí po ~3 minutách
  // umlká (omezení systému), a procedura je pětiminutová. Na iOSu to
  // řeší `UIBackgroundModes` a tahle část je zbytečná.
  useEffect(() => {
    if (Platform.OS !== 'android' || !zni || !vOkne) return;
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
  }, [zni, vOkne, kratky]);

  // <b>Partitura se plánuje dopředu, nedohání se zpětně.</b> Panel tiká
  // po vteřině, takže zvuk puštěný „až s tikem" zazní až vteřinu po svém
  // okamžiku — a u odpočtu, podle kterého se mačká houkačka, je to
  // vteřina, o kterou rozhodčí zatroubí pozdě. Tik proto jen zjistí, co
  // přijde do příští vteřiny, a naplánuje to na přesný zlomek.
  //
  // Dohánění zůstává pro jediný případ, kdy plán nestačí: appka byla na
  // pozadí a tik nepřišel vůbec. Obojí drží tentýž seznam vyřízených
  // okamžiků, aby jedno znamení nezaznělo dvakrát.
  const predchozi = useRef<number | null>(null);
  const vyrizeno = useRef(new Set<number>());
  const casovace = useRef<ReturnType<typeof setTimeout>[]>([]);
  // <b>Drží to ref, ne proměnná.</b> Naplánovaný zvuk se ptá až ve chvíli,
  // kdy má zaznít — a mezi naplánováním a tou chvílí mohl rozhodčí volbu
  // změnit.
  const zniTed = useRef({ mluvi, troubi });
  zniTed.current = { mluvi, troubi };

  // Kdy se relace budila naposledy. Uvnitř odpočtu se nebudí znovu —
  // viz `RELACE_CERSTVA_MS`.
  const probuzeno = useRef(0);
  const casovaceZruseni = useRef<ReturnType<typeof setTimeout>[]>([]);
  const probud = useCallback(async () => {
    if (Date.now() - probuzeno.current < RELACE_CERSTVA_MS) return;
    probuzeno.current = Date.now();
    await probudRelaci();
  }, []);

  useEffect(() => {
    if (doStartu === null) {
      predchozi.current = null;
      vyrizeno.current.clear();
      return;
    }
    const minule = predchozi.current;
    predchozi.current = doStartu;

    // Čas do startu vzrostl: je to jiná procedura (odložení, odvolání,
    // další rozjížďka) a co bylo vyřízené v té minulé, tady neplatí.
    if (minule !== null && doStartu > minule) vyrizeno.current.clear();

    // První tik jen zapamatuje, kde jsme; jinak by se po otevření
    // obrazovky přehrálo všechno, co už dávno platilo.
    if (minule === null || !zni) return;

    const vyriz = (okamzik: Znameni[], zaMs: number) => {
      const kdy = okamzik[0].vterinDoStartu;
      if (vyrizeno.current.has(kdy)) return;
      vyrizeno.current.add(kdy);

      // Propadlé znamení už je pozdě; pár milisekund navíc na probuzení
      // relace nic nezhorší a bez ní by nebylo slyšet nic.
      if (zaMs <= 0) {
        void (async () => {
          await probud();
          prehraj(okamzik, kratky, dlouhy, cislovky.current, zniTed.current);
        })();
        return;
      }

      // <b>Relace se budí napřed.</b> Kdyby se budila až v okamžiku,
      // stála by před zvukem — a právě to dělalo odpočet nepravidelným.
      const predem = zaMs - PROBUZENI_PREDEM_MS;
      if (predem <= 0) void probud();
      else
        casovace.current.push(
          setTimeout(() => {
            if (zniTed.current.mluvi || zniTed.current.troubi) void probud();
          }, predem),
        );

      casovace.current.push(
        setTimeout(() => {
          // Mezi naplánováním a zazněním mohl rozhodčí hlas vypnout.
          prehraj(okamzik, kratky, dlouhy, cislovky.current, zniTed.current);
        }, zaMs),
      );
    };

    const prijde = nejblizsiOkamzik(doStartu, OKNO_PLANU_S, delkaS);
    if (prijde.length > 0) vyriz(prijde, (doStartu - prijde[0].vterinDoStartu) * 1000);

    const propadlo = coOkamzik(minule, doStartu, delkaS);
    if (propadlo.length > 0) vyriz(propadlo, 0);
  }, [doStartu, zni, delkaS, kratky, dlouhy]);

  // Naplánovaný zvuk nesmí přežít odchod z obrazovky.
  useEffect(
    () => () => {
      casovace.current.forEach(clearTimeout);
      casovace.current = [];
    },
    [],
  );

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
    if (!mluvi) Speech.stop().catch(() => {});
  }, [mluvi]);

  /**
   * Zatroubí zrušení rozjížďky: dva dlouhé zvuky a pak věta.
   *
   * <b>Druhý zvuk až po doznění prvního</b>, ne přes něj — dva klaksony
   * naráz zní jako jeden delší a počítat se mají dva. Věta jde až za
   * nimi, ze stejného důvodu jako u znamení: pod klaksonem by zmizela.
   */
  const zruseno = useCallback(
    (cislo: number) => {
      const { mluvi: m, troubi: tr } = zniTed.current;
      if (!m && !tr) return;
      void (async () => {
        await probud();
        // <b>Věta čeká na klakson, jen když klakson zní.</b> S vypnutým
        // klaksonem by se čekalo na ticho a oznámení by přišlo o dvě
        // vteřiny později než zrušení samo.
        const rekni = () => {
          if (!m) return;
          Speech.stop().catch(() => {});
          Speech.speak(`Rozjížďka ${cislo} zrušena`, { language: JAZYK, rate: TEMPO });
        };
        if (!tr) {
          rekni();
          return;
        }
        zahraj(dlouhy);
        casovaceZruseni.current.push(
          setTimeout(() => zahraj(dlouhy), DELKA_TROUBENI_MS.dlouze),
          setTimeout(rekni, DELKA_TROUBENI_MS.dlouze * 2),
        );
      })();
    },
    [dlouhy, probud],
  );

  /**
   * <b>Odklad a odvolání: ping a věta, ne klakson</b> (Filip, 8. 11.
   * 2026: *„jestli ne, tak nějaký ping drobný a slovně oznámit hlasem.
   * Jinak by se to pletlo s oficiálním signálem"*).
   *
   * Zvuková znamení u startu jsou vyhlášená a plachetní směrnice poháru
   * vypisuje jediné — zrušení rozjížďky dvěma dlouhými (R23). Tyhle dva
   * úkony v ní nejsou, takže klakson by u nich oznamoval poli znamení,
   * které nikdo nevyhlásil. Ping žádné znamení není: je to potvrzení
   * rozhodčímu, že úkon prošel, a věta po něm říká co.
   *
   * Nespouští se klepnutím, ale změnou stavu rozjížďky — tedy i tehdy,
   * když odložil někdo jiný z webu, stejně jako u zrušení.
   */
  const prerusen = useCallback(
    (druh: 'odklad' | 'odvolani', cislo: number, kdy: string | null) => {
      const { mluvi: m, troubi: tr } = zniTed.current;
      if (!m && !tr) return;
      void (async () => {
        await probud();
        // <b>Ping zazní i tomu, kdo má jen klakson.</b> Není to znamení
        // pro pole, ale potvrzení rozhodčímu, že úkon prošel — a bez
        // něj by u vypnutého hlasu neřekl telefon vůbec nic.
        zahraj(ping);
        if (!m) return;
        // <b>Odvolání čas neříká</b> (Filip, 8. 11. 2026: *„všeobecné
        // odvolání stačí říct"*). Nový čas u něj počítá pravidlo
        // (ZPJ 29.2), ne rozhodčí — nic se jím nerozhoduje a věta navíc
        // jen prodlužuje hlášení ve chvíli, kdy se pole vrací ke startu.
        // U odkladu je to naopak ta podstatná informace: čas si volí
        // rozhodčí sám a hlášení je jediné potvrzení, že se zapsal ten,
        // který chtěl.
        const casem = druh === 'odklad' && kdy ? casHlasem(kdy) : null;
        const sCasem = casem
          ? `Start rozjížďky ${cislo} odložen na ${casem}.`
          : druh === 'odklad'
            ? `Start rozjížďky ${cislo} odložen.`
            : `Všeobecné odvolání, rozjížďka ${cislo}.`;
        casovaceZruseni.current.push(
          setTimeout(() => {
            Speech.stop().catch(() => {});
            Speech.speak(sCasem, { language: JAZYK, rate: TEMPO });
          }, DELKA_PINGU_MS),
        );
      })();
    },
    [ping, probud],
  );

  // Naplánované zvuky zrušení a přerušení nesmějí přežít odchod
  // z obrazovky.
  useEffect(
    () => () => {
      casovaceZruseni.current.forEach(clearTimeout);
      casovaceZruseni.current = [];
    },
    [],
  );

  return {
    zruseno,
    prerusen,
    hlas: volba.hlas,
    klakson: volba.klakson,
    bezCestiny: mluvi && bezCestiny,
    klidChybiPovoleni: veli && klidJdeTo() && !smimeKlid,
    povolKlid: () => void otevriNastaveni(),
  };
}

/** Krátký klakson, ať si ho umí přehrát i nastavení zvuku. */
export const KLAKSON_KRATCE = KLAKSON.kratce;

/**
 * <b>Zapnutí se musí ozvat, a tím, co se zapnulo.</b>
 *
 * Rozhodčí si telefon strčí do kapsy a potřebuje vědět, že z ní něco
 * uslyší — a jak nahlas. Jediná chvíle, kdy se to dá zkusit, je ta, kdy
 * se to zapíná; za minutu už jde o start. Ukázat klakson tomu, kdo
 * zapnul hlas, by přitom bylo zavádějící: slyšel by zvuk, který mu pak
 * nezazní.
 */
export function ukazZvuk(co: 'hlas' | 'klakson', kratky: Prehravac): void {
  void (async () => {
    await probudRelaci();
    if (co === 'klakson') {
      zahraj(kratky);
      return;
    }
    Speech.speak('Dirigent hlásí', { language: JAZYK, rate: TEMPO });
  })();
}

/** Zastaví rozmluvené hlášení — po vypnutí hlasu nemá co dozvučovat. */
export function umlkni(): void {
  Speech.stop().catch(() => {});
}

/** Značka, pod kterou si panel drží displej. Vlastní, aby ji neuvolnil
 *  někdo jiný — cílová obrazovka má svou. */
const ZNACKA_DISPLEJ = 'start-procedura';

/** Přehrávač jednoho zvuku. Jen ta část, kterou dirigent potřebuje. */
type Prehravac = { seekTo: (s: number) => Promise<void>; play: () => void };

/**
 * Přehraje jeden okamžik partitury: zatroubí a řekne.
 *
 * <b>Nebudí zvukovou relaci.</b> O tu se stará volající, a schválně
 * dřív — probuzení v okamžiku zvuku bylo to, co dělalo odpočet
 * nepravidelným (viz `PROBUZENI_PREDEM_MS`).
 */
function prehraj(
  okamzik: Znameni[],
  kratky: Prehravac,
  dlouhy: Prehravac,
  cislovky: Record<string, Prehravac>,
  /** Co z toho zní: hlas, klakson, nebo obojí. */
  zni: { mluvi: boolean; troubi: boolean },
): void {
  const { troubeni, veta } = coZazni(okamzik, zni);

  if (troubeni) troub(troubeni, kratky, dlouhy);
  if (!veta) return;

  // <b>Číslovka odpočtu jde z nahrávky</b>, a je to to jediné místo,
  // kde na milisekundách záleží: rozhodčí podle ní mačká houkačku.
  // Syntéza by začala o neznámou chvíli později a slovo by na konci
  // protáhla.
  const nahravka = cislovky[veta];
  if (nahravka) {
    // Věta, která ještě dozvučuje, by se s odpočtem pletla.
    Speech.stop().catch(() => {});
    zahraj(nahravka);
    return;
  }

  // Nové hlášení přebíjí staré: *„jedna minuta"* nesmí čekat, až
  // doběhne *„čtyři minuty do startu"*.
  const rekni = () => {
    Speech.stop().catch(() => {});
    Speech.speak(veta, { language: JAZYK, rate: TEMPO });
  };

  // <b>Věta jde až po doznění klaksonu</b>, ne s ním. Klakson je hlasitý
  // a mluvené hlášení by pod ním zmizelo — a přitom jsou v partituře na
  // tentýž okamžik schválně: nejdřív takt pro ruku rozhodčího, pak slovo
  // pro ty, kdo ho slyší.
  if (troubeni) setTimeout(rekni, DELKA_TROUBENI_MS[troubeni]);
  else rekni();
}

function troub(druh: Troubeni, kratky: Prehravac, dlouhy: Prehravac): void {
  zahraj(druh === 'dlouze' ? dlouhy : kratky);
}

/**
 * Přehraje zvuk od začátku.
 *
 * <b>Přetočení je nutné:</b> týž přehrávač hraje znovu a znovu a po
 * dohrání stojí na konci, takže by podruhé nezaznělo nic. Když se
 * přetočení nepovede, zkusí se přehrát stejně — mlčící klakson je horší
 * než klakson od půlky.
 */
function zahraj(p: Prehravac): void {
  p.seekTo(0)
    .then(() => p.play())
    .catch(() => p.play());
}
