import { NextResponse } from "next/server";
import {
  COOKIE_TOK,
  naWebu,
  prihlasovaniJde,
  ulozToken,
  vymenKod,
} from "@/lib/oidc";

export const dynamic = "force-dynamic";

/**
 * Návrat od poskytovatele. Tady se kód mění za token.
 *
 * Ověřuje se `state` proti tomu, co si web odložil do cookie — bez toho by
 * šlo někoho přihlásit cizím kódem (CSRF na přihlašovacím toku).
 *
 * <b>Každý neúspěch má svůj důvod a ten se veze dál.</b> Dřív se všechny
 * konce slévaly do `?prihlaseni=chyba`, což navíc nikde nic nevypsalo:
 * nepovedené přihlášení vypadalo úplně stejně jako odhlášený uživatel
 * a nedalo se poznat odnikud než z logu poskytovatele.
 */
export async function GET(request: Request) {
  if (!prihlasovaniJde) return new NextResponse("Přihlašování není nastavené.", { status: 404 });

  const parametry = new URL(request.url).searchParams;

  // Poskytovatel může místo kódu vrátit chybu — třeba když uživatel
  // přihlášení zruší. Není to výjimka, je to běžný konec toku.
  const chyba = parametry.get("error");
  if (chyba) return nepovedloSe("poskytovatel", chyba);

  const kod = parametry.get("code");
  const state = parametry.get("state");

  const tokRaw = request.headers
    .get("cookie")
    ?.split("; ")
    .find((c) => c.startsWith(`${COOKIE_TOK}=`))
    ?.slice(COOKIE_TOK.length + 1);

  if (!kod || !state) return nepovedloSe("bez-kodu");

  // Cookie s rozdělaným tokem chybí. Buď vypršela (deset minut), nebo ji
  // prohlížeč neposlal zpátky — což se stává, když se od poskytovatele
  // vrací požadavkem, na který `SameSite=Lax` cookie nepouští.
  if (!tokRaw) return nepovedloSe("bez-toku");

  const tok = JSON.parse(decodeURIComponent(tokRaw)) as {
    verifier: string;
    state: string;
    kam: string;
  };

  if (tok.state !== state) return nepovedloSe("stav");

  let tokeny;
  try {
    tokeny = await vymenKod(kod, tok.verifier);
  } catch (e) {
    // Výjimka by jinak skončila stránkou „něco se pokazilo" bez jediného
    // vodítka. Důvod zná poskytovatel a `vymenKod` ho píše do logu.
    console.error("Výměna kódu za token selhala.", e);
    return nepovedloSe("vymena");
  }

  const odpoved = NextResponse.redirect(naWebu(tok.kam));

  // O minutu kratší, než platí token. Cookie, která přežije svůj token,
  // vyrobí přihlášeného uživatele, kterému API na všechno odpoví 401.
  const kusu = ulozToken(
    odpoved.cookies,
    tokeny.access_token,
    Math.max((tokeny.expires_in ?? 3600) - 60, 60),
  );

  // Délka tokenu, ne token sám. Je to jediné číslo, kterým se pozná, jestli
  // se sezení blíží hranici, za kterou prohlížeč cookie zahazuje.
  console.log(
    `Přihlášení: token ${tokeny.access_token.length} znaků, ${kusu} cookie, `
      + `platnost ${tokeny.expires_in ?? "?"} s.`,
  );

  // Rozdělaný tok skončil, ať se nepovaluje.
  odpoved.cookies.delete({ name: COOKIE_TOK, path: "/" });
  return odpoved;
}

const nepovedloSe = (proc: string, podrobnost?: string) =>
  NextResponse.redirect(
    naWebu(`/prihlaseni/nepovedlo-se?proc=${proc}${podrobnost ? `&kod=${encodeURIComponent(podrobnost)}` : ""}`),
  );
