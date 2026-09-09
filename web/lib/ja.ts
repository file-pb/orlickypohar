import { cookies } from "next/headers";
import { COOKIE_TOKEN, prihlasovaniJde } from "@/lib/oidc";
import type { components } from "./schema";

export type Ja = components["schemas"]["JaDto"];

const API = process.env.API_URL ?? "http://localhost:8080";

/**
 * Má prohlížeč cookie se sezením?
 *
 * Není to totéž co „je přihlášený". Token může být prošlý nebo odmítnutý,
 * a přesně v tu chvíli je tahle otázka potřeba: bez ní by hlavička nabízela
 * „Přihlásit" člověku, který cookie má, a odhlásit by se nemohl nikde —
 * uvízl by mezi dvěma stavy.
 */
export async function maSezeni(): Promise<boolean> {
  if (!prihlasovaniJde) return false;
  return Boolean((await cookies()).get(COOKIE_TOKEN)?.value);
}

/**
 * Kdo je přihlášený, podle API — ne podle obsahu tokenu.
 *
 * Web token nerozbaluje a ani nemůže: jméno v něm je jméno u poskytovatele,
 * kdežto oprávnění zná jen aplikace. Kdyby si web četl role z tokenu, měl by
 * o nich vlastní pravdu a ta by se s API dřív nebo později rozešla.
 *
 * Vrací <c>null</c> u nepřihlášeného i u prošlého tokenu. <b>Nepadá</b>:
 * veřejné stránky musí fungovat, i když identita neběží — a dokud není
 * administrace, není přihlášení k ničemu potřeba.
 */
export async function nactiJa(): Promise<Ja | null> {
  if (!prihlasovaniJde) return null;

  const token = (await cookies()).get(COOKIE_TOKEN)?.value;
  if (!token) return null;

  try {
    const odpoved = await fetch(`${API}/ja`, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      // Odpověď závisí na cookie, takže se nesmí sdílet mezi návštěvníky.
      cache: "no-store",
    });

    // 401 znamená prošlý nebo neplatný token. Pro stránku je to totéž co
    // nepřihlášený — ukáže se odkaz „přihlásit se" a je to.
    if (!odpoved.ok) return null;
    return (await odpoved.json()) as Ja;
  } catch {
    // Nedostupné API nesmí shodit hlavičku na veřejné stránce.
    return null;
  }
}
