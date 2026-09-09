import { NextResponse } from "next/server";
import { COOKIE_TOK, prihlasovaniJde, zacniPrihlaseni } from "@/lib/oidc";

export const dynamic = "force-dynamic";

/**
 * Začátek přihlášení. Odsud odchází prohlížeč k poskytovateli identity.
 *
 * `?kam=` říká, kam se má vrátit. Bere se z něj jen cesta na tomhle webu —
 * otevřené přesměrování na cizí adresu je klasická díra, kterou se dá
 * z odkazu „přihlas se" udělat past.
 */
export async function GET(request: Request) {
  if (!prihlasovaniJde) return new NextResponse("Přihlašování není nastavené.", { status: 404 });

  const kam = new URL(request.url).searchParams.get("kam");
  const bezpecneKam = kam && kam.startsWith("/") && !kam.startsWith("//") ? kam : "/";

  const { kam: adresa, tok } = await zacniPrihlaseni(bezpecneKam);

  const odpoved = NextResponse.redirect(adresa);
  odpoved.cookies.set(COOKIE_TOK, tok, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    // Přihlášení trvá minuty, ne hodiny. Krátká platnost znamená, že se
    // rozdělaný pokus sám uklidí.
    maxAge: 600,
  });
  return odpoved;
}
