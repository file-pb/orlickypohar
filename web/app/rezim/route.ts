import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_REZIM, jeRezim } from "@/lib/rezim";

export const dynamic = "force-dynamic";

const WEB = process.env.WEB_URL ?? "http://localhost:3000";

/**
 * Přepnutí vzhledu. Formulář z hlavičky pošle `na` = `svetly`, `tmavy`,
 * nebo `system`; poslední volbu smaže a web se zase řídí systémem.
 *
 * <b>Jen POST</b>, ze stejného důvodu jako odhlášení: požadavek, který něco
 * mění, nesmí být `GET`. Přednačtení odkazu nebo robot by jinak lidem
 * přepínali vzhled.
 *
 * Zpátky vede na stránku, odkud formulář přišel — ale jen v rámci webu.
 * Cizí `Referer` by z téhle cesty udělal přesměrovač kamkoliv.
 */
export async function POST(pozadavek: NextRequest) {
  const na = String((await pozadavek.formData()).get("na") ?? "");
  const odpoved = NextResponse.redirect(zpet(pozadavek.headers.get("referer")), { status: 303 });

  if (jeRezim(na)) {
    odpoved.cookies.set(COOKIE_REZIM, na, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: true,
      secure: WEB.startsWith("https://"),
    });
  } else {
    odpoved.cookies.delete({ name: COOKIE_REZIM, path: "/" });
  }

  return odpoved;
}

/** Kdo sem přijde odkazem, ať neskončí na prázdné stránce. Nic nemění. */
export async function GET() {
  return NextResponse.redirect(new URL("/", WEB));
}

function zpet(odkud: string | null) {
  const web = new URL(WEB);
  try {
    const cil = new URL(odkud ?? "/", web);
    if (cil.origin === web.origin) return cil;
  } catch {
    // Nesmyslný Referer: prostě domů.
  }
  return new URL("/", web);
}
