// Aktualizace v paměti. Hodnoty jsou `let`, protože `import * as Updates`
// je živá vazba — co tu `nastav` přepíše, vidí i modul, který se naimportoval
// dřív. Díky tomu jde `puvod()` zkoušet ve všech stavech bez telefonu.
export let isEnabled = true;
export let isEmbeddedLaunch = true;
export let createdAt = null;
export let runtimeVersion = null;
export let updateId = null;
export let channel = null;
export let isEmergencyLaunch = false;
export let emergencyLaunchReason = null;

export function nastav(s) {
  if ('isEnabled' in s) isEnabled = s.isEnabled;
  if ('isEmbeddedLaunch' in s) isEmbeddedLaunch = s.isEmbeddedLaunch;
  if ('createdAt' in s) createdAt = s.createdAt;
  if ('runtimeVersion' in s) runtimeVersion = s.runtimeVersion;
  if ('updateId' in s) updateId = s.updateId;
  if ('channel' in s) channel = s.channel;
  if ('isEmergencyLaunch' in s) isEmergencyLaunch = s.isEmergencyLaunch;
  if ('emergencyLaunchReason' in s) emergencyLaunchReason = s.emergencyLaunchReason;
}

// Kontrola, stažení a restart: výsledek kontroly si test podstrčí přes
// `nastavKontrolu` (může být i Error) a co appka zavolala, přečte `zaznam`.
let kontrola = { isAvailable: false };
let stazeni = 0;
let restarty = [];
export function nastavKontrolu(k) { kontrola = k; }
export function zaznam() { return { stazeni, restarty: [...restarty] }; }
export function zapomenZaznam() { stazeni = 0; restarty = []; kontrola = { isAvailable: false }; }

export async function checkForUpdateAsync() {
  if (kontrola instanceof Error) throw kontrola;
  return kontrola;
}
export async function fetchUpdateAsync() { stazeni += 1; return { isNew: true }; }
export async function reloadAsync(volby) { restarty.push(volby ?? null); }
