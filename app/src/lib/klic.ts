/**
 * Mobilní klíč k lodi.
 *
 * <b>Trasa patří lodi, ne člověku.</b> Telefon se proto neprokazuje účtem
 * posádky, ale klíčem, který mu kapitán vydal — a tím padá požadavek, aby
 * si celá posádka zakládala účty. Od posádky chceme jen zdvojení zdrojů,
 * ne registraci (Filip, 21. 10. 2026).
 *
 * Klíč se získá jednorázovou pozvánkou: kapitán ji vystaví a dá jako QR,
 * posádka ji naskenuje a appka ji tady vymění za klíč. Pozvánka platí
 * 48 hodin a jde uplatnit jednou; klíč pak drží, dokud ho kapitán
 * neodebere, nebo dokud se posádka sama neodepne.
 *
 * Klíč je <b>tajemství</b>, takže leží v SecureStore (Keychain, resp.
 * Keystore), ne v obyčejném úložišti.
 */
import * as SecureStore from 'expo-secure-store';

const KLIC = 'op_klic_lodi';
const KLIC_LOD = 'op_klic_lod';
const KLIC_LOD_NAZEV = 'op_klic_lod_nazev';
const KLIC_JMENO = 'op_klic_jmeno';

const API = process.env.EXPO_PUBLIC_API_URL ?? 'https://orlickypohar-api.klihovka.cz';
const WEB = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://orlickypohar.klihovka.cz';

/**
 * Adresa, která se zabalí do QR.
 *
 * <b>Míří na web, ne rovnou do appky.</b> Vlastní schéma `orlickypohar://`
 * by u telefonu bez appky skončilo tím, že se nestane vůbec nic; takhle
 * posádka skončí na stránce, která ji buď přehodí do appky, nebo jí řekne,
 * kde appku vzít. Web pak skládá tutéž adresu v `lib/klice.ts`.
 */
export const adresaKlice = (kod: string) =>
  `${WEB.replace(/\/$/, '')}/klic?kod=${encodeURIComponent(kod)}`;

export type Klic = {
  /** Číslo lodi, ke které klíč patří. */
  lodId: number;
  lodNazev: string;
  /** Jméno, které kapitán k pozvánce napsal — ať posádka pozná, kdo je kdo. */
  jmeno: string | null;
};

async function uloz(klic: string, hodnota: string | null) {
  if (hodnota === null) await SecureStore.deleteItemAsync(klic);
  else await SecureStore.setItemAsync(klic, hodnota);
}

/** Samo tajemství. Dál než do hlavičky požadavku nemá chodit. */
export async function tajemstvi(): Promise<string | null> {
  return SecureStore.getItemAsync(KLIC);
}

/** Ke které lodi je telefon spárovaný. `null` znamená „k žádné". */
export async function klic(): Promise<Klic | null> {
  const [tajne, lod, nazev, jmeno] = await Promise.all([
    SecureStore.getItemAsync(KLIC),
    SecureStore.getItemAsync(KLIC_LOD),
    SecureStore.getItemAsync(KLIC_LOD_NAZEV),
    SecureStore.getItemAsync(KLIC_JMENO),
  ]);
  if (!tajne || !lod) return null;
  return { lodId: Number(lod), lodNazev: nazev ?? '', jmeno };
}

export type Uplatneni = { klic: string; lodId: number; lodNazev: string; jmeno: string | null };

/**
 * Vymění pozvánku za klíč a klíč si uloží.
 *
 * Vrací `null`, když pozvánka neplatí — je vymyšlená, prošlá, nebo už ji
 * někdo uplatnil. Rozlišovat to nemá smysl: posádce pomůže jedině nová
 * pozvánka od kapitána.
 *
 * <b>Jediný endpoint bez přihlášení</b> — pozvánka sama je tím oprávněním.
 */
export async function uplatni(kod: string): Promise<Klic | null> {
  const odpoved = await fetch(`${API}/klice/uplatnit`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ kod: kod.trim() }),
  });

  if (odpoved.status === 400) return null;
  if (!odpoved.ok) throw new Error(`Uplatnění pozvánky vrátilo ${odpoved.status}`);

  const u = (await odpoved.json()) as Uplatneni;

  // Nový klíč přepíše starý: telefon patří jedné lodi. Kdyby šel někdo
  // z posádky k jiné, starý klíč mu na původní lodi odebere kapitán.
  await uloz(KLIC, u.klic);
  await uloz(KLIC_LOD, String(u.lodId));
  await uloz(KLIC_LOD_NAZEV, u.lodNazev);
  await uloz(KLIC_JMENO, u.jmeno);

  return { lodId: u.lodId, lodNazev: u.lodNazev, jmeno: u.jmeno };
}

/**
 * Jestli se z tohohle telefonu zaznamenává. `null` znamená „nedá se zjistit"
 * — telefon není spárovaný, klíč odebrali, nebo neběží síť.
 *
 * <b>Stav drží server, ne telefon.</b> Odepnout klíč umí i kapitán ze své
 * obrazovky, takže kdyby si appka pamatovala jen svoje poslední kliknutí,
 * tvrdila by „zaznamenává se" telefonu, kterému to kapitán mezitím vypnul.
 */
export async function sledovani(): Promise<boolean | null> {
  const tajne = await tajemstvi();
  if (!tajne) return null;

  const odpoved = await fetch(`${API}/klice/sledovani`, {
    headers: { accept: 'application/json', 'x-klic-lodi': tajne },
  });
  if (!odpoved.ok) return null;

  return ((await odpoved.json()) as { sleduje: boolean }).sleduje;
}

/**
 * Odepne telefon ze sledování, nebo ho zase připne.
 *
 * Je to <b>„dneska nejedu", ne odchod z posádky</b>: klíč zůstává a příští
 * závod se posádka nemusí párovat znovu. Odebrat klíč natrvalo umí jen
 * kapitán — tohle je ta půlka, kterou si má člověk zvládnout sám, aniž by
 * byl odkázaný na to, že na něj někdo nezapomene.
 *
 * `null` znamená, že klíč už neplatí — kapitán ho odebral.
 */
export async function nastavSledovani(sleduje: boolean): Promise<boolean | null> {
  const tajne = await tajemstvi();
  if (!tajne) return null;

  const odpoved = await fetch(`${API}/klice/sledovani`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'x-klic-lodi': tajne,
    },
    body: JSON.stringify({ sleduje }),
  });
  if (odpoved.status === 401) return null;
  if (!odpoved.ok) throw new Error(`Nastavení sledování vrátilo ${odpoved.status}`);

  return ((await odpoved.json()) as { sleduje: boolean }).sleduje;
}

/**
 * Zapomene klíč v telefonu.
 *
 * <b>Na serveru klíč zůstává platný</b> — tohle není odepnutí z posádky.
 * Odebrat ho umí jen kapitán; tady se jen tenhle telefon přestane lodí
 * prokazovat.
 */
export async function zapomen() {
  await uloz(KLIC, null);
  await uloz(KLIC_LOD, null);
  await uloz(KLIC_LOD_NAZEV, null);
  await uloz(KLIC_JMENO, null);
}
