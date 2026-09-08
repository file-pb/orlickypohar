// Typovaný přístup k veřejnému API. Tvary odpovídají DTO v Features/*
// a jsou zatím **opsané z `web/lib/api.ts`**.
//
// Plán chce klienta generovaného z OpenAPI, sdíleného webem i appkou —
// a tohle je přesně ta chvíle, kdy to začíná dávat smysl, protože klienti
// jsou nově dva. Napřed ale musí OpenAPI dokument nést tvary odpovědí;
// dnes je nenese, protože endpointy nemají `Produces<T>`. Do té doby je
// tahle kopie menší zlo než generátor, který vygeneruje `any`.

const API = process.env.EXPO_PUBLIC_API_URL ?? 'https://orlickypohar-api.klihovka.cz';

export type SerieShrnuti = { slug: string; nazev: string; rok: number; pocetZavodu: number };

export type Kategorie = { nazev: string; poradi: number };

export type StavZavodu = 'Planovany' | 'Vypsany' | 'Odjety' | 'Zruseny';

export type ZavodShrnuti = {
  slug: string;
  nazev: string;
  datum: string;
  datumKonce: string | null;
  typ: string | null;
  poradatel: string | null;
  poradi: number;
  stav: StavZavodu;
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

export type KodVysledku = 'Dnf' | 'Dns' | 'Dnc' | 'Ocs' | 'Dsq' | 'Ret' | 'Rdg';

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
  stav: 'Planovana' | 'Probiha' | 'Dokoncena' | 'Zrusena';
  doSerie: boolean;
  vysledky: Vysledek[];
};

export type BodyVRozjizdce = { cislo: number; body: number; skrtnuto: boolean };

export type VysledekZavodu = {
  lod: string;
  kategorie: string;
  body: number;
  poradi: number;
  rozjizdky: BodyVRozjizdce[];
};

export type UcastLodi = { lod: string; kategorie: string; kormidelnik: string | null };

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
  vyhodnoceni: 'CelePole' | 'PoKategoriich';
  koeficientDoSerie: number;
  rozjizdky: Rozjizdka[];
  poradi: VysledekZavodu[];
  lode: UcastLodi[];
};

export type Zastavka = { slug: string; nazev: string; datum: string; poradi: number };

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
export async function nacti<T>(cesta: string): Promise<T | null> {
  const odpoved = await fetch(`${API}${cesta}`, { headers: { accept: 'application/json' } });

  if (odpoved.status === 404) return null;
  if (!odpoved.ok) throw new Error(`API ${cesta} vrátilo ${odpoved.status}`);
  return (await odpoved.json()) as T;
}

export const nactiSerie = () => nacti<SerieShrnuti[]>('/serie');
export const nactiSerii = (slug: string) => nacti<SerieDetail>(`/serie/${slug}`);
export const nactiPoradi = (slug: string) => nacti<PoradiSerie>(`/serie/${slug}/poradi`);
export const nactiZavod = (serie: string, zavod: string) =>
  nacti<ZavodDetail>(`/serie/${serie}/zavody/${zavod}`);
