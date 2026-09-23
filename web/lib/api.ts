// Tenký typovaný přístup k API. Tvary typů se generují z OpenAPI, samotné
// načítání zůstává ruční: web ho potřebuje s cachí Nextu, appka bez ní,
// a je to pět řádků.

import type { components } from "./schema";

const API = process.env.API_URL ?? "http://localhost:8080";

// Typy nejsou psané rukou — generuje je `packages/api-client/generuj.sh`
// z OpenAPI dokumentu API do `schema.d.ts`. Tady se jen pojmenují, aby se
// v kódu psalo `SerieDetail` a ne `components["schemas"]["SerieDetailDto"]`.
type S = components["schemas"];

export type SerieShrnuti = S["SerieShrnutiDto"];
export type Kategorie = S["KategorieDto"];
export type StavZavodu = S["StavZavodu"];
export type ZavodShrnuti = S["ZavodShrnutiDto"];
export type Prihlaska = S["PrihlaskaDto"];
export type SerieDetail = S["SerieDetailDto"];
export type KodVysledku = S["KodVysledku"];
export type Vysledek = S["VysledekDto"];
export type Rozjizdka = S["RozjizdkaDto"];
export type BodyVRozjizdce = S["BodyVRozjizdceDto"];
export type VysledekZavodu = S["VysledekZavoduDto"];
export type UcastLodi = S["UcastDto"];
// `vysledkySkryte` je dopsané ručně, protože `schema.d.ts` se generuje
// z běžícího API (packages/api-client/generuj.sh) a nová vlastnost je zatím
// jen v tomhle repozitáři, ne na produkci, odkud se dokument stahuje.
// **Po prvním nasazení a přegenerování schématu tenhle průnik zmizí** —
// vlastnost přijde ze schématu jako všechny ostatní.
export type ZavodDetail = S["ZavodDetailDto"] & { vysledkySkryte?: boolean };
export type Zastavka = S["ZastavkaDto"];
export type PoradiLodi = S["PoradiLodiDto"];
export type PoradiKategorie = S["PoradiKategorieDto"];
export type PoradiSerie = S["PoradiSerieDto"];
export type ClanekShrnuti = S["ClanekShrnutiDto"];
// `format` je dopsaný ručně ze stejného důvodu jako typ níž — schéma se
// generuje z produkce, kde sloupec zatím není.
export type Clanek = S["ClanekDto"] & { format?: FormatClanku };

/**
 * V jakém tvaru je tělo článku. Psané ručně, protože `schema.d.ts` se
 * generuje z běžícího API a sloupec je zatím jen v repozitáři, ne na
 * produkci, odkud se dokument stahuje. **Po nasazení a přegenerování
 * schématu tenhle typ nahradí `S["FormatClanku"]`.**
 */
export type FormatClanku = "Text" | "Html" | "Bloky";

/** Kus textu v jednom stylu. Odkaz je absolutní http(s) nebo mailto. */
export type Usek = {
  text: string;
  tucne?: boolean;
  kurziva?: boolean;
  odkaz?: string | null;
};

/**
 * Blok těla článku. Vzniká na serveru z vloženého HTML
 * (`Features/Clanky/Bloky.cs`) a je to **úzká množina** — co se do ní
 * nevejde, server zahodil.
 *
 * Web ho vykresluje vlastními komponentami, nikdy `dangerouslySetInnerHTML`:
 * proto se do stránky nemůže dostat cizí značka, ani kdyby se server spletl.
 */
export type Blok = {
  druh: "Odstavec" | "Nadpis" | "Seznam" | "Obrazek";
  useky?: Usek[];
  uroven?: number;
  polozky?: Usek[][];
  cislovany?: boolean;
  adresa?: string;
  popis?: string;
};

/**
 * Přečte tělo uložené jako bloky. Nečitelné vrátí prázdné — článek
 * s rozbitým tělem se má ukázat bez něj, ne shodit stránku.
 */
export function bloky(telo: string): Blok[] {
  try {
    const rozebrane: unknown = JSON.parse(telo);
    return Array.isArray(rozebrane) ? (rozebrane as Blok[]) : [];
  } catch {
    return [];
  }
}

