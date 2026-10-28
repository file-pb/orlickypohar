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
export type StavRozjizdky = S["StavRozjizdky"];
export type BodyVRozjizdce = S["BodyVRozjizdceDto"];
export type VysledekZavodu = S["VysledekZavoduDto"];
export type UcastLodi = S["UcastDto"];
export type ZavodDetail = S["ZavodDetailDto"];
export type Zastavka = S["ZastavkaDto"];
export type PoradiLodi = S["PoradiLodiDto"];
export type PoradiKategorie = S["PoradiKategorieDto"];
export type PoradiSerie = S["PoradiSerieDto"];
export type ClanekShrnuti = S["ClanekShrnutiDto"];
export type Clanek = S["ClanekDto"];

/** V jakém tvaru je tělo článku. */
export type FormatClanku = S["FormatClanku"];

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
 */
export type PrevzatyClanek = S["PrevzatyClanekDto"];

/**
 * Chyba, která znamená **nedostupné API**, ne chybějící obsah.
 *
 * Rozdíl je pro návštěvníka podstatný: „stránka neexistuje" u výpadku je
 * lež, která ho pošle pryč, místo aby to za chvíli zkusil znovu.
 */
export class ApiNedostupne extends Error {}

/**
 * Vrací null u 404 — nepublikovaný ročník se chová, jako by neexistoval.
 *
 * <b>`cerstve` vypne minutovou cache.</b> Pro čtení, kde minuta není
 * kompromis, ale chyba: tabule v hospodě hlásí dojezdy, jak padají, takže
 * minutu stará odpověď znamená minutu staré pořadí (Filip, 20. 10. 2026:
 * *„ten modal po dojetí lodě přišel později… ten by měl přijít ihned po
 * projetí cílem"*). Mikrocache před webem drží tutéž odpověď deset vteřin
 * pro celou hospodu, takže API to nezatíží.
 */
async function nacti<T>(cesta: string, cerstve = false): Promise<T | null> {
  let odpoved: Response;
  try {
    // Výsledky se mění po závodě, ne po vteřinách. Minuta je kompromis mezi
    // čerstvostí a tím, aby stránka nešla na API při každém načtení.
    odpoved = await fetch(`${API}${cesta}`, {
      ...(cerstve ? { cache: "no-store" as const } : { next: { revalidate: 60 } }),
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

/** Trať pro diváka. `null` znamená „zatím není zveřejněná", ne chybu. */
export type VerejnaTrat = components["schemas"]["VerejnaTratDto"];

/**
 * Trať regaty, jakmile ji rozhodčí přijal.
 *
 * <b>Minutová cache je tu málo.</b> Ostatní veřejná čtení se mění po
 * závodě; trať se mění **při přestavbě, tedy za provozu** — a dokud stránka
 * ukazuje starou, pluje podle ní někdo k bóji, která se mezitím posunula.
 * Proto se čte bez cache; mikrocache před webem ji stejně podrží deset
 * vteřin pro všechny naráz.
 */
export async function nactiVerejnouTrat(
  serie: string,
  zavod: string,
  /**
   * Rozjížďka, jejíž trať se má vydat. Bez ní API vydá tu na řadě.
   * <b>Neznámé číslo vrací 404</b>, tedy `null` — a to je správně: trať
   * jiné rozjížďky by diváka tiše poslala na špatnou vodu.
   */
  rozjizdka?: number,
): Promise<VerejnaTrat | null> {
  const cesta =
    `/serie/${encodeURIComponent(serie)}/zavody/${encodeURIComponent(zavod)}/trat` +
    (rozjizdka ? `?rozjizdka=${rozjizdka}` : "");

  let odpoved: Response;
  try {
    odpoved = await fetch(`${API}${cesta}`, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
  } catch (e) {
    throw new ApiNedostupne(`API ${cesta} se nepodařilo zavolat: ${e}`);
  }

  if (odpoved.status === 404) return null;
  if (!odpoved.ok) throw new ApiNedostupne(`API ${cesta} vrátilo ${odpoved.status}`);
  return (await odpoved.json()) as VerejnaTrat;
}
/**
 * Vypsání závodu — dokument podle Dodatku J1 ZPJ (nálezy R1 a R8
 * oponentury rozhodčího, 28. 10. 2026).
 */
export type BodVypsani = S["BodVypsani"];
export type VypsaniZavodu = S["VypsaniDto"];

/**
 * Vypsání jedné regaty. `null` u komunitní akce a u regaty, která není
 * veřejná — jako ostatní veřejná čtení.
 */
export const nactiVypsani = (serie: string, zavod: string) =>
  nacti<VypsaniZavodu>(
    `/serie/${encodeURIComponent(serie)}/zavody/${encodeURIComponent(zavod)}/vypsani`);

export const nactiSerii = (slug: string) => nacti<SerieDetail>(`/serie/${slug}`);
export const nactiZavod = (serie: string, zavod: string, cerstve = false) =>
  nacti<ZavodDetail>(`/serie/${serie}/zavody/${zavod}`, cerstve);
/**
 * Zprávy vydané k regatě — vývěska, kterou plní pořadatel během dne.
 * Veřejné, bez tokenu: čte je tabule v hospodě, kde není přihlášený nikdo.
 */
export type ZpravaRegaty = {
  id: number;
  text: string;
  druh: "Informace" | "Program" | "Vystraha";
  vydanoV: string;
  platiDo: string | null;
  stazenoV: string | null;
};

export const nactiZpravy = (serie: string, zavod: string) =>
  nacti<ZpravaRegaty[]>(`/serie/${serie}/zavody/${zavod}/zpravy`);

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
  /**
   * Adresa fotky u zdroje. Rozměry k ní neznáme, proto není `obrazek`.
   * Používá se, jen když nemáme vlastní kopii (API ji vydává v `fotka`).
   */
  fotkaZdroje?: string;
  /** Malé logo zdroje ke štítku. Soubor ve webu, `web/public/zdroje/`. */
  zdrojLogo?: string;
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
      // Naše kopie fotky od zdroje (od 2. 10. 2026). Je to `obrazek` se vším
      // všudy — leží u nás a rozměry známe —, takže s ní karta zachází stejně
      // jako s naší nahranou fotkou, včetně velké varianty na úvodu.
      obrazek: c.fotka ?? null,
      // Záloha, dokud kopii nemáme: adresa u zdroje. Rozměry k ní neznáme,
      // proto nemůže být `obrazek` — vymyslet si je jen kvůli typu by byla
      // lež v datech.
      fotkaZdroje: c.fotka ? undefined : (c.obrazek ?? undefined),
      zdrojLogo: c.zdrojLogo ?? undefined,
      zavod: null,
      zavodNazev: null,
      // Úvodník je náš příznak pro článek, který vede stránku regaty.
      // Přejatý článek od svazu jím není a být nemůže.
      uvodnik: false,
      adresa: c.odkaz,
      vnejsi: true,
      zdroj: c.zdroj,
    })),
  // Podle času, ne podle textu: API vydává čas s posunem a „+02:00"
  // proti „Z" by se textově řadilo špatně.
  ].sort((a, b) => Date.parse(b.publikovanoV) - Date.parse(a.publikovanoV));

  return limit ? vsechny.slice(0, limit) : vsechny;
}

