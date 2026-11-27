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
import { HLAVICKA_VERZE, hlavickaTed } from './verze-hlavicka';

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

/**
 * Kolik zápisů (cokoliv kromě GET) právě letí na server.
 *
 * <b>Kvůli samoaktualizaci</b> (`restart.ts`): restart uprostřed zápisu by
 * nechal výsledek nejistý — zrušená rozjížďka, spotřebovaný jednorázový
 * kód — a člověk by nevěděl, jestli to má zkusit znovu.
 */
let vLetu = 0;

export function zapisuVLetu(): number {
  return vLetu;
}

/**
 * Přidá hlavičku a nechá tvar `headers` takový, jaký přišel. Volající
 * i testy čtou hlavičky jako obyčejný objekt (`init.headers.authorization`),
 * takže převod na `Headers` by jim je potichu schoval.
 */
function sHlavickou(init: RequestInit | undefined, jmeno: string, hodnota: string): RequestInit {
  const h = init?.headers;
  if (typeof Headers !== 'undefined' && h instanceof Headers) {
    const kopie = new Headers(h);
    kopie.set(jmeno, hodnota);
    return { ...init, headers: kopie };
  }
  if (Array.isArray(h)) return { ...init, headers: [...h, [jmeno, hodnota]] };
  return { ...init, headers: { ...(h as Record<string, string> | undefined), [jmeno]: hodnota } };
}

export function sit(cesta: string, init?: RequestInit): Promise<OdpovedSite | Response> {
  if (ukazkaBezi()) {
    return ukazkaOdpovez(cesta, {
      method: init?.method,
      body: typeof init?.body === 'string' ? init.body : undefined,
    });
  }

  // Na čem appka jede, se veze s každým dotazem — server tak ví, kdo ve
  // flotile zaostává, bez jediného požadavku navíc (`verze-hlavicka.ts`).
  const verze = hlavickaTed();
  const s = verze ? sHlavickou(init, HLAVICKA_VERZE, verze) : init;

  const zapis = (init?.method ?? 'GET').toUpperCase() !== 'GET';
  if (zapis) vLetu += 1;
  const dopadl = () => {
    if (zapis) vLetu = Math.max(0, vLetu - 1);
  };

  // <b>Zapisuje se dolet, ne odpověď.</b> Chyba 500 znamená, že server
  // je na příjmu a něco se nepovedlo — to není věc spojení a proužek by
  // o ní lhal. Spojení chybí tehdy, když `fetch` vůbec nedojde.
  return fetch(`${API}${cesta}`, s).then(
    (odpoved) => {
      dopadl();
      posledni = { doletelo: true, kdy: Date.now() };
      return odpoved;
    },
    (chyba) => {
      dopadl();
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
