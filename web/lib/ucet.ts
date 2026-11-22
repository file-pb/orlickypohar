import { tokenZeSezeni } from "@/lib/oidc";

/**
 * Smazání vlastního účtu. Zvlášť od `lib/sprava.ts` schválně: tohle nemá nic
 * společného s administrací ročníku a nesmí se k tomu dostat nikdo, kdo není
 * sám sebou.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

/**
 * Slovo, které se opisuje do potvrzení. <b>Opsané z `Potvrzeni.Slovo`
 * v API</b>, protože rozhoduje server a formulář je jen vlídnost k člověku.
 * Kdyby se ty dvě hodnoty rozešly, projeví se to hned a nahlas: správně
 * opsané slovo by API odmítlo.
 */
export const SLOVO = "SMAZAT";

/**
 * Účtenka o smazání — čeho kolik ubylo.
 *
 * <b>Tvar je opsaný z API, ne generovaný</b>, a je to vědomá výjimka
 * z pravidla „typy klientů se negenerují ručně". `packages/api-client/generuj.sh`
 * stahuje dokument OpenAPI z **běžícího** API, protože aplikace při startu
 * pouští migrace a bez databáze nenaběhne — a tenhle endpoint na produkci
 * ještě není. Jde to tedy obráceně: nejdřív se to nasadí, pak se typy
 * dogenerují a tahle deklarace zmizí. Precedens je `lib/co-smim.ts`, opsaný
 * z `Prava` na serveru.
 */
export type Uctenka = {
  prihlaseni: number;
  opravneni: number;
  vazebKLodim: number;
  zmenRoli: number;
  naroku: number;
  pomocniku: number;
  velitelstvi: number;
  osobOdpojeno: number;
  kontaktu: number;
  prihlasekSKontaktem: number;
  poskytovatelZrusen: boolean;
  poskytovatelDuvod: string | null;
};

export type Vysledek = { chyba: string } | { uctenka: Uctenka };

/**
 * Pošle žádost o smazání účtu.
 *
 * <b>Potvrzení posílá klient, ověřuje server.</b> Kontrola ve formuláři je
 * vlídnost k člověku, ne pojistka — žádost bez opsaného slova musí odmítnout
 * API, jinak projde z curlu.
 */
export async function smazUcet(potvrzeni: string): Promise<Vysledek> {
  const token = await tokenZeSezeni();
  if (!token) return { chyba: "Sezení vypršelo. Přihlas se znovu a zkus to podruhé." };

  try {
    const odpoved = await fetch(`${API}/ja/smazani`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ potvrzeni }),
      cache: "no-store",
    });

    if (odpoved.status === 401)
      return { chyba: "API token odmítlo. Odhlas se, přihlas znovu a zkus to podruhé." };

    if (!odpoved.ok) {
      // Čtyřistovka nese důvod v `{ "error": … }` jako všude jinde v tomhle
      // API — je to hláška o potvrzení a patří na obrazovku, ne do logu.
      try {
        const telo = (await odpoved.json()) as { error?: string };
        if (telo?.error) return { chyba: telo.error };
      } catch {
        // Tělo nemusí být JSON. Pak zbývá jen stav.
      }
      return { chyba: `API odpovědělo ${odpoved.status}.` };
    }

    return { uctenka: (await odpoved.json()) as Uctenka };
  } catch {
    // Výpadek sítě tady znamená, že se neví, jestli se smazalo. Nesmí to
    // vypadat jako „nestalo se nic".
    return {
      chyba:
        "API se nedaří zavolat. Zkus to za chvíli znovu — a jestli už je účet smazaný, " +
        "poznáš to tím, že se jím nepřihlásíš.",
    };
  }
}

/**
 * Položky účtenky, jak se píšou na obrazovku. <b>Jedno místo</b>, protože
 * tentýž seznam potřebuje adresa účtenky i její výpis, a kdyby se rozešly,
 * tiše by se přestala ukazovat jedna položka.
 */
export const POLOZKY = [
  { klic: "prihlaseni", nazev: "přihlášení k účtu" },
  { klic: "opravneni", nazev: "udělená oprávnění" },
  { klic: "vazebKLodim", nazev: "vazby k lodím" },
  { klic: "zmenRoli", nazev: "záznamy o změnách role u lodi" },
  { klic: "naroku", nazev: "žádosti o připojení k lodi" },
  { klic: "pomocniku", nazev: "zápisy pomocníka u zastávky" },
  { klic: "velitelstvi", nazev: "velitelské časy" },
  { klic: "osobOdpojeno", nazev: "odpojené osoby ve výsledcích" },
  { klic: "kontaktu", nazev: "uložené kontakty" },
  { klic: "prihlasekSKontaktem", nazev: "přihlášky, ze kterých zmizel kontakt" },
] as const satisfies readonly { klic: keyof Uctenka; nazev: string }[];
