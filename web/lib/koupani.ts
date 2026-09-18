/**
 * Kvalita vody ke koupání na Orlíku (Filip, 18. 9. 2026) — doplněk
 * widgetu s teplotou vody.
 *
 * <b>Zdroj je mapová služba Ministerstva zdravotnictví</b>, ze které čte
 * i aplikace koupaci-vody.cz: vrstva `bathingPlace` s posledním hodnocením
 * hygieniků. Veřejná, bez klíče. <b>Teplotu vody neobsahuje</b> — hygienici
 * ji měří, ale nezveřejňují (ověřeno 18. 9. 2026), proto tu je jen
 * hodnocení 1–5 a datum odběru.
 *
 * Odběry jsou jen v koupací sezóně, zhruba po dvou týdnech. Mimo ni se
 * část schová (viz `aktualni`), aby widget v prosinci neukazoval srpen.
 */

const SLUZBA =
  "https://geoportal.mzcr.cz/server/rest/services/VerejneAplikace/KoupaciVody_View/MapServer/0/query";

/** Veřejná aplikace pro čtenáře. Ověřeno 18. 9. 2026 (200). */
export const STRANKA_KOUPANI = "https://www.koupaci-vody.cz/";

/** Starší hodnocení než tolik dní se nezobrazuje — sezóna skončila. */
export const NEJSTARSI_DNI = 45;

/**
 * Stupně podle legendy hygieniků. Krátké popisky, ať se vejdou do boku.
 */
export const STUPNE: Record<number, string> = {
  1: "vhodná ke koupání",
  2: "zhoršené vlastnosti",
  3: "zhoršená jakost",
  4: "nevhodná ke koupání",
  5: "zákaz koupání",
};

export type Koupaliste = { misto: string; stupen: number; datum: string };

/** „VN Orlík - ATC Radava" → „ATC Radava", „… - veřejné tábořiště Podolsko" → „Podolsko". */
export const kratkeJmeno = (nazev: string) =>
  nazev
    .replace(/^VN Orlík\s*[-–]\s*/i, "")
    .replace(/^veřejné tábořiště\s+/i, "")
    .trim();

/** „31.08.2026" → ISO datum, nebo null. */
export function isoDatum(text: string): string | null {
  const m = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}

type Odpoved = {
  features?: { attributes: { title?: string; lastEvaluationDate?: string; lastEvaluationResult?: string } }[];
};

/** Koupaliště z odpovědi služby; nečitelné řádky vypadnou. Nejhorší stupeň první. */
export function rozeber(odpoved: Odpoved): Koupaliste[] {
  return (odpoved.features ?? [])
    .map(({ attributes: a }) => ({
      misto: kratkeJmeno(a.title ?? ""),
      stupen: Number(a.lastEvaluationResult),
      datum: isoDatum(a.lastEvaluationDate ?? "") ?? "",
    }))
    .filter((k) => k.misto && k.datum && STUPNE[k.stupen])
    .sort((a, b) => b.stupen - a.stupen || a.misto.localeCompare(b.misto, "cs"));
}

/** Jen hodnocení z běžící sezóny. */
export function aktualni(koupaliste: Koupaliste[], ted = new Date()): Koupaliste[] {
  const hranice = ted.getTime() - NEJSTARSI_DNI * 24 * 3600_000;
  return koupaliste.filter((k) => Date.parse(k.datum) >= hranice);
}

export async function nactiKoupani(): Promise<Koupaliste[]> {
  const dotaz = new URLSearchParams({
    where: "title LIKE 'VN Orlík%'",
    outFields: "title,lastEvaluationDate,lastEvaluationResult",
    returnGeometry: "false",
    f: "json",
  });

  try {
    const odpoved = await fetch(`${SLUZBA}?${dotaz}`, {
      // Odběr je jednou za dva týdny; šest hodin je víc než dost.
      next: { revalidate: 6 * 3600 },
      headers: { accept: "application/json" },
    });
    return odpoved.ok ? aktualni(rozeber((await odpoved.json()) as Odpoved)) : [];
  } catch {
    // Doplněk. Když služba nejede, část prostě chybí.
    return [];
  }
}
