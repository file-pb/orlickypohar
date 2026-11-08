/**
 * Ukázkový režim: appka bez serveru.
 *
 * <b>Proč.</b> Filip, 7. 11. 2026: *„když si to bude někdo chtít
 * prohlídnout, tam mu to nechci pouštět na serveru po telefonu a musíme
 * mít nějaký demo mód."* Z možností, jak to udělat, splní tu větu
 * doopravdy jen přibalený snímek — v ukázce appka <b>na síť nesáhne
 * vůbec</b>, ani kdyby byla online.
 *
 * <b>Data se nevymýšlejí.</b> `ukazka/snimek.json` pořizuje
 * `app/scripts/ukazka.py` z mocku (`tools/fake-api.py`), tedy z týchž
 * dat, na kterých se zkouší web. Ručně psaný snímek by se tvarem rozešel
 * se schématem a poznalo by se to, až by v appce zůstalo prázdno.
 *
 * <b>Zápisy se nezahazují, mění snímek v paměti.</b> Kdyby se jen
 * spolkly, ukázka by po klepnutí na *Ohlásit rozjížďku* neudělala nic
 * a vypadala by rozbitě. Mění se jen kopie v paměti; po vypnutí režimu
 * se zahodí a soubor zůstává, jaký byl.
 *
 * <b>Ukázka začíná deset minut před startem</b> (Filip, 7. 11. 2026:
 * *„ukázka simuluje obrazovku dejme tomu 10 minut do startu regaty
 * a pak podle pokynu a užití"*). Bez toho by prohlížející zapnul režim
 * a našel klidnou obrazovku — ve snímku jsou všechny regaty odjeté
 * a každá rozjížďka dokončená, takže odpočet, hlas ani cíl by si
 * nezkusil.
 *
 * <b>Deset, ne pět, a je v tom rozdíl.</b> Procedura trvá pět minut,
 * takže v desáté minutě ještě neběží: panel nabízí *Spustit startovní
 * proceduru* a prohlížející si pustí celou věc od začátku, i s hlasem
 * a klaksonem. Kdyby se otevřel uprostřed odpočtu, o tu půlku by přišel.
 *
 * <b>Režim se nepamatuje mezi spuštěními.</b> Zapnout ho jde jen klepnutím
 * v nabídce; po zabití appky je zase pryč. Je to pojistka proti tomu
 * nejhoršímu, co tahle věc umí — aby někdo u vody startoval rozjížďku
 * v ukázce a čekal, že se to stalo.
 *
 * Pravidla jsou oddělená od vykreslování a mají testy bez telefonu
 * (`app/testy/ukazka.test.ts`).
 */

import snimek from '../ukazka/snimek.json';
import type { components } from './schema';

type S = components['schemas'];

/** Co z odpovědi appka potřebuje. `Response` tomu vyhovuje tvarem. */
export type OdpovedSite = {
  status: number;
  ok: boolean;
  json: () => Promise<unknown>;
  /** Některá volání čtou tělo jako text (chybová hláška od serveru). */
  text: () => Promise<string>;
};

/** Snímek rozbalený do paměti; `null`, dokud režim neběží. */
let stav: Record<string, unknown> | null = null;

export function ukazkaBezi(): boolean {
  return stav !== null;
}

/**
 * Kolik minut do startu ukázka nachystá. Dvojnásobek procedury, aby se
 * dala spustit celá, ne jen dokoukat.
 */
export const DO_STARTU_MIN = 10;

/**
 * Nachystá rozjížďku, která startuje za deset minut.
 *
 * <b>Scéna se staví při zapnutí, ne ve snímku.</b> Čas ve snímku je
 * absolutní a za týden by zestaral; `teď + 10 minut` platí vždycky.
 *
 * <b>Přidává se nová, ne přepisuje stará.</b> Odjeté rozjížďky v ukázce
 * zůstávají, protože jsou to ty „různé stavy" — dokončená s výsledky
 * vedle čerstvé, která se teprve rozbíhá.
 *
 * Regata se bere ta, které ukázkový účet velí; `kdeVeli` na ni otevře
 * start a cíl, takže je to táž, ke které se prohlížející doklepe.
 */
