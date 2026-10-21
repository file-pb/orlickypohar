// Přihlášení se v testech neřeší; token podstrčí test sám přes náhradu
// SecureStore.
export function makeRedirectUri() { return 'orlickypohar://prihlaseni'; }
export const ResponseType = { Code: 'code' };
export function useAuthRequest() { return [null, null, async () => ({ type: 'dismiss' })]; }
export async function exchangeCodeAsync() { throw new Error('v testech se nepřihlašuje'); }
export async function refreshAsync() { throw new Error('v testech se neobnovuje'); }
export async function fetchDiscoveryAsync() { return {}; }
export function useAutoDiscovery() { return null; }
