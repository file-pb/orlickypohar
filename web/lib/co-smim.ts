import type { Ja } from "@/lib/ja";
import type { components } from "@/lib/schema";

/**
 * Co kdo smí — jediný zdroj pravdy pro nabídku i rozcestník.
 *
 * <b>Proč to vůbec je.</b> Nabídka pod ikonkou účtu si dřív pravidla
 * odvozovala sama a počítala je jen z rolí na ročník. Kdo měl roli na celý
 * web a žádnou v ročníku, neviděl ročníkové položky, ačkoliv na ty obrazovky
 * smí — a po zadání adresy ho pustily (audit, 6. 10. 2026). Dvě místa, která
 * si o oprávněních vedou vlastní pravdu, se rozejdou; tohle je proto jedno.
 *
 * <b>Rozhodování je opsané z `Prava.Smi`</b> na serveru, včetně toho, že
 * rozhodčí není stupeň. Pravda o právech leží tam a hlídají ji její testy;
 * tady se opisuje, aby se nenabízel odkaz na obrazovku, ze které se vrátí
 * „nemáš práva" — slib naprázdno je horší než chybějící odkaz.
 */

export type Role = NonNullable<components["schemas"]["Role"]>;

/** Jedno udělené právo. `serie` prázdná znamená celý web. */
export type Udelena = { role: Role; serie: string | null; zavod: string | null };

/** Na co se ptáme. `zavod` prázdný je otázka na celý ročník. */
export type Pozadavek = { role: Role; serie: string | null; zavod?: string | null };

export const NAZVY_ROLI: Record<Role, string> = {
  Ctenar: "čtenář",
  Editor: "editor",
  Organizator: "pořadatel",
  Rozhodci: "rozhodčí",
  Spravce: "správce",
};

/** Udělená práva přihlášeného, ročníková i ta na celý web, v jednom seznamu. */
export function prava(ja: Ja | null): Udelena[] {
  if (!ja) return [];

  return [
    ...(ja.opravneni ?? []).map((o) => ({
      role: o.role as Role,
      serie: o.serie,
      zavod: o.zavod ?? null,
    })),
    // Role na celý web (od 22. 9. 2026). Starší API pole nevydává, proto `??`.
    ...(ja.web ?? []).map((role) => ({ role: role as Role, serie: null, zavod: null })),
  ];
}

/** Obsahuje udělená role tu požadovanou? Opsané z `Prava.Pokryva`. */
function pokryva(udelena: Role, pozadovana: Role): boolean {
  switch (pozadovana) {
    case "Ctenar":
      return true;
    // Rozhodčí je funkce v procesu, ne stupeň: nedá ho editor ani organizátor.
    case "Rozhodci":
      return udelena === "Rozhodci" || udelena === "Spravce";
    // Organizátor píše i na blog, takže obsahuje editora. Obráceně ne.
    case "Editor":
      return udelena === "Editor" || udelena === "Organizator" || udelena === "Spravce";
    case "Organizator":
      return udelena === "Organizator" || udelena === "Spravce";
    case "Spravce":
      return udelena === "Spravce";
  }
}

/**
 * Smí ten, kdo má tahle práva, to, na co se ptáme? Opsané z `Prava.Smi`:
 * širší rozsah pokrývá užší, ne naopak.
 */
export function smi(udelena: Udelena[], co: Pozadavek): boolean {
  if (co.role === "Ctenar") return true;

  return udelena.some((u) => {
    // Právo na celý web platí všude, včetně otázky na web samotný.
    if (u.serie === null) return pokryva(u.role, co.role);

    // Na celý web nestačí žádné právo na ročník.
    if (co.serie === null) return false;
    if (u.serie !== co.serie) return false;

    // Právo na jednu zastávku platí jen na ni; právo na ročník i na jeho zastávky.
    if (u.zavod !== null && u.zavod !== (co.zavod ?? null)) return false;

    return pokryva(u.role, co.role);
  });
}

/** Ročníky, kde má člověk aspoň jedno právo. Role na celý web pokrývá všechny. */
export function rocniky(udelena: Udelena[], vsechny: string[]): string[] {
  if (udelena.some((u) => u.serie === null && u.role !== "Ctenar")) return vsechny;

  return [...new Set(udelena.filter((u) => u.serie !== null).map((u) => u.serie!))];
}

/** Zastávky, na které člověk dosáhne. Prázdné znamená „na všechny v ročníku". */
export function jenSveZastavky(udelena: Udelena[], serie: string): string[] | null {
  // Kdo má právo na celý ročník nebo na celý web, není omezený na zastávky.
  const naCelyRocnik = udelena.some(
    (u) => (u.serie === null || u.serie === serie) && u.zavod === null && u.role !== "Ctenar",
  );
  if (naCelyRocnik) return null;

  return [...new Set(udelena.filter((u) => u.serie === serie && u.zavod).map((u) => u.zavod!))];
}

