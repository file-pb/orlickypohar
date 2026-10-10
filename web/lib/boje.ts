import { tokenZeSezeni } from "@/lib/oidc";
import type { Stav } from "@/lib/sprava";
import type { components } from "./schema";

export type BarvaBoje = components["schemas"]["BarvaBoje"];
export type TvarBoje = components["schemas"]["TvarBoje"];

/**
 * Bóje na trati — pípnutí polohy, přenastavení a sebrání.
 *
 * <b>Pípá ten, kdo bóji staví</b>, a nikdo jiný nemá přesnější polohu
 * (plán, oddíl *Trať staví pořadatel, pípnutím u bóje*). Proto je to
 * jediná obrazovka správy, která potřebuje javascript: polohu umí dát
 * jen prohlížeč.
 *
 * <b>Nic se nepřepisuje.</b> Přenastavení je nový záznam a ten starý se
 * označí za nahrazený; sebrání je razítko, ne smazání. Trasa lodi z té
 * doby se jinak nedá přečíst — vztahuje se k trati tak, jak stála tehdy.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

export type Boje = components["schemas"]["BojeDto"];
export type ZdrojPolohy = components["schemas"]["ZdrojPolohy"];
export type Obrazek = components["schemas"]["ObrazekDto"];

/** Jak se zdroj polohy jmenuje na obrazovce. */
export const NAZVY_ZDROJU: Record<ZdrojPolohy, string> = {
  Telefon: "pípnuto u bóje",
  Mapa: "z mapy",
  Qr: "z QR kódu",
};

/**
 * Tytéž hranice jako v `Pipnuti` v API. Hlídají se i tady, aby člověk
 * dostal odpověď hned u tlačítka a neposílalo se, co API stejně odmítne.
 * Zdroj pravdy zůstává server; tohle je jen předstih.
 */
export const NEJHORSI_PRESNOST_M = 100;

/** Tatáž délka jako `Pipnuti.NazevNejvic` v API. */
export const NAZEV_NEJVIC = 60;

const cesta = (serie: string, zavod: string) =>
  `${API}/sprava/serie/${encodeURIComponent(serie)}/zastavky/${encodeURIComponent(zavod)}/boje`;

async function hlaska(odpoved: Response) {
  try {
    const telo = (await odpoved.json()) as { error?: string };
    if (telo?.error) return telo.error;
  } catch {
    // Tělo nemusí být JSON — 401 z ověřování ho nemá vůbec.
  }

  if (odpoved.status === 401) return "Přihlášení vypršelo. Přihlas se prosím znovu.";
  if (odpoved.status === 403) return "Bóje smí stavět pořadatel téhle regaty nebo rozhodčí ročníku.";
  if (odpoved.status === 404) return "Tahle regata neexistuje.";
  return `API odpovědělo ${odpoved.status}.`;
}

