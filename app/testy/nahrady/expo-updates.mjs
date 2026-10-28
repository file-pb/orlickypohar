// Aktualizace v paměti. Hodnoty jsou `let`, protože `import * as Updates`
// je živá vazba — co tu `nastav` přepíše, vidí i modul, který se naimportoval
// dřív. Díky tomu jde `puvod()` zkoušet ve všech stavech bez telefonu.
export let isEnabled = true;
export let isEmbeddedLaunch = true;
export let createdAt = null;
export let runtimeVersion = null;
export let updateId = null;

export function nastav(s) {
  if ('isEnabled' in s) isEnabled = s.isEnabled;
  if ('isEmbeddedLaunch' in s) isEmbeddedLaunch = s.isEmbeddedLaunch;
  if ('createdAt' in s) createdAt = s.createdAt;
  if ('runtimeVersion' in s) runtimeVersion = s.runtimeVersion;
  if ('updateId' in s) updateId = s.updateId;
}

export async function checkForUpdateAsync() { return { isAvailable: false }; }
export async function fetchUpdateAsync() { return { isNew: false }; }
export async function reloadAsync() {}
