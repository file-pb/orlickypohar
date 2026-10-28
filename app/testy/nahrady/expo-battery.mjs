// Baterie v paměti. Testy si hodnotu podstrčí přes `nastav`, aby šlo
// vyzkoušet, že se do bodu propíše — a zároveň to, co dělá simulátor:
// `-1` znamená „nevím" a nesmí se z něj stát nula procent.
let uroven = 0.73;
export async function getBatteryLevelAsync() { return uroven; }
export function nastav(v) { uroven = v; }
