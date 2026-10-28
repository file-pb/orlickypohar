import { tokenZeSezeni } from "@/lib/oidc";
import { NEJVIC_MB } from "@/lib/fotky";
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
/**
 * Zápis rozjížďky. <b>`delkaProceduryMin` a `opakovanychStartu` jsou
 * dopsané ručně</b> (28. 10. 2026) — typy se generují z běžícího API a to
 * bez databáze nenaběhne; viz {@link KodVysledku}.
 */
export type ZapisRozjizdky = S["ZapisRozjizdkyDto"] & {
  delkaProceduryMin?: number;
  opakovanychStartu?: number;
  /** Kdo velí startu regaty; `null`, když nikdo (nález R19). */
  velitel?: string | null;
  /** Velí ten, kdo se dívá? */
  veliS?: boolean;
};
export type ZapisLod = S["ZapisLodDto"];
/** Řádek zápisu. `kod` je rozšířený o nové hodnoty — viz {@link KodVysledku}. */
export type ZapisRadek = Omit<S["ZapisRadekVstup"], "kod"> & {
  kod?: KodVysledku | null;
};
export type Navrhy = S["NavrhyDto"];
export type Navrh = S["NavrhDto"];
export type NavrhRadek = S["NavrhRadekDto"];
// Dokument popisuje kód včetně `null`, protože u výsledku je nepovinný.
// Jako klíč slovníku a hodnota v nabídce ale prázdný být nesmí.
/**
 * Kód výsledku. <b>Čtyři hodnoty jsou dopsané ručně</b> (`Zfp`, `Ufd`,
 * `Bfd`, `Dne` z 28. 10. 2026) a je to výjimka s důvodem: typy se generují
 * z OpenAPI **běžícího** API, jenže to při startu pouští migrace a bez
 * databáze nenaběhne — a na pracovním stroji databáze nejede (README,
 * *Klient API*). Při příštím generování se objeví ve `schema.d.ts`
 * a tenhle průnik se smaže.
 */
export type KodVysledku = NonNullable<S["KodVysledku"]> | "Zfp" | "Ufd" | "Bfd" | "Dne";

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
  // Čtyři kódy z 28. 10. 2026 (nálezy K1 a R14). Popisek říká, co kód
  // znamená pro loď — ne číslo pravidla: ten, kdo zapisuje, hledá „co se
  // té lodi stalo", a ZPJ si přečte ve vypsání. Pozor: startovní tresty
  // jsou na poháru dohoda z rozpravy, ne ZPJ 30 (nález R16).
  Zfp: "bodový trest 20 %",
  Ufd: "diskvalifikace od startu",
  Bfd: "diskvalifikace černou vlajkou",
  Dne: "diskvalifikace, nelze vyškrtnout",
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
  // <b>Protesty v téhle větě nemají co dělat</b> (nález K2 oponentury
  // rozhodčího, 28. 10. 2026). Stávalo tu *„Protesty vyřízené, pořadí
  // platí"*, zatímco aplikace o protestech neví nic: nemá tabulku protestů,
  // nezná protestní časový limit (ZPJ 60.3(b)) ani kam zapsat, že se
  // jeden projednává. Byla to tedy věta, kterou si nemá čím ověřit — a
  // klepne ji rozhodčí, který třeba o protestu ví a nemá kde ho zapsat.
  // Nová věta říká jen to, co rozhodčí doopravdy podepisuje. Protesty
  // zůstávají venku přiznaně, jako celek s vlastním rozhodnutím.
  // Tentýž text je u `StavVysledku.Schvaleno` v `Zavod.cs` — ať se
  // nerozejdou.
  Schvaleno: {
    stitek: "schváleno",
    tlacitko: "Schválit",
    popis: "Pořadí v cíli sedí, rozhodčí ho podepsal.",
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
  // <b>Zrušená, ne „eliminovaná"</b> (Filip, 16. 10. 2026). Pod tím slovem
  // se na vodě rozhoduje: nefouká, rušíme. Stav v modelu se jmenuje dál
  // `Eliminovano`, protože je to tentýž fakt z druhé strany — rozjížďka,
  // která neplatí nikde, se nejela — a přejmenovávat ho v databázi kvůli
  // slovu na tlačítku nemá smysl.
  Eliminovano: {
    stitek: "zrušená",
    tlacitko: "Zrušit rozjížďku",
    popis: "Nejela se, nebo neplatí. Nepočítá se do závodu ani do poháru.",
  },
};

