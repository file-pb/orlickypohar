import { NextResponse } from "next/server";
import { COOKIE_TOK, COOKIE_TOKEN, naWebu, prihlasovaniJde, vymenKod } from "@/lib/oidc";

export const dynamic = "force-dynamic";

/**
 * Návrat od poskytovatele. Tady se kód mění za token.
 *
 * Ověřuje se `state` proti tomu, co si web odložil do cookie — bez toho by
 * šlo někoho přihlásit cizím kódem (CSRF na přihlašovacím toku).
 */
export async function GET(request: Request) {
  if (!prihlasovaniJde) return new NextResponse("Přihlašování není nastavené.", { status: 404 });

  const parametry = new URL(request.url).searchParams;

  // Poskytovatel může místo kódu vrátit chybu — třeba když uživatel
  // přihlášení zruší. Není to výjimka, je to běžný konec toku.
  const chyba = parametry.get("error");
  if (chyba) return NextResponse.redirect(naWebu("/?prihlaseni=zruseno"));

  const kod = parametry.get("code");
  const state = parametry.get("state");

  const tokRaw = request.headers
    .get("cookie")
    ?.split("; ")
    .find((c) => c.startsWith(`${COOKIE_TOK}=`))
    ?.slice(COOKIE_TOK.length + 1);

  if (!kod || !state || !tokRaw)
    return NextResponse.redirect(naWebu("/?prihlaseni=chyba"));

  const tok = JSON.parse(decodeURIComponent(tokRaw)) as {
    verifier: string;
    state: string;
    kam: string;
  };

  if (tok.state !== state)
    return NextResponse.redirect(naWebu("/?prihlaseni=chyba"));

  const tokeny = await vymenKod(kod, tok.verifier);

  const odpoved = NextResponse.redirect(naWebu(tok.kam));
  odpoved.cookies.set(COOKIE_TOKEN, tokeny.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    // O minutu kratší, než platí token. Cookie, která přežije svůj token,
    // vyrobí přihlášeného uživatele, kterému API na všechno odpoví 401.
    maxAge: Math.max((tokeny.expires_in ?? 3600) - 60, 60),
  });
  // Rozdělaný tok skončil, ať se nepovaluje.
  odpoved.cookies.delete(COOKIE_TOK);
  return odpoved;
}
