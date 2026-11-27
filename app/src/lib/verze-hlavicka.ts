/**
 * Hlavička `X-Appka-Verze`: na čem appka v telefonu doopravdy jede.
 *
 * <b>Proč to existuje</b> (Filip, 27. 11. 2026: *„až to bude používat celá
 * flotila, musí to být naprostá samozřejmost"*). Dokud server nevěděl, na
 * čem který telefon jede, nedalo se spolehlivost aktualizací změřit —
 * zaostalý telefon se poznal až telefonátem z vody. Hlavička jede s každým
 * požadavkem (`sit.ts`), takže nová verze se nahlásí hned dalším dotazem
 * a nevznikne kvůli tomu žádný požadavek navíc.
 *
 * Tvar je smlouva se serverem:
 *   platforma=android;otisk=…;aktualizace=<uuid>;kanal=…;spusteni=vestavena|stazena|nouzova[;ceka=<uuid>]
 *
 * <b>Je to telemetrie, nikdy oprávnění.</b> Jde podvrhnout, server ji čte
 * shovívavě a neplatnou zahodí. Proto ji tady nikdy nesestavíme napůl:
 * chybí-li otisk nebo ID aktualizace, nejde vůbec.
 */
import { Platform } from 'react-native';
import * as Updates from 'expo-updates';

export const HLAVICKA_VERZE = 'X-Appka-Verze';

export type SpusteniAppky = 'vestavena' | 'stazena' | 'nouzova';

export type UdajeVerze = {
  platforma: string;
  otisk: string | null;
  aktualizace: string | null;
  kanal: string | null;
  spusteni: SpusteniAppky;
  ceka: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OTISK = /^[A-Za-z0-9._-]{1,64}$/;
const KANAL = /^[a-z0-9-]{1,32}$/;

/** Hodnota hlavičky, nebo `null`, když by byla neúplná nebo neplatná. */
export function hlavickaVerze(u: UdajeVerze): string | null {
  if (u.platforma !== 'android' && u.platforma !== 'ios') return null;
  if (!u.otisk || !OTISK.test(u.otisk)) return null;
  if (!u.aktualizace || !UUID.test(u.aktualizace)) return null;
  // Kanál chybí ve vývojovém buildu a v Expo Go; smlouva ho připouští prázdný.
  const kanal = u.kanal && KANAL.test(u.kanal) ? u.kanal : '';
  const ceka = u.ceka && UUID.test(u.ceka) ? `;ceka=${u.ceka}` : '';
  return `platforma=${u.platforma};otisk=${u.otisk};aktualizace=${u.aktualizace};kanal=${kanal};spusteni=${u.spusteni}${ceka}`;
}

/**
 * ID stažené, ještě nepoužité aktualizace. Mimo hook `useUpdates` ho
 * veřejné rozhraní nemá, takže ho sem zapisuje `Aktualizator`.
 */
let ceka: string | null = null;

export function nastavCekajici(id: string | null): void {
  ceka = id;
}

/** Jak appka nastartovala. Nouzové spuštění přebije všechno ostatní. */
export function spusteni(): SpusteniAppky {
  if (Updates.isEmergencyLaunch) return 'nouzova';
  return Updates.isEmbeddedLaunch ? 'vestavena' : 'stazena';
}

/** Hlavička pro tenhle telefon, nebo `null`. Nikdy nevyhodí. */
export function hlavickaTed(): string | null {
  try {
    if (!Updates.isEnabled) return null;
    return hlavickaVerze({
      platforma: Platform.OS,
      otisk: Updates.runtimeVersion ?? null,
      aktualizace: Updates.updateId ?? null,
      kanal: Updates.channel ?? null,
      spusteni: spusteni(),
      ceka,
    });
  } catch {
    // Telemetrie nesmí shodit požadavek, ke kterému se veze.
    return null;
  }
}