export const nazevStavu = (stav: StavVysledku) => STAVY[stav].stitek;

/**
 * Co udělá tlačítko, které vede ze stavu <c>ze</c> do stavu <c>na</c>.
 *
 * <b>Stejný cíl neznamená stejný úkon</b> (Filip, 20. 10. 2026: *„odjeli
 * jsme rozjížďku, ale nemáme jak ji schválit — furt je tam k revizi, nějak
 * tam není logika v tom flow odjeté rozjížďky"*). Z revize i ze zrušené
 * rozjížďky vede jediná cesta vpřed, a to na „Navrženo". Jenže popsaná
 * byla slovem <b>„Vrátit do návrhu"</b>, které zní jako couvnutí — takže
 * to jediné tlačítko, které zápis posouvá dál, vypadalo jako krok zpátky
 * a obrazovka nedávala smysl.
 *
 * Z „Ověřeno" nebo „Schváleno" je to naopak couvnutí doopravdy, a tam ten
 * text zůstává.
 */
export function krokZe(
  ze: StavVysledku,
  na: StavVysledku,
): { tlacitko: string; popis: string } {
  if (na === "Navrzeno" && ze === "KRevizi")
    return {
      tlacitko: "Otevřít k opravě",
      popis: "Zápis se odemkne. Po opravě projde ověřením a schválením znovu.",
    };

  if (na === "Navrzeno" && ze === "Eliminovano")
    return {
      tlacitko: "Vrátit do hry",
      popis: "Rozjížďka se zase počítá. Zápis začíná od návrhu.",
    };

  return { tlacitko: STAVY[na].tlacitko, popis: STAVY[na].popis };
}

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
  if (odpoved.status === 404) return "Rozjížďka, regata nebo ročník neexistuje.";
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

/**
 * Celá sada výsledků rozjížďky. Loď, která v ní nemá pořadí ani kód,
 * výsledek nemá.
 *
 * <b>`revize` je podoba sady, ze které formulář vyšel.</b> Uložení maže
 * lodě, které v sadě nejsou, takže sada ze starší podoby umí smazat
 * opravu, o které tenhle formulář nevěděl — API ji proto odmítne.
 */
export async function ulozZapis(
  serie: string,
  zavod: string,
  cislo: number,
  radky: ZapisRadek[],
  revize: number,
): Promise<string | null> {
  return zapis(
    kam(serie, `/${encodeURIComponent(zavod)}/rozjizdky/${cislo}/vysledky`),
    { radky, revize },
    "PUT",
  );
}

/** Přidá rozjížďku a vrátí její číslo — obrazovka pak jde rovnou na její zápis. */
export async function pridejRozjizdku(
  serie: string,
  zavod: string,
  doSerie = true,
): Promise<{ chyba: string } | { cislo: number }> {
  const odpoved = await posli(kam(serie, `/${encodeURIComponent(zavod)}/rozjizdky`), { doSerie }, "POST");

  if (typeof odpoved === "string") return { chyba: odpoved };
  if (!odpoved.ok) return { chyba: await hlaska(odpoved) };

  return { cislo: ((await odpoved.json()) as RozjizdkaRadek).cislo };
}

/**
 * Cílová obrazovka (22. 9. 2026): uloží celou sadu a vrátí zápis tak, jak
 * ho teď vidí API, nebo hlášku. Na rozdíl od formuláře tu odpověď potřeba
 * je — obrazovka podle ní ukazuje „uloženo".
 */
