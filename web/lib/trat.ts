import { tokenZeSezeni } from "@/lib/oidc";
import type { Stav } from "@/lib/sprava";
import type { components } from "./schema";

/**
 * Jak dlouho se čeká na API, než se to vzdá.
 *
 * <b>Bez limitu se čeká navždy</b>, a na vodě to vypadá jako zamrzlá
 * obrazovka: tlačítko zůstane na „Zapisuji…" a nikdo se nedozví, že se
 * nic neděje (Filip, 11. 10. 2026: *„zapisování startu z mapy po
 * přiřazení bodu zamrzne"*). Patnáct sekund je stejná mez jako
 * u radaru a větru — přes mobilní signál u přehrady je to dost
 * i na pomalé spojení.
 */
export const CEKAT_MS = 15_000;

/**
 * Stav trati: stavitelé hlásí hotovo, rozhodčí přijímá a zamyká, přestavba
 * odemyká.
 *
 * <b>Zámek je to podstatné.</b> Přijatá trať je veřejná, takže se do ní
 * nesmí sáhnout, aniž by se o tom venku vědělo — API pípnutí i sebrání
 * odmítne. Obrazovka to proto musí říct <b>dřív</b>, než na to člověk
 * narazí tlačítkem: formulář pípnutí se u zamčené trati schová a místo něj
 * stojí důvod.
 *
 * <b>Co kdo smí, rozhoduje server</b> a posílá to v odpovědi
 * (<c>smiHlasitHotovo</c>, <c>smiPrijmout</c>, <c>smiPrestavet</c>).
 * Obrazovka podle toho jen skrývá tlačítka; kdo pošle formulář přesto,
 * dostane odpověď z API.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

export type Trat = components["schemas"]["TratDto"];
export type StavTrati = components["schemas"]["StavTrati"];

/** Krok, kterým se stav posune. Jmenuje se stejně jako cesta v API. */
export type KrokTrati = "hotovo" | "prijeti" | "vraceni" | "prestavba";

/** Tatáž délka jako `Stavba.DuvodNejvic` v API. */
export const DUVOD_NEJVIC = 300;

const cesta = (serie: string, zavod: string) =>
  `${API}/sprava/serie/${encodeURIComponent(serie)}/zastavky/${encodeURIComponent(zavod)}/trat`;

/**
 * Stav trati. <c>trat: null</c> znamená, že regata nemá ani jednu bóji —
 * stavba začíná prvním pípnutím, ne zvláštním knoflíkem, takže to není
 * chyba ani výpadek.
 */
export async function nactiStavTrati(
  serie: string,
  zavod: string,
  /** Kterou trať chce obrazovka. Bez ní tu nejnovější, jako dřív. */
  trat?: number,
): Promise<{ stav: Stav; trat?: Trat | null }> {
  const t = await tokenZeSezeni();
  if (!t) return { stav: "neprihlasen" };

  let odpoved: Response;
  try {
    odpoved = await fetch(`${cesta(serie, zavod)}${trat ? `?trat=${trat}` : ""}`, {
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(CEKAT_MS),
    });
  } catch {
    return { stav: "vypadek" };
  }

  if (odpoved.status === 401) return { stav: "odmitnut" };
  if (odpoved.status === 403) return { stav: "nesmi" };
  // 404 tu neznamená „regata neexistuje", ale „ještě nemá bóji". Rozliší to
  // obrazovka bójí, která stejnou regatu načítá vedle.
  if (odpoved.status === 404) return { stav: "ok", trat: null };
  if (!odpoved.ok) return { stav: "vypadek" };

  return { stav: "ok", trat: (await odpoved.json()) as Trat };
}

