// Typovaný přístup k veřejnému API. Tvary typů se generují z OpenAPI
// dokumentu, viz `packages/api-client/generuj.sh` — ručně psané kopie
// se webem a appkou se dřív musely držet v hlavě.

import type { components } from "./schema";
import { token } from './identita';

const API = process.env.EXPO_PUBLIC_API_URL ?? 'https://orlickypohar-api.klihovka.cz';

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
export type ZavodDetail = S["ZavodDetailDto"];
export type Zastavka = S["ZastavkaDto"];
export type PoradiLodi = S["PoradiLodiDto"];
export type PoradiKategorie = S["PoradiKategorieDto"];
export type PoradiSerie = S["PoradiSerieDto"];
export type Ja = S["JaDto"];

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

/**
 * Čtení za přihlášeného. `null` znamená „nikdo není přihlášený nebo
 * relace skončila" — ne chybu, kterou by měla obrazovka hlásit červeně.
 *
 * <b>Token se bere přes `identita.token()`</b>, ne ze zapamatované
 * proměnné: ta funkce umí token cestou obnovit, takže volající nemusí
 * vědět, kdy vyprší.
 */
export async function nactiZaSebe<T>(cesta: string): Promise<T | null> {
  const t = await token();
  if (!t) return null;

  const odpoved = await fetch(`${API}${cesta}`, {
    headers: { accept: 'application/json', authorization: `Bearer ${t}` },
  });

  if (odpoved.status === 401 || odpoved.status === 404) return null;
  if (!odpoved.ok) throw new Error(`API ${cesta} vrátilo ${odpoved.status}`);
  return (await odpoved.json()) as T;
}

/** Kdo jsem podle našeho API — včetně oprávnění. Tím se pozná, že token
 *  neplatí jen u poskytovatele, ale i u nás. */
export const nactiJa = () => nactiZaSebe<Ja>('/ja');
