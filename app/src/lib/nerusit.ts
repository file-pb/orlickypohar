/**
 * Režim Nerušit na dobu startovní procedury.
 *
 * <b>Proč to vůbec je.</b> Ze čtyř věcí, které se stanou, když rozhodčímu
 * uprostřed procedury zavolá manželka, umí appka odstranit jen jednu —
 * a tahle je to (`docs/APPKA-PORADI-PRACI.md`). Měření běží dál, cizí
 * obrazovku appka neodsune a zvuk <i>během</i> hovoru neobejde nikdo.
 * Co jde: nenechat telefon zazvonit.
 *
 * <b>Na Androidu ano, na iPhonu ne,</b> a ten rozdíl dopadá přesně na
 * toho člověka, o kterého jde: Miloš má Android, Filip iPhone. Na iOSu
 * tenhle modul neexistuje a `jdeTo()` vrací `false` — tam si automatizaci
 * nastaví uživatel ve Zkratkách a appka na ni může jen odkázat.
 *
 * <b>Kdy má klid platit,</b> rozhoduje pravidlo `maBytKlid`
 * (`lib/start.ts`) a má vlastní testy: od minuty před zahájením procedury
 * do pěti minut po startu. Tenhle soubor jen provádí.
 */
import { requireOptionalNativeModule } from 'expo';

type NativniNerusit = {
  smime: () => boolean;
  otevriNastaveni: () => Promise<void>;
  nastav: (klid: boolean) => Promise<boolean>;
};

const nativni = requireOptionalNativeModule<NativniNerusit>('Nerusit');

/** Umí tenhle telefon režim přepnout? Na iPhonu nikdy. */
export function jdeTo(): boolean {
  return nativni !== null;
}

/**
 * Dal uživatel oprávnění? Bez něj se nic nestane a <b>procedura kvůli
 * tomu nesmí stát</b> — je to pohodlí, ne podmínka.
 */
export function smime(): boolean {
  try {
    return nativni?.smime() ?? false;
  } catch {
    return false;
  }
}

/** Otevře nastavení systému, kde se oprávnění dává. */
export async function otevriNastaveni(): Promise<void> {
  try {
    await nativni?.otevriNastaveni();
  } catch {
    // Nastavení se neotevřelo. Horší než to je jen spadlá obrazovka startu.
  }
}

/**
 * Zapne nebo vypne klid. Vrací, jestli se to doopravdy stalo.
 *
 * Předchozí režim si modul pamatuje a vrací ho i po pádu appky — proto
 * se vypnutí nemusí volat „za každou cenu".
 */
export async function nastav(klid: boolean): Promise<boolean> {
  try {
    return (await nativni?.nastav(klid)) ?? false;
  } catch {
    return false;
  }
}
