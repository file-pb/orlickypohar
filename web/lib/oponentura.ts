import { tokenZeSezeni } from "@/lib/oidc";
import type { Stav } from "@/lib/sprava";

/**
 * Sady otázek pro oponenturu s rozhodčím — výpis se stavem, detail
 * s odpověďmi, zápis odpovědi a hlasová nahrávka.
 *
 * <b>Proč tu jsou tvary psané rukou, a ne z `lib/schema.d.ts`.</b> Typy se
 * generují `packages/api-client/generuj.sh` z OpenAPI dokumentu
 * **běžícího** API, takže na nový koncový bod dojde až po jeho nasazení —
 * a generátor píše i do `app/src/lib/schema.d.ts`, tedy do appky. Je to
 * tentýž precedens jako `ZpravaRegaty` v `lib/api.ts`. Až se schéma
 * dogeneruje, dají se nahradit za `components["schemas"][…]`; tvary jsou
 * schválně opsané z DTO v `Features/Oponentura/SadaOtazek.cs`.
 *
 * <b>Token zůstává na serveru</b>, stejně jako u zbytku správy. Proto
 * nahrávka z prohlížeče necestuje do API přímo, ale přes koncový bod webu
 * (`…/nahravky/[kod]/route.ts`), který token dolepí — a proto se i hlas
 * přehrává přes web, ne z adresy API.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

export type StavSady = "Neodpovezeno" | "Rozpracovano" | "Odpovezeno";

export type SadaShrnuti = {
  slug: string;
  nazev: string;
  uvod: string;
  pocetOtazek: number;
  odpovezeno: number;
  pocetNahravek: number;
  stav: StavSady;
  dokonceneV: string | null;
  zmenenoV: string | null;
};

export type Volba = { kod: string; text: string };

export type Nahravka = {
  id: string;
  /** Adresa v API. Web ji nepoužívá přímo — přehrává přes svůj koncový bod. */
  adresa: string;
  typ: string;
  velikost: number;
  sekund: number | null;
  nahranoV: string;
  kdo: string | null;
};

export type Otazka = {
  kod: string;
  text: string;
  vysvetleni: string | null;
  uvolni: string | null;
  volby: Volba[];
  volbyVice: boolean;
  zaskrtnuto: string[];
  odpoved: string | null;
  odpovezenoV: string | null;
  nahravky: Nahravka[];
};

export type SadaDetail = {
  slug: string;
  nazev: string;
  uvod: string;
  stav: StavSady;
  dokonceneV: string | null;
  otazky: Otazka[];
};

/** Stejná hranice jako v API. Hlídá se i tady, ať se nic velkého neposílá dál. */
export const NEJVIC_MB = 20;

/** Jak se stav sady čte česky. Nikde se nestaví z `stav` natvrdo. */
export const NAZVY_STAVU: Record<StavSady, string> = {
  Neodpovezeno: "neodpovězeno",
  Rozpracovano: "rozpracováno",
  Odpovezeno: "odpovězeno",
};

const cesta = (serie: string) =>
  `${API}/sprava/serie/${encodeURIComponent(serie)}/oponentura`;

async function hlaska(odpoved: Response) {
  // Tělo se čte jako text, ne rovnou jako JSON: když odpověď nemá naše pole
  // `error`, bývá v ní stejně něco, co říká proč (12. 10. 2026).
  let telo = "";
  try {
    telo = await odpoved.text();
    const json = JSON.parse(telo) as { error?: string; title?: string };
    if (json?.error) return json.error;
    if (json?.title) return `API: ${json.title}`;
  } catch {
    // Tělo nemusí být JSON — 401 z ověřování ho nemá vůbec.
  }

  if (odpoved.status === 401) return "Přihlášení vypršelo. Přihlas se prosím znovu.";
  if (odpoved.status === 403) return "Odpovídat na otázky smí rozhodčí ročníku.";
  if (odpoved.status === 404) return "Tahle sada otázek neexistuje.";
  if (odpoved.status === 413) return `Nahrávka může mít nejvýš ${NEJVIC_MB} MB.`;
  const konec = telo.trim().slice(0, 200);
  return konec
    ? `API odpovědělo ${odpoved.status}: ${konec}`
    : `API odpovědělo ${odpoved.status}.`;
}

async function stav(odpoved: Response): Promise<Stav | null> {
  if (odpoved.status === 401) return "odmitnut";
  if (odpoved.status === 403) return "nesmi";
  if (odpoved.status === 404) return "neni";
  return odpoved.ok ? null : "vypadek";
}