/**
 * <b>Posune start blíž</b> — zkratka, aby se simulace dala ladit
 * rychleji (Filip, 7. 11. 2026: *„je to jenom abychom mohli pouštět
 * simulaci a ladit ji rychleji"*).
 *
 * Mění se čas startu, ne odpočet: tím projde celá partitura stejně jako
 * u vody, jen se vynechá čekání. Kdyby se přetáčel odpočet, byl by to
 * druhý zdroj pravdy o tom, kolik zbývá.
 *
 * <b>Jen v ukázce.</b> Mimo ni funkce nic neudělá — `stav` je `null`.
 */
export function posunStartUkazky(oS: number): void {
  if (!stav || oS <= 0) return;

  const driv = (kdy: string) => new Date(Date.parse(kdy) - oS * 1000).toISOString();

  for (const telo of Object.values(stav)) {
    const z = telo as S['ZavodDetailDto'] | undefined;
    if (!z || !Array.isArray(z.rozjizdky)) continue;
    for (const r of z.rozjizdky) {
      if (!r.startV || r.stav === 'Dokoncena' || r.stav === 'Zrusena') continue;
      r.startV = driv(r.startV);
    }
  }

  // <b>Pohled posádky má vlastní kopii času</b>, protože `/lod/dnes` se
  // skládá při zapnutí ukázky a `rozjizdky` v sobě nemá — smyčka výš ho
  // tedy mine. Dokud přeskok uměl jen rozhodčí, nevadilo to; od 7. 11.
  // 2026 ho umí i posádka a bez tohohle by si obrazovky odporovaly:
  // rozhodčí by odpočítával k posunutému startu a posádka by nad týmž
  // startem četla ten původní.
  const dnes = stav['/lod/dnes'] as
    | { startV?: string | null; nahravatOd?: string | null }
    | undefined;
  if (dnes?.startV) {
    dnes.startV = driv(dnes.startV);
    // T−20 se veze s ním: je to odvozená hodnota, ne druhý údaj.
    if (dnes.nahravatOd) dnes.nahravatOd = driv(dnes.nahravatOd);
  }
}

/**
 * <b>Pohled posádky do ukázky.</b> `/lod/dnes` nemá ve snímku co hledat —
 * snímek se bere z mocku pod přihlášením, kdežto tahle cesta jde klíčem.
 * Skládá se proto z téhož, co ukázka už má: z velené regaty a její
 * nachystané rozjížďky.
 *
 * <b>Loď je vymyšlená, a je to vidět.</b> Ukázkový účet žádnou nemá —
 * tvářit se, že ano, by znamenalo tvrdit o datech něco, co v nich není.
 */
function nachystejZavodnika(data: Record<string, unknown>): void {
  const ja = data['/ja'] as S['JaDto'] | undefined;
  const kde = (ja?.opravneni ?? []).find((o) => o.zavod);
  if (!kde?.zavod) return;

  const z = data[`/serie/${kde.serie}/zavody/${kde.zavod}`] as S['ZavodDetailDto'] | undefined;
  if (!z) return;

  const r = z.rozjizdky.find((x) => x.stav === 'Planovana' || x.stav === 'Probiha');

  data['/lod/dnes'] = {
    serie: kde.serie,
    zavod: kde.zavod,
    zavodNazev: z.nazev,
    lod: z.lode?.[0]?.lod ?? 'JOY',
    kategorie: z.lode?.[0]?.kategorie ?? null,
    // Plachetní číslo a telefony na lodi (zbytek R34). Ukázka je musí
    // nést, jinak by karta „Telefony na lodi" v ní nikdy nebyla vidět —
    // a právě ta je na té obrazovce nová.
    cisloPlachty: 'CZE 142',
    posadka: [
      {
        jmeno: 'Svoboda',
        ja: true,
        baterieProcent: 78,
        ozvalSeV: new Date(Date.now() - 8_000).toISOString(),
        vysila: true,
      },
      {
        jmeno: 'Nováková',
        ja: false,
        baterieProcent: 41,
        ozvalSeV: new Date(Date.now() - 3 * 60_000).toISOString(),
        vysila: true,
      },
      // Třetí se nehlásí — na břehu je to ta řádka, kvůli které karta
      // existuje. S třemi vysílajícími by ukázka tvrdila, že se nic
      // zajímavého stát nemůže.
      {
        jmeno: 'Dvořák',
        ja: false,
        baterieProcent: null,
        ozvalSeV: new Date(Date.now() - 12 * 60_000).toISOString(),
        vysila: false,
      },
    ],
    rozjizdka: r?.cislo ?? null,
    stavRozjizdky: r?.stav ?? null,
    startV: r?.startV ?? null,
    // T−20 proti času startu, jak ho počítá server (`Klice.Hlaseni`).
    nahravatOd: r?.startV
      ? new Date(Date.parse(r.startV) - 20 * 60_000).toISOString()
      : null,
    // <b>Ukázka musí obrazovku ukázat celou.</b> S prázdným `stavLodi`
    // a `pokyny` zbyl na obrazovce pruh a jméno lodi, a nebylo z čeho
    // poznat, k čemu je (Filip, 7. 11. 2026: *„nerozumím téhle
    // obrazovce"*). Dva záznamy stačí: pokyn komise a to, co o lodi
    // zapsal rozhodčí.
    stavLodi: {
      veta: 'Trest 720° — nevykonán',
      kdy: new Date(Date.now() - 4 * 60_000).toISOString(),
    },
    pokyny: [
      {
        druh: 'Odlozeni',
        veta: 'Start odložen, nový čas dostanete megafonem.',
        vyhlasenoV: new Date(Date.now() - 9 * 60_000).toISOString(),
      },
    ],
  };
}

