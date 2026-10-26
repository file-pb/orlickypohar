import { tokenZeSezeni } from "@/lib/oidc";
import type { Stav } from "@/lib/sprava";
import type { components } from "./schema";
import type { ZpravaRegaty } from "@/lib/api";

/**
 * Co pořadatel a rozhodčí nastavují kolem trackingu: <b>okno závodního dne,
 * co je vidět, a telefony na palubě</b>.
 *
 * <b>Proč jeden modul.</b> Je to jedna obrazovka a tři otázky téhož dne:
 * *jede se?* (okno), *kdo to uvidí?* (nastavení), *hlásí se všichni?*
 * (klíče). Rozdělit to po endpointech by znamenalo tři soubory, které se
 * vždycky mění spolu.
 *
 * <b>Oprávnění je u všech tří stejné</b> — pořadatel té regaty, nebo
 * rozhodčí ročníku —, a je to totéž, co pustí živé polohy
 * (`PolohyEndpoints.SmiAsync`). Nastavení má navíc zámek: po rozpravě s ním
 * hýbe jen rozhodčí a jen směrem k přísnějšímu.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

export type Okno = components["schemas"]["OknoDto"];
export type Nastaveni = components["schemas"]["NastaveniDto"];
export type CoVidiPosadky = components["schemas"]["CoVidiPosadky"];
export type Klic = components["schemas"]["KlicDto"];
/** Druh zprávy na vývěsce — podle něj se liší barva na tabuli. */
export type DruhZpravy = ZpravaRegaty["druh"];

/**
 * Klíče jedné lodi v poli. Píše se ručně, protože v nasazeném API ještě
 * není — generovaný tvar ho nahradí, až se typy přegenerují.
 */
export type KliceLodi = {
  lodId: number;
  lod: string;
  cisloPlachty: string | null;
  klice: Klic[];
};

/** Jak se jmenuje, co posádky uvidí. Pořadí od nejpřísnějšího. */
export const NAZVY_VIDENI: Record<CoVidiPosadky, string> = {
  Nic: "nic — ani sebe",
  JenSebe: "jen sebe",
  IOstatni: "i ostatní lodě",
};

async function zavolej<T>(
  cesta: string,
  volby: RequestInit = {},
): Promise<{ stav: Stav; data?: T; chyba?: string }> {
  const t = await tokenZeSezeni();
  if (!t) return { stav: "neprihlasen" };

  let odpoved: Response;
  try {
    odpoved = await fetch(`${API}${cesta}`, {
      ...volby,
      headers: { authorization: `Bearer ${t}`, accept: "application/json", ...volby.headers },
      cache: "no-store",
    });
  } catch {
    return { stav: "vypadek" };
  }

  if (odpoved.status === 401) return { stav: "odmitnut" };
  if (odpoved.status === 403) return { stav: "nesmi" };
  if (odpoved.status === 404) return { stav: "neni" };

  // 409 nese důvod, proč zásah neprošel — „zamčené nastavení jde jen
  // zpřísnit" je odpověď pro člověka, ne porucha.
  if (odpoved.status === 409) {
    const telo = (await odpoved.json().catch(() => null)) as { error?: string } | null;
    return { stav: "vypadek", chyba: telo?.error ?? "Zásah neprošel." };
  }
  if (!odpoved.ok) return { stav: "vypadek" };

  const prazdna = odpoved.status === 204;
  return { stav: "ok", data: prazdna ? undefined : ((await odpoved.json()) as T) };
}

const cesta = (serie: string, zavod: string) =>
  `/sprava/serie/${encodeURIComponent(serie)}/zastavky/${encodeURIComponent(zavod)}`;

export const nactiOkna = (serie: string, zavod: string) =>
  zavolej<Okno[]>(`${cesta(serie, zavod)}/okna`);

/**
 * Rozpravou se otevře okno závodního dne. <b>Od téhle chvíle smí telefony
 * zaznamenávat</b> — bez okna server trasu nevezme.
 *
 * Druhá rozprava druhé okno nezaloží; na vodě se klikne dvakrát spíš než
 * vůbec.
 */
export const rozprava = (serie: string, zavod: string, trvaniHodin: number | null) =>
  zavolej<Okno>(`${cesta(serie, zavod)}/okna/rozprava`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ trvaniHodin }),
  });

/** Konec závodního dne. Mezi dny se nesleduje. */
export const uzavri = (serie: string, zavod: string) =>
  zavolej<Okno>(`${cesta(serie, zavod)}/okna/uzavrit`, { method: "POST" });

/**
 * Vývěska regaty ve správě — <b>včetně stažených</b>, aby šlo dohledat,
 * co na tabuli stálo. Tabule si bere jen platné, vlastní veřejnou cestou.
 */
export const nactiZpravySpravy = (serie: string, zavod: string) =>
  zavolej<ZpravaRegaty[]>(`${cesta(serie, zavod)}/zpravy`);

export const vydejZpravu = (
  serie: string,
  zavod: string,
  vstup: { text: string; druh: DruhZpravy; platiHodin: number | null },
) =>
  zavolej<ZpravaRegaty>(`${cesta(serie, zavod)}/zpravy`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(vstup),
  });

/** Stažení je odvolání, ne smazání: řádek i historie zůstávají. */
export const stahniZpravu = (serie: string, zavod: string, id: number) =>
  zavolej<ZpravaRegaty>(`${cesta(serie, zavod)}/zpravy/${id}/stahnout`, { method: "POST" });

export const nactiNastaveni = (serie: string, zavod: string) =>
  zavolej<Nastaveni>(`${cesta(serie, zavod)}/tracker/nastaveni`);

export const ulozNastaveni = (
  serie: string,
  zavod: string,
  vstup: {
    coVidiPosadky: CoVidiPosadky;
    zivyPrenosVen: boolean;
    jizdyPoRegateVerejne: boolean;
    duvod: string | null;
  },
) =>
  zavolej<Nastaveni>(`${cesta(serie, zavod)}/tracker/nastaveni`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(vstup),
  });

export const nactiKliceRegaty = (serie: string, zavod: string) =>
  zavolej<KliceLodi[]>(`${cesta(serie, zavod)}/klice`);

/** Odepne telefon ze sledování, nebo ho zase připne. Vratné. */
export const prepniSledovaniVRegate = (
  serie: string,
  zavod: string,
  klic: number,
  sleduje: boolean,
) =>
  zavolej<void>(`${cesta(serie, zavod)}/klice/${klic}/sledovani`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sleduje }),
  });

/** Odebere klíč natrvalo. Telefon se bude muset spárovat znovu. */
export const odeberKlicVRegate = (serie: string, zavod: string, klic: number) =>
  zavolej<void>(`${cesta(serie, zavod)}/klice/${klic}`, { method: "DELETE" });

/** Hláška ke stavu, ať ji neskládá každá obrazovka zvlášť. */
export function procNejde(stav: Stav, chyba?: string): string {
  if (chyba) return chyba;

  switch (stav) {
    case "neprihlasen":
    case "odmitnut":
      return "Přihlášení vypršelo. Přihlas se prosím znovu.";
    case "nesmi":
      return "Tohle nastavuje pořadatel téhle regaty nebo rozhodčí ročníku.";
    case "neni":
      return "Tahle regata neexistuje.";
    default:
      return "Nepovedlo se spojit s API.";
  }
}