/** Jedna položka rozcestníku: kam se jde, co se tam dělá a z čeho to plyne. */
export type Polozka = {
  nazev: string;
  popis: string;
  kam: string;
  /** Role, ze které právo plyne — kvůli „co mám pod jakou rolí". */
  role: Role;
  /**
   * Nápis do řádku, kde se položky vypisují za sebou — v kalendáři jich
   * je u každé regaty pět a „Plachetní směrnice" by řádek zlomilo. Nese
   * ho jen to, co se takhle vypisuje; jinde se bere `nazev`.
   */
  kratky?: string;
};

/**
 * Jedna podoba položky — táž obrazovka, ale jiná role a jiná věta o tom,
 * co se tam dělá.
 */
type Varianta = Polozka & { pozadavek: Pozadavek };

/**
 * Z několika podob položky ta, na kterou člověk doopravdy má.
 *
 * <b>Proč to není jedna role na položku.</b> Server u výsledků, přihlášek
 * i směrnic pouští <b>pořadatele zastávky nebo rozhodčího ročníku</b>
 * (`VysledkyEndpoints.PohledAsync`, `PrihlaskyEndpoints.PrehledAsync`,
 * `SmerniceEndpoints.SmiAsync`), jenže rozcestník u nich chtěl pořadatele —
 * takže rozhodčí neviděl ani jeden odkaz na práci, která je jeho
 * (audit, 8. 10. 2026). Pořadí podob rozhoduje: kdo je obojí, dostane tu
 * první, a popis má odpovídat tomu, co ten člověk na obrazovce dělá.
 */
function prvniPlatna(udelena: Udelena[], varianty: Varianta[]): Polozka | null {
  const platna = varianty.find((v) => smi(udelena, v.pozadavek));
  if (!platna) return null;

  const { pozadavek: _pozadavek, ...polozka } = platna;
  return polozka;
}

/**
 * Co se dá dělat s celým ročníkem. Pořadí je podle toho, jak často se to
 * dělá: kalendář a výsledky vedou, oprávnění se nastaví raz za rok.
 */
export function polozkyRocniku(udelena: Udelena[], serie: string): Polozka[] {
  const kam = (cesta: string) => `/sprava/${encodeURIComponent(serie)}${cesta}`;

  const vse: Varianta[][] = [
    [
      {
        nazev: "Kalendář ročníku",
        popis: "Vypsat regatu, posunout termín, zrušit.",
        kam: kam("/kalendar"),
        role: "Rozhodci",
        pozadavek: { role: "Rozhodci", serie },
      },
    ],
    [
      {
        nazev: "Výsledky",
        popis: "Zápis z vody, oprava a vypuštění ven.",
        kam: kam("/vysledky"),
        role: "Organizator",
        pozadavek: { role: "Organizator", serie },
      },
      {
        nazev: "Výsledky",
        popis: "Ověřit rozjížďky, vrátit k revizi a pustit ven.",
        kam: kam("/vysledky"),
        role: "Rozhodci",
        pozadavek: { role: "Rozhodci", serie },
      },
    ],
    [{
      nazev: "Lodě a kapitáni",
      popis: "Kdo patří ke které lodi, kapitánství od kódu.",
      kam: kam("/lode"),
      role: "Spravce",
      pozadavek: { role: "Spravce", serie },
    }],
    [{
      nazev: "Novinky ročníku",
      popis: "Články o seriálu a o regatách.",
      kam: kam("/clanky"),
      role: "Editor",
      pozadavek: { role: "Editor", serie },
    }],
    [{
      nazev: "Oprávnění",
      popis: "Komu udělit roli pořadatele, rozhodčího, správce.",
      kam: kam("/opravneni"),
      role: "Rozhodci",
      pozadavek: { role: "Rozhodci", serie },
    }],
  ];

  return vse
    .map((varianty) => prvniPlatna(udelena, varianty))
    .filter((p): p is Polozka => p !== null);
}

/**
 * Co se dá dělat s jednou zastávkou. Tyhle obrazovky dnes v nabídce nejsou.
 *
 * <b>Rozhodčí sem patří taky.</b> U všech tří ho server pouští a u dvou má
 * vlastní práci, kterou nikdo jiný udělat nesmí: ověřit rozjížďky a pustit
 * je ven, a vyloučit loď ze závodu (`Prihlasky.cs`: „O vyloučení ze závodu
 * rozhoduje rozhodčí"). Dokud tu stál jen pořadatel, neměl na ně odkaz.
 */
