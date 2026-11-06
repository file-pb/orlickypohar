/**
 * Jediné místo, kde appka sahá na síť.
 *
 * <b>Proč to není `fetch` přímo v modulech.</b> Volání bylo na pěti
 * místech ve třech souborech; ukázkový režim (`lib/ukazka.ts`) slibuje,
 * že se v něm na server nejde <b>vůbec</b>, a takový slib se s pěti
 * místy nedá udržet — stačí jedno zapomenout a ukázka tiše chodí ven.
 *
 * Vlastní modul, a ne funkce v `api.ts`, kvůli kruhu: `api.ts` si bere
 * tajemství z `klic.ts`, a `klic.ts` potřebuje tohle.
 */

import { ukazkaBezi, ukazkaOdpovez, type OdpovedSite } from './ukazka';

export const API = process.env.EXPO_PUBLIC_API_URL ?? 'https://orlickypohar-api.klihovka.cz';

/**
 * <b>Co appka naposledy zjistila o spojení</b> — a jak dávno.
 *
 * Měří se tím, co doopravdy rozhoduje: jestli dotaz doletí na server.
 * Ikona signálu v telefonu to neříká — wifi v klubovně bez internetu
 * svítí plná. Proto se stav nebere z `expo-network`, ale z volání, která
 * appka stejně dělá; navíc je to nativní modul, a ten by posunul otisk
 * a odřízl vydané APK od aktualizací.
 *
 * `null` znamená „zatím nevíme", ne „nejde to": appka po studeném startu
 * ještě nikam nesáhla a tvrdit v tu chvíli cokoliv by byla lež.
 */
let posledni: { doletelo: boolean; kdy: number } | null = null;

export function stavSite(): { doletelo: boolean; kdy: number } | null {
  return posledni;
}

export function sit(cesta: string, init?: RequestInit): Promise<OdpovedSite | Response> {
  if (ukazkaBezi()) {
    return ukazkaOdpovez(cesta, {
      method: init?.method,
      body: typeof init?.body === 'string' ? init.body : undefined,
    });
  }

  // <b>Zapisuje se dolet, ne odpověď.</b> Chyba 500 znamená, že server
  // je na příjmu a něco se nepovedlo — to není věc spojení a proužek by
  // o ní lhal. Spojení chybí tehdy, když `fetch` vůbec nedojde.
  return fetch(`${API}${cesta}`, init).then(
    (odpoved) => {
      posledni = { doletelo: true, kdy: Date.now() };
      return odpoved;
    },
    (chyba) => {
      posledni = { doletelo: false, kdy: Date.now() };
      throw chyba;
    },
  );
}

/**
 * Tiché šťouchnutí na server, aby se stav spojení dozvěděl i ten, kdo
 * zrovna nic nedělá.
 *
 * <b>Proč to vůbec musí být.</b> Landing od 7. 11. 2026 nevolá nic — je
 * na něm jen značka — takže by `stavSite()` zůstalo navždy `null` a
 * proužek by mlčel, i kdyby telefon byl bez signálu. Filip ho přitom
 * chce vidět právě tam.
 *
 * <b>`/health` je nejlevnější, co API má</b>: `Predicate = _ => false`
 * v `Program.cs` znamená, že se nespustí žádná kontrola a vrátí se holá
 * dvoustovka. Žádná databáze, žádná data.
 *
 * Chybu polyká schválně — jejím jediným úkolem je zapsat se do stavu,
 * což `sit` udělá samo.
 */
export async function overSpojeni(): Promise<void> {
  try {
    await sit('/health', { method: 'GET' });
  } catch {
    // Zapsáno v `sit`; víc se s tím tady dělat nedá.
  }
}
