import { tokenZeSezeni } from "@/lib/oidc";
import type { Stav } from "@/lib/sprava";
import type { components } from "./schema";

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
  },
): Promise<string | null> {
  const t = await tokenZeSezeni();
  if (!t) return "Přihlášení vypršelo. Přihlas se prosím znovu.";

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
    return odpoved.ok ? null : await hlaska(odpoved);
  } catch {
    return "API se nedaří zavolat.";
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