/** Posune stav trati. Vrací chybu k zobrazení, nebo `null`. */
export async function posunTrat(
  serie: string,
  zavod: string,
  krok: KrokTrati,
  duvod?: string,
  /**
   * Trať, které se krok týká. <b>Bez ní server sáhne na nejnovější</b> —
   * a od chvíle, kdy má každá rozjížďka svou, to znamená přijmout trať,
   * na kterou se nikdo nedíval (Filip, 15. 10. 2026).
   */
  trat?: number,
): Promise<string | null> {
  const t = await tokenZeSezeni();
  if (!t) return "Přihlášení vypršelo. Přihlas se prosím znovu.";

  let odpoved: Response;
  try {
    odpoved = await fetch(
      `${cesta(serie, zavod)}/${krok}${trat ? `?trat=${trat}` : ""}`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${t}`,
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(krok === "vraceni" ? { duvod } : {}),
        cache: "no-store",
        signal: AbortSignal.timeout(CEKAT_MS),
      },
    );
  } catch {
    return "Nedaří se spojit s API. Zkus to za chvíli.";
  }

  if (odpoved.ok) return null;

  try {
    const telo = (await odpoved.json()) as { error?: string };
    if (telo?.error) return telo.error;
  } catch {
    // Tělo nemusí být JSON — 401 z ověřování ho nemá vůbec.
  }

  if (odpoved.status === 401) return "Přihlášení vypršelo. Přihlas se prosím znovu.";
  if (odpoved.status === 403)
    return krok === "prijeti" || krok === "vraceni"
      ? "Přijmout nebo vrátit trať smí jen rozhodčí ročníku."
      : "Do trati smí sáhnout pořadatel téhle regaty nebo rozhodčí ročníku.";
  return `API odpovědělo ${odpoved.status}.`;
}

export type Prvek = components["schemas"]["PrvekDto"];
export type TypPrvku = components["schemas"]["TypPrvku"];
export type StranaPrvku = components["schemas"]["StranaPrvku"];
export type PrvekVstup = components["schemas"]["PrvekVstup"];

/** Tatáž délka jako `Prvky.PoznamkaNejvic` v API. */
export const POZNAMKA_NEJVIC = 200;

/**
 * Jak se typ prvku jmenuje na obrazovce.
 *
 * <b>Čti to přes `nazevTypu`, ne přímo.</b> Změna kontraktu je dvoukroková
 * — nejdřív se nasadí API, teprve pak se přegeneruje klient a nasadí web —,
 * takže mezi tím chodí jména, která tenhle seznam ještě nezná. Prázdné
 * místo v tabulce vypadá jako porucha; syrové jméno je ošklivé, ale pravdivé.
 */
export const NAZVY_TYPU: Record<TypPrvku, string> = {
  OtocnaBoje: "otočná bóje",
  PrujezdniBoje: "průjezdní bóje",
  Brana: "brána",
  // Otočná brána se od průjezdní liší tím, *že* se v ní otáčí, ne kde:
  // stranu, okolo které loď točí, si volí posádka (Filip, 10. 10. 2026).
  OtocnaBrana: "otočná brána",
  Odskok: "odskok",
  OtocnaZona: "otočná zóna",
  // Start je start a cíl je cíl (Filip, 9. 10. 2026). „Startovní čára"
  // a „cílová čára" byly popisy tvaru, ne jména věcí.
  Start: "start",
  Cil: "cíl",
};

/**
 * Co o typu potřebuje vědět formulář. <b>Dva body, nebo jedna bóje</b> —
 * Filip, 10. 10. 2026: *„Tady bude vždy potřeba definovat dva body, na
 * rozdíl od ostatních typů."*
 */
export function dvaBody(typ: TypPrvku): boolean {
  return typ !== "OtocnaBoje" && typ !== "PrujezdniBoje";
}

/** Uvádí se u typu strana? U brány si ji volí loď, u čar rozhoduje směr. */
export function stranaPatri(typ: TypPrvku): boolean {
  return typ === "OtocnaBoje" || typ === "PrujezdniBoje" || typ === "Odskok";
}

export type SvetovaStrana = components["schemas"]["SvetovaStrana"];
export type DruhStartu = components["schemas"]["DruhStartu"];

/** Osm směrů, ne stupně: na vodě se člověk řídí rozhledem. */
export const SMERY: NonNullable<SvetovaStrana>[] = ["S", "SV", "V", "JV", "J", "JZ", "Z", "SZ"];

export const NAZVY_SMERU: Record<NonNullable<SvetovaStrana>, string> = {
  S: "na sever",
  SV: "na severovýchod",
  V: "na východ",
  JV: "na jihovýchod",
  J: "na jih",
  JZ: "na jihozápad",
  Z: "na západ",
  SZ: "na severozápad",
};

export const NAZVY_DRUHU_STARTU: Record<NonNullable<DruhStartu>, string> = {
  PevnaLinie: "pevná linie",
  OtevirajiciSeBrana: "otevírající se brána za startovací lodí",
};

/** Jméno typu, nebo syrová hodnota, když ji tenhle klient nezná. */
export function nazevTypu(typ: TypPrvku): string {
  return NAZVY_TYPU[typ] ?? typ;
}

/** Totéž pro stranu. */
export function nazevStrany(strana: NonNullable<StranaPrvku>): string {
  return NAZVY_STRAN[strana] ?? strana;
}

/**
 * <b>Levobok a pravobok</b> (Filip, 9. 10. 2026: *„Stranu nazývej levobok
 * a pravobok"*). Dřív tu stálo „ponechat po levé" — opis, který měl
 * zabránit tomu, aby si někdo „objíždí se levou" přečetl jako „točit
 * doleva". Opis to řešil za cenu toho, že to nebylo námořnicky: bok lodi
 * je levobok a pravobok, a tak to říká rozhodčí i na vodě.
 */
export const NAZVY_STRAN: Record<NonNullable<StranaPrvku>, string> = {
  PoLeve: "levobok",
  PoPrave: "pravobok",
};

/** Prvky trati v pořadí. Bez trati prázdno, ne chyba. */
export async function nactiPrvky(
  serie: string,
  zavod: string,
  /** Kterou trať. Bez ní tu nejnovější. */
  trat?: number,
): Promise<Prvek[]> {
  const t = await tokenZeSezeni();
  if (!t) return [];

  try {
    const odpoved = await fetch(`${cesta(serie, zavod)}/prvky${trat ? `?trat=${trat}` : ""}`, {
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(CEKAT_MS),
    });
    return odpoved.ok ? ((await odpoved.json()) as Prvek[]) : [];
  } catch {
    // Výpadek prvků nesmí shodit obrazovku bójí: bóje se dají stavět
    // i bez toho, aby se vědělo, co je brána.
    return [];
  }
}

/** Založí prvek. Vrací chybu k zobrazení, nebo `null`. */
export async function zalozPrvek(
  serie: string,
  zavod: string,
  vstup: PrvekVstup,
  /** Do které trati. Bez ní server založí na nejnovější. */
  trat?: number,
): Promise<string | null> {
  return await posli(`${cesta(serie, zavod)}/prvky${naTrati(trat)}`, "POST", vstup);
}

/**
 * Upraví prvek. Vrací chybu k zobrazení, nebo `null`.
 *
 * <b>Posílá se celý vstup</b>, ne jen změněná pole — API má na prvku
 * `PUT`, ne `PATCH`. Nerozepsané pole by se tím přepsalo prázdnem, takže
 * si volající musí zbytek vzít z `vstupZPrvku`.
 */
export async function upravPrvek(
  serie: string,
  zavod: string,
  prvek: number,
  vstup: PrvekVstup,
  trat?: number,
): Promise<string | null> {
  return await posli(`${cesta(serie, zavod)}/prvky/${prvek}${naTrati(trat)}`, "PUT", vstup);
}

/**
 * Prvek, jak ho vrací API, přeložený na vstup pro zápis.
 *
 * <b>Proč to je:</b> úprava jednoho pole musí poslat i všechna ostatní.
 * Kdyby si je skládala obrazovka ze skrytých políček, dal by se prvku
 * podstrčit jiný typ nebo jiná bóje — a hlavně by se na každé nové pole
 * muselo myslet na dvou místech.
 */
export function vstupZPrvku(p: Prvek): PrvekVstup {
  return {
    typ: p.typ,
    poradi: p.poradi,
    bojeAId: p.a.id,
    bojeBId: p.b?.id ?? null,
    strana: p.strana,
    poznamka: p.poznamka,
    smer: p.smer ?? null,
    druhStartu: p.druhStartu ?? null,
  };
}

/** Smaže prvek. Vrací chybu k zobrazení, nebo `null`. */
export async function smazPrvek(
  serie: string,
  zavod: string,
  prvek: number,
  trat?: number,
): Promise<string | null> {
  return await posli(`${cesta(serie, zavod)}/prvky/${prvek}${naTrati(trat)}`, "DELETE");
}

/** `?trat=` do adresy, nebo nic. Zámek i cíl zápisu se ptají téhle trati. */
const naTrati = (trat?: number) => (trat ? `?trat=${trat}` : "");

async function posli(adresa: string, metoda: string, telo?: unknown): Promise<string | null> {
  const t = await tokenZeSezeni();
  if (!t) return "Přihlášení vypršelo. Přihlas se prosím znovu.";

  let odpoved: Response;
  try {
    odpoved = await fetch(adresa, {
      method: metoda,
      headers: {
        authorization: `Bearer ${t}`,
        accept: "application/json",
        ...(telo ? { "content-type": "application/json" } : {}),
      },
      body: telo ? JSON.stringify(telo) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(CEKAT_MS),
    });
  } catch {
    return "Nedaří se spojit s API. Zkus to za chvíli.";
  }

  if (odpoved.ok) return null;

  try {
    const chyba = (await odpoved.json()) as { error?: string };
    if (chyba?.error) return chyba.error;
  } catch {
    // Tělo nemusí být JSON.
  }

  if (odpoved.status === 401) return "Přihlášení vypršelo. Přihlas se prosím znovu.";
  if (odpoved.status === 403)
    return "Do trati smí sáhnout pořadatel téhle regaty nebo rozhodčí ročníku.";
  return `API odpovědělo ${odpoved.status}.`;
}

export type TratNaVyber = components["schemas"]["TratNaVyberDto"];

/** Jména stavů trati pro nabídku „jede se tahle". */
export const NAZVY_STAVU: Record<NonNullable<StavTrati>, string> = {
  Rozestaveno: "staví se",
  Hotovo: "hotová, čeká na rozhodčího",
  Prijato: "přijatá",
  Prestavba: "přestavuje se",
};

/**
 * Tratě regaty na výběr, od nejnovější. Prázdno, když regata trať nemá —
 * to není chyba, stavba začíná první bójí.
 */
/**
 * Tratě regaty k výběru. <b><c>null</c> znamená výpadek</b>, ne prázdno.
 *
 * <para>
 * Dřív se vracelo prázdné pole na obojí a sekce „Tratě regaty" se na
 * prázdném poli nevykreslila vůbec — při výpadku API tak zmizelo
 * přiřazení trati rozjížďce i klonování, beze stopy a bez hlášky. Stavitel
 * neměl jak poznat rozdíl mezi „žádné tratě" a „nepodařilo se načíst"
 * (průchod scénáři Izolepy, 15. 10. 2026).
 * </para>
 */
export async function nactiTrate(
  serie: string,
  zavod: string,
): Promise<TratNaVyber[] | null> {
  const t = await tokenZeSezeni();
  // Nepřihlášený žádné tratě nemá — to je prázdno, ne výpadek.
  if (!t) return [];

  try {
    const odpoved = await fetch(`${cesta(serie, zavod)}/seznam`, {
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(CEKAT_MS),
    });
    return odpoved.ok ? ((await odpoved.json()) as TratNaVyber[]) : null;
  } catch {
    return null;
  }
}

/**
 * Zkrátí trať: od teď je cíl u zadaného prvku. Vrací text chyby, nebo
 * `null`. <b>Co jde a co ne, hlídá server</b> — jen u běžící rozjížďky
 * a ne u posledního prvku.
 */
export async function zkratTrat(
  serie: string,
  zavod: string,
  trat: number,
  prvek: number,
): Promise<string | null> {
  return await posli(`${cesta(serie, zavod)}/${trat}/zkraceni`, "POST", { prvek });
}

/** Zruší zkrácení — jede se zase celá trať. */
export async function zrusZkraceni(
  serie: string,
  zavod: string,
  trat: number,
): Promise<string | null> {
  return await posli(`${cesta(serie, zavod)}/${trat}/zkraceni`, "DELETE");
}

/** Přiřadí volnou trať rozjížďce. Vrací text chyby, nebo `null`. */
export async function priradTrat(
  serie: string,
  zavod: string,
  trat: number,
  rozjizdka: number,
): Promise<string | null> {
  return await posli(`${cesta(serie, zavod)}/${trat}/rozjizdka`, "POST", { rozjizdka });
}

/**
 * Odškrtne trati rozjížďku. Vrací text chyby a příznak, že se server ptá
 * na potvrzení (odpoví 409) — <b>potvrzení není chyba vstupu</b>, takže to
 * obrazovka musí poznat bez čtení textu.
 */
export async function odvazTrat(
  serie: string,
  zavod: string,
  trat: number,
  potvrzeno: boolean,
): Promise<{ chyba: string | null; potvrdit: boolean }> {
  const t = await tokenZeSezeni();
  if (!t) return { chyba: "Přihlášení vypršelo. Přihlas se prosím znovu.", potvrdit: false };

  const adresa = `${cesta(serie, zavod)}/${trat}/rozjizdka${potvrzeno ? "?potvrzeno=true" : ""}`;
  try {
    const odpoved = await fetch(adresa, {
      method: "DELETE",
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(CEKAT_MS),
    });
    if (odpoved.ok) return { chyba: null, potvrdit: false };

    const telo = (await odpoved.json().catch(() => null)) as
      | { error?: string; potvrdit?: boolean }
      | null;
    return {
      chyba:
        telo?.error ??
        (odpoved.status === 401
          ? "Přihlášení vypršelo. Přihlas se prosím znovu."
          : odpoved.status === 403
            ? "Do trati smí sáhnout pořadatel téhle regaty nebo rozhodčí ročníku."
            : `API odpovědělo ${odpoved.status}.`),
      potvrdit: odpoved.status === 409 && telo?.potvrdit === true,
    };
  } catch {
    return { chyba: "Nedaří se spojit s API. Zkus to za chvíli.", potvrdit: false };
  }
}

/**
 * Zahodí trať i s prvky. Vrací text chyby a příznak, že se server ptá na
 * potvrzení — stejně jako <see cref="odvazTrat"/>.
 *
 * <b>Rozjížďka tím trať ztratí</b> (Filip, 19. 10. 2026: *„trať smazat,
 * rozjížďka by tím pádem tu trať odepla"*). Vazba sedí na trati, takže
 * smazáním zmizí sama; odvazovat zvlášť předem není potřeba.
 *
 * <b>Záznamy bójí zůstávají</b> — prvek na ně jen ukazuje, bóje pořád
 * stojí ve vodě a jejich poloha je měření, které se stalo.
 */
export async function zahodTrat(
  serie: string,
  zavod: string,
  trat: number,
  potvrzeno: boolean,
): Promise<{ chyba: string | null; potvrdit: boolean }> {
  const t = await tokenZeSezeni();
  if (!t) return { chyba: "Přihlášení vypršelo. Přihlas se prosím znovu.", potvrdit: false };

  const adresa = `${cesta(serie, zavod)}/${trat}${potvrzeno ? "?potvrzeno=true" : ""}`;
  try {
    const odpoved = await fetch(adresa, {
      method: "DELETE",
      headers: { authorization: `Bearer ${t}`, accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(CEKAT_MS),
    });
    if (odpoved.ok) return { chyba: null, potvrdit: false };

    const telo = (await odpoved.json().catch(() => null)) as
      | { error?: string; potvrdit?: boolean }
      | null;
    return {
      chyba:
        telo?.error ??
        (odpoved.status === 401
          ? "Přihlášení vypršelo. Přihlas se prosím znovu."
          : odpoved.status === 403
            ? "Do trati smí sáhnout pořadatel téhle regaty nebo rozhodčí ročníku."
            : `API odpovědělo ${odpoved.status}.`),
      potvrdit: odpoved.status === 409 && telo?.potvrdit === true,
    };
  } catch {
    return { chyba: "Nedaří se spojit s API. Zkus to za chvíli.", potvrdit: false };
  }
}

/**
 * Naklonuje trať. <b>Kopíruje prvky na tytéž bóje</b> — žádná nová
 * pípnutí; vyrobila by se tím měření, která se nestala.
 */
export async function klonujTrat(
  serie: string,
  zavod: string,
  trat: number,
  rozjizdka: number | null,
  stav: StavTrati | null,
): Promise<string | null> {
  return await posli(`${cesta(serie, zavod)}/${trat}/klon`, "POST", { rozjizdka, stav });
}

/**
 * Založí další, prázdnou trať regaty. Vrací chybu k zobrazení, nebo `null`.
 *
 * <b>Opakované volání vrací tutéž trať</b>, dokud ta prázdná nedostane
 * rozjížďku — hlídá to API, aby po dvojím kliknutí na plus regatě
 * nepřibyly dvě prázdné tratě, které nejdou uklidit. Obrazovka proto
 * nemusí nic blokovat.
 */
export async function zalozDalsiTrat(serie: string, zavod: string): Promise<string | null> {
  return await posli(`${cesta(serie, zavod)}/dalsi`, "POST");
}