export async function ulozCil(
  serie: string,
  zavod: string,
  cislo: number,
  radky: ZapisRadek[],
  revize: number,
): Promise<{ chyba: string; konflikt?: boolean } | { zapis: ZapisRozjizdky }> {
  const odpoved = await posli(
    kam(serie, `/${encodeURIComponent(zavod)}/rozjizdky/${cislo}/vysledky`),
    { radky, revize },
    "PUT",
  );
  if (typeof odpoved === "string") return { chyba: odpoved };

  // Konflikt není chyba v datech a nemá se opakovat: rozjížďku mezitím
  // uložil někdo jiný a dokud to člověk nerozhodne, posílat tutéž sadu
  // dokola nemá smysl. Obrazovka si svou sadu nechává.
  if (odpoved.status === 409) return { chyba: await hlaska(odpoved), konflikt: true };

  if (!odpoved.ok) return { chyba: await hlaska(odpoved) };
  return { zapis: (await odpoved.json()) as ZapisRozjizdky };
}

/**
 * Start rozjížďky. Cílová obrazovka posílá čas z telefonu: dojezdy měří
 * týmiž hodinami, takže naměřený čas nezávisí na tom, jak se hodiny
 * telefonu rozcházejí se serverem. Bez času platí okamžik, kdy požadavek
 * dojde na server.
 */
/**
 * Úkony startovní procedury (nálezy R5 a R12, 28. 10. 2026).
 *
 * <b>Čas se neposílá</b>: spuštění i odvolání si ho počítají z pravidel
 * (ZPJ 26 a 29.2) a z délky procedury regaty. Poslat vlastní čas by
 * znamenalo obejít to pravidlo — a u odvolání je ten čas závazný.
 */
export type DruhProcedury = "Spustit" | "Odlozit" | "Odvolat";

/**
 * Převezme velení startu regaty (nález R19, rozhodnuto 28. 10. 2026).
 *
 * <b>Slave o velení aktivně požádá</b> a nikdy si ho nevezme sám. Jde to
 * kdykoliv, i uprostřed odpočtu — hlavní spadlý do vody tři minuty před
 * startem je ten případ, kvůli kterému to vzniklo.
 */
export async function prevezmiVeleni(
  serie: string,
  zavod: string,
): Promise<{ chyba: string } | { ok: true }> {
  const odpoved = await posli(kam(serie, `/${encodeURIComponent(zavod)}/velitel`), {}, "POST");
  if (typeof odpoved === "string") return { chyba: odpoved };
  if (!odpoved.ok) return { chyba: await hlaska(odpoved) };
  return { ok: true };
}

export async function procedura(
  serie: string,
  zavod: string,
  cislo: number,
  druh: DruhProcedury,
): Promise<{ chyba: string } | { zapis: ZapisRozjizdky }> {
  const odpoved = await posli(
    kam(serie, `/${encodeURIComponent(zavod)}/rozjizdky/${cislo}/procedura`),
    { druh },
    "POST",
  );
  if (typeof odpoved === "string") return { chyba: odpoved };
  if (!odpoved.ok) return { chyba: await hlaska(odpoved) };
  return { zapis: (await odpoved.json()) as ZapisRozjizdky };
}

export async function odstartuj(
  serie: string,
  zavod: string,
  cislo: number,
  startV?: string,
): Promise<{ chyba: string } | { zapis: ZapisRozjizdky }> {
  const odpoved = await posli(
    kam(serie, `/${encodeURIComponent(zavod)}/rozjizdky/${cislo}/start`),
    startV ? { startV } : {},
    "POST",
  );
  if (typeof odpoved === "string") return { chyba: odpoved };
  if (!odpoved.ok) return { chyba: await hlaska(odpoved) };
  return { zapis: (await odpoved.json()) as ZapisRozjizdky };
}

/**
 * Zastaví časomíru rozjížďky, nebo ji pustí znovu.
 *
 * <b>Zastavením je rozjížďka dojetá</b>, i když lodě ještě nemají dojezd
 * ani kód (Filip, 20. 10. 2026: *„lodě bez cíle dopíšeme, ale čas už
 * zastav"*). Zápis zůstává otevřený a dopisuje se dál.
 */
