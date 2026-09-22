import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_KALENDAR, jeVolbaKalendare } from "@/lib/kalendar-volba";

export const dynamic = "force-dynamic";

const WEB = process.env.WEB_URL ?? "http://localhost:3000";

/**
 * Uložení volby kalendáře (pohár / vše / mimo pohár). Stejný vzor jako
 * `/rezim`: jen POST, protože přednačtení odkazu nebo robot nesmí lidem
 * měnit nastavení, a zpátky jen v rámci webu.
 *
 * Z adresy, kam se vrací, se maže `?kalendar=` — jinak by parametr ze
 * sdíleného odkazu hned přebil volbu, kterou čtenář právě uložil, a přepínač
 * by vypadal rozbitě.
 */
export async function POST(pozadavek: NextRequest) {
  const formular = await pozadavek.formData();
  const na = String(formular.get("na") ?? "");
  const kotva = String(formular.get("kotva") ?? "");
  const odpoved = NextResponse.redirect(zpet(pozadavek.headers.get("referer"), kotva), {
    status: 303,
  });

  if (jeVolbaKalendare(na)) {
    odpoved.cookies.set(COOKIE_KALENDAR, na, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: true,
      secure: WEB.startsWith("https://"),
    });
  } else {
    odpoved.cookies.delete({ name: COOKIE_KALENDAR, path: "/" });
  }

  return odpoved;
}

/** Kdo sem přijde odkazem, ať neskončí na prázdné stránce. Nic nemění. */
export async function GET() {
  return NextResponse.redirect(new URL("/", WEB));
}

/**
 * Zpátky na stránku s kalendářem. Kotva vrátí čtenáře na přepínač — bez ní
 * by po přepnutí skončil na začátku stránky, kalendář je kus pod nadpisem.
 */
function zpet(odkud: string | null, kotva: string) {
  const web = new URL(WEB);
  let cil = new URL("/", web);
  try {
    const odtud = new URL(odkud ?? "/", web);
    if (odtud.origin === web.origin) cil = odtud;
  } catch {
    // Nesmyslný Referer: prostě domů.
  }
  cil.searchParams.delete("kalendar");
  cil.hash = /^[a-z-]+$/.test(kotva) ? kotva : "";
  return cil;
}