/** Sady ročníku se stavem. Stavy jsou tytéž jako u zbytku správy. */
export async function nactiSady(
  serie: string,
): Promise<{ stav: Stav; data?: SadaShrnuti[] }> {
  const t = await tokenZeSezeni();
  if (!t) return { stav: "neprihlasen" };

  let odpoved: Response;
  try {
    odpoved = await fetch(cesta(serie), {
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return { stav: "vypadek" };
  }

  const spatne = await stav(odpoved);
  if (spatne) return { stav: spatne };

  return { stav: "ok", data: (await odpoved.json()) as SadaShrnuti[] };
}

/** Jedna sada i s odpověďmi. */
export async function nactiSadu(
  serie: string,
  sada: string,
): Promise<{ stav: Stav; data?: SadaDetail }> {
  const t = await tokenZeSezeni();
  if (!t) return { stav: "neprihlasen" };

  let odpoved: Response;
  try {
    odpoved = await fetch(`${cesta(serie)}/${encodeURIComponent(sada)}`, {
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return { stav: "vypadek" };
  }

  const spatne = await stav(odpoved);
  if (spatne) return { stav: spatne };

  return { stav: "ok", data: (await odpoved.json()) as SadaDetail };
}

/** Zapíše zaškrtnuté volby a text u jedné otázky. Vrací chybu, nebo `null`. */
export async function odpovez(
  serie: string,
  sada: string,
  kod: string,
  vstup: { volby: string[]; text?: string },
): Promise<string | null> {
  const t = await tokenZeSezeni();
  if (!t) return "Přihlášení vypršelo. Přihlas se prosím znovu.";

  try {
    const odpoved = await fetch(
      `${cesta(serie)}/${encodeURIComponent(sada)}/otazky/${encodeURIComponent(kod)}`,
      {
        method: "PUT",
        headers: {
          authorization: `Bearer ${t}`,
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({ volby: vstup.volby, text: vstup.text ?? null }),
        cache: "no-store",
      },
    );
    return odpoved.ok ? null : await hlaska(odpoved);
  } catch {
    return "API se nedaří zavolat.";
  }
}

/**
 * Nahraje hlasovou odpověď. Vrací chybu, nebo `null`.
 *
 * Jména polí podle `OponenturaEndpoints.NahrajAsync`: soubor je `nahravka`,
 * délka `sekund`. Soubor je v API **samostatný parametr**, ne pole záznamu
 * — uvnitř záznamu s `[FromForm]` se nenaveze a koncový bod vrátí 400
 * s prázdným tělem (12. 10. 2026, `VazbaNahravkyTests`).
 */
export async function nahrajHlas(
  serie: string,
  sada: string,
  kod: string,
  vstup: { soubor: Blob; jmeno: string; sekund?: number },
): Promise<string | null> {
  const t = await tokenZeSezeni();
  if (!t) return "Přihlášení vypršelo. Přihlas se prosím znovu.";

  const telo = new FormData();
  telo.set("nahravka", vstup.soubor, vstup.jmeno);
  if (vstup.sekund) telo.set("sekund", String(Math.round(vstup.sekund)));

  try {
    const odpoved = await fetch(
      `${cesta(serie)}/${encodeURIComponent(sada)}/otazky/${encodeURIComponent(kod)}/nahravky`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${t}`, accept: "application/json" },
        body: telo,
        cache: "no-store",
      },
    );
    return odpoved.ok ? null : await hlaska(odpoved);
  } catch {
    return "API se nedaří zavolat.";
  }
}

/** Smaže nahrávku. Vrací chybu, nebo `null`. */
export async function smazHlas(
  serie: string,
  sada: string,
  id: string,
): Promise<string | null> {
  const t = await tokenZeSezeni();
  if (!t) return "Přihlášení vypršelo. Přihlas se prosím znovu.";

  try {
    const odpoved = await fetch(
      `${cesta(serie)}/${encodeURIComponent(sada)}/nahravky/${encodeURIComponent(id)}`,
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

/** Zaškrtne „mám to“, nebo to vezme zpátky. */
export async function dokonci(
  serie: string,
  sada: string,
  hotovo: boolean,
): Promise<string | null> {
  const t = await tokenZeSezeni();
  if (!t) return "Přihlášení vypršelo. Přihlas se prosím znovu.";

  try {
    const odpoved = await fetch(
      `${cesta(serie)}/${encodeURIComponent(sada)}/dokonceni`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${t}`,
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({ hotovo }),
        cache: "no-store",
      },
    );
    return odpoved.ok ? null : await hlaska(odpoved);
  } catch {
    return "API se nedaří zavolat.";
  }
}

/**
 * Obsah nahrávky z API, k propuštění dál do prohlížeče.
 *
 * Hlas se nevydává z veřejné adresy úložiště (důvod je u `HlasovaOdpoved`
 * v API), takže ho musí někdo s tokenem přinést — a token je na serveru.
 */
export async function nactiHlas(
  serie: string,
  sada: string,
  id: string,
): Promise<Response | null> {
  const t = await tokenZeSezeni();
  if (!t) return null;

  try {
    return await fetch(
      `${cesta(serie)}/${encodeURIComponent(sada)}/nahravky/${encodeURIComponent(id)}`,
      {
        headers: { authorization: `Bearer ${t}` },
        cache: "no-store",
      },
    );
  } catch {
    return null;
  }
}