function nachystejStart(data: Record<string, unknown>): void {
  const ja = data['/ja'] as S['JaDto'] | undefined;
  const kde = (ja?.opravneni ?? []).find((o) => o.zavod);
  if (!kde?.zavod) return;

  const z = data[`/serie/${kde.serie}/zavody/${kde.zavod}`] as S['ZavodDetailDto'] | undefined;
  if (!z) return;

  const cislo = Math.max(0, ...z.rozjizdky.map((r) => r.cislo)) + 1;
  z.rozjizdky.push({
    cislo,
    startV: new Date(Date.now() + DO_STARTU_MIN * 60_000).toISOString(),
    stav: 'Planovana',
    doSerie: true,
    vysledky: [],
  } as S['RozjizdkaDto']);

  // <b>Posunout rozjížďku nestačí, musí se posunout i regata.</b> Ve
  // snímku jsou všechny odjeté, takže v kalendáři ročníku by u téhle
  // stál štítek *odjeto* a datum ze září — a nikdo by dovnitř nešel
  // hledat odpočet, který se tam za chvíli rozběhne. Nalezeno zkouškou
  // v simulátoru 7. 11. 2026.
  const dnes = new Date().toISOString().slice(0, 10);
  z.stav = 'Vypsany';
  z.datum = dnes;
  z.datumKonce = null;

  // Kalendář ročníku má vlastní kopii téhož; kdyby se změnila jen jedna,
  // obrazovky by si odporovaly.
  const serie = data[`/serie/${kde.serie}`] as S['SerieDetailDto'] | undefined;
  const vKalendari = serie?.zavody?.find((x) => x.slug === kde.zavod);
  if (vKalendari) {
    vKalendari.stav = 'Vypsany';
    vKalendari.datum = dnes;
    vKalendari.datumKonce = null;
  }
}

/**
 * <b>Tresty v ukázce.</b> Snažit se je vecpat do snímů nedává smysl —
 * sníměk je odečtený stav webu a tresty vznikají až za jízdy. Drží se
 * proto zvlášť a žijí jen po dobu ukázky.
 *
 * <b>Dva předem uložené</b>, aby bylo co odkliknout hned po zapnutí:
 * jinak je pruh prázdný a nepozná se, že existuje.
 */
type TrestUkazky = {
  id: number;
  ucastId: number;
  lod: string;
  druh: 'Otacka360' | 'Otacka720';
  otacek: number;
  ulozenoV: string;
  vykonanoV: string | null;
};

let tresty: { cislo: number; trest: TrestUkazky }[] = [];
let dalsiTrestId = 1;

