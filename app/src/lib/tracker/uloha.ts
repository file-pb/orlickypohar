/**
 * Záznam polohy na pozadí.
 *
 * Tohle je ta část pilotu, která se nedá vyzkoušet v Expo Go: jeho nativní
 * binárka je pevná, takže se do ní nedá deklarovat `UIBackgroundModes:
 * location` ani služba na popředí. Zkouší se v APK (`npm run apk`), na iOSu
 * v simulátoru.
 *
 * Úloha se registruje v systému, ne v appce — `isTaskRegisteredAsync` čte
 * z trvalého úložiště a přežije i zabití procesu. Když systém appku zabije,
 * probudí se jen tenhle handler v samostatném JS kontextu bez jediné
 * obrazovky; proto si bere stav ze databáze a nesmí spoléhat na nic v paměti.
 */
import * as Location from 'expo-location';
import { Alert, Linking } from 'react-native';
import * as TaskManager from 'expo-task-manager';

import { baterieProcent, obnovBaterii } from './baterie';
import { hlasim, ozviSeAsync, zacniKdyzJeCas } from './hlasim-se';
import { zkusZiveAsync } from './nahravani';
import { SDELENI, cekejNaSdeleni, hostJeNaMiste, textSdeleni } from './sdeleni';
import { bezicZaznam, zapisBody } from './zaznam';

export const ULOHA = 'orlickypohar-zaznam-trasy';

type DataPolohy = { locations: Location.LocationObject[] };

/**
 * Musí být v globálním rozsahu modulu — Expo to vyžaduje a po probuzení
 * v novém kontextu se nic jiného nevyhodnotí.
 *
 * Handler je `async`, protože to Expo vyžaduje, ale zápis bodů je před
 * prvním `await` — tedy hotový synchronně, ještě než se vrátí řízení. Kdyby
 * se zápis odložil za `await`, zabitý proces by ho nedokončil, a to je
 * přesně ta porucha, kvůli které tenhle soubor vypadá takhle.
 */
TaskManager.defineTask<DataPolohy>(ULOHA, async ({ data, error }) => {
  if (error) {
    // Handler nesmí vyhodit výjimku, jinak systém úlohu odregistruje a
    // záznam skončí bez varování v půlce závodu.
    console.warn('[tracker] úloha dostala chybu', error.message);
    return;
  }
  const polohy = data?.locations ?? [];
  if (polohy.length === 0) return;

  // <b>Dvě role jedné úlohy.</b> Běží-li záznam, zapisuje se. Neběží-li,
  // může běžet režim „hlásím se" (R3) — a ten se v T−20 překlopí sám.
  // Překlopení je synchronní, protože musí být hotové před prvním `await`.
  const z = bezicZaznam() ?? (zacniKdyzJeCas() !== null ? bezicZaznam() : null);
  if (!z) {
    const h = hlasim();
    if (!h.zapnuto) {
      // Příznak běžícího záznamu je jedině v databázi. Když tam není (data
      // appky někdo smazal) a ani se nehlásíme, úloha by zapisovala do
      // prázdna.
      await Location.stopLocationUpdatesAsync(ULOHA).catch(() => {});
      return;
    }

    // <b>Slepě.</b> Polohy, které právě přišly, se zahazují — v tomhle
    // režimu neodchází na server ani jedna. Odběr se drží jen proto, aby se
    // telefon probouzel a mohl si přečíst čas startu; `ozviSeAsync` si
    // chyby spolkne sama, takže handler nevyhodí výjimku a systém úlohu
    // neodregistruje.
    await ozviSeAsync();
    return;
  }

  zapisBody(
    z.id,
    polohy.map((p) => ({
      sirka: p.coords.latitude,
      delka: p.coords.longitude,
      presnost: p.coords.accuracy,
      vyska: p.coords.altitude,
      rychlost: p.coords.speed,
      kurz: p.coords.heading,
      casGps: p.timestamp,
      podvrzeny: p.mocked === true,
      // Z posledního čtení — nové se vyžádá až za zápisem, aby zápis
      // zůstal před prvním `await`. Viz `baterie.ts`.
      baterie: baterieProcent(),
    })),
    INTERVAL_MS,
  );

  // Až teď, když je dávka na disku.
  obnovBaterii();

  // Teprve tady, za zápisem, se odesílá — a jen jednou za minutu, o což se
  // stará `zkusZiveAsync`. Přenos je automatický a průběžný, ne úkon
  // posádky: na ní nesmí viset nic než spuštění záznamu. Výjimka se odsud
  // nesmí dostat ven, jinak systém úlohu odregistruje.
  try {
    await zkusZiveAsync(z.id);
  } catch (e) {
    console.warn('[tracker] živé odeslání selhalo', e);
  }
});

export type StavOpravneni = 'ok' | 'bez-sdeleni' | 'bez-popredi' | 'bez-pozadi';

/**
 * Oprávnění se ptá ve dvou krocích, protože Android 11 a výš otevře
 * u polohy na pozadí systémové nastavení — bez vysvětlení dopředu tam
 * člověk neví, co má hledat.
 *
 * <b>Před systémovým dotazem musí přijít sdělení o poloze</b> a tohle je
 * jediná cesta, kterou se k tomu dotazu dá dojít — proto je ta podmínka
 * tady a ne na obrazovce. Co v něm musí stát a proč to Play vyžaduje,
 * stojí v `sdeleni.ts`.
 */
