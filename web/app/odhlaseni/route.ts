import { NextResponse } from "next/server";
import { COOKIE_TOK, COOKIE_TOKEN, odhlasovaciAdresa, prihlasovaniJde } from "@/lib/oidc";

export const dynamic = "force-dynamic";

/**
 * Odhlášení. Zahodí cookie a pošle prohlížeč ukončit sezení i u poskytovatele
 * — jinak by se příští „přihlásit" provedlo mlčky a vypadalo, že odhlášení
 * nefungovalo.
 */
export async function GET() {
  if (!prihlasovaniJde) return new NextResponse("Přihlašování není nastavené.", { status: 404 });

  const odpoved = NextResponse.redirect(await odhlasovaciAdresa());
  odpoved.cookies.delete(COOKIE_TOKEN);
  odpoved.cookies.delete(COOKIE_TOK);
  return odpoved;
}
