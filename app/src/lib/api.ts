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
export type ZapisRozjizdky = S["ZapisRozjizdkyDto"];
export type ZapisLod = S["ZapisLodDto"];
export type ZapisRadekVstup = S["ZapisRadekVstup"];
export type CilZTrasovaniOdpoved = S["CilZTrasovaniDto"];

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
/**
 * <b>Server odpověděl a odmítl.</b> Rozdíl proti „nedoletělo" není
 * kosmetický: podržený úkon se zkouší znovu, dokud neprojde, kdežto
 * odmítnutý by bušil donekonečna. A důvod bývá věta pravidla
 * („Rozjížďka už jede. Na nový start je všeobecné odvolání."), kterou
 * rozhodčí potřebuje vidět.
 *
 * Vlastnosti se přiřazují v těle, ne parametrem konstruktoru: testy
 * jedou na Node, který TypeScript jen odstraňuje a `readonly` parametr
 * neumí.
 */
export class OdmitnutoServerem extends Error {
  readonly stav: number;
  readonly duvod: string | null;
  /**
   * Celé tělo odpovědi. U konfliktu (409) v něm server posílá současný
   * zápis, aby si klient měl svou sadu s čím srovnat — a nemusel se na
   * něj ptát znovu.
   */
  readonly telo: unknown;

  constructor(stav: number, duvod: string | null, cesta: string, telo: unknown = null) {
    super(duvod ?? `API ${cesta} vrátilo ${stav}`);
    this.name = 'OdmitnutoServerem';
    this.stav = stav;
    this.duvod = duvod;
    this.telo = telo;
  }
}

