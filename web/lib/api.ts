// Tenký typovaný přístup k API. Ručně psaný schválně: generovaný klient
// z OpenAPI je platformové rozhodnutí, ale má smysl teprve tehdy, až ho
// bude sdílet i mobilní appka. Do té doby by generátor v řetězu jen přidal
// krok, který nikdo nepotřebuje.
//
// Tvary odpovídají DTO v Features/Serial a Features/Zavody.

const API = process.env.API_URL ?? "http://localhost:8080";

export type SerieShrnuti = {
  slug: string;
  nazev: string;
  rok: number;
  pocetZavodu: number;
};

export type Kategorie = { nazev: string; poradi: number };

/** Ročník nezačíná závody, ale předběžným kalendářem — stav proto patří i do shrnutí. */
export type StavZavodu = "Planovany" | "Vypsany" | "Odjety" | "Zruseny";

export type ZavodShrnuti = {
  slug: string;
  nazev: string;
  datum: string;
  datumKonce: string | null;
  typ: string | null;
  poradatel: string | null;
  poradi: number;
  stav: StavZavodu;
  /** Termín, na který se lidé chystali, když se zastávka přesunula. */
  puvodniDatum: string | null;
};

export type Prihlaska = {
  lod: string;
  cisloPlachty: string | null;
  typLodi: string | null;
  majitel: string;
  kategorie: string;
};

export type SerieDetail = {
  slug: string;
  nazev: string;
  rok: number;
  kategorie: Kategorie[];
  zavody: ZavodShrnuti[];
  prihlasky: Prihlaska[];
};

export type KodVysledku = "Dnf" | "Dns" | "Dnc" | "Ocs" | "Dsq" | "Ret" | "Rdg";

export type Vysledek = {
  lod: string;
  kategorie: string;
  kormidelnik: string | null;
  poradiVCili: number | null;
  casSekundy: number | null;
  kod: KodVysledku | null;
};

export type Rozjizdka = {
  cislo: number;
  startV: string | null;
  stav: "Planovana" | "Probiha" | "Dokoncena" | "Zrusena";
  doSerie: boolean;
  vysledky: Vysledek[];
};

/** Body lodi v jedné rozjížďce — pořadí v její kategorii, ne v celém poli. */
export type BodyVRozjizdce = { cislo: number; body: number; skrtnuto: boolean };

export type VysledekZavodu = {
  lod: string;
  kategorie: string;
  body: number;
  poradi: number;
  rozjizdky: BodyVRozjizdce[];
};

export type ZavodDetail = {
  slug: string;
  nazev: string;
  datum: string;
  datumKonce: string | null;
  typ: string | null;
  poradatel: string | null;
  stav: StavZavodu;
  puvodniDatum: string | null;
  pocetSkrtu: number;
  vyhodnoceni: "CelePole" | "PoKategoriich";
  koeficientDoSerie: number;
  rozjizdky: Rozjizdka[];
  /** Body a pořadí počítá server. Web je nesčítá — rozešlo by se to. */
  poradi: VysledekZavodu[];
};

export type Zastavka = { slug: string; nazev: string; datum: string; poradi: number };

/** Prázdné místo v `zastavky` znamená, že tam loď nestartovala. */
export type PoradiLodi = {
  lod: string;
  majitel: string;
  zastavky: (number | null)[];
  body: number;
  poradi: number;
  bodyPoSkrtu: number;
  poradiPoSkrtu: number;
  skrtnuto: number | null;
};

export type PoradiKategorie = { kategorie: string; lode: PoradiLodi[] };

export type PoradiSerie = {
  slug: string;
  nazev: string;
  rok: number;
  zastavky: Zastavka[];
  kategorie: PoradiKategorie[];
};

/** Vrací null u 404 — nepublikovaný ročník se chová, jako by neexistoval. */
async function nacti<T>(cesta: string): Promise<T | null> {
  const odpoved = await fetch(`${API}${cesta}`, {
    // Výsledky se mění po závodě, ne po vteřinách. Minuta je kompromis mezi
    // čerstvostí a tím, aby stránka nešla na API při každém načtení.
    next: { revalidate: 60 },
    headers: { accept: "application/json" },
  });

  if (odpoved.status === 404) return null;
  if (!odpoved.ok) throw new Error(`API ${cesta} vrátilo ${odpoved.status}`);
  return (await odpoved.json()) as T;
}

export const nactiSerie = () => nacti<SerieShrnuti[]>("/serie");
export const nactiSerii = (slug: string) => nacti<SerieDetail>(`/serie/${slug}`);
export const nactiZavod = (serie: string, zavod: string) =>
  nacti<ZavodDetail>(`/serie/${serie}/zavody/${zavod}`);
export const nactiPoradi = (slug: string) => nacti<PoradiSerie>(`/serie/${slug}/poradi`);
