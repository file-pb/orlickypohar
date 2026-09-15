import { tokenZeSezeni } from "@/lib/oidc";
import type { components } from "./schema";

/**
 * Volání administrace. Odděleno od `lib/api.ts` schválně: veřejné čtení se
 * cachuje a nikoho se neptá, tohle nese token a nesmí se cachovat vůbec.
 *
 * <b>Token zůstává na serveru.</b> Leží v cookie, kterou prohlížeč jen vozí
 * s sebou; do stránky se nikdy nevypisuje a do prohlížeče se nedostane.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

type S = components["schemas"];

export type Prehled = S["PrehledOpravneniDto"];
export type Radek = S["OpravneniRadek"];
export type ZastavkaVolba = S["ZastavkaVolbaDto"];
export type Ucet = S["UcetDto"];
export type Role = S["Role"];

/**
 * Role, které se dají udělit, a co znamenají.
 *
 * <b>Čtenář tu není</b> — je to každý, i nepřihlášený, a neuděluje se.
 * Popisy jsou tu proto, že jméno role samo o sobě neřekne, kde je hranice
 * mezi editorem a organizátorem; správce si to jinak vyzkouší na lidech.
 */
export const ROLE: { role: Role; nazev: string; popis: string; jenRocnik?: boolean }[] = [
  { role: "Editor", nazev: "Editor", popis: "Píše na blog svého rozsahu. Nic dalšího." },
  {
    role: "Organizator",
    nazev: "Organizátor",
    popis: "Vypisuje závod, spravuje lodě, rozjížďky a výsledky. Píše i na blog.",
  },
  {
    role: "Rozhodci",
    nazev: "Rozhodčí",
    popis: "Vede kalendář a schvaluje výsledky. Zadávat je sám nesmí.",
    jenRocnik: true,
  },
  {
    role: "Spravce",
    nazev: "Správce",
    popis: "Všechno ve svém rozsahu, včetně publikace a udělování rolí.",
    jenRocnik: true,
  },
];

/**
 * Jméno role, jak se píše česky. V API i v adrese je bez diakritiky, protože
 * je to hodnota výčtu — na obrazovku ale patří „Rozhodčí", ne „Rozhodci".
 */
export const nazevRole = (role: Role) =>
  ROLE.find((r) => r.role === role)?.nazev ?? role;

/**
 * Stav odpovědi na dotaz, který vyžaduje roli správce.
 *
 * <b>„Nemáš sezení" a „API tvůj token odmítlo" jsou dvě různé věci.</b>
 * Dřív se slévaly do jedné hlášky „musíš se přihlásit" — a právě proto se
 * nedalo poznat, jestli cookie chybí, nebo jestli je a jen neplatí.
 */
export type Stav = "ok" | "neprihlasen" | "odmitnut" | "nesmi" | "neni" | "vypadek";

// Jedno místo, kde se čte sezení — včetně tokenu uloženého po kusech.
const token = () => tokenZeSezeni();

/** Chybová hláška z API, nebo obecná podle stavu. Nikdy prázdná. */
async function hlaska(odpoved: Response) {
  try {
    const telo = (await odpoved.json()) as { error?: string };
    if (telo?.error) return telo.error;
  } catch {
    // Tělo nemusí být JSON — 401 z ověřování ho nemá vůbec.
  }

  if (odpoved.status === 401) return "Přihlášení vypršelo. Přihlas se prosím znovu.";
  if (odpoved.status === 403) return "Na tenhle ročník nemáš práva správce.";
  return `API odpovědělo ${odpoved.status}.`;
}

export async function nactiPrehled(
  serie: string,
): Promise<{ stav: Stav; prehled?: Prehled }> {
  const t = await token();
  if (!t) return { stav: "neprihlasen" };

  let odpoved: Response;
  try {
    odpoved = await fetch(`${API}/sprava/serie/${encodeURIComponent(serie)}/opravneni`, {
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      // Odpověď závisí na tom, kdo se ptá, a mění se hned po každém udělení.
      cache: "no-store",
    });
  } catch {
    return { stav: "vypadek" };
  }

  // Cookie tu je, ale API token nepřijalo: vypršel, nebo ho poskytovatel
  // zneplatnil. Pro člověka je to „přihlas se znovu", ne „přihlas se" —
  // a pro hledání chyby je to úplně jiná stopa.
  if (odpoved.status === 401) return { stav: "odmitnut" };
  if (odpoved.status === 403) return { stav: "nesmi" };
  if (odpoved.status === 404) return { stav: "neni" };
  if (!odpoved.ok) return { stav: "vypadek" };

  return { stav: "ok", prehled: (await odpoved.json()) as Prehled };
}

/**
 * Vrací chybu k zobrazení, nebo `null`, když se povedlo.
 *
 * `ucetNeni` říká, že se na ten e-mail ještě nikdo nepřihlásil — stránka
 * pak k hlášce přidá odkaz na seznam účtů. Pozná se podle 404: ročník
 * i zastávka tu pocházejí z nabídky, kterou vydalo totéž API, takže jiná
 * 404 vzniká jen souběhem se smazáním.
 */
export async function udel(
  serie: string,
  vstup: { email: string; role: Role; zavod?: string },
): Promise<{ chyba: string; ucetNeni: boolean } | null> {
  const t = await token();
  if (!t) return { chyba: "Přihlášení vypršelo. Přihlas se prosím znovu.", ucetNeni: false };

  try {
    const odpoved = await fetch(
      `${API}/sprava/serie/${encodeURIComponent(serie)}/opravneni`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${t}`,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify(vstup),
        cache: "no-store",
      },
    );

    return odpoved.ok
      ? null
      : { chyba: await hlaska(odpoved), ucetNeni: odpoved.status === 404 };
  } catch {
    return { chyba: "API se nedaří zavolat.", ucetNeni: false };
  }
}

export async function odeber(serie: string, id: number): Promise<string | null> {
  const t = await token();
  if (!t) return "Přihlášení vypršelo. Přihlas se prosím znovu.";

  try {
    const odpoved = await fetch(
      `${API}/sprava/serie/${encodeURIComponent(serie)}/opravneni/${id}`,
      {
        method: "DELETE",
        headers: { authorization: `Bearer ${t}`, accept: "application/json" },
        cache: "no-store",
      },
    );

    return odpoved.ok ? null : await hlaska(odpoved);
  } catch {
    return "API se nedaří zavolat.";
  }
}
