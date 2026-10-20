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
import * as TaskManager from 'expo-task-manager';

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

  const z = bezicZaznam();
  if (!z) {
    // Příznak běžícího záznamu je jedině v databázi. Když tam není (data
    // appky někdo smazal), úloha by jinak zapisovala do prázdna.
    await Location.stopLocationUpdatesAsync(ULOHA).catch(() => {});
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
    })),
  );
});

export type StavOpravneni = 'ok' | 'bez-popredi' | 'bez-pozadi';

/**
 * Oprávnění se ptá ve dvou krocích, protože Android 11 a výš otevře
 * u polohy na pozadí systémové nastavení — bez vysvětlení dopředu tam
 * člověk neví, co má hledat.
 */
export async function zadejOpravneni(): Promise<StavOpravneni> {
  const popredi = await Location.requestForegroundPermissionsAsync();
  if (popredi.status !== 'granted') return 'bez-popredi';
  const pozadi = await Location.requestBackgroundPermissionsAsync();
  if (pozadi.status !== 'granted') return 'bez-pozadi';
  return 'ok';
}

/**
 * Vzorkování. Zápis do telefonu je zadarmo (GPS stejně běží), takže se
 * zapisuje po vteřinách; odesílání živě je ten druhý knoflík a pilot ho
 * nemá — veřejná živá mapa do něj nepatří.
 */
export const INTERVAL_MS = 5000;

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
