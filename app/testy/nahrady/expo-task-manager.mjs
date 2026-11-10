// Úloha na pozadí se v Node nespustí a není to předmět testu: tady stačí,
// že se `defineTask` při načtení modulu nerozbije.
const ulohy = new Map();
export function defineTask(nazev, handler) { ulohy.set(nazev, handler); }
export async function isTaskRegisteredAsync(nazev) { return ulohy.has(nazev); }
export function handler(nazev) { return ulohy.get(nazev) ?? null; }
