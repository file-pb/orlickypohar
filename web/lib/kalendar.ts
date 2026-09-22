import { tokenZeSezeni } from "@/lib/oidc";
import type { components } from "./schema";
import type { Stav } from "@/lib/sprava";

/**
 * Volání správy kalendáře. Vedle `lib/clanky.ts` a `lib/sprava.ts` ze
 * stejného důvodu, z jakého jsou oddělené ty dvě: tahle je o termínech
 * a stavech regat. Sdílejí jen typ <c>Stav</c>, protože odpověď
 * „nepřihlášen / odmítnut / nesmí" je u všech tatáž otázka.
 *
 * <b>Token zůstává na serveru.</b> Leží v cookie, kterou prohlížeč jen vozí
 * s sebou; do stránky se nikdy nevypisuje.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

type S = components["schemas"];

export type PrehledZastavek = S["PrehledZastavekDto"];
export type ZastavkaRadek = S["ZastavkaRadek"];
export type ZastavkaVstup = S["ZastavkaVstup"];
export type StavZavodu = S["StavZavodu"];
export type DruhZastavky = S["DruhZastavky"];

/**
 * Co tlačítko udělá a co to znamená.
 *
 * <b>Nápisy jsou slovesa, ne názvy stavů.</b> Na štítku stojí „vypsáno",
 * protože popisuje, jak to je; na tlačítku „Vypsat závod", protože se
 * klikáním něco dělá. Tentýž text na obojím by znamenal, že se nedá poznat,
 * jestli je regata vypsaná, nebo se vypsat teprve má.
 *
 * <c>Record</c> je tu naschvál: nový stav v modelu tak shodí překlad webu,
 * ne až prázdné tlačítko na stránce — přesně to se stalo se stavem
 * <c>Potvrzeny</c>.
 */
export const PRECHODY: Record<StavZavodu, { tlacitko: string; popis: string }> = {
  Planovany: { tlacitko: "Vrátit do plánu", popis: "Zpátky mezi nejisté termíny." },
  Potvrzeny: { tlacitko: "Potvrdit termín", popis: "Termín platí. Závod ještě není vypsaný." },
  Vypsany: { tlacitko: "Vypsat závod", popis: "Vypsání a plachetní směrnice jsou venku." },
  Odjety: { tlacitko: "Odjeto", popis: "Závod proběhl. Teprve teď dávají výsledky smysl." },
  Zruseny: { tlacitko: "Zrušit", popis: "Nekonal se. Do poháru se nepočítá vůbec." },
};

/**
 * Nápisy u komunitní akce. Stavy jsou tytéž, ale „Vypsat závod" a „Odjeto"
 * by u setkání lhaly — a „Do poháru se nepočítá" u zrušené akce by
 * naznačovalo, že se jinak počítala.
 */
const PRECHODY_AKCE: Partial<Record<StavZavodu, { tlacitko: string; popis: string }>> = {
  Potvrzeny: { tlacitko: "Potvrdit termín", popis: "Termín platí. Akce ještě není oznámená." },
  Vypsany: { tlacitko: "Oznámit akci", popis: "Akce je oznámená, přijít se dá." },
  Odjety: { tlacitko: "Proběhla", popis: "Akce proběhla." },
  Zruseny: { tlacitko: "Zrušit", popis: "Akce se nekoná." },
};

/** Co přechod udělá — u akce jejími slovy, jinak slovy poháru. */
export const prechod = (na: StavZavodu, druh?: DruhZastavky | null) =>
  (druh === "Akce" && PRECHODY_AKCE[na]) || PRECHODY[na];

/** Stavy v pořadí, jak jdou v čase. Totéž co `Kalendar.Rada` v API. */
const RADA: StavZavodu[] = ["Planovany", "Potvrzeny", "Vypsany", "Odjety"];

/**
 * Nápis na tlačítku podle toho, kam se jde.
 *
 * <b>Krok zpátky se musí jmenovat jinak než krok dopředu.</b> „Vypsat
 * závod" u odjeté regaty by znamenalo, že se vypisuje znovu — přitom se
 * jen opravuje překlep. Že je to návrat, ví jen ten, kdo zná dosavadní
 * stav, takže se to musí rozhodnout tady, ne v tabulce výše.
 */
export function nazevPrechodu(ze: StavZavodu, na: StavZavodu, druh?: DruhZastavky | null) {
  const zpatky = RADA.includes(na) && RADA.includes(ze) && RADA.indexOf(ze) > RADA.indexOf(na);
  if (!zpatky) return prechod(na, druh).tlacitko;

  // Do plánovaného se vrací i ze zrušeného, takže „Vrátit do plánu" stojí
  // rovnou v tabulce výš; sem patří jen ty dva stavy, jejichž nápis se
  // podle směru mění.
  return na === "Potvrzeny" ? "Vrátit na potvrzený termín"
    : na === "Vypsany" ? (druh === "Akce" ? "Vrátit mezi oznámené" : "Vrátit mezi vypsané")
    : prechod(na, druh).tlacitko;
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
  if (odpoved.status === 403) return "Na tuhle změnu v kalendáři nemáš práva.";
  if (odpoved.status === 404) return "Regata nebo ročník neexistuje.";
  return `API odpovědělo ${odpoved.status}.`;
}

const kam = (serie: string, cesta = "") =>
  `${API}/sprava/serie/${encodeURIComponent(serie)}/zastavky${cesta}`;

export async function nactiKalendar(
  serie: string,
): Promise<{ stav: Stav; prehled?: PrehledZastavek }> {
  const t = await token();
  if (!t) return { stav: "neprihlasen" };

  let odpoved: Response;
  try {
    odpoved = await fetch(kam(serie), {
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

  return { stav: "ok", prehled: (await odpoved.json()) as PrehledZastavek };
}

export async function zaloz(serie: string, vstup: ZastavkaVstup): Promise<string | null> {
  return zapis(kam(serie), "POST", vstup);
}

export async function uloz(
  serie: string,
  zavod: string,
  vstup: ZastavkaVstup,
): Promise<string | null> {
  return zapis(kam(serie, `/${encodeURIComponent(zavod)}`), "PUT", vstup);
}

export async function prepniStav(
  serie: string,
  zavod: string,
  stav: StavZavodu,
): Promise<string | null> {
  return zapis(kam(serie, `/${encodeURIComponent(zavod)}/stav`), "POST", { stav });
}

export async function publikuj(
  serie: string,
  zavod: string,
  publikovano: boolean,
): Promise<string | null> {
  return zapis(kam(serie, `/${encodeURIComponent(zavod)}/publikace`), "POST", { publikovano });
}

/** Společné pro zápisy, které vracejí jen „povedlo se, nebo proč ne". */
async function zapis(adresa: string, metoda: string, telo: unknown): Promise<string | null> {
  const t = await token();
  if (!t) return "Přihlášení vypršelo. Přihlas se prosím znovu.";

  try {
    const odpoved = await fetch(adresa, {
      method: metoda,
      headers: {
        authorization: `Bearer ${t}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(telo),
      cache: "no-store",
    });

    return odpoved.ok ? null : await hlaska(odpoved);
  } catch {
    return "API se nedaří zavolat.";
  }
}