export async function posliZaSebe<T>(
  cesta: string,
  telo: unknown,
  /** `PUT` u sad, které se přepisují celé — jinak `POST`. */
  metoda: 'POST' | 'PUT' = 'POST',
): Promise<T | null> {
  const t = await token();
  if (!t) return null;

  const odpoved = await fetch(`${API}${cesta}`, {
    method: metoda,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${t}`,
    },
    body: JSON.stringify(telo),
  });

  if (odpoved.status === 401) return null;
  if (!odpoved.ok) {
    // Tělo nese větu pravidla („Rozjížďka už jede. Na nový start je
    // všeobecné odvolání."), a ta je rozhodčímu u vody k užitku —
    // na rozdíl od čísla stavu, které mu neřekne nic.
    let duvod: string | null = null;
    let telo: unknown = null;
    try {
      telo = await odpoved.json();
      const chyba = telo as { error?: unknown };
      duvod = typeof chyba?.error === 'string' ? chyba.error : null;
    } catch {
      duvod = null;
    }
    throw new OdmitnutoServerem(odpoved.status, duvod, cesta, telo);
  }
  return (await odpoved.json()) as T;
}

/**
 * Startovní procedura: spustit, odložit, odvolat.
 *
 * <b>Čas startu se neposílá, posílá se okamžik stisku.</b> Čas z něj
 * počítá server podle pravidla (ZPJ 26, resp. 29.2) a z délky procedury
 * regaty — kdyby ho vybírala appka, obcházelo by se pravidlo. Bez
 * `zapsanoV` by ale podržený úkon padl až ve chvíli, kdy telefon chytil
 * síť, a to je ten rozpor, kterému pyramida autority brání: odpočet už
 * mezitím běžel z hodin startéra a posádky slyšely jeho.
 *
 * <b>Jen za přihlášeného a jen pro toho, kdo velí</b> — práva hlídá
 * server, appka tlačítko jen neukazuje tomu, komu nepatří. Vrací `null`,
 * když nikdo není přihlášený; chybu vyhodí, protože u zásahu do procedury
 * je rozdíl mezi „nepovedlo se" a „nic tam není" podstatný.
 *
 * Cesta jde přes správu, ne přes veřejné čtení: veřejně se procedura
 * nespouští.
 */
export async function provedProceduru(
  serie: string,
  zavod: string,
  cislo: number,
  druh: 'Spustit' | 'Odlozit' | 'Odvolat',
  /**
   * Kdy to startér zmáčkl (ISO). Bez něj platí čas, kdy požadavek dorazil
   * — a podržený úkon by tím posunul start o celý výpadek sítě.
   */
  zapsanoV?: string,
) {
  const v = await posliZaSebe<unknown>(
    `/sprava/serie/${serie}/vysledky/${zavod}/rozjizdky/${cislo}/procedura`,
    { druh, zapsanoV },
  );
  // `null` z `posliZaSebe` znamená „nikdo přihlášený" nebo „token už
  // neplatí" — a to se u startu nesmí spolknout. Změřeno 29. 10. 2026
  // na simulátoru: dialog se zavřel, jako by se odložilo, a na server
  // přitom nešel žádný požadavek. U vody by to byl rozhodčí, který
  // odvolává start naprázdno.
  if (v === null) throw new Error('neprihlasen');
  return v;
}

/**
 * <b>Ohlášení startu.</b> Posílá to appka sama, jakmile odpočet dojde na
 * nulu — teprve tím se z „plánované" rozjížďky stane „probíhá", a bez
 * toho nejede trať, úkony za jízdy ani polohy.
 *
 * Rozhodčí nic nemačká: start padl tím, že doběhla procedura, kterou
 * spustil. Dřív tu bylo tlačítko „Jede se" a panel čekal na potvrzení
 * startu — úkon, který na vodě neexistuje (Filip, 29. 10. 2026: *„no
 * potvrzení startu nevím co je"*).
 *
 * <b>Posílá se čas, na který odpočet došel</b>, ne okamžik požadavku.
 * Mezi nulou na displeji a doručením je latence a u vody i výpadek —
 * a start zapsaný o ně později je jiný start, než jaký posádky slyšely.
 * Bez času platí okamžik požadavku, jako dřív.
 */
export async function ohlasStart(
  serie: string,
  zavod: string,
  cislo: number,
  startV?: string,
) {
  const v = await posliZaSebe<unknown>(
    `/sprava/serie/${serie}/vysledky/${zavod}/rozjizdky/${cislo}/start`,
    { startV },
  );
  // Totéž jako u procedury: nepřihlášenému se start neohlásí a `useEffect`
  // v panelu si to musí vrátit do fronty, ne to zahodit jako hotové.
  if (v === null) throw new Error('neprihlasen');
  return v;
}

/**
 * Zápis rozjížďky pro cílovou obrazovku: lodě, jejich pořadí a kódy,
 * čas startu a revize sady.
 *
 * Jde přes správu, ne přes veřejné čtení — rozepsaný zápis z vody není
 * výsledek, dokud ho rozhodčí neuzavře.
 */
export const nactiZapis = (serie: string, zavod: string, cislo: number) =>
  nactiZaSebe<ZapisRozjizdky>(
    `/sprava/serie/${serie}/vysledky/${zavod}/rozjizdky/${cislo}`,
  );

/**
 * Uloží <b>celou sadu</b> výsledků rozjížďky. Co v ní není, výsledek
 * nemá — uložení takovou loď smaže, takže se posílají i lodě bez pořadí.
 *
 * <b>`revize` je podoba sady, ze které obrazovka vyšla.</b> Bez ní by
 * zápis z telefonu uměl smazat opravu, o které nevěděl; server proto
 * starší revizi odmítne stavem 409 a přiloží současný zápis.
 */
export async function ulozVysledky(
  serie: string,
  zavod: string,
  cislo: number,
  radky: ZapisRadekVstup[],
  revize: number,
) {
  // Vrací se celý zápis po uložení — hlavně <b>nová revize</b>, se kterou
  // se posílá další klepnutí. Dopočítávat ji (+1) by byl odhad o cizím
  // počítadle.
  const v = await posliZaSebe<ZapisRozjizdky>(
    `/sprava/serie/${serie}/vysledky/${zavod}/rozjizdky/${cislo}/vysledky`,
    { radky, revize },
    'PUT',
  );
  // Totéž jako u procedury: nepřihlášenému se nic neuloží a volající to
  // nesmí spolknout jako hotovou věc.
  if (v === null) throw new Error('neprihlasen');
  return v;
}

/**
 * <b>Co u cíle vidí trasování</b> (nález R33): u kterých lodí stopa
 * z telefonu protla cílovou čáru ve směru do cíle.
 *
 * Je to <b>návrh, ne zápis</b>. Která loď to byla a jestli dojela, ví
 * jen rozhodčí; stopa umí dodat čas přesnější, než na jaký stačí palec.
 * Když se dotaz nepovede, obrazovka o nic nepřijde — zapisuje se dál
 * klepáním.
 */
export const nactiCilZTrasovani = (serie: string, zavod: string, cislo: number) =>
  nactiZaSebe<CilZTrasovaniOdpoved>(
    `/sprava/serie/${serie}/vysledky/${zavod}/rozjizdky/${cislo}/cil-z-trasovani`,
  );

/**
 * <b>Ukončí rozjížďku</b> — zastaví časomíru.
 *
 * Ukončuje rozhodčí, ne hodiny: *„v prvních verzích prostě ukončí ofiko
 * rozhodčí"* (Filip, 29. 10. 2026). Časový limit podle ZPJ 35 appka
 * nehlídá a plachetní směrnice poháru žádný nevypisuje.
 *
 * Bez času v těle platí okamžik požadavku. Zbylé lodě dostanou DNF už
 * tím, co se uloží před tímhle voláním.
 */
export async function ukonciRozjizdku(serie: string, zavod: string, cislo: number) {
  const v = await posliZaSebe<unknown>(
    `/sprava/serie/${serie}/vysledky/${zavod}/rozjizdky/${cislo}/konec`,
    {},
  );
  if (v === null) throw new Error('neprihlasen');
  return v;
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
