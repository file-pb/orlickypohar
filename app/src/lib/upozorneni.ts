import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Přihlášení telefonu k veřejným upozorněním.
 *
 * <b>Bez účtu</b> (plán, *Dvě úrovně upozornění*): výsledky, nový článek
 * ani termín závodu nesmějí vyžadovat přihlášení — divák nemá kvůli termínu
 * nic zakládat. Server to má stejně, `PUT /zarizeni` je veřejný.
 *
 * <b>Push token není identita, je to adresa.</b> Komu zpráva patří, se
 * pozná z odběru; čí je telefon, řeší u trasy mobilní klíč (`lib/klic.ts`).
 * Nejsou to dvě cesty k témuž — token říká „kam doručit", klíč „co smí".
 *
 * <b>V Expo Go to nefunguje.</b> Od SDK 53 tam push není; jeho nativní
 * binárka nemá jak přijmout token. Zkouší se v APK (`npm run apk`), stejně
 * jako poloha na pozadí a přihlášení.
 */

const API = process.env.EXPO_PUBLIC_API_URL ?? 'https://orlickypohar-api.klihovka.cz';

/** Co jsme naposledy poslali serveru. Ušetří volání při každém startu. */
const ULOZENY = 'op_push_stav';

/** Jak se upozornění chová, když appka běží na popředí. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // Zvuk ani odznak ne: upozornění během závodu je informace, ne budík,
    // a na vodě je telefon stejně v kapse.
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type StavUpozorneni =
  | { stav: 'prihlaseno'; odbery: string[] }
  | { stav: 'odmitnuto' }
  | { stav: 'nejde'; duvod: string };

/**
 * Vyžádá oprávnění, vezme token a nahlásí ho serveru.
 *
 * <b>Oprávnění se nevyžaduje potichu při startu.</b> Systémový dotaz
 * položený dřív, než člověk ví proč, se odmítá — a podruhé už ho appka
 * položit nesmí. Volá se proto z obrazovky, kde je u toho napsáno, co
 * bude chodit.
 */
export async function prihlasKOdberu(odbery: string[]): Promise<StavUpozorneni> {
  // Android potřebuje kanál, jinak upozornění nikde nevyskočí — jen tiše
  // přistane v liště.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Orlický pohár',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const stavajici = await Notifications.getPermissionsAsync();
  const povoleno = stavajici.granted
    ? stavajici
    : stavajici.canAskAgain
      ? await Notifications.requestPermissionsAsync()
      : stavajici;

  if (!povoleno.granted) return { stav: 'odmitnuto' };

  let token: string;
  try {
    // `projectId` si bere z `app.json`; bez něj Expo token nevydá
    // a vyhodí — proto je to v `try`, ne jen podmínka.
    const vysledek = await Notifications.getExpoPushTokenAsync();
    token = vysledek.data;
  } catch (e) {
    return { stav: 'nejde', duvod: `Token se nepodařilo získat: ${e}` };
  }

  const platforma = Platform.OS === 'ios' ? 'Ios' : 'Android';
  const telo = JSON.stringify({ token, platforma, odbery });

  // Server zápis přijímá opakovaně, ale volat ho při každém startu je
  // zbytečné — posílá se, jen když se token nebo odběry změnily.
  const posledni = await SecureStore.getItemAsync(ULOZENY).catch(() => null);
  if (posledni === telo) return { stav: 'prihlaseno', odbery };

  try {
    const odpoved = await fetch(`${API}/zarizeni`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: telo,
    });
    if (!odpoved.ok) {
      const chyba = await odpoved.text().catch(() => '');
      return { stav: 'nejde', duvod: chyba || `Server odpověděl ${odpoved.status}.` };
    }
  } catch (e) {
    return { stav: 'nejde', duvod: `Server se nepodařilo zavolat: ${e}` };
  }

  await SecureStore.setItemAsync(ULOZENY, telo).catch(() => {});
  return { stav: 'prihlaseno', odbery };
}

/**
 * Odhlásí telefon ze všech odběrů.
 *
 * <b>Prázdný seznam, ne smazání zařízení.</b> Token zůstane zapsaný, takže
 * se dá zase přihlásit bez nového oprávnění — a server o něm pořád ví, až
 * přijdou účastnická upozornění.
 */
export async function odhlasOdbery(): Promise<StavUpozorneni> {
  return prihlasKOdberu([]);
}

/** Co appka naposledy serveru nahlásila. Pro obrazovku, aby neptala systém. */
export async function naposledyPrihlaseno(): Promise<string[] | null> {
  const ulozene = await SecureStore.getItemAsync(ULOZENY).catch(() => null);
  if (!ulozene) return null;
  try {
    return (JSON.parse(ulozene) as { odbery?: string[] }).odbery ?? [];
  } catch {
    return null;
  }
}