export async function zadejOpravneni(): Promise<StavOpravneni> {
  // <b>Povolenou polohu na pozadí se znovu neptáme.</b> Systémový dotaz
  // už nepřijde, takže by sdělení nemělo co předcházet — a dialog před
  // každým spuštěním záznamu by byl jen zdržení u vody.
  if ((await Location.getBackgroundPermissionsAsync()).status === 'granted') return 'ok';

  if (!(await sdeleniPotvrzeno())) return 'bez-sdeleni';

  const popredi = await Location.requestForegroundPermissionsAsync();
  if (popredi.status !== 'granted') return 'bez-popredi';
  // Popředí musí být povolené dřív — bez něj se oprávnění na pozadí
  // nezíská (dokumentace `expo-location`, SDK 57).
  const pozadi = await Location.requestBackgroundPermissionsAsync();
  if (pozadi.status !== 'granted') return 'bez-pozadi';
  return 'ok';
}

/**
 * Sdělení dialogem z korzene zásobníku, a když ho nikdo nekreslí,
 * systémovým.
 *
 * Náhrada je tu kvůli jediné možnosti: že někdo hosta z `_layout.tsx`
 * odpojí. Zaseknutý slib by byl tlačítko, po kterém se nestane nic,
 * a vynechat sdělení nejde — Play by appku odmítl. Systémový dialog je
 * ošklivější, ale pravidlo plní stejně.
 */
async function sdeleniPotvrzeno(): Promise<boolean> {
  if (hostJeNaMiste()) return cekejNaSdeleni();
  return new Promise<boolean>((hotovo) => {
    let odpovezeno = false;
    const odpovez = (souhlas: boolean) => {
      if (odpovezeno) return;
      odpovezeno = true;
      hotovo(souhlas);
    };
    Alert.alert(
      SDELENI.nadpis,
      textSdeleni(),
      [
        { text: SDELENI.zrusit, style: 'cancel', onPress: () => odpovez(false) },
        { text: SDELENI.dal, onPress: () => odpovez(true) },
      ],
      // Zavření mimo tlačítka se nesmí brát jako souhlas.
      { cancelable: true, onDismiss: () => odpovez(false) },
    );
  });
}

/**
 * Vzorkování. Zápis do telefonu je zadarmo (GPS stejně běží), takže se
 * zapisuje po pěti sekundách; odesílání je ten druhý knoflík a jede po
 * minutě (`ZIVE_MS`) — rádio žere víc než zápis.
 */
export const INTERVAL_MS = 5000;

/**
 * <b>Na iOSu `timeInterval` nic neznamená.</b> Dokumentace `expo-location`
 * ho vede jako Android only, takže iPhone dodává polohy vlastním tempem —
 * změřeno 21. 10. 2026: při nastavených 5 s chodil bod každé 2,2 s. Proto
 * se vzorkování hlídá ještě jednou při zápisu (`zapisBody` bere interval
 * jako parametr). Tenhle údaj zůstává, protože na Androidu funguje a šetří
 * práci už na úrovni systému.
 */

export async function spustZaznamNaPozadi() {
  if (await Location.hasStartedLocationUpdatesAsync(ULOHA)) return;
  await Location.startLocationUpdatesAsync(ULOHA, {
    accuracy: Location.Accuracy.High,
    timeInterval: INTERVAL_MS,
    distanceInterval: 0,
    // Plachetnice se mezi dvěma manévry nehýbe skoro vůbec; kdyby si iOS
    // usoudil, že se nic neděje, přišli bychom o stání u bóje.
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.OtherNavigation,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Orlický pohár zaznamenává trasu',
      notificationBody: 'Záznam běží. Po dojezdu ho ukonči v appce.',
      notificationColor: '#1f6f8b',
      // Smysl pilotu je, že záznam přežije zabití appky systémem. Služba
      // proto nesmí odejít s procesem.
      killServiceOnDestroy: false,
    },
  });
}

export async function zastavZaznamNaPozadi() {
  if (await Location.hasStartedLocationUpdatesAsync(ULOHA)) {
    await Location.stopLocationUpdatesAsync(ULOHA);
  }
}

export async function bezinaPozadi(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(ULOHA);
}

export type Propichnuti = {
  /** Jak dlouho trvalo, než GPS odpověděla. */
  trvaloMs: number;
  presnostM: number | null;
  sirka: number;
  delka: number;
};

/**
 * Zkusí **teď hned** získat polohu a vrátí, jak dlouho to trvalo.
 *
 * Proč zvlášť a ne jen ukazovat poslední bod: kontrolka může svítit zeleně
 * proto, že se nikdo nezeptal. Tohle je skutečný pokus s čerstvým výsledkem —
 * a doba odpovědi je sama o sobě údaj. Když GPS odpoví za dvě sekundy, má
 * družice; když za třicet, hledá je.
 *
 * Záznam to neruší: čte se jedna poloha navíc, odběr běží dál.
 */
export async function propichni(): Promise<Propichnuti> {
  const zacatek = Date.now();
  const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return {
    trvaloMs: Date.now() - zacatek,
    presnostM: p.coords.accuracy,
    sirka: p.coords.latitude,
    delka: p.coords.longitude,
  };
}

/** Otevře nastavení appky, kde se dá oprávnění k poloze přepnout na „Vždy". */
export async function otevriNastaveni() {
  await Linking.openSettings();
}
