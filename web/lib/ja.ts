import { cache } from "react";
import { prihlasovaniJde, tokenZeSezeni } from "@/lib/oidc";
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
  return Boolean(await tokenZeSezeni());
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
export type Sezeni = { ja: Ja | null; duvod: string | null };

/**
 * Jedno čtení na požadavek. Hlavička si o přihlášeného říká v layoutu
 * a stránka znovu kvůli oprávněním — a od té doby, co se na práva ptají
 * i veřejné stránky (odkaz do správy u regaty), by to byla tři volání
 * `/ja` na jedno vykreslení. `cache` z Reactu platí v rámci jednoho
 * požadavku, takže se nic nesdílí mezi návštěvníky.
 */
export const nactiJa = cache(nactiJaZeServeru);

async function nactiJaZeServeru(): Promise<Sezeni> {
  if (!prihlasovaniJde) return { ja: null, duvod: null };

  const token = await tokenZeSezeni();
  if (!token) return { ja: null, duvod: null };

  try {
    const odpoved = await fetch(`${API}/ja`, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      // Odpověď závisí na cookie, takže se nesmí sdílet mezi návštěvníky.
      cache: "no-store",
    });

    if (odpoved.ok) return { ja: (await odpoved.json()) as Ja, duvod: null };

    // Proč token neprošel, říká API v hlavičce `WWW-Authenticate` — je to
    // standardní chování OAuth a nic tajného tam není. Zahodit ji znamená
    // poslat člověka hledat příčinu do logu serveru, což u „nefunguje mi
    // přihlášení" nikdo neudělá.
    return { ja: null, duvod: duvodZHlavicky(odpoved.headers.get("www-authenticate")) };
  } catch {
    // Nedostupné API nesmí shodit hlavičku na veřejné stránce.
    return { ja: null, duvod: "API se nedaří zavolat." };
  }
}

/** Z `Bearer error="invalid_token", error_description="..."` vytáhne popis. */
function duvodZHlavicky(hlavicka: string | null) {
  if (!hlavicka) return null;
  const popis = /error_description="([^"]*)"/.exec(hlavicka)?.[1];
  const kod = /error="([^"]*)"/.exec(hlavicka)?.[1];
  return popis ?? kod ?? null;
}