/**
 * Novinka přejatá z cizího kanálu (dnes Český svaz jachtingu). Nemá slug ani
 * tělo — u nás nemá vlastní stránku a vede rovnou ke zdroji.
 *
 * Tvar je psaný ručně, protože `schema.d.ts` se generuje z běžícího API
 * (packages/api-client/generuj.sh) a endpoint je zatím jen v repozitáři, ne
 * na produkci, odkud se dokument stahuje. **Po nasazení a přegenerování
 * schématu tenhle typ nahradí `S["PrevzatyClanekDto"]`.**
 */
export type PrevzatyClanek = {
  titulek: string;
  perex: string | null;
  publikovanoV: string;
  odkaz: string;
  zdroj: string;
  zdrojOdkaz: string;
  obrazek: string | null;
};

/**
 * Chyba, která znamená **nedostupné API**, ne chybějící obsah.
 *
 * Rozdíl je pro návštěvníka podstatný: „stránka neexistuje" u výpadku je
 * lež, která ho pošle pryč, místo aby to za chvíli zkusil znovu.
 */
export class ApiNedostupne extends Error {}

/** Vrací null u 404 — nepublikovaný ročník se chová, jako by neexistoval. */
async function nacti<T>(cesta: string): Promise<T | null> {
  let odpoved: Response;
  try {
    // Výsledky se mění po závodě, ne po vteřinách. Minuta je kompromis mezi
    // čerstvostí a tím, aby stránka nešla na API při každém načtení.
    odpoved = await fetch(`${API}${cesta}`, {
      next: { revalidate: 60 },
      headers: { accept: "application/json" },
    });
  } catch (e) {
    throw new ApiNedostupne(`API ${cesta} se nepodařilo zavolat: ${e}`);
  }

  if (odpoved.status === 404) return null;
  if (!odpoved.ok) throw new ApiNedostupne(`API ${cesta} vrátilo ${odpoved.status}`);
  return (await odpoved.json()) as T;
}

export const nactiSerie = () => nacti<SerieShrnuti[]>("/serie");
export const nactiSerii = (slug: string) => nacti<SerieDetail>(`/serie/${slug}`);
export const nactiZavod = (serie: string, zavod: string) =>
  nacti<ZavodDetail>(`/serie/${serie}/zavody/${zavod}`);
export const nactiPoradi = (slug: string) => nacti<PoradiSerie>(`/serie/${slug}/poradi`);

/**
 * Novinky ročníku, od nejnovější. `zavod` zúží výpis na jednu regatu,
 * `limit` na daný počet — úvodní stránka chce tři a nemá důvod stahovat
 * celý blog.
 */
export const nactiClanky = (
  slug: string,
  kde: { zavod?: string; limit?: number } = {},
) => {
  const dotaz = new URLSearchParams();
  if (kde.zavod) dotaz.set("zavod", kde.zavod);
  if (kde.limit) dotaz.set("limit", String(kde.limit));
  const konec = dotaz.size ? `?${dotaz}` : "";
  return nacti<ClanekShrnuti[]>(`/serie/${slug}/clanky${konec}`);
};

export const nactiClanek = (slug: string, clanek: string) =>
  nacti<Clanek>(`/serie/${slug}/clanky/${clanek}`);

/** Obecné články mimo ročník (od 22. 9. 2026), od nejnovějšího. */
export const nactiObecneClanky = (limit?: number) =>
  nacti<ClanekShrnuti[]>(`/clanky${limit ? `?limit=${limit}` : ""}`);

export const nactiObecnyClanek = (clanek: string) => nacti<Clanek>(`/clanky/${clanek}`);

/** Novinky ze svazu, od nejnovější. Drží se jich nejvýš osm. */
export const nactiPrevzateClanky = (limit?: number) =>
  nacti<PrevzatyClanek[]>(`/prevzate-clanky${limit ? `?limit=${limit}` : ""}`);