function nachystejTresty(data: Record<string, unknown>): void {
  tresty = [];
  dalsiTrestId = 1;

  const ja = data['/ja'] as S['JaDto'] | undefined;
  const kde = (ja?.opravneni ?? []).find((o) => o.zavod);
  if (!kde?.zavod) return;
  const z = data[`/serie/${kde.serie}/zavody/${kde.zavod}`] as S['ZavodDetailDto'] | undefined;
  if (!z) return;

  const r = z.rozjizdky.find((x) => x.stav === 'Planovana' || x.stav === 'Probiha');
  if (!r) return;

  const lode = listina(z);
  const zalozen = (i: number, druh: 'Otacka360' | 'Otacka720', predS: number) => {
    const l = lode[i];
    if (!l) return;
    tresty.push({
      cislo: r.cislo,
      trest: {
        id: dalsiTrestId++,
        ucastId: l.prihlaskaId,
        lod: l.lod,
        druh,
        otacek: druh === 'Otacka360' ? 1 : 2,
        ulozenoV: new Date(Date.now() - predS * 1000).toISOString(),
        vykonanoV: null,
      },
    });
  };
  zalozen(1, 'Otacka720', 84);
  zalozen(3, 'Otacka360', 12);
}

export function zapniUkazku(): void {
  // Pokaždé čerstvá kopie: druhá ukázka nemá začínat tam, kde skončila
  // ta první.
  stav = JSON.parse(JSON.stringify(snimek)) as Record<string, unknown>;
  nachystejStart(stav);
  nachystejZavodnika(stav);
  nachystejTresty(stav);
}

export function vypniUkazku(): void {
  stav = null;
}

/**
 * Kam ukázku otevřít, aby bylo co číst.
 *
 * Ukázka stojí na jedné identitě: `Organizator` jednoho závodu (dnes
 * `2026-nanecisto` / `izolepa`). Obrazovka toho závodu je to, co ukázka
 * vlastně ukazuje — start, cíl a trať tak, jak je vidí rozhodčí. Cesta se
 * proto **odvozuje ze snímku**, ne zapisuje natvrdo: až se snímek pořídí
 * znovu nad jiným závodem, povede odkaz s ním.
 *
 * Vrací rozebrané slugy, ne hotovou cestu: expo-router má typované cesty
 * a dynamickou adresu skládá z `pathname` a `params`, takže řetězec by
 * stejně musel volající rozebrat zpátky.
 *
 * `null` znamená, že ve snímku žádné oprávnění k závodu není — pak nemá
 * kam vést a volající zůstane, kde je.
 */
export function kamVUkazce(): { serie: string; zavod: string } | null {
  const ja = stav?.['/ja'] as S['JaDto'] | undefined;
  const kde = (ja?.opravneni ?? []).find((o) => o.zavod);
  return kde?.zavod && kde.serie ? { serie: kde.serie, zavod: kde.zavod } : null;
}

const odpoved = (status: number, telo: unknown = null): OdpovedSite => ({
  status,
  ok: status >= 200 && status < 300,
  json: () => Promise.resolve(telo),
  text: () => Promise.resolve(telo === null ? '' : JSON.stringify(telo)),
});

/** Cesta bez dotazu — snímek je klíčovaný cestou, ne celou adresou. */
const bezDotazu = (cesta: string) => cesta.split('?')[0];

/**
 * Regata, do které cesta míří. Zápisy chodí přes správu
 * (`/sprava/serie/{s}/vysledky/{z}/…`), ale měnit se musí to, co appka
 * čte veřejně — jinak by se obrazovka po uložení překreslila do starého.
 *
 * <b>I `zastavky`, ne jen `vysledky`.</b> Tresty za jízdy mají vlastní
 * větev správy (`/zastavky/…/tresty`) a tahle funkce ji dřív nepoznala,
 * takže si zápis trestu hledal regatu po svém — prvním klíčem, který
 * ve snímku vypadal jako regata. To je *24hodinovka*, ne ta otevřená,
 * a loď se v její listině nenašla, takže trest přistál v pruhu jako
 * holé „Loď" (Filip, 8. 11. 2026).
 */
function regata(cesta: string): S['ZavodDetailDto'] | null {
  const m = /^\/sprava\/serie\/([^/]+)\/(?:vysledky|zastavky)\/([^/]+)\//.exec(cesta);
  if (!m || !stav) return null;
  return (stav[`/serie/${m[1]}/zavody/${m[2]}`] as S['ZavodDetailDto'] | undefined) ?? null;
}