export function polozkyZastavky(udelena: Udelena[], serie: string, zavod: string): Polozka[] {
  const kam = (cesta: string) =>
    `/sprava/${encodeURIComponent(serie)}${cesta}/${encodeURIComponent(zavod)}`;

  const vse: Varianta[][] = [
    [
      {
        nazev: "Výsledky",
        kratky: "výsledky",
        popis: "Rozjížďky, zápis z cíle, oprava.",
        kam: kam("/vysledky"),
        role: "Organizator",
        pozadavek: { role: "Organizator", serie, zavod },
      },
      {
        nazev: "Výsledky",
        kratky: "výsledky",
        popis: "Ověřit rozjížďky, vrátit k revizi a pustit ven.",
        kam: kam("/vysledky"),
        role: "Rozhodci",
        pozadavek: { role: "Rozhodci", serie },
      },
    ],
    [
      {
        nazev: "Přihlášky",
        kratky: "přihlášky",
        popis: "Kdo přijel, pozdě příchozí loď, startovné.",
        kam: kam("/prihlasky"),
        role: "Organizator",
        pozadavek: { role: "Organizator", serie, zavod },
      },
      {
        nazev: "Přihlášky",
        kratky: "přihlášky",
        popis: "Kdo přijel a koho vyloučit ze závodu.",
        kam: kam("/prihlasky"),
        role: "Rozhodci",
        pozadavek: { role: "Rozhodci", serie },
      },
    ],
    [
      {
        nazev: "Plachetní směrnice",
        kratky: "směrnice",
        popis: "Vyvěsit PDF, stáhnout odvolanou verzi.",
        kam: kam("/smernice"),
        role: "Organizator",
        pozadavek: { role: "Organizator", serie, zavod },
      },
      {
        nazev: "Plachetní směrnice",
        kratky: "směrnice",
        popis: "Vyvěsit PDF, stáhnout odvolanou verzi.",
        kam: kam("/smernice"),
        role: "Rozhodci",
        pozadavek: { role: "Rozhodci", serie },
      },
    ],
    // Táž dvě práva jako u směrnice, protože je tak kontroluje i API
    // (`BojeEndpoints.SmiAsync`): organizátor té regaty, nebo rozhodčí ročníku.
    [
      {
        nazev: "Bóje na trati",
        kratky: "bóje",
        popis: "Pípnout polohu bóje, přenastavit, sebrat z vody.",
        kam: kam("/boje"),
        role: "Organizator",
        pozadavek: { role: "Organizator", serie, zavod },
      },
      {
        nazev: "Bóje na trati",
        kratky: "bóje",
        popis: "Pípnout polohu bóje, přenastavit, sebrat z vody.",
        kam: kam("/boje"),
        role: "Rozhodci",
        pozadavek: { role: "Rozhodci", serie },
      },
    ],
  ];

  return vse
    .map((varianty) => prvniPlatna(udelena, varianty))
    .filter((p): p is Polozka => p !== null);
}

/** Co se dá dělat s celým webem, mimo ročníky. */
export function polozkyWebu(udelena: Udelena[]): Polozka[] {
  const vse: (Polozka & { pozadavek: Pozadavek })[] = [
    {
      nazev: "Obecné články",
      popis: "Co nepatří k žádnému ročníku.",
      kam: "/sprava/web/clanky",
      role: "Editor",
      pozadavek: { role: "Editor", serie: null },
    },
    {
      nazev: "Oprávnění na celý web",
      popis: "Role, které platí ve všech ročnících.",
      kam: "/sprava/opravneni-webu",
      role: "Spravce",
      pozadavek: { role: "Spravce", serie: null },
    },
    {
      nazev: "Co web stojí",
      popis: "Stroj, předplatné, přirážka.",
      kam: "/sprava/naklady",
      role: "Spravce",
      pozadavek: { role: "Spravce", serie: null },
    },
  ];

  return vse.filter((p) => smi(udelena, p.pozadavek)).map(({ pozadavek: _, ...p }) => p);
}

/**
 * Jak se komu říká v ročníku, od nejsilnější role. Pro větu „jsi tu správce",
 * která má stát nad rozcestníkem — bez ní se člověk dozví, co smí, ale ne proč.
 */
export function roleVRocniku(udelena: Udelena[], serie: string): { role: Role; zavod: string | null }[] {
  const poradi: Role[] = ["Spravce", "Rozhodci", "Organizator", "Editor"];

  return udelena
    .filter((u) => u.serie === null || u.serie === serie)
    .filter((u) => u.role !== "Ctenar")
    .sort((a, b) => poradi.indexOf(a.role) - poradi.indexOf(b.role))
    .map((u) => ({ role: u.role, zavod: u.zavod }));
}
