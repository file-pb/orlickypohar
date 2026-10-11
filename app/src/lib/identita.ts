import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";

/**
 * Přihlášení v appce — Authorization Code s PKCE, stejný tok jako na webu.
 *
 * <b>Proč tentýž tok:</b> web je veřejný klient bez tajemství schválně,
 * protože *„tentýž tok bude potřebovat i mobilní appka, kde se udržet
 * nedá"* (`web/lib/oidc.ts`). Dvě různá přihlášení do jedné aplikace by
 * znamenala dvě místa, kde se dá udělat chyba v bezpečnosti.
 *
 * <b>Proč to vůbec je:</b> Filip, 11. 10. 2026, vyjmenoval, co má appka
 * umět — přihlášky, posádky, správa lodi, stavy rozjížděk, cíl, stavění
 * trati. Osm z deseti položek jsou zápisy a všechny visí na `/sprava/*`
 * nebo `/ja/*`, takže bez přihlášení se nehne ani jedna. Audit 8. 10.
 * 2026 to jmenuje jako to, co blokuje nejvíc.
 *
 * <b>Poskytovatel tu není jmenovaný</b>, stejně jako na webu a v API.
 * Všechno přichází z prostředí; kdyby tu stálo jméno nebo adresa konzole,
 * byl by to první řádek, který výměnu poskytovatele stojí změnu kódu.
 */

const AUTORITA = process.env.EXPO_PUBLIC_IDENTITA_AUTHORITY ?? "";
const KLIENT = process.env.EXPO_PUBLIC_IDENTITA_CLIENT_ID ?? "";

/** Bez konfigurace se přihlašování nikde nenabízí — stejně jako na webu. */
export const prihlasovaniJde = Boolean(AUTORITA && KLIENT);

/**
 * Kam se poskytovatel vrací.
 *
 * <b>V Expo Go to není `orlickypohar://`.</b> `makeRedirectUri` vrací
 * `native` jen ve standalone nebo bare buildu (`AuthSession.js`, větev na
 * `ExecutionEnvironment.Standalone`); jinde spadne na `Linking.createURL`,
 * tedy `exp://<adresa-v-síti>:8081/--/prihlaseni`. Ta adresa se mění
 * s Wi-Fi, takže ji nemá smysl zapisovat natrvdo do poskytovatele.
 *
 * Praktický důsledek: <b>přihlášení se zkouší v APK</b> (`npm run apk`),
 * ne v Expo Go. Kdo to chce přesto zkusit v Expo Go, musí si tu adresu
 * u poskytovatele přidat — a proto ji přihlašovací obrazovka ukazuje.
 */
export const navratovaAdresa = AuthSession.makeRedirectUri({
  scheme: "orlickypohar",
  path: "prihlaseni",
  native: "orlickypohar://prihlaseni",
});

/** Co se žádá. `offline_access` je kvůli obnovovacímu tokenu — bez něj by
 *  se člověk přihlašoval znovu každou hodinu, a to na vodě nejde. */
const ROZSAHY = ["openid", "profile", "email", "offline_access"];

const KLIC_TOKEN = "op_token";
const KLIC_OBNOVA = "op_obnova";
const KLIC_PLATNOST = "op_platnost";

/**
 * Tajemství do `SecureStore`, ne do `AsyncStorage`.
 *
 * <b>Rozdíl není kosmetický:</b> `AsyncStorage` je na Androidu obyčejný
 * soubor v adresáři aplikace a na iOSu nešifrovaný plist. `SecureStore`
 * jde do Keychainu a do `EncryptedSharedPreferences`.
 */
async function uloz(klic: string, hodnota: string | null) {
  if (hodnota === null) await SecureStore.deleteItemAsync(klic);
  else await SecureStore.setItemAsync(klic, hodnota);
}

let discovery: AuthSession.DiscoveryDocument | null = null;

/** OIDC dokument poskytovatele. Načte se jednou a drží se v paměti —
 *  mění se jednou za roky a každý start by za něj platil kolečkem. */
async function dokument() {
  if (!discovery) discovery = await AuthSession.fetchDiscoveryAsync(AUTORITA);
  return discovery;
}

export type Prihlaseny = { jmeno: string | null; email: string | null };

/**
 * Přihlásí člověka. Vrací chybu k zobrazení, nebo `null`.
 *
 * <b>Chyba se vrací, nevyhazuje se.</b> Tohle volá obrazovka a potřebuje
 * říct větu, ne spadnout — na vodě je výpadek sítě normální stav.
 */
