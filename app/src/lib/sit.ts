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

export function sit(cesta: string, init?: RequestInit): Promise<OdpovedSite | Response> {
  if (ukazkaBezi()) {
    return ukazkaOdpovez(cesta, {
      method: init?.method,
      body: typeof init?.body === 'string' ? init.body : undefined,
    });
  }
  return fetch(`${API}${cesta}`, init);
}
