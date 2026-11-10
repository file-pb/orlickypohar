// Poloha v paměti. Nejde o to zkoušet GPS, ale **pořadí**: že se appka
// nezeptá na oprávnění dřív, než ukáže sdělení. Proto si každá volání
// zapisuje do `volani` a stavy oprávnění si test podstrčí přes `nastav`.
export const volani = [];
let stavy = { popredi: 'undetermined', pozadi: 'undetermined' };
let bezi = false;

export function nastav(s) { stavy = { ...stavy, ...s }; }
export function zapomen() { volani.length = 0; stavy = { popredi: 'undetermined', pozadi: 'undetermined' }; bezi = false; }

const odpoved = (status) => ({ status, granted: status === 'granted', canAskAgain: true, expires: 'never' });

export async function getForegroundPermissionsAsync() {
  volani.push('cti-popredi');
  return odpoved(stavy.popredi);
}
export async function getBackgroundPermissionsAsync() {
  volani.push('cti-pozadi');
  return odpoved(stavy.pozadi);
}
export async function requestForegroundPermissionsAsync() {
  volani.push('zadej-popredi');
  return odpoved(stavy.popredi);
}
export async function requestBackgroundPermissionsAsync() {
  volani.push('zadej-pozadi');
  return odpoved(stavy.pozadi);
}

export async function hasStartedLocationUpdatesAsync() { return bezi; }
export async function startLocationUpdatesAsync() { bezi = true; }
export async function stopLocationUpdatesAsync() { bezi = false; }
export async function getCurrentPositionAsync() {
  return { coords: { latitude: 49.5, longitude: 14.3, accuracy: 6, altitude: null, speed: null, heading: null }, timestamp: Date.now() };
}

export const Accuracy = { High: 4 };
export const ActivityType = { OtherNavigation: 4 };