/**
 * Lodě na startovní listině, očíslované — snímek `prihlaskaId` nenese.
 *
 * <b>Zapsané kódy a pořadí se přibalí</b>, je-li rozjížďka po ruce.
 * Do 8. 11. 2026 tady stálo `kod: null` natvrdo, takže i uložený
 * předčasný start se při dalším čtení ztratil a zápis vypadal, jako by
 * se nic nestalo (Filip: *„dám OCS, vyberu loď, a neobjeví se"*).
 */
function listina(z: S['ZavodDetailDto'], cislo?: number): S['ZapisLodDto'][] {
  const r = cislo === undefined ? undefined : z.rozjizdky.find((x) => x.cislo === cislo);
  return z.lode
    .filter((l) => !l.vyloucena && l.potvrzena !== false)
    .map((l, i) => {
      const v = r?.vysledky.find((x) => x.lod === l.lod);
      return {
        prihlaskaId: i + 1,
        lod: l.lod,
        cisloPlachty: null,
        kategorie: l.kategorie,
        poradiVCili: v?.poradiVCili ?? null,
        kod: v?.kod ?? null,
        casSekundy: v?.casSekundy ?? null,
        naRegate: true,
      };
    });
}

/** Rozepsaný zápis cílové obrazovky, složený z veřejného detailu. */
function zapis(z: S['ZavodDetailDto'], cislo: number): unknown {
  const r = z.rozjizdky.find((x) => x.cislo === cislo);
  return {
    serie: '',
    serieNazev: '',
    zavod: z.slug,
    zavodNazev: z.nazev,
    stavZavodu: z.stav,
    cislo,
    stavVysledku: 'Koncept',
    duvodRevize: null,
    smiZapisovat: true,
    procNelze: null,
    lode: listina(z, cislo),
    startV: r?.startV ?? null,
    doSerie: r?.doSerie ?? true,
    smiPapir: false,
    revize: 1,
  };
}

/**
 * Odpověď ukázky. Čtení bere ze snímku, zápis ho mění.
 *
 * <b>Neznámá cesta vrací 404, ne prázdno.</b> Appka 404 umí (nepublikovaný
 * ročník se chová, jako by nebyl) a prázdná obrazovka je čitelnější než
 * vymyšlená odpověď, která by v ukázce tvrdila něco, co v ní není.
 */
/** Drží si ukázka velení? Přepne se, až si o ně rozhodčí řekne. */
let veliUkazka = false;