export async function konecRozjizdky(
  serie: string,
  zavod: string,
  cislo: number,
  /** `false` zastavení zruší a čas běží dál — opakování startu to udělá samo. */
  zastavit: boolean,
): Promise<{ chyba: string } | { zapis: ZapisRozjizdky }> {
  const odpoved = await posli(
    kam(serie, `/${encodeURIComponent(zavod)}/rozjizdky/${cislo}/konec`),
    zastavit ? {} : { pustit: true },
    "POST",
  );
  if (typeof odpoved === "string") return { chyba: odpoved };
  if (!odpoved.ok) return { chyba: await hlaska(odpoved) };
  return { zapis: (await odpoved.json()) as ZapisRozjizdky };
}

/** Snímky zápisu od jednotlivých zapisovatelů (krok 4). */
export const nactiNavrhy = (serie: string, zavod: string, cislo: number) =>
  cti<Navrhy>(kam(serie, `/${encodeURIComponent(zavod)}/rozjizdky/${cislo}/navrhy`));

/** Přepíše výsledky rozjížďky snímkem jednoho zapisovatele. */
export async function pouzijNavrh(
  serie: string,
  zavod: string,
  cislo: number,
  autor: string,
): Promise<string | null> {
  return zapis(
    kam(serie, `/${encodeURIComponent(zavod)}/rozjizdky/${cislo}/navrhy/${autor}/pouzit`),
    {},
  );
}

/** Poznávací znak lodi na regatě. Prázdný ho smaže. */
export async function nastavZnak(
  serie: string,
  zavod: string,
  prihlaskaId: number,
  znak: string,
): Promise<string | null> {
  return zapis(
    kam(serie, `/${encodeURIComponent(zavod)}/lode/${prihlaskaId}/znak`),
    { znak },
    "PUT",
  );
}

/** Zařadí rozjížďku do poháru, nebo ji z něj vyndá. */
export async function zaradDoPoharu(
  serie: string,
  zavod: string,
  cislo: number,
  doSerie: boolean,
): Promise<string | null> {
  return zapis(kam(serie, `/${encodeURIComponent(zavod)}/rozjizdky/${cislo}/pohar`), { doSerie });
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

/**
 * Fotka papírového zápisu. Autora doplní API z přihlášeného a souhlas se
 * neptá — doklad z cíle se nikde nezveřejňuje.
 */
export async function nahrajPapir(
  serie: string,
  zavod: string,
  cislo: number,
  soubor: File,
): Promise<string | null> {
  const t = await token();
  if (!t) return "Přihlášení vypršelo. Přihlas se prosím znovu.";

  const telo = new FormData();
  telo.set("soubor", soubor, soubor.name);

  try {
    const odpoved = await fetch(
      kam(serie, `/${encodeURIComponent(zavod)}/rozjizdky/${cislo}/papir`),
      {
        method: "PUT",
        headers: { authorization: `Bearer ${t}`, accept: "application/json" },
        body: telo,
        cache: "no-store",
      },
    );
    if (odpoved.ok) return null;
    return odpoved.status === 413 ? `Fotka může mít nejvýš ${NEJVIC_MB} MB.` : await hlaska(odpoved);
  } catch {
    return "API se nedaří zavolat.";
  }
}

export async function odeberPapir(
  serie: string,
  zavod: string,
  cislo: number,
): Promise<string | null> {
  const t = await token();
  if (!t) return "Přihlášení vypršelo. Přihlas se prosím znovu.";

  try {
    const odpoved = await fetch(
      kam(serie, `/${encodeURIComponent(zavod)}/rozjizdky/${cislo}/papir`),
      {
        method: "DELETE",
        headers: { authorization: `Bearer ${t}`, accept: "application/json" },
        cache: "no-store",
      },
    );
    return odpoved.ok ? null : await hlaska(odpoved);
  } catch {
    return "API se nedaří zavolat.";
  }
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
