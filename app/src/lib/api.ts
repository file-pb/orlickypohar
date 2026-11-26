// Typovaný přístup k veřejnému API. Tvary typů se generují z OpenAPI
// dokumentu, viz `packages/api-client/generuj.sh` — ručně psané kopie
// se webem a appkou se dřív musely držet v hlavě.

import type { components } from "./schema";
import { token } from './identita';
import { tajemstvi } from './klic';
import { HLAVICKA, klicUctu } from './klic-uctu';
import { API, sit } from './sit';
import { ukazkaBezi } from './ukazka';

/**
 * Čím se telefon prokáže „za sebe", nebo `null`, když nemá čím.
 *
 * <b>Dvě cesty, jedna odpověď.</b> Od 26. 11. 2026 se appka nemusí
 * přihlašovat u poskytovatele: telefon se napojí kódem z webu a pak
 * posílá klíč v hlavičce `X-Klic-Uctu`. Server z něj vyrobí tutéž
 * identitu, jakou by dal token (`Features/Klice/KlicUctuOvereni.cs`),
 * takže volající rozdíl nepoznají.
 *
 * <b>Klíč má přednost před tokenem.</b> Kdo se napojil, udělal to
 * vědomě; token mu mohl zůstat ležet z doby, kdy se appka ještě
 * přihlašovala, a dva doklady naráz znamenají dvě odpovědi na otázku,
 * kdo volá.
 */
async function hlavickySebe(): Promise<Record<string, string> | null> {
  if (ukazkaBezi()) return { authorization: 'Bearer ukazka' };

  const klic = await klicUctu();
  if (klic) return { [HLAVICKA]: klic };

  const t = await token();
  return t ? { authorization: `Bearer ${t}` } : null;
}

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
export type SnimekPoloh = S["SnimekPoloh"];
export type Zastavka = S["ZastavkaDto"];
export type PoradiLodi = S["PoradiLodiDto"];
export type PoradiKategorie = S["PoradiKategorieDto"];
export type PoradiSerie = S["PoradiSerieDto"];
export type Ja = S["JaDto"];
export type ZapisRozjizdky = S["ZapisRozjizdkyDto"];
export type ZapisLod = S["ZapisLodDto"];

/**
 * Co vidí posádka. <b>Psané ručně, ne ze schématu</b> — snímek API se
 * generuje z běžícího serveru a ten tenhle endpoint dostane až po
 * nasazení. Až se přegeneruje, tenhle typ zmizí ve prospěch `S[…]`.
 */
// <b>Ručně psaný tvar tu byl jen do nasazení.</b> Dokud `/lod/dnes`
// neběželo na produkci, nebylo z čeho generovat; teď je a platí schéma.
export type ZavodnikDnes = S['ZavodnikDto'];
export type HlaseniOdpoved = S['HlaseniDto'];
export type ClenPosadky = S['ClenPosadkyDto'];
export type ZapisRadekVstup = S["ZapisRadekVstup"];
export type CilZTrasovaniOdpoved = S["CilZTrasovaniDto"];

