import { tokenZeSezeni } from "@/lib/oidc";
import type { components } from "./schema";
import type { Stav } from "@/lib/sprava";

/**
 * Volání přihlášek lodí na regatu. Vedle `lib/vysledky.ts`: ta je o tom,
 * co se stalo na vodě, tahle o tom, kdo se chystá jet.
 *
 * <b>Token zůstává na serveru.</b> Leží v cookie, kterou prohlížeč jen vozí
 * s sebou; do stránky se nikdy nevypisuje.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

type S = components["schemas"];

export type PrihlaskyZastavky = S["PrihlaskyZastavkyDto"];
export type LodNaZastavce = S["LodNaZastavceDto"];
export type NovaLod = S["NovaLodVstup"];
// Stav lodi je v dokumentu nepovinný — loď ročníku na regatě být nemusí.
// Jako klíč slovníku ale prázdný být nesmí.
export type StavUcasti = NonNullable<S["StavUcasti"]>;

/**
 * Stav lodi na regatě: co znamená a co udělá tlačítko, které do něj vede.
 * Štítek popisuje, jak to je; tlačítko, co se stane.
 *
 * <c>Record</c> je naschvál: nový stav v modelu shodí překlad webu, ne až
 * prázdné tlačítko na stránce.
 */
export const STAVY_UCASTI: Record<StavUcasti, { stitek: string; tlacitko: string; popis: string }> = {
  // Původní tři hodnoty API mají stará jména; na obrazovce platí nová
  // (plán, oddíl Veřejné přihlášky lodí).
  Prihlasena: {
    stitek: "zapsaná",
    tlacitko: "Zapsat",
    popis: "Přihláška přijata, prezence ještě nebyla. Na webu je s poznámkou.",
  },
  Potvrzena: {
    stitek: "potvrzená",
    tlacitko: "Potvrdit prezenci",
    popis: "Loď je na místě a startuje. Na webu je bez poznámky.",
  },
  Zrusena: {
    stitek: "odhlášená",
    tlacitko: "Odhlásit",
    popis: "Loď předem odřekla. Na webu ji nikdo neuvidí.",
  },
  Pozadavek: {
    stitek: "požadavek",
    tlacitko: "Požadavek",
    popis: "Přihláška z webu, kterou ještě nikdo neviděl. Na webu není.",
  },
  KDoplneni: {
    stitek: "k doplnění",
    tlacitko: "Vrátit k doplnění",
    popis: "Něco chybí nebo nesedí; kapitán to má doplnit. Na webu není.",
  },
  Odmitnuta: {
    stitek: "odmítnutá",
    tlacitko: "Odmítnout",
    popis: "Přihláška nepřijata. Na webu není. Nesmysl raději smaž.",
  },
  Nedostavila: {
    stitek: "nedostavila se",
    tlacitko: "Nedostavila se",
    popis: "Byla zapsaná, ale nepřijela. Na webu není.",
  },
  Vyloucena: {
    stitek: "vyloučená",
    tlacitko: "Vyloučit",
    // Důvod je interní: veřejné `LodNaZavodeDto` nese jen `vyloucena`,
    // žádný text. „Protest přijat" taky není věta na web.
    popis: "Vyloučená ze závodu rozhodčím. Na webu je štítek, důvod ne.",
  },
};

/**
 * Co stojí v `?potvrdit=` místo id přihlášky, když se potvrzuje nová loď.
 * Id nemá — ještě neexistuje — a obrazovka přitom musí poznat, který
 * formulář po potvrzení odeslat. Bydlí tady, a ne u serverových akcí:
 * soubor s `"use server"` smí vyvážet jen asynchronní funkce a konstanta
 * v něm shodí celý modul (16. 10. 2026).
 */
export const NOVA = "nova";

/** Stejné pravidlo jako `Prihlasky.PotrebujeDuvod` v API: tyhle přechody chtějí napsat proč. */
export const potrebujeDuvod = (na: StavUcasti) =>
  na === "KDoplneni" || na === "Odmitnuta" || na === "Vyloucena";

/** Kde loď na obrazovce stojí: čeká na pořadatele, jede, nebo je mimo závod. */
export const skupinaStavu = (stav: StavUcasti): "ceka" | "jede" | "mimo" =>
  stav === "Pozadavek" || stav === "KDoplneni"
    ? "ceka"
    : stav === "Prihlasena" || stav === "Potvrzena" || stav === "Vyloucena"
      ? "jede"
      : "mimo";

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
  if (odpoved.status === 403) return "Přihlášky na tuhle regatu spravuje její pořadatel.";
  if (odpoved.status === 404) return "Loď, regata nebo ročník neexistuje.";
  return `API odpovědělo ${odpoved.status}.`;
}

