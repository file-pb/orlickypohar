import * as SecureStore from 'expo-secure-store';

import { sit } from './sit';

/**
 * Klíč k účtu — čím se telefon prokazuje místo přihlášení.
 *
 * <b>Proč to existuje</b> (Filip, 26. 11. 2026): *„na zitadel uživatele
 * tahat nechci… rád bych, aby se dalo přihlásit přímo v apce."*
 * Přihlášení přes OIDC otevírá stránku poskytovatele a to je pro
 * pořadatele, který appku zapne dvakrát za sezónu, cizí obrazovka
 * s heslem, které nemá.
 *
 * <b>Cesta dovnitř vede z webu.</b> Člověk se přihlásí u počítače, na
 * svém profilu si vystaví kód a ten zadá sem. Appka ho vymění za klíč
 * a od té chvíle jedná za jeho účet.
 *
 * <b>Je to tatáž věc jako klíč k lodi</b> (`lib/klic.ts`), jen míří na
 * účet místo na loď — a proto leží taky v SecureStore (Keychain, resp.
 * Keystore), ne v obyčejném úložišti.
 */

const KLIC = 'op_klic_uctu';
const KLIC_JMENO = 'op_klic_uctu_jmeno';

async function uloz(klic: string, hodnota: string | null) {
  if (hodnota === null) await SecureStore.deleteItemAsync(klic);
  else await SecureStore.setItemAsync(klic, hodnota);
}

/** Tajemství do hlavičky, nebo `null`. */
export const klicUctu = () => SecureStore.getItemAsync(KLIC);

/** Za koho telefon jedná, pro vypsání na obrazovce. */
export const jmenoUctu = () => SecureStore.getItemAsync(KLIC_JMENO);

/** Hlavička, ve které klíč chodí. Server ji zná pod týmž jménem. */
export const HLAVICKA = 'X-Klic-Uctu';

/**
 * Vymění kód za klíč a uloží ho. Vrací jméno účtu, nebo `null`.
 *
 * <b>Vymyšlený, propadlý i už uplatněný kód dopadnou stejně</b> — tak to
 * odpovídá server a appka z toho nemá co dovozovat. Pro člověka u vody
 * je rada stejná ve všech třech případech: vystav si na webu nový.
 */
export async function napoj(kod: string, zarizeni: string): Promise<string | null> {
  const odpoved = await sit('/klice/napojit', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ kod: kod.trim(), zarizeni }),
  });

  if (!odpoved.ok) return null;

  const data = (await odpoved.json()) as { klic: string; zobrazovane: string };
  await uloz(KLIC, data.klic);
  await uloz(KLIC_JMENO, data.zobrazovane);
  return data.zobrazovane;
}

/**
 * Zapomene klíč. <b>Jen v telefonu</b> — aby přestal platit i na serveru,
 * musí ho majitel odebrat na webu. Obojí má smysl: tohle je pro ten
 * telefon, co mám v ruce, odebrání na webu pro ten, co jsem ztratil.
 */
export async function zapomenKlic() {
  await uloz(KLIC, null);
  await uloz(KLIC_JMENO, null);
}

/**
 * Abeceda kódu a jeho délka. <b>Opsané ze serveru</b>
 * (`KliceUctuSprava.Abeceda`, `KodDelka`): nuly, jedničky, I ani O v ní
 * nejsou, protože se kód opisuje z obrazovky počítače.
 *
 * Appka je zná proto, aby poznala **svůj** kód mezi několika QR na jedné
 * fotce a aby políčko nepřijímalo znaky, které v kódu nikdy nebudou.
 * Rozhodovat podle nich nesmí: platnost kódu posoudí server.
 */
export const ABECEDA = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const DELKA = 8;

/**
 * Kód z toho, co přišlo z QR, z galerie nebo z ruky.
 *
 * <b>QR nese adresu webu, ne holý kód</b> (`/napojeni?kod=…`), protože
 * telefon bez appky má skončit na stránce, která mu poradí. Appka tedy
 * musí umět obojí — a při opisování z ruky i malá písmena, mezery
 * a pomlčky, které si do opisu každý přidává po svém.
 *
 * <b>Zahazuje znaky mimo abecedu, nepřekládá je.</b> Nula se tedy
 * nezmění na „O"; obojí prostě zmizí, přesně jako na serveru
 * (`KliceUctuSprava.Uprav`). Hádat, co měl člověk na mysli, by u
 * přístupového údaje znamenalo tiše měnit, co zadal.
 */
export function kodZeVstupu(vstup: string): string {
  const text = vstup.trim();
  const zAdresy = /[?&]kod=([^&\s]+)/i.exec(text);
  const kod = zAdresy ? decodeURIComponent(zAdresy[1]) : text;
  return [...kod.toUpperCase()].filter((z) => ABECEDA.includes(z)).join('');
}

/**
 * Náš kód z toho, co našel sken — foťákem nebo v obrázku z galerie.
 *
 * <b>Na jedné fotce bývá víc QR.</b> Snímek obrazovky zachytí i QR
 * z vedlejší stránky a foťák namířený na monitor klidně dva. Brát slepě
 * první nalezený by znamenalo poslat serveru cizí řetězec a ukázat
 * „Kód neplatí" nad fotkou, na které ten správný kód je.
 *
 * Vybírá se tedy ten, který po srovnání vypadá jako kód k účtu — osm
 * znaků z naší abecedy. Když takový není, vrací `null` a volající to
 * řekne; `null` znamená „tady náš kód nebyl", ne „kód je neplatný".
 */
export function kodZeSkenu(nalezy: readonly { data: string }[]): string | null {
  for (const nalez of nalezy) {
    const text = (nalez.data ?? '').trim();

    // Náš QR nese adresu s parametrem; podle něj se pozná bezpečně.
    if (/[?&]kod=/i.test(text)) {
      const kod = kodZeVstupu(text);
      if (kod.length === DELKA) return kod;
      continue;
    }

    // <b>Holý kód se přijme jen tehdy, když je v něm doopravdy jen kód.</b>
    // Samotná délka po očištění nestačí: `https://a.cz` dá `HTTPSACZ`, tedy
    // osm znaků z abecedy — appka by serveru poslala cizí adresu místo kódu
    // a hlásila „kód neplatí" nad fotkou, na které ten platný je. Projdou
    // tedy jen znaky, které se v opsaném kódu vyskytují: písmena, číslice
    // a oddělovače, které si lidé do opisu přidávají.
    if (!/^[0-9A-Za-z \t-]+$/.test(text)) continue;

    const kod = kodZeVstupu(text);
    if (kod.length === DELKA) return kod;
  }
  return null;
}