export function ukazkaOdpovez(cesta: string, init?: { method?: string; body?: string }): Promise<OdpovedSite> {
  if (!stav) return Promise.resolve(odpoved(503));

  const c = bezDotazu(cesta);
  const metoda = (init?.method ?? 'GET').toUpperCase();
  const telo = init?.body ? (JSON.parse(init.body) as Record<string, unknown>) : {};

  // Klíč k lodi ani registrace zařízení v ukázce nedávají smysl: prohlíží
  // si ji pořadatel bez vlastní lodi a upozornění by chodila z ukázky.
  // Odpovídá se jako bez klíče, ne chybou — appka ten stav umí.
  if (c.startsWith('/klice/') || c === '/zarizeni') return Promise.resolve(odpoved(401));

  // Tresty za jízdy mají vlastní cestu (`/zastavky/…`, ne `/vysledky/…`)
  // a vlastní úložiště, takže se obslouí dřív než sníměk.
  const mt = /\/rozjizdky\/(\d+)\/tresty(?:\/(\d+)\/vykonan|\/(\d+))?$/.exec(c);
  if (mt) {
    const cislo = Number(mt[1]);
    const moje = () => tresty.filter((x) => x.cislo === cislo).map((x) => x.trest);

    if (metoda === 'GET') return Promise.resolve(odpoved(200, moje()));

    if (mt[2]) {
      const t = tresty.find((x) => x.trest.id === Number(mt[2]));
      if (t) t.trest.vykonanoV = new Date().toISOString();
      return Promise.resolve(odpoved(200, t?.trest ?? {}));
    }

    if (mt[3] && metoda === 'DELETE') {
      tresty = tresty.filter((x) => x.trest.id !== Number(mt[3]));
      return Promise.resolve(odpoved(204));
    }

    if (metoda === 'POST') {
      const druh = (telo.druh as 'Otacka360' | 'Otacka720') ?? 'Otacka360';
      const zz = regata(c);
      const l = zz ? listina(zz).find((x) => x.prihlaskaId === telo.ucast) : undefined;
      const novy: TrestUkazky = {
        id: dalsiTrestId++,
        ucastId: Number(telo.ucast ?? 0),
        lod: l?.lod ?? 'Lo\u010f',
        druh,
        otacek: druh === 'Otacka360' ? 1 : 2,
        ulozenoV: (telo.ulozenoV as string) ?? new Date().toISOString(),
        vykonanoV: null,
      };
      tresty.push({ cislo, trest: novy });
      return Promise.resolve(odpoved(200, novy));
    }
  }

  // <b>Kdo velí.</b> Ve snímku to není a být nemůže — velení je stav
  // chvíle, ne zápis regaty. Ukázka tedy odpovídá sama: velí někdo
  // jiný, dokud si o velení rozhodčí neřekne. Bez toho by pilulka
  // v hlavičce zůstala navždy viset na „velení…".
  if (/\/vysledky\/[^/]+\/velitel$/.test(c)) {
    if (metoda === 'POST') veliUkazka = true;
    return Promise.resolve(
      odpoved(200, {
        uzivatelId: veliUkazka ? 'ukazka' : 'milos',
        jmeno: veliUkazka ? 'ty' : 'Miloš',
        odV: new Date().toISOString(),
        jsemTo: veliUkazka,
      }),
    );
  }

  if (metoda === 'GET') {
    if (c in stav) return Promise.resolve(odpoved(200, stav[c]));
    // Rozepsaný zápis se v snímku nedrží — skládá se z veřejného detailu,
    // aby ukázka uměla i cíl.
    const mz = /\/rozjizdky\/(\d+)$/.exec(c);
    const z = regata(c);
    if (mz && z) return Promise.resolve(odpoved(200, zapis(z, Number(mz[1]))));
    return Promise.resolve(odpoved(404));
  }

  const z = regata(c);
  if (!z) return Promise.resolve(odpoved(200, {}));

  // Ohlášení rozjížďky: číslo určuje server, tady tedy ukázka.
  if (/\/rozjizdky$/.test(c)) {
    const cislo = Math.max(0, ...z.rozjizdky.map((r) => r.cislo)) + 1;
    const nova = { cislo, startV: null, stav: 'Planovana', doSerie: true, vysledky: [] };
    z.rozjizdky.push(nova as S['RozjizdkaDto']);
    return Promise.resolve(odpoved(200, nova));
  }

  const mr = /\/rozjizdky\/(\d+)(\/[a-z-]+)?$/.exec(c);
  const r = mr ? z.rozjizdky.find((x) => x.cislo === Number(mr[1])) : undefined;
  if (!mr || !r) return Promise.resolve(odpoved(200, {}));

  switch (mr[2]) {
    case '/procedura': {
      // Čas startu počítá server z okamžiku stisku a délky procedury
      // (ZPJ 26). Ukázka to dělá stejně, jinak by odpočet začal jinde,
      // než kam ho panel nakreslí.
      const zapsanoV = typeof telo.zapsanoV === 'string' ? Date.parse(telo.zapsanoV) : Date.now();
      const delka = (z.delkaProceduryMin ?? 5) * 60_000;

      // <b>Všeobecné odvolání nový čas má</b>, a nepočítá se stejně jako
      // spuštění: vyzývací znamení padne **minutu** po spuštění prvního
      // opakovače (ZPJ 29.2) a od něj teprve uplyne celá procedura —
      // `Procedura.NovyStart` na serveru. Do 8. 11. 2026 tady odvolání
      // padalo do téhož `null` jako odklad.
      r.startV =
        telo.druh === 'Spustit'
          ? new Date(zapsanoV + delka).toISOString()
          : telo.druh === 'Odvolat'
            ? new Date(zapsanoV + 60_000 + delka).toISOString()
            : null;

      // <b>A všechny tři vracejí rozjížďku mezi plánované</b>
      // (`Procedura.StavPo`): procedura znamená, že se teprve pojede.
      // Bez tohohle řádku zůstala odvolaná rozjížďka v `Probiha`
      // a panel nad ní dál psal „jede" (Filip, 8. 11. 2026: *„spadne
      // to do okna rozjížďka jede"*).
      if (r.stav !== 'Zrusena') r.stav = 'Planovana';
      break;
    }
    case '/start': {
      // <b>Plánovaný start rozjížďku nerozjede.</b> Týmž endpointem se
      // zapisuje čas z rozpravy i skutečné odstartování a rozdíl je
      // jedině v tom, jestli ten čas už přišel — server proto počítá
      // `planovany = Planovana && kdy > ted` a `Probiha` nastaví jen
      // `if (!planovany)` (`ZapisSprava.cs`).
      //
      // Do 8. 11. 2026 tady ukázka nastavovala `Probiha` bezpodmínečně,
      // takže po zapsání času startu panel ohlásil „Rozjížďka jede
      // 0:00" — stav, do kterého se na produkci dostat nedá, a který
      // vypadal, jako by se mezitím spustila procedura.
      const kdy = typeof telo.startV === 'string' ? Date.parse(telo.startV) : Date.now();
      const planovany = r.stav === 'Planovana' && kdy > Date.now();
      if (typeof telo.startV === 'string') r.startV = telo.startV;
      if (!planovany && r.stav !== 'Zrusena') r.stav = 'Probiha';
      break;
    }
    case '/konec':
      r.stav = 'Dokoncena';
      break;
    case '/stav': {
      // <b>Zrušení rozjížďky.</b> Appka ho posílá jako stav výsledku
      // `Eliminovano` — eliminace a zrušení jsou na serveru dvě strany
      // téhož (`VysledkySprava`, nález R13). Do 8. 11. 2026 tahle větev
      // chyběla a `default` vracel prázdné „OK", takže ukázka po výběru
      // důvodu neudělala nic (Filip: *„vyberu důvod a nic se nestane"*).
      if (telo.stav !== 'Eliminovano') break;
      r.stav = 'Zrusena';

      // <b>Posádka to musí vidět taky.</b> `/lod/dnes` je vlastní pohled
      // složený při zapnutí ukázky, ne výřez z rozjížďky — bez tohohle
      // by rozhodčí rozjížďku zrušil a posádce by dál svítilo „Startuje
      // se". Tatáž past jako u posunu startu.
      const dnes = stav['/lod/dnes'] as
        | { rozjizdka?: number | null; stavRozjizdky?: string | null } | undefined;
      if (dnes && dnes.rozjizdka === r.cislo) dnes.stavRozjizdky = 'Zrusena';
      break;
    }
    case '/vysledky': {
      // <b>Zápis se musí uložit, ne jen odpovědět.</b> Do 8. 11. 2026
      // tahle větev vracela nezměněný zápis s revizí 2, takže se
      // v ukázce nic nezapsalo — a předčasný start, který appka posílá
      // právě touhle cestou (`zapisPredcasnyStart` skládá celou sadu),
      // zmizel beze stopy. Server kódy i pořadí ukládá k rozjížďce;
      // tady se tedy propíšou do jejích výsledků.
      const lode = listina(z);
      const radky = Array.isArray(telo.radky) ? telo.radky : [];
      for (const radek of radky as {
        prihlaskaId?: number;
        poradiVCili?: number | null;
        kod?: string | null;
      }[]) {
        const l = lode.find((x) => x.prihlaskaId === radek.prihlaskaId);
        if (!l) continue;
        const uz = r.vysledky.find((x) => x.lod === l.lod);
        const novy = {
          lod: l.lod,
          kategorie: l.kategorie,
          kormidelnik: null,
          poradiVCili: radek.poradiVCili ?? null,
          casSekundy: uz?.casSekundy ?? null,
          kod: (radek.kod ?? null) as S['VysledekDto']['kod'],
        };
        if (uz) Object.assign(uz, novy);
        else r.vysledky.push(novy);
      }
      // Revize roste, jinak by si appka myslela, že zapisuje ještě
      // někdo jiný, a další klepnutí by odmítla.
      const dalsi = (typeof telo.revize === 'number' ? telo.revize : 1) + 1;
      return Promise.resolve(odpoved(200, { ...(zapis(z, r.cislo) as object), revize: dalsi }));
    }
    default:
      break;
  }

  return Promise.resolve(odpoved(200, {}));
}