const kam = (serie: string, zavod: string, cesta = "") =>
  `${API}/sprava/serie/${encodeURIComponent(serie)}/zastavky/${encodeURIComponent(zavod)}/lode${cesta}`;

export async function nactiPrihlasky(
  serie: string,
  zavod: string,
): Promise<{ stav: Stav; data?: PrihlaskyZastavky }> {
  const t = await token();
  if (!t) return { stav: "neprihlasen" };

  let odpoved: Response;
  try {
    odpoved = await fetch(kam(serie, zavod), {
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      // Odpověď závisí na tom, kdo se ptá, a mění se po každém zápisu.
      cache: "no-store",
    });
  } catch {
    return { stav: "vypadek" };
  }

  if (odpoved.status === 401) return { stav: "odmitnut" };
  if (odpoved.status === 403) return { stav: "nesmi" };
  if (odpoved.status === 404) return { stav: "neni" };
  if (!odpoved.ok) return { stav: "vypadek" };

  return { stav: "ok", data: (await odpoved.json()) as PrihlaskyZastavky };
}

/** Přihlásí loď z ročníku, nebo novou. <c>nova</c> je false, když už přihlášená byla. */
export async function prihlas(
  serie: string,
  zavod: string,
  vstup: { prihlaskaId: number } | { novaLod: NovaLod },
  /**
   * Vím, že výsledky jsou venku, a chci loď přidat i tak. Server se na
   * to ptá 409, protože přidáním se mění počet přihlášených, ze kterého
   * se počítají body za kódy a za neúčast.
   */
  potvrzeno = false,
  /**
   * Kapitán pořadateli potvrdil souhlas s pravidly a vlastním nebezpečím
   * (nález R9, 28. 10. 2026). <b>Nevynucuje se</b>: na veřejném formuláři
   * ho dává kapitán sám, tady ho pořadatel jen zaznamenává za něj — a loď,
   * která se domluví telefonem na startu, se zapsat musí i bez něj.
   */
  souhlas = false,
): Promise<{ chyba: string; potvrdit?: boolean } | { lod: LodNaZastavce; nova: boolean }> {
  const odpoved = await posli(kam(serie, zavod), { ...vstup, potvrzeno, souhlas });
  if (typeof odpoved === "string") return { chyba: odpoved };
  if (!odpoved.ok)
    return { chyba: await hlaska(odpoved), potvrdit: odpoved.status === 409 };

  return { lod: (await odpoved.json()) as LodNaZastavce, nova: odpoved.status === 201 };
}

export async function prepniLod(
  serie: string,
  zavod: string,
  prihlaskaId: number,
  stav: StavUcasti,
  duvod?: string,
): Promise<string | null> {
  const odpoved = await posli(kam(serie, zavod, `/${prihlaskaId}/stav`), { stav, duvod });
  if (typeof odpoved === "string") return odpoved;

  return odpoved.ok ? null : await hlaska(odpoved);
}

export async function zapisStartovne(
  serie: string,
  zavod: string,
  prihlaskaId: number,
  zaplaceno: boolean,
  poznamka?: string,
): Promise<string | null> {
  const odpoved = await posli(kam(serie, zavod, `/${prihlaskaId}/startovne`), { zaplaceno, poznamka });
  if (typeof odpoved === "string") return odpoved;
  return odpoved.ok ? null : await hlaska(odpoved);
}

/** Smaže nesmyslnou přihlášku z webu, i s lodí a osobou, které vznikly jen kvůli ní. */
export async function smazPrihlasku(serie: string, zavod: string, prihlaskaId: number): Promise<string | null> {
  const odpoved = await posli(kam(serie, zavod, `/${prihlaskaId}`), undefined, "DELETE");
  if (typeof odpoved === "string") return odpoved;
  return odpoved.ok ? null : await hlaska(odpoved);
}

/** Odpověď API, nebo hláška, když se k němu vůbec nedošlo. */
async function posli(adresa: string, telo: unknown, metoda = "POST"): Promise<Response | string> {
  const t = await token();
  if (!t) return "Přihlášení vypršelo. Přihlas se prosím znovu.";

  try {
    return await fetch(adresa, {
      method: metoda,
      headers: {
        authorization: `Bearer ${t}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: telo === undefined ? undefined : JSON.stringify(telo),
      cache: "no-store",
    });
  } catch {
    return "API se nedaří zavolat.";
  }
}
