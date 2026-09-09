import { NextResponse } from "next/server";
import { COOKIE_TOK, odhlasovaciAdresa, prihlasovaniJde, zahodToken } from "@/lib/oidc";

export const dynamic = "force-dynamic";

/**
 * Odhlášení. Zahodí cookie a pošle prohlížeč ukončit sezení i u poskytovatele
 * — jinak by se příští „přihlásit" provedlo mlčky a vypadalo, že odhlášení
 * nefungovalo.
 */
export async function GET() {
  if (!prihlasovaniJde) return new NextResponse("Přihlašování není nastavené.", { status: 404 });

  const odpoved = NextResponse.redirect(await odhlasovaciAdresa());
  // Zahazují se i kusy dlouhého tokenu — jinak by po odhlášení zbyla část
  // sezení a hlavička by ukazovala přihlášeného.
  zahodToken(odpoved.cookies);
  odpoved.cookies.delete({ name: COOKIE_TOK, path: "/" });
  return odpoved;
}
