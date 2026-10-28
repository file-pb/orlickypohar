/**
 * Stav baterie telefonu, který se posílá s polohami.
 *
 * <b>V appce se nezobrazuje</b> (Filip, 26. 10. 2026: *„baterii v apce
 * nepotřebujeme zobrazovat, to uživatel vidí na telefonu nativně"*). Jde
 * o jedinou otázku, a tu si klade pořadatel na břehu: *všichni se
 * přihlásili, ale dojedou jim telefony dřív, než se odstartuje?* Odpověď
 * je vidět na tabuli u kostiček telefonů.
 *
 * <b>Čte se mimo zápis, ne před ním.</b> `zapisBody` běží synchronně
 * schválně — po návratu je dávka na disku, i když systém proces hned
 * potom zabije (viz `uloha.ts`). Čtení baterie je `async`, takže kdyby se
 * na něj před zápisem čekalo, posunul by se zápis za první `await` a ta
 * záruka by padla. Hodnota se proto bere z posledního přečtení a nové se
 * vyžádá až po zápisu.
 *
 * Zpoždění o jednu dávku ničemu nevadí: baterie se mění po hodinách, dávka
 * chodí po minutě, a server si stejně drží jen tu poslední nenulovou
 * (`TrasySprava`). První dávka po startu appky jde bez baterie.
 */
import * as Battery from 'expo-battery';

let posledni: number | null = null;

/** Poslední známý stav v procentech, nebo `null`, než se poprvé přečte. */
export function baterieProcent(): number | null {
  return posledni;
}

/**
 * Vyžádá nové čtení. Nic nevrací a nikdy nevyhodí výjimku — je to doplněk
 * k poloze, ne důvod, proč by měl záznam skončit.
 */
export function obnovBaterii(): void {
  Battery.getBatteryLevelAsync()
    .then((v) => {
      // `-1` znamená „nevím" (simulátor, nepodporované zařízení).
      posledni = v < 0 ? null : Math.round(v * 100);
    })
    .catch(() => {});
}
