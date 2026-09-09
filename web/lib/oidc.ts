/**
 * Přihlášení přes OIDC, tok Authorization Code s PKCE.
 *
 * <b>Veřejný klient bez tajemství.</b> Web sice renderuje server, takže by
 * secret udržet uměl — jenže tentýž tok bude potřebovat i mobilní appka,
 * kde se udržet nedá. PKCE funguje v obou případech a nemá smysl mít dvě
 * různá přihlášení do jedné aplikace.
 *
 * Token leží v cookie, ne v paměti procesu. Je to pravidlo platformy č. 3:
 * druhá replika by in-memory session neviděla.
 *
 * Jméno poskytovatele tu není a být nemá — všechno přichází z prostředí,
 * stejně jako na straně API.
 */

const AUTORITA = process.env.IDENTITA_AUTHORITY ?? "";
const KLIENT = process.env.IDENTITA_CLIENT_ID ?? "";
const VEREJNA_ADRESA = process.env.WEB_URL ?? "";

/** Bez konfigurace se přihlašování nikde nenabízí. */
export const prihlasovaniJde = Boolean(AUTORITA && KLIENT && VEREJNA_ADRESA);

export const COOKIE_TOKEN = "op_token";
export const COOKIE_TOK = "op_tok";

export type Dokument = {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint?: string;
};

/**
 * Adresy endpointů se čtou z OIDC dokumentu, ne skládají z autority.
 * Tvary cest jsou věc poskytovatele — Zitadel má `/oauth/v2/token`, jiný
 * má něco jiného — a uhodnout je znamená napsat si poskytovatele do kódu.
 */
export async function dokument(): Promise<Dokument> {
  const odpoved = await fetch(`${AUTORITA}/.well-known/openid-configuration`, {
    // Dokument se mění jednou za dlouho, ale ne nikdy: klíče se rotují.
    next: { revalidate: 3600 },
  });
  if (!odpoved.ok) throw new Error(`OIDC dokument vrátil ${odpoved.status}`);
  return (await odpoved.json()) as Dokument;
}

export const navratovaAdresa = () => `${VEREJNA_ADRESA}/prihlaseni/zpet`;

/**
 * Adresa na tomhle webu, poskládaná z veřejné adresy z prostředí.
 *
 * <b>Nikdy ne z `request.url`.</b> Ta je uvnitř kontejneru interní — Next
 * poslouchá na `0.0.0.0:8080`, takže přesměrování složené z ní pošle
 * prohlížeč na `https://0.0.0.0:8080/`. Projde to všude, kde se web testuje
 * přímo, a pokazí se to teprve za proxy.
 */
export const naWebu = (cesta: string) => new URL(cesta, VEREJNA_ADRESA);

/** Náhodný řetězec pro `state` i pro PKCE. */
function nahodne(bajtu = 32) {
  return base64url(crypto.getRandomValues(new Uint8Array(bajtu)));
}

function base64url(data: Uint8Array) {
  return Buffer.from(data).toString("base64url");
}

/**
 * Začátek přihlášení: adresa poskytovatele a tajemství, které si web nechá
 * u sebe, aby si na konci ověřil, že odpověď patří k jeho vlastní žádosti.
 */
export async function zacniPrihlaseni(kam: string) {
  const d = await dokument();
  const verifier = nahodne();
  const state = nahodne(16);

  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const challenge = base64url(new Uint8Array(hash));

  const parametry = new URLSearchParams({
    client_id: KLIENT,
    redirect_uri: navratovaAdresa(),
    response_type: "code",
    // `openid` je povinné, zbytek je jméno a e-mail do hlavičky webu.
    scope: "openid profile email",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  return {
    kam: `${d.authorization_endpoint}?${parametry}`,
    // Verifier i state se vezou v jedné cookie. Dvě by se daly rozpojit,
    // tahle se dá jen celá zahodit.
    tok: JSON.stringify({ verifier, state, kam }),
  };
}

export type Tokeny = { access_token: string; expires_in?: number; id_token?: string };

/**
 * Výměna kódu za token. `code_verifier` je to, co dokazuje, že kód uplatňuje
 * tentýž klient, který o něj žádal — proto se posílá až sem a nikdy nejde
 * přes prohlížeč.
 */
export async function vymenKod(kod: string, verifier: string): Promise<Tokeny> {
  const d = await dokument();
  const odpoved = await fetch(d.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: kod,
      redirect_uri: navratovaAdresa(),
      client_id: KLIENT,
      code_verifier: verifier,
    }),
    cache: "no-store",
  });

  if (!odpoved.ok) {
    // Tělo chyby se do logu píše celé: poskytovatel v něm říká, co přesně
    // nesedí (špatná návratová adresa, prošlý kód), a bez toho se to hádá.
    throw new Error(`Výměna kódu selhala: ${odpoved.status} ${await odpoved.text()}`);
  }

  return (await odpoved.json()) as Tokeny;
}

/**
 * Adresa, kam poslat prohlížeč při odhlášení, když ji poskytovatel má.
 *
 * <b>`client_id` je povinné</b>, i když to podle jména vypadá jako údaj pro
 * přihlášení. Bez něj poskytovatel neví, čí je zaslaná návratová adresa —
 * a protože ji nesmí použít neověřenou, tiše ji zahodí a nechá uživatele
 * na své vlastní stránce. Ověřeno na Zitadelu: bez `client_id` dosadí
 * `/logout/done`, s ním nechá naši. Podle specifikace RP-Initiated Logout
 * stačí `id_token_hint` nebo `client_id`; my id_token neukládáme, protože
 * by to byla druhá cookie na každý požadavek kvůli jedinému odhlášení.
 */
export async function odhlasovaciAdresa(idToken?: string) {
  const d = await dokument();
  if (!d.end_session_endpoint) return VEREJNA_ADRESA;

  const parametry = new URLSearchParams({
    post_logout_redirect_uri: `${VEREJNA_ADRESA}/`,
    client_id: KLIENT,
  });
  if (idToken) parametry.set("id_token_hint", idToken);
  return `${d.end_session_endpoint}?${parametry}`;
}
