import { NextResponse } from "next/server";
import { COOKIE_TOK, odhlasovaciAdresa, prihlasovaniJde, zahodToken } from "@/lib/oidc";

export const dynamic = "force-dynamic";

/**
 * Odhlášení. Zahodí cookie a pošle prohlížeč ukončit sezení i u poskytovatele
 * — jinak by se příští „přihlásit" provedlo mlčky a vypadalo, že odhlášení
 * nefungovalo.
 *
 * <b>Jen POST.</b> Dřív to bylo `GET`, a to znamená, že odhlášení provede
 * kdokoliv, kdo tu adresu jen navštíví: náhled odkazu, přednačtení stránky,
 * firemní kontrola odkazů, robot. Sezení pak mizí bez zjevné příčiny a
 * v logu API po tom není ani stopa, protože odhlášení je čistě věc webu.
 * Požadavek, který něco mění, nesmí být `GET` — je to pravidlo HTTP, ne
 * náš zvyk.
 */
export async function POST() {
  if (!prihlasovaniJde) return new NextResponse("Přihlašování není nastavené.", { status: 404 });

  const odpoved = NextResponse.redirect(await odhlasovaciAdresa(), { status: 303 });
  // Zahazují se i kusy dlouhého tokenu — jinak by po odhlášení zbyla část
  // sezení a hlavička by ukazovala přihlášeného.
  zahodToken(odpoved.cookies);
  odpoved.cookies.delete({ name: COOKIE_TOK, path: "/" });
  return odpoved;
}

/**
 * Kdo sem přijde odkazem nebo z historie, ať se nediví prázdné stránce.
 * <b>Nic to nemění</b> — jen ukáže tlačítko, které pošle POST.
 */
export async function GET() {
  return NextResponse.redirect(new URL("/odhlaseni/potvrzeni", process.env.WEB_URL ?? "http://localhost:3000"));
}