/** Vrací null u 404 — nepublikovaný ročník se chová, jako by neexistoval. */
export async function nacti<T>(cesta: string): Promise<T | null> {
  const odpoved = await sit(cesta, { headers: { accept: 'application/json' } });

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
  const doklad = await hlavickySebe();
  if (!doklad) return null;

  const odpoved = await sit(cesta, {
    headers: { accept: 'application/json', ...doklad },
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
  /**
   * `PUT` u sad, které se přepisují celé, `DELETE` u odvolání — jinak
   * `POST`. U `DELETE` se tělo neposílá: některé servery ho u téhle
   * metody zahazují a volající by si myslel, že něco předal.
   */
  metoda: 'POST' | 'PUT' | 'DELETE' = 'POST',
): Promise<T | null> {
  const doklad = await hlavickySebe();
  if (!doklad) return null;

  const odpoved = await sit(cesta, {
    method: metoda,
    headers:
      metoda === 'DELETE'
        ? { accept: 'application/json', ...doklad }
        : {
            accept: 'application/json',
            'content-type': 'application/json',
            ...doklad,
          },
    body: metoda === 'DELETE' ? undefined : JSON.stringify(telo),
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
  druh: 'Spustit' | 'Odlozit' | 'Odvolat' | 'OpakovacDolu',
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
 * <b>Zruší rozjížďku s důvodem</b> (nález R17, ZPJ 32.1).
 *
 * <b>Jde to přes stav výsledků, ne přes vlastní úkon.</b> Zrušení
 * a eliminace jsou dvě strany téhož: rozjížďka, která neplatí v zápisu,
 * se nejede — a server to drží u jediného přechodu stavu schválně, aby
 * se druhá cesta k témuž s touhle nerozešla. Přechod do `Eliminovano`
 * je povolený z jakéhokoliv stavu, takže se dá zrušit i rozjížďka,
 * která se zrovna jede.
 *
 * <b>Důvod je povinný</b> a server to hlídá sám.
 */
export async function zrusRozjizdku(
  serie: string,
  zavod: string,
  cislo: number,
  duvod: string,
) {
  const v = await posliZaSebe<unknown>(
    `/sprava/serie/${serie}/vysledky/${zavod}/rozjizdky/${cislo}/stav`,
    { stav: 'Eliminovano', duvod },
  );
  if (v === null) throw new Error('neprihlasen');
  return v;
}

/**
 * <b>Otáčkový trest</b> (nález R36, ZPJ 44.2).
 *
 * <b>Není to kód výsledku.</b> Otáčka pořadí nemění — loď ji odkrouží
 * a jede dál — a proto má vlastní cestu, ne zápis do sady výsledků.
 * Do výsledku se promítne teprve protestem, a ten aplikace neřeší.
 *
 * <b>Posílá se čas z telefonu</b>, stejně jako u úkonů procedury: na vodě
 * se trest uloží hned, odeslat se dá až v signálu, a rozhoduje, kdy
 * platil.
 */
export async function ulozTrest(
  serie: string,
  zavod: string,
  cislo: number,
  ucast: number,
  druh: 'Otacka360' | 'Otacka720',
) {
  const v = await posliZaSebe<unknown>(
    `/sprava/serie/${serie}/zastavky/${zavod}/rozjizdky/${cislo}/tresty`,
    { ucast, druh, ulozenoV: new Date().toISOString() },
  );
  // Jako u procedury: nepřihlášenému se nic neuloží a volající to nesmí
  // spolknout jako hotovou věc.
  if (v === null) throw new Error('neprihlasen');
  return v;
}

/**
 * <b>Co rozhodčí v téhle rozjížďce lodím uložil.</b>
 *
 * Pruh trestů na trati z návrhu (`Jede.dc.html`) stojí na tomhle — bez
 * něj šel trest zapsat, ale už ne odkliknout, čímž appka věděla
 * o uložení a nikdy o vykonání.
 */
export type TrestZaJizdy = S['TrestDto'];

/**
 * <b>Poslední známá poloha každé lodi v regatě.</b>
 *
 * Endpoint vrací celé pole včetně lodí, které se ještě neozvaly —
 * popis u něj to říká rovnou: otázka zní *„trackuje nám celé pole?"*.
 * Panel startu z toho dělá jediný řádek, *„12 z 12 lodí vysílá
 * polohu"*, jak ho kreslí návrh.
 *
 * Snímek si server drží pět vteřin v cache, takže se nevyplatí ptát
 * častěji.
 */
/**
 * <b>Kdo velí startu téhle regaty.</b> Pole `jsemTo` je to, kvůli kterému
 * se telefon ptá při každém připojení: velí pořád ten, kdo se ptá?
 *
 * Do 21. 11. 2026 tu stál tvar napsaný ručně — jediný takový v appce —,
 * protože oba endpointy velitele vracejí `IResult` a `VeleniDto` se tím do
 * kontraktu nedostalo. Spravilo se to v API (`Produces<VeleniDto>()`), ne tady.
 */
export type Veleni = S["VeleniDto"];

export const nactiVeleni = (serie: string, zavod: string) =>
  nactiZaSebe<Veleni>(`/sprava/serie/${serie}/vysledky/${zavod}/velitel`);

/**
 * <b>Vyžádá si velení.</b>
 *
 * Pozor na směr: velení se <b>bere</b>, nedává (nález R19) — *„slave
 * o velení aktivně požádá, server ho udělí"*. Předat ho někomu jinému
 * nejde, a je to tak schválně: dva hlavní startéři by jinak vznikli
 * přesně tam, kde je to rozhodnutí chtělo vyloučit.
 */
export async function prevezmiVeleni(serie: string, zavod: string): Promise<Veleni> {
  const v = await posliZaSebe<Veleni>(
    `/sprava/serie/${serie}/vysledky/${zavod}/velitel`,
    {},
  );
  if (v === null) throw new Error('neprihlasen');
  return v;
}

export const nactiPolohy = (serie: string, zavod: string) =>
  nactiZaSebe<SnimekPoloh>(`/sprava/serie/${serie}/zastavky/${zavod}/polohy`);

export const nactiTresty = (serie: string, zavod: string, cislo: number) =>
  nactiZaSebe<TrestZaJizdy[]>(
    `/sprava/serie/${serie}/zastavky/${zavod}/rozjizdky/${cislo}/tresty`,
  );

/**
 * <b>Rozhodčí zapíše, že loď trest odkroužila.</b>
 *
 * Zapisuje rozhodčí, ne posádka — *„abychom jim nekomplikovali život"*
 * (nález R41). Dokud to nikdo nezapíše, zůstává `vykonanoV` prázdné,
 * a to <b>neznamená, že loď trest nevykonala</b>: znamená to, že se na
 * to rozhodčí ještě nedostal.
 */
export async function oznacTrestVykonan(
  serie: string,
  zavod: string,
  cislo: number,
  trest: number,
) {
  const v = await posliZaSebe<unknown>(
    `/sprava/serie/${serie}/zastavky/${zavod}/rozjizdky/${cislo}/tresty/${trest}/vykonan`,
    {},
  );
  if (v === null) throw new Error('neprihlasen');
  return v;
}

/**
 * <b>Trať rozjížďky, veřejně.</b> Appka ji čte touž cestou jako web a
 * tabule — žádný zvláštní endpoint pro telefon: trať, kterou vidí
 * rozhodčí, musí být tatáž, podle které pluje pole.
 *
 * `null` znamená, že rozjížďka přijatou trať nemá (nebo se zrovna
 * přestavuje). Na vodě je to zpráva, ne chyba.
 */
export type VerejnaTrat = S['VerejnaTratDto'];
export type PrvekTrati = S['VerejnyPrvekDto'];

export const nactiTrat = (serie: string, zavod: string, rozjizdka: number) =>
  nacti<VerejnaTrat>(
    `/serie/${serie}/zavody/${zavod}/trat?rozjizdka=${rozjizdka}`,
  );

/**
 * <b>Rozestavěná trať a její prvky.</b> Tohle veřejná cesta vydat nesmí —
 * dokud ji rozhodčí nepřijme, trať neexistuje pro nikoho kromě stavitele
 * (`VerejnaAsync` nepřijatou nevydá vůbec). Stavitel ji ale vidět musí,
 * jinak by stavěl poslepu a nepoznal, co už stojí.
 *
 * <para>
 * `null` znamená „regata zatím nemá ani jednu značku, takže ani trať" —
 * což je u stavby běžný výchozí stav, ne chyba.
 * </para>
 */
export type TratSpravy = S['TratDto'];
export type PrvekSpravy = S['PrvekDto'];

export const nactiRozestavenouTrat = (serie: string, zavod: string) =>
  nactiZaSebe<TratSpravy>(`/sprava/serie/${serie}/zastavky/${zavod}/trat`);

export const nactiPrvkySpravy = (serie: string, zavod: string) =>
  nactiZaSebe<PrvekSpravy[]>(`/sprava/serie/${serie}/zastavky/${zavod}/trat/prvky`);

/**
 * <b>Postaví celý prvek i s jeho značkami jedním požadavkem.</b>
 *
 * Po krocích to nejde: prvek se skládá ze serverových id, takže by každý
 * krok čekal na odpověď toho předchozího — a na vodě signál není. Server
 * zapíše značky i prvek jednou transakcí, takže nevznikne půlka brány.
 *
 * <para>
 * <b>`klic` je povinný</b> a opakované odeslání téhož klíče vrátí týž
 * prvek (200 místo 201), ne konflikt. Telefon totiž posílá znovu právě
 * tehdy, když neví, jestli to poprvé prošlo.
 * </para>
 */
export type PostavPrvek = S['PostavPrvekVstup'];

export const postavPrvek = (serie: string, zavod: string, vstup: PostavPrvek) =>
  posliZaSebe<PrvekSpravy>(
    `/sprava/serie/${serie}/zastavky/${zavod}/trat/prvky/postav`,
    vstup,
  );

/**
 * <b>Pípnutí jedné značky.</b> Staví novou, nebo přenastavuje starou —
 * to rozhoduje `nahrazujeId`.
 *
 * <para>
 * <b>Přenastavení je nový záznam, ne oprava.</b> Starý zůstává platný
 * pro dobu, kdy platil: podle něj se posuzuje trasa lodi, která kolem
 * plula. Kdo chce opravit špatně zadanou polohu, zahodí záznam a pípne
 * znovu.
 * </para>
 */
export type PipnutiVstup = S['PipnutiVstup'];

export type BojeSpravy = S['BojeDto'];

export const pipni = (serie: string, zavod: string, vstup: PipnutiVstup) =>
  posliZaSebe<BojeSpravy>(`/sprava/serie/${serie}/zastavky/${zavod}/boje`, vstup);

/**
 * <b>Odemkne přijatou trať na přestavbu.</b> Smí organizátor regaty
 * a rozhodčí ročníku, ne pomocník.
 *
 * <para>
 * <b>Veřejně to znamená „počkej", ne „nic"</b>: někdo už má GPX
 * v plotteru a popluje k bóji, která se mezitím posunula. Podle odjeté
 * trati se navíc už jelo, takže se nepřepíše — vznikne nová a stará
 * zůstane přijatá.
 * </para>
 */
export const prestavbaTrati = (serie: string, zavod: string) =>
  posliZaSebe<unknown>(`/sprava/serie/${serie}/zastavky/${zavod}/trat/prestavba`, {});

/**
 * <b>Přepíše značení bóje</b> — barvu, tvar, druh a poznámku.
 *
 * <para>
 * <b>Měření se tím nemění.</b> Poloha, přesnost, zdroj ani čas: tohle
 * popisuje tentýž kus plastu, ne záznam o tom, kde stál. Posílá se celá
 * čtveřice, protože `null` u každé z nich znamená „neuvedeno" a musí
 * jít nastavit.
 * </para>
 */
export type ZnaceniBoje = S['ZnaceniBojeVstup'];

export const znaceniBoje = (
  serie: string,
  zavod: string,
  boje: number,
  vstup: ZnaceniBoje,
) =>
  posliZaSebe<unknown>(
    `/sprava/serie/${serie}/zastavky/${zavod}/boje/${boje}/znaceni`,
    vstup,
    'PUT',
  );

/**
 * <b>Sebrání bóje z vody.</b> Ze zápisu nemizí — je to razítko, ne
 * mazání: podle té bóje se možná jelo.
 */
export const seberBoji = (serie: string, zavod: string, boje: number) =>
  posliZaSebe<unknown>(
    `/sprava/serie/${serie}/zastavky/${zavod}/boje/${boje}/sebrana`,
    {},
  );

/**
 * <b>Smaže prvek trati.</b> Mizí rozhodnutí o trati, <b>ne měření</b>:
 * záznam bóje zůstává a dál říká, kde ta značka stála.
 */
export const smazPrvek = (serie: string, zavod: string, prvek: number) =>
  posliZaSebe<unknown>(
    `/sprava/serie/${serie}/zastavky/${zavod}/trat/prvky/${prvek}`,
    null,
    'DELETE',
  );

/**
 * <b>Přepíše prvek trati</b> — v appce jediné kvůli pořadí (*výš* /
 * *níž*). Posílá se celý tvar, protože server sadu přepisuje celou.
 */
export type PrvekVstup = S['PrvekVstup'];

export const upravPrvek = (
  serie: string,
  zavod: string,
  prvek: number,
  vstup: PrvekVstup,
) =>
  posliZaSebe<PrvekSpravy>(
    `/sprava/serie/${serie}/zastavky/${zavod}/trat/prvky/${prvek}`,
    vstup,
    'PUT',
  );

/**
 * <b>Co komise za jízdy vyhlásila</b> — změna úseku (ZPJ 33) a chybějící
 * značka (34).
 */
export type UkonZaJizdy = S['UkonDto'];

export const nactiUkony = (serie: string, zavod: string, cislo: number) =>
  nactiZaSebe<UkonZaJizdy[]>(
    `/sprava/serie/${serie}/zastavky/${zavod}/rozjizdky/${cislo}/ukony`,
  );

/**
 * <b>Vyhlášení úkonu za jízdy z telefonu.</b>
 *
 * <b>Posílá se čas z hodin telefonu</b>, stejně jako u trestů a startu:
 * mezi klepnutím a doručením je u vody výpadek, a vyhlášení zapsané
 * později je jiné vyhlášení, než jaké posádky viděly. Server čas bere,
 * leží-li v okně (`CasKlienta`); jinak platí jeho vlastní.
 *
 * <b>Trať se tím nemění</b> (Filip, 28. 10. 2026) — je to rozhodnutí nad
 * přijatou tratí, které platí pro rozjížďku, co se zrovna jede.
 */
export async function vyhlasUkon(
  serie: string,
  zavod: string,
  cislo: number,
  vstup: {
    druh: 'ZmenaUseku' | 'ChybejiciZnacka';
    prvek: number;
    kurz?: number | null;
    delka?: 'Beze' | 'Prodlouzeno' | 'Zkraceno';
    poznamka?: string | null;
  },
) {
  const v = await posliZaSebe<unknown>(
    `/sprava/serie/${serie}/zastavky/${zavod}/rozjizdky/${cislo}/ukony`,
    { ...vstup, vyhlasenoV: new Date().toISOString() },
  );
  if (v === null) throw new Error('neprihlasen');
  return v;
}

/**
 * <b>Odvolání úkonu.</b> Vlajka se stáhla — a to se stává: rozhodčí
 * vyhlásí změnu a než pole dopluje, ukáže se, že značka stojí.
 */
export async function odvolejUkon(
  serie: string,
  zavod: string,
  cislo: number,
  ukon: number,
) {
  const v = await posliZaSebe<unknown>(
    `/sprava/serie/${serie}/zastavky/${zavod}/rozjizdky/${cislo}/ukony/${ukon}`,
    null,
    'DELETE',
  );
  if (v === null) throw new Error('neprihlasen');
  return v;
}

/**
 * <b>Předčasný start: zapíše lodi OCS</b> (nález R35, ZPJ 29.1).
 *
 * <b>Proč to jde přes zápis výsledků, a ne přes vlastní úkon.</b> OCS
 * není krok procedury jako odložení nebo odvolání — je to <b>kód
 * výsledku</b> jedné lodi, tedy totéž, co se jinak zapisuje v cíli.
 * Server pro něj žádný zvláštní endpoint nemá a nemá ho mít: kdyby měl,
 * existovaly by dvě cesty, jak loď dostane kód, a rozešly by se.
 *
 * <b>Posílá se celá sada, ne jeden řádek</b> — to je smlouva
 * `ulozVysledky`: co v sadě není, výsledek nemá. Proto se zápis napřed
 * načte a změní se v něm jediná loď.
 *
 * <b>Zapisuje se OCS, ne DSQ</b> (rozhodnuto 29. 10. 2026): tak to
 * žádají pravidla. *„Kdyžtak se to změní"* je pak jeden řádek.
 */
export async function zapisPredcasnyStart(
  serie: string,
  zavod: string,
  cislo: number,
  prihlaskaId: number,
) {
  const zapis = await nactiZapis(serie, zavod, cislo);
  if (zapis === null) throw new Error('neprihlasen');

  // Loď s předčasným startem nemá pořadí: kód pořadí nahrazuje a server
  // by sadu s obojím odmítl (`Zapis.ProcNejdeUlozit`).
  const radky: ZapisRadekVstup[] = zapis.lode.map((l) =>
    l.prihlaskaId === prihlaskaId
      ? { prihlaskaId: l.prihlaskaId, poradiVCili: null, kod: 'Ocs', dojezdV: null }
      : {
          prihlaskaId: l.prihlaskaId,
          poradiVCili: l.poradiVCili ?? null,
          kod: l.kod ?? null,
          dojezdV: null,
        },
  );

  return ulozVysledky(serie, zavod, cislo, radky, zapis.revize);
}

/**
 * <b>Loď předčasný start odčinila</b> — kód se smaže (nález R35:
 * *„dlaždice OCS → loď → odčinila / neodčinila"*).
 *
 * Vrácení se posílá touž cestou jako zápis, celou sadou: zápis výsledků
 * je jeden dokument s revizí a dvě cesty k témuž by se rozešly. Loď se
 * hledá podle `prihlaskaId`, ne podle jména — jména se v poli opakují.
 */
export async function odcinilPredcasnyStart(
  serie: string,
  zavod: string,
  cislo: number,
  prihlaskaId: number,
) {
  const zapis = await nactiZapis(serie, zavod, cislo);
  if (zapis === null) throw new Error('neprihlasen');

  const radky: ZapisRadekVstup[] = zapis.lode.map((l) => ({
    prihlaskaId: l.prihlaskaId,
    poradiVCili: l.poradiVCili ?? null,
    kod: l.prihlaskaId === prihlaskaId ? null : (l.kod ?? null),
    dojezdV: null,
  }));

  return ulozVysledky(serie, zavod, cislo, radky, zapis.revize);
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

/**
 * <b>Co se dnes týká mojí lodi</b> (`GET /lod/dnes`).
 *
 * Klíčem, ne přihlášením: telefon posádky je spárovaný s lodí, a účet
 * by znamenal, že ho musí mít každý člen posádky zvlášť.
 *
 * Vrací `null` ve dvou různých případech, které se tu schválně
 * neodlišují: telefon nemá klíč, nebo dnes loď nikde nejede (204).
 * Obrazovka se v obou zachová stejně — nemá co ukázat — a rozlišovat
 * je by znamenalo dva prázdné stavy tam, kde stačí jeden.
 */
export async function nactiDnesniRegatu(): Promise<ZavodnikDnes | null> {
  // <b>Bez klíče se neodchází předčasně.</b> Dotaz se pošle tak jako
  // tak: v ukázce ho obslouží přibalený snímek, kde žádný klíč není,
  // a mimo ni odpoví server 401 — což je tentýž prázdný stav. Kdyby se
  // tu couvlo dřív, ukázka by zůstala prázdná a vypadalo by to jako
  // chybějící data.
  const k = await tajemstvi();
  const odpoved = await sit('/lod/dnes', {
    headers: k
      ? { accept: 'application/json', 'x-klic-lodi': k }
      : { accept: 'application/json' },
  });
  if (!odpoved.ok || odpoved.status === 204) return null;

  return (await odpoved.json()) as ZavodnikDnes;
}

/**
 * <b>Telefon se ozve</b> (`POST /klice/hlaseni`, nález R3).
 *
 * Posílá **jen** stav baterie, žádné souřadnice — to je celý smysl režimu
 * „hlásím se". Zpátky dostane čas, odkdy si má sám zapnout nahrávání (T−20).
 *
 * `null` znamená „nemám klíč" nebo chybu; volající se podle toho nezastaví,
 * protože stažený čas z minula platí dál. Viz `tracker/hlasim-se.ts`.
 */
export async function ozviSe(baterieProcent: number | null): Promise<HlaseniOdpoved | null> {
  return posliKlicem<HlaseniOdpoved>('/klice/hlaseni', { baterieProcent });
}

export async function posliKlicemPodrobne<T>(
  cesta: string,
  telo: unknown,
): Promise<OdpovedKlicem<T>> {
  const k = await tajemstvi();
  if (!k) return { stav: 'bez-klice' };

  const odpoved = await sit(cesta, {
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
  const doklad = await hlavickySebe();
  if (!doklad) return false;

  const odpoved = await sit(cesta, {
    method: metoda,
    headers: {
      accept: 'application/json',
      ...doklad,
      ...(telo === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(telo === undefined ? {} : { body: JSON.stringify(telo) }),
  });

  if (odpoved.status === 401) return false;
  if (!odpoved.ok) throw new Error(`API ${cesta} vrátilo ${odpoved.status}`);
  return true;
}

/**
 * Ohlásí další rozjížďku — založí ji, nic nespouští.
 *
 * <b>„Ohlásit", ne „zahájit"</b> (Filip, 29. 10. 2026): zahájení zní,
 * jako by se tím startovalo. Rozhodčí tímhle říká, že se pojede další;
 * čas a procedura přijdou až potom, druhým klepnutím.
 *
 * <b>Číslo určuje server</b>, ne appka, a proto tohle jediné z úkonů
 * startu nejde podržet ve frontě jako `cekajici-start.ts`: bez odpovědi
 * není co očíslovat. Když se to nepovede, rozhodčí to pozná hned —
 * tiché selhání by znamenalo, že čeká na odpočet, který nikdy nezačne.
 */
export async function ohlasRozjizdku(serie: string, zavod: string) {
  const v = await posliZaSebe<{ cislo?: number }>(
    `/sprava/serie/${serie}/vysledky/${zavod}/rozjizdky`,
    { doSerie: true },
  );
  if (v === null) throw new Error('neprihlasen');
  return v;
}
