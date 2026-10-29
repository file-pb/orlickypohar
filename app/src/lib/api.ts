// Typovaný přístup k veřejnému API. Tvary typů se generují z OpenAPI
// dokumentu, viz `packages/api-client/generuj.sh` — ručně psané kopie
// se webem a appkou se dřív musely držet v hlavě.

import type { components } from "./schema";
import { token } from './identita';
import { tajemstvi } from './klic';

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

/**
 * Zápis za přihlášeného. `null` znamená „nikdo není přihlášený" — volající
 * se podle toho rozhodne, jestli to zkusit později, nebo říct posádce, že
 * se má přihlásit.
 *
 * <b>Chyba se vyhodí</b>, na rozdíl od čtení: u zápisu je rozdíl mezi
 * „nepovedlo se" a „nic tam není" podstatný. Odesílání trasy na něm stojí —
 * co se nepotvrdí, musí zůstat ve frontě.
 */
export async function posliZaSebe<T>(cesta: string, telo: unknown): Promise<T | null> {
  const t = await token();
  if (!t) return null;

  const odpoved = await fetch(`${API}${cesta}`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${t}`,
    },
    body: JSON.stringify(telo),
  });

  if (odpoved.status === 401) return null;
  if (!odpoved.ok) throw new Error(`API ${cesta} vrátilo ${odpoved.status}`);
  return (await odpoved.json()) as T;
}

/**
 * Startovní procedura: spustit, odložit, odvolat.
 *
 * <b>Jen za přihlášeného a jen pro toho, kdo velí</b> — práva hlídá
 * server, appka tlačítko jen neukazuje tomu, komu nepatří. Vrací `null`,
 * když nikdo není přihlášený; chybu vyhodí, protože u zásahu do procedury
 * je rozdíl mezi „nepovedlo se" a „nic tam není" podstatný.
 *
 * Cesta jde přes správu, ne přes veřejné čtení: veřejně se procedura
 * nespouští.
 */
export function provedProceduru(
  serie: string,
  zavod: string,
  cislo: number,
  druh: 'Spustit' | 'Odlozit' | 'Odvolat',
) {
  return posliZaSebe<unknown>(
    `/sprava/serie/${serie}/vysledky/${zavod}/rozjizdky/${cislo}/procedura`,
    { druh },
  );
}

/** Kdo jsem podle našeho API — včetně oprávnění. Tím se pozná, že token
 *  neplatí jen u poskytovatele, ale i u nás. */
export const nactiJa = () => nactiZaSebe<Ja>('/ja');

/**
 * Zápis za loď, ne za člověka. Telefon se prokazuje mobilním klíčem.
 *
 * `null` znamená „tenhle telefon není spárovaný s lodí" (nebo mu klíč
 * odebrali) — ne chybu. Volající z toho pozná, že má posádku poslat za
 * kapitánem pro novou pozvánku, ne že se má pokus opakovat.
 *
 * Na tom stojí celé nahrávání trasy: posádka účet mít nemusí.
 */
export async function posliKlicem<T>(cesta: string, telo: unknown): Promise<T | null> {
  const v = await posliKlicemPodrobne<T>(cesta, telo);
  return v.stav === 'ok' ? v.data : null;
}

/**
 * Totéž, ale s rozlišením, **proč** to nevyšlo.
 *
 * Zakládání trasy potřebuje odlišit dvě věci, které obě končí „neodeslalo
 * se": telefon není spárovaný s lodí (posádka musí za kapitánem) a mimo
 * okno regaty (server trasu nevezme, dokud nebyla rozprava). První je
 * porucha, druhé je stav závodu — a posádka se podle toho zachová jinak.
 */
export type OdpovedKlicem<T> =
  | { stav: 'ok'; data: T }
  | { stav: 'bez-klice' }
  | { stav: 'mimo-okno'; duvod: string };

export async function posliKlicemPodrobne<T>(
  cesta: string,
  telo: unknown,
): Promise<OdpovedKlicem<T>> {
  const k = await tajemstvi();
  if (!k) return { stav: 'bez-klice' };

  const odpoved = await fetch(`${API}${cesta}`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'x-klic-lodi': k,
    },
    body: JSON.stringify(telo),
  });

  if (odpoved.status === 401) return { stav: 'bez-klice' };
  if (odpoved.status === 409) {
    const telo = (await odpoved.json().catch(() => null)) as { error?: string } | null;
    return { stav: 'mimo-okno', duvod: telo?.error ?? 'Teď se nesmí zaznamenávat.' };
  }
  if (!odpoved.ok) throw new Error(`API ${cesta} vrátilo ${odpoved.status}`);
  return { stav: 'ok', data: (await odpoved.json()) as T };
}

// ---------------------------------------------------------------------------
// Klíče k lodi očima kapitána. Tyhle volání jdou přes **účet**, ne přes klíč:
// vydat klíč smí jen majitel nebo kapitán a to se pozná z přihlášení.
// ---------------------------------------------------------------------------

export type MojeLod = { lodId: number; nazev: string; cisloPlachty: string | null; role: string };
export type KlicLodi = {
  id: number;
  jmeno: string | null;
  vydanV: string;
  posledniPouzitiV: string | null;
  sleduje: boolean;
  odebran: boolean;
};
export type Pozvanka = { id: number; kod: string; jmeno: string | null; platiDo: string };

/** Lodě, ke kterým přihlášený patří — i s rolí, podle níž se pozná, kdo smí vydávat klíče. */
export const nactiMojeLode = () => nactiZaSebe<MojeLod[]>('/ja/lode');

export const nactiKliceLodi = (lod: number) => nactiZaSebe<KlicLodi[]>(`/ja/lode/${lod}/klice`);

/** Vytvoří pozvánku. <b>Kód se vrací jednou</b> — podruhé ho nikdo nezjistí. */
export const pozviKlicem = (lod: number, jmeno: string | null) =>
  posliZaSebe<Pozvanka>(`/ja/lode/${lod}/klice`, { jmeno });

/**
 * Zapne nebo vypne sledování u jednoho klíče. Vratné — na rozdíl od odebrání.
 * Tím se řeší „telefon zůstal v autě" a „tuhle regatu nejedu".
 */
export const prepniSledovani = (lod: number, klic: number, sleduje: boolean) =>
  posliBezOdpovedi(`/ja/lode/${lod}/klice/${klic}/sledovani`, 'POST', { sleduje });

/** Odebere klíč natrvalo. Nedá se oživit — pro odchod z posádky nadobro. */
export const odeberKlic = (lod: number, klic: number) =>
  posliBezOdpovedi(`/ja/lode/${lod}/klice/${klic}`, 'DELETE');

/**
 * Zápis, po kterém nic nepřijde (204). `false` znamená „nikdo není
 * přihlášený"; cokoli jiného než úspěch se vyhodí, protože u zápisu se
 * tiché selhání pozná pozdě.
 */
async function posliBezOdpovedi(
  cesta: string,
  metoda: 'POST' | 'DELETE',
  telo?: unknown,
): Promise<boolean> {
  const t = await token();
  if (!t) return false;

  const odpoved = await fetch(`${API}${cesta}`, {
    method: metoda,
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${t}`,
      ...(telo === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(telo === undefined ? {} : { body: JSON.stringify(telo) }),
  });

  if (odpoved.status === 401) return false;
  if (!odpoved.ok) throw new Error(`API ${cesta} vrátilo ${odpoved.status}`);
  return true;
}