export async function prihlas(): Promise<string | null> {
  if (!prihlasovaniJde) return "Přihlašování není v téhle verzi nastavené.";

  try {
    const d = await dokument();
    const zadost = new AuthSession.AuthRequest({
      clientId: KLIENT,
      redirectUri: navratovaAdresa,
      scopes: ROZSAHY,
      usePKCE: true,
    });

    const vysledek = await zadost.promptAsync(d);
    if (vysledek.type === "cancel" || vysledek.type === "dismiss") return null;
    if (vysledek.type !== "success") {
      return vysledek.type === "error"
        ? (vysledek.error?.message ?? "Poskytovatel přihlášení odmítl.")
        : "Přihlášení se nepovedlo.";
    }

    const odpoved = await AuthSession.exchangeCodeAsync(
      {
        clientId: KLIENT,
        code: vysledek.params.code,
        redirectUri: navratovaAdresa,
        extraParams: { code_verifier: zadost.codeVerifier ?? "" },
      },
      d,
    );

    await zapisOdpoved(odpoved);
    return null;
  } catch (chyba) {
    return chyba instanceof Error ? chyba.message : "Přihlášení se nepovedlo.";
  }
}

async function zapisOdpoved(o: AuthSession.TokenResponse) {
  await uloz(KLIC_TOKEN, o.accessToken);
  await uloz(KLIC_OBNOVA, o.refreshToken ?? null);
  // Vteřina rezervy navíc: token, který vyprší cestou, vypadá jako
  // odhlášení uprostřed práce.
  const platiDo = o.expiresIn ? Date.now() + (o.expiresIn - 30) * 1000 : 0;
  await uloz(KLIC_PLATNOST, String(platiDo));
}

/**
 * Platný přístupový token, nebo `null`.
 *
 * <b>Obnovuje sám.</b> Volající nemá vědět, jestli token zrovna vypršel —
 * kdyby to měl řešit každý dotaz, zapomene se to u toho desátého.
 */
export async function token(): Promise<string | null> {
  const ulozeny = await SecureStore.getItemAsync(KLIC_TOKEN);
  if (!ulozeny) return null;

  const platiDo = Number((await SecureStore.getItemAsync(KLIC_PLATNOST)) ?? "0");
  if (platiDo === 0 || Date.now() < platiDo) return ulozeny;

  const obnova = await SecureStore.getItemAsync(KLIC_OBNOVA);
  if (!obnova) {
    await odhlas();
    return null;
  }

  try {
    const o = await AuthSession.refreshAsync(
      { clientId: KLIENT, refreshToken: obnova, scopes: ROZSAHY },
      await dokument(),
    );
    await zapisOdpoved(o);
    return o.accessToken;
  } catch {
    // Neplatná obnova znamená, že relace skončila na straně poskytovatele.
    await odhlas();
    return null;
  }
}

/** Je někdo přihlášený? Nevolá sítě, jen se ptá úložiště. */
export async function jePrihlasen() {
  return (await SecureStore.getItemAsync(KLIC_TOKEN)) !== null;
}

/**
 * Kdo je přihlášený — z `userinfo`, ne z tokenu.
 *
 * <b>Přístupový token jméno ani e-mail nenese</b>, jsou v ID tokenu, který
 * patří klientovi. Tentýž důvod je popsaný v runbooku Zitadelu u webu;
 * appka na tom není jinak.
 */
export async function kdoJsem(): Promise<Prihlaseny | null> {
  const t = await token();
  if (!t) return null;

  const d = await dokument();
  if (!d.userInfoEndpoint) return null;

  try {
    const odpoved = await fetch(d.userInfoEndpoint, {
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
    });
    if (!odpoved.ok) return null;
    const telo = (await odpoved.json()) as { name?: string; email?: string };
    return { jmeno: telo.name ?? null, email: telo.email ?? null };
  } catch {
    return null;
  }
}

/**
 * Odhlášení. <b>Jen tady, u poskytovatele ne</b> — konec relace
 * v prohlížeči telefonu by zavřel i přihlášení do webu na témže
 * telefonu, a to člověk nechtěl.
 */
export async function odhlas() {
  await uloz(KLIC_TOKEN, null);
  await uloz(KLIC_OBNOVA, null);
  await uloz(KLIC_PLATNOST, null);
}