async function nacti(
  serie: string,
  zavod: string,
  historie: boolean,
): Promise<{ stav: Stav; data?: Boje[] }> {
  const t = await tokenZeSezeni();
  if (!t) return { stav: "neprihlasen" };

  const adresa = historie ? `${cesta(serie, zavod)}?historie=true` : cesta(serie, zavod);

  let odpoved: Response;
  try {
    odpoved = await fetch(adresa, {
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return { stav: "vypadek" };
  }

  if (odpoved.status === 401) return { stav: "odmitnut" };
  if (odpoved.status === 403) return { stav: "nesmi" };
  if (odpoved.status === 404) return { stav: "neni" };
  if (!odpoved.ok) return { stav: "vypadek" };

  return { stav: "ok", data: (await odpoved.json()) as Boje[] };
}

/** Jedna bóje z historie a čím skončila. */
export type Byvala = { boje: Boje; proc: "sebraná" | "přenastavená" };

/**
 * Trať a historie k ní.
 *
 * <b>Čte se dvakrát a je to schválně.</b> `BojeDto` nese jen `sebrana`,
 * takže přenastavený záznam se v odpovědi nepozná od platného — vypadá
 * stejně, jen stojí v řazení za ním. Historie se proto spočítá rozdílem
 * dvou seznamů: co je v `historie=true` a není v platných, už neplatí.
 * Kdyby DTO neslo i „nahrazená", stačilo by jedno čtení; dokud ho nenese,
 * je tohle jediný způsob, jak **nelhat** o tom, co na trati stojí.
 *
 * Bóje sebraná i přenastavená zároveň se vypíše jako sebraná — DTO víc
 * neřekne a je to ten vzácnější případ.
 */
export async function nactiTrat(
  serie: string,
  zavod: string,
): Promise<{ stav: Stav; trat?: Boje[]; byvale?: Byvala[] }> {
  const platne = await nacti(serie, zavod, false);
  if (platne.stav !== "ok" || !platne.data) return { stav: platne.stav };

  const vse = await nacti(serie, zavod, true);
  // Výpadek druhého čtení trať nezahodí: bez historie se obrazovka obejde.
  if (vse.stav !== "ok" || !vse.data) return { stav: "ok", trat: platne.data, byvale: [] };

  const stoji = new Set(platne.data.map((b) => b.id));
  const byvale: Byvala[] = vse.data
    .filter((b) => !stoji.has(b.id))
    .map((boje) => ({ boje, proc: boje.sebrana ? "sebraná" : "přenastavená" }));

  return { stav: "ok", trat: platne.data, byvale };
}

/** Vrací chybu k zobrazení, nebo `null`, když se pípnutí povedlo. */
export async function pipni(
  serie: string,
  zavod: string,
  vstup: {
    nazev: string;
    poradi: number;
    sirka: number;
    delka: number;
    presnostM: number | null;
    nahrazujeId: number | null;
    zdroj?: ZdrojPolohy;
    barva?: BarvaBoje;
    tvar?: TvarBoje;
  },
): Promise<{ chyba: string | null; boje: Boje | null }> {
  const t = await tokenZeSezeni();
  if (!t) return { chyba: "Přihlášení vypršelo. Přihlas se prosím znovu.", boje: null };

  try {
    const odpoved = await fetch(cesta(serie, zavod), {
      method: "POST",
      headers: {
        authorization: `Bearer ${t}`,
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(vstup),
      cache: "no-store",
    });
    // Vrací se i zapsaná bóje: průvodce stavbou z ní potřebuje `id`, aby
    // z pípnutých bodů hned složil prvek.
    if (!odpoved.ok) return { chyba: await hlaska(odpoved), boje: null };
    return { chyba: null, boje: (await odpoved.json()) as Boje };
  } catch {
    return { chyba: "API se nedaří zavolat.", boje: null };
  }
}

/** Označí bóji za sebranou. Vrací chybu k zobrazení, nebo `null`. */
export async function seber(
  serie: string,
  zavod: string,
  boje: number,
): Promise<string | null> {
  const t = await tokenZeSezeni();
  if (!t) return "Přihlášení vypršelo. Přihlas se prosím znovu.";

  try {
    const odpoved = await fetch(`${cesta(serie, zavod)}/${boje}/sebrana`, {
      method: "POST",
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      cache: "no-store",
    });
    return odpoved.ok ? null : await hlaska(odpoved);
  } catch {
    return "API se nedaří zavolat.";
  }
}

/** Stejná hranice jako v API (`Nahravani.NejvicBajtu`). */
export const FOTKA_NEJVIC_MB = 15;

/**
 * Přiloží k bóji fotku. <b>Fotek může být víc</b> — jedna zblízka
 * neukáže, co je za bójí na břehu.
 *
 * Soubor jde přes server webu, ne z prohlížeče do úložiště: API ho
 * přepočítá na WebP dřív, než se cokoliv uloží, takže se originál
 * z telefonu nikam neukládá.
 */
export async function nahrajFotku(
  serie: string,
  zavod: string,
  boje: number,
  soubor: File,
): Promise<string | null> {
  const t = await tokenZeSezeni();
  if (!t) return "Přihlášení vypršelo. Přihlas se prosím znovu.";

  const telo = new FormData();
  telo.set("soubor", soubor, soubor.name);

  try {
    const odpoved = await fetch(`${cesta(serie, zavod)}/${boje}/fotky`, {
      method: "POST",
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      body: telo,
      cache: "no-store",
    });
    if (odpoved.status === 413) return `Fotka může mít nejvýš ${FOTKA_NEJVIC_MB} MB.`;
    return odpoved.ok ? null : await hlaska(odpoved);
  } catch {
    return "API se nedaří zavolat.";
  }
}

/** Odebere jednu fotku bóje i její soubory. */
export async function odeberFotku(
  serie: string,
  zavod: string,
  boje: number,
  fotka: string,
): Promise<string | null> {
  const t = await tokenZeSezeni();
  if (!t) return "Přihlášení vypršelo. Přihlas se prosím znovu.";

  try {
    const odpoved = await fetch(
      `${cesta(serie, zavod)}/${boje}/fotky/${encodeURIComponent(fotka)}`,
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

/**
 * Kolik záznamů historie je k zahození. <b>Nic nemaže</b> — obrazovka to
 * musí říct dřív, než se na něco klikne, protože mazání nejde vzít zpátky.
 * Při výpadku vrací <c>null</c> a obrazovka úklid prostě nenabídne.
 */
export async function nactiKUklizeni(serie: string, zavod: string): Promise<number | null> {
  const t = await tokenZeSezeni();
  if (!t) return null;

  try {
    const odpoved = await fetch(`${cesta(serie, zavod)}/uklid`, {
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      cache: "no-store",
    });
    if (!odpoved.ok) return null;
    return ((await odpoved.json()) as { pocet: number }).pocet;
  } catch {
    return null;
  }
}

/** Úklid historie. Vrací počet zahozených, nebo text chyby. */
export async function uklidHistorii(
  serie: string,
  zavod: string,
): Promise<number | string> {
  const t = await tokenZeSezeni();
  if (!t) return "Přihlášení vypršelo. Přihlas se prosím znovu.";

  try {
    const odpoved = await fetch(`${cesta(serie, zavod)}/uklid`, {
      method: "POST",
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      cache: "no-store",
    });
    if (!odpoved.ok) return await hlaska(odpoved);
    return ((await odpoved.json()) as { pocet: number }).pocet;
  } catch {
    return "API se nedaří zavolat.";
  }
}