/**
 * Obsah předchozího ročníku, dokud ten nový žádný nemá (Filip, 2. 10. 2026).
 *
 * <b>Proč:</b> ročník 2027 se publikoval s kalendářem od rozhodčího a tím
 * z úvodní stránky zmizely novinky i průběžné pořadí — web vypisuje jen
 * aktuální ročník a v tom se ještě nejelo. Mezi sezónami má úvod vypadat
 * živě, ne prázdně.
 *
 * <b>Nikdy to nevydává za letošek.</b> Volající dostane i ročník, ze kterého
 * obsah je, a musí ho napsat k němu — konečné pořadí loňska bez popisku by
 * tvrdilo, že se letos jezdilo.
 */
export type SNahradou<T> = {
  data: T;
  /** Ročník, ze kterého data jsou, když to není ten, na který se ptáme. */
  nahrada?: SerieShrnuti;
};

/** Ročník vydaný hned po tomhle, tedy o rok starší. API je řadí od nejnovějšího. */
async function predchoziRocnik(slug: string): Promise<SerieShrnuti | undefined> {
  const rocniky = await nactiSerie().catch(() => null);
  const kde = rocniky?.findIndex((r) => r.slug === slug) ?? -1;
  return kde >= 0 ? rocniky?.[kde + 1] : undefined;
}

/** Pořadí ročníku, a když v něm ještě nikdo nejel, pořadí toho předchozího. */
export async function poradiSNahradou(slug: string): Promise<SNahradou<PoradiSerie | null>> {
  const poradi = await nactiPoradi(slug);
  if (poradi?.kategorie.some((k) => k.lode.length > 0)) return { data: poradi };

  const predchozi = await predchoziRocnik(slug);
  if (!predchozi) return { data: poradi };

  const starsi = await nactiPoradi(predchozi.slug).catch(() => null);
  return starsi?.kategorie.some((k) => k.lode.length > 0)
    ? { data: starsi, nahrada: predchozi }
    : { data: poradi };
}

/**
 * Novinky ročníku, a když v něm ještě žádná nevyšla, novinky té minulé sezóny.
 *
 * <b>Rozhodují jen naše články.</b> Přejaté ze svazu chodí každý druhý den,
 * takže by výpis vypadal plný i v ročníku, ve kterém jsme nenapsali řádku —
 * a loňská sezóna by zmizela. Ověřeno 2. 10. 2026 na produkci: po publikaci
 * 2027 zbyly na úvodu čtyři přejaté a žádná naše novinka.
 *
 * Při náhradě jdou naše články první a přejaté doplní zbytek místa. Řadit
 * všechno podle data by je zase odsunulo, protože svaz píše častěji.
 */
export async function novinkySNahradou(
  slug: string,
  limit?: number,
): Promise<SNahradou<Novinka[] | null>> {
  const novinky = await nactiNovinky(slug, limit);
  if (novinky?.some((n) => !n.vnejsi)) return { data: novinky };

  const predchozi = await predchoziRocnik(slug);
  if (!predchozi) return { data: novinky };

  const nase = await nactiVlastniNovinky(predchozi.slug, limit).catch(() => null);
  if (!nase?.length) return { data: novinky };

  // <b>Podle času, ne „naše a za nimi převzaté".</b> Dřív se obě řady
  // jen slepily za sebe a uřízly na `limit` — a protože loňských je víc
  // než limit, převzaté se na úvodní stránku nikdy nedostaly, i když byly
  // o tři týdny novější. Mísit je podle data je přesně to, kvůli čemu
  // převzaté vznikly: aby výpis byl plný i v zimě (Filip, 23. 9. 2026).
  const prevzate = (novinky ?? []).filter((n) => n.vnejsi);
  const vsechny = [...nase, ...prevzate].sort(
    (a, b) => Date.parse(b.publikovanoV) - Date.parse(a.publikovanoV),
  );
  return { data: limit ? vsechny.slice(0, limit) : vsechny, nahrada: predchozi };
}
