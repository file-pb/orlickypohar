// Trezor v paměti. Test si přes `nastav` podstrčí token, aby šlo vyzkoušet
// odesílání bez skutečného přihlášení.
const data = new Map();
export async function getItemAsync(k) { return data.get(k) ?? null; }
export async function setItemAsync(k, v) { data.set(k, v); }
export async function deleteItemAsync(k) { data.delete(k); }
export function nastav(k, v) { data.set(k, v); }
