import { tokenZeSezeni } from "@/lib/oidc";
import type { components } from "./schema";
import type { Stav } from "@/lib/sprava";

/**
 * Volání workflow výsledků. Vedle `lib/kalendar.ts`: ta je o termínech,
 * tahle o tom, kdo za čísla ručí a smí je vidět veřejnost.
 *
 * <b>Token zůstává na serveru.</b> Leží v cookie, kterou prohlížeč jen vozí
 * s sebou; do stránky se nikdy nevypisuje.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

type S = components["schemas"];

export type PrehledVysledku = S["PrehledVysledkuDto"];
export type RozjizdkaRadek = S["RozjizdkaSpravaRadek"];
export type ZastavkaVysledky = S["ZastavkaVysledkyDto"];
export type StavVysledku = S["StavVysledku"];
export type ZapisRozjizdky = S["ZapisRozjizdkyDto"];
export type ZapisLod = S["ZapisLodDto"];
export type ZapisRadek = S["ZapisRadekVstup"];
// Dokument popisuje kód včetně `null`, protože u výsledku je nepovinný.
// Jako klíč slovníku a hodnota v nabídce ale prázdný být nesmí.
export type KodVysledku = NonNullable<S["KodVysledku"]>;

/**
 * Kódy závodních pravidel tak, jak je čte pořadatel. Zkratka se nepřekládá
 * — stojí tak na papíře z cíle — ale co znamená, se hodí mít vedle.
 *
 * Pořadí je podle toho, jak často se na vodě stávají, ne podle závažnosti:
 * v rozbalovátku se hledá `DNF`, ne `RDG`.
 */
export const KODY: Record<KodVysledku, string> = {
  Dnf: "nedokončila",
  Dns: "nestartovala",
  Ret: "odstoupila",
  Ocs: "předčasný start",
  Dsq: "diskvalifikace",
  Dnc: "nezúčastnila se",
  Rdg: "náprava",
};

/**
 * Stav zápisu: co znamená a co udělá tlačítko, které do něj vede.
 *
 * <b>Štítek popisuje, jak to je; tlačítko, co se stane.</b> „Ověřeno" na
 * obojím by znamenalo, že se nedá poznat, jestli výsledky ověřené jsou,
 * nebo se ověřit teprve mají.
 *
 * <c>Record</c> je naschvál: nový stav v modelu shodí překlad webu, ne až
 * prázdné tlačítko na stránce.
 */
export const STAVY: Record<StavVysledku, { stitek: string; tlacitko: string; popis: string }> = {
  Navrzeno: {
    stitek: "navrženo",
    tlacitko: "Vrátit do návrhu",
    popis: "Zapsáno, nikdo to ještě nekontroloval.",
  },
  Overeno: {
    stitek: "ověřeno",
    tlacitko: "Ověřit",
    popis: "Čísla sedí s papírem z vody.",
  },
  Schvaleno: {
    stitek: "schváleno",
    tlacitko: "Schválit",
    popis: "Protesty vyřízené, pořadí platí.",
  },
  Potvrzeno: {
    stitek: "potvrzeno",
    tlacitko: "Potvrdit",
    popis: "Konečné. Dál se needituje.",
  },
  KRevizi: {
    stitek: "k revizi",
    tlacitko: "Vrátit k revizi",
    popis: "Vrátit zpátky s důvodem, co je špatně.",
  },
  Eliminovano: {
    stitek: "eliminováno",
    tlacitko: "Eliminovat",
    popis: "Rozjížďka neplatí nikde — ani v závodě, ani v poháru.",
  },
};

export const nazevStavu = (stav: StavVysledku) => STAVY[stav].stitek;

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
  if (odpoved.status === 403) return "Na tenhle krok ve workflow nemáš práva.";
  if (odpoved.status === 404) return "Rozjížďka, zastávka nebo ročník neexistuje.";
  return `API odpovědělo ${odpoved.status}.`;
}

const kam = (serie: string, cesta = "") =>
  `${API}/sprava/serie/${encodeURIComponent(serie)}/vysledky${cesta}`;

async function cti<T>(adresa: string): Promise<{ stav: Stav; data?: T }> {
  const t = await token();
  if (!t) return { stav: "neprihlasen" };

  let odpoved: Response;
  try {
    odpoved = await fetch(adresa, {
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

  return { stav: "ok", data: (await odpoved.json()) as T };
}

export const nactiZastavky = (serie: string) =>
  cti<ZastavkaVysledky[]>(kam(serie));

export const nactiRozjizdky = (serie: string, zavod: string) =>
  cti<PrehledVysledku>(kam(serie, `/${encodeURIComponent(zavod)}`));

export async function prepniStav(
  serie: string,
  zavod: string,
  cislo: number,
  stav: StavVysledku,
  duvod?: string,
): Promise<string | null> {
  return zapis(kam(serie, `/${encodeURIComponent(zavod)}/rozjizdky/${cislo}/stav`), {
    stav,
    duvod,
  });
}

export const nactiZapis = (serie: string, zavod: string, cislo: number) =>
  cti<ZapisRozjizdky>(kam(serie, `/${encodeURIComponent(zavod)}/rozjizdky/${cislo}`));

/** Celá sada výsledků rozjížďky. Loď, která v ní nemá pořadí ani kód, výsledek nemá. */
export async function ulozZapis(
  serie: string,
  zavod: string,
  cislo: number,
  radky: ZapisRadek[],
): Promise<string | null> {
  return zapis(
    kam(serie, `/${encodeURIComponent(zavod)}/rozjizdky/${cislo}/vysledky`),
    { radky },
    "PUT",
  );
}

/** Přidá rozjížďku a vrátí její číslo — obrazovka pak jde rovnou na její zápis. */
export async function pridejRozjizdku(
  serie: string,
  zavod: string,
): Promise<{ chyba: string } | { cislo: number }> {
  const odpoved = await posli(kam(serie, `/${encodeURIComponent(zavod)}/rozjizdky`), {}, "POST");

  if (typeof odpoved === "string") return { chyba: odpoved };
  if (!odpoved.ok) return { chyba: await hlaska(odpoved) };

  return { cislo: ((await odpoved.json()) as RozjizdkaRadek).cislo };
}

export async function publikuj(
  serie: string,
  zavod: string,
  cislo: number,
  publikovano: boolean,
): Promise<string | null> {
  return zapis(kam(serie, `/${encodeURIComponent(zavod)}/rozjizdky/${cislo}/publikace`), {
    publikovano,
  });
}

/** Zápisy vracejí jen „povedlo se, nebo proč ne". */
async function zapis(
  adresa: string,
  telo: unknown,
  metoda: "POST" | "PUT" = "POST",
): Promise<string | null> {
  const odpoved = await posli(adresa, telo, metoda);
  if (typeof odpoved === "string") return odpoved;

  return odpoved.ok ? null : await hlaska(odpoved);
}

/** Odpověď API, nebo hláška, když se k němu vůbec nedošlo. */
async function posli(
  adresa: string,
  telo: unknown,
  metoda: "POST" | "PUT",
): Promise<Response | string> {
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
      body: JSON.stringify(telo),
      cache: "no-store",
    });
  } catch {
    return "API se nedaří zavolat.";
  }
}