/**
 * Novinka ve výpisu i s adresou, kam vede — ročníková, obecná, nebo přejatá.
 *
 * `zdroj` a `vnejsi` má jen přejatá: `vnejsi` říká kartě, že odkaz vede pryč
 * z webu (otevře se v nové kartě), `zdroj` je štítek, kterým se přiznává,
 * odkud text je. Bez obojího bychom podmínku, za které se smí přebírat,
 * nesplnili.
 */
export type Novinka = Omit<ClanekShrnuti, "slug"> & {
  slug: string;
  adresa: string;
  vnejsi?: boolean;
  zdroj?: string;
  /** Adresa fotky u zdroje. Rozměry k ní neznáme, proto není `obrazek`. */
  fotkaZdroje?: string;
};

/**
 * Novinky ročníku a obecné články dohromady, od nejnovější. Obecné se
 * vmíchávají všude, kde je výpis novinek — mají být vidět, ne schované
 * na vlastní stránce, kterou nikdo nenajde. `slug` prázdný vrátí jen obecné
 * (úvodní stránka bez ročníku).
 */
/**
 * **Jen náš vlastní obsah** — články ročníku a obecné, nic přejatého.
 *
 * Je to pojmenovaná hranice, ne jen mezikrok: náš RSS kanál smí vydávat
 * právě tohle. Přeposílat cizí články dál nám nikdo nedovolil, povolení
 * od svazu je na zobrazení s odkazem (Filip, 23. 9. 2026).
 */
export async function nactiVlastniNovinky(
  slug: string | null,
  limit?: number,
): Promise<Novinka[] | null> {
  const [rocnik, obecne] = await Promise.all([
    slug ? nactiClanky(slug, { limit }) : Promise.resolve([] as ClanekShrnuti[]),
    nactiObecneClanky(limit),
  ]);
  if (rocnik === null && obecne === null) return null;

  return [
    ...(rocnik ?? []).map((c) => ({ ...c, adresa: `/serie/${slug}/novinky/${c.slug}` })),
    ...(obecne ?? []).map((c) => ({ ...c, adresa: `/novinky/${c.slug}` })),
  ].sort((a, b) => Date.parse(b.publikovanoV) - Date.parse(a.publikovanoV));
}

export async function nactiNovinky(slug: string | null, limit?: number): Promise<Novinka[] | null> {
  const [nase, prevzate] = await Promise.all([
    nactiVlastniNovinky(slug, limit),
    // Výpadek novinek ze svazu nesmí shodit výpis našich — jsou to doplněk,
    // ne obsah, kvůli kterému sem čtenář přišel.
    nactiPrevzateClanky(limit).catch(() => [] as PrevzatyClanek[]),
  ]);
  if (nase === null) return null;

  const vsechny: Novinka[] = [
    ...nase,
    // Přejaté se mezi naše míchají, ne řadí pod ně: jde o to, aby výpis byl
    // plný i v zimě, kdy se nic nejede (Filip, 23. 9. 2026). Slug slouží jen
    // jako klíč seznamu a jako zdroj dekorační fotky — stránku u nás nemají.
    ...(prevzate ?? []).map((c) => ({
      slug: c.odkaz,
      titulek: c.titulek,
      perex: c.perex,
      publikovanoV: c.publikovanoV,
      autor: null,
      obrazek: null,
      // Fotka od zdroje jde vlastním polem, ne jako `obrazek`: ten popisuje
      // naši nahranou fotku včetně rozměrů, a ty u cizí adresy neznáme.
      // Vymyslet si je jen kvůli typu by byla lež v datech.
      fotkaZdroje: c.obrazek ?? undefined,
      zavod: null,
      zavodNazev: null,
      adresa: c.odkaz,
      vnejsi: true,
      zdroj: c.zdroj,
    })),
  // Podle času, ne podle textu: API vydává čas s posunem a „+02:00"
  // proti „Z" by se textově řadilo špatně.
  ].sort((a, b) => Date.parse(b.publikovanoV) - Date.parse(a.publikovanoV));

  return limit ? vsechny.slice(0, limit) : vsechny;
}
