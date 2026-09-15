import { unstable_cache } from "next/cache";

/**
 * Výstrahy ČHMÚ pro okolí Orlíku (Filip, 16. 9. 2026).
 *
 * <b>Zdroj je otevřený CAP</b> na opendata.chmi.cz: soubory
 * `alert_cap_50_DDHHMM.xml`, několikrát denně nový. Každý nese stav celé
 * republiky česky i anglicky, včetně bloků „Žádná výstraha…" — stačí tedy
 * vzít nejnovější. Stálá adresa aktuálního souboru neexistuje, nejnovější se
 * vybírá z výpisu adresáře podle času změny (jméno obsahuje jen den
 * v měsíci, přes měsíc se přepisuje).
 *
 * <b>Obvody jsou dva.</b> Výstrahy se vydávají po obvodech obcí s rozšířenou
 * působností. Radava u Kovářova patří pod Milevsko, Velký vír u Kožlí pod
 * Písek. Kódy z číselníku ČSÚ CISORP, ověřené 16. 9. 2026 — pozor, některé
 * přehledy na webu je uvádějí posunuté o jedna (3108 Milevsko), a to je
 * špatně.
 *
 * <b>Stupeň je z parametru `awareness_level`</b> („2; yellow; Moderate"):
 * 2 žlutá = nízký, 3 oranžová = vysoký, 4 červená = extrémní. Stupeň 1
 * (zelená) je „žádná výstraha" a nezobrazuje se.
 */

export const ADRESAR_VYSTRAH = "https://opendata.chmi.cz/meteorology/weather/alerts/cap/";
/** Výstražná stránka ČHMÚ pro čtenáře. Ověřeno 16. 9. 2026 (200). */
export const STRANKA_VYSTRAH = "https://vystrahy.chmi.cz/";

export const OBVODY: Record<string, string> = { "3107": "Milevsko", "3108": "Písek" };

export type Stupen = 2 | 3 | 4;

export type Vystraha = {
  jev: string;
  stupen: Stupen;
  popis: string;
  /** ISO čas, jak ho uvádí ČHMÚ, nebo null. */
  od: string | null;
  do: string | null;
  obvody: string[];
};

export type StavVystrah = { odeslano: string | null; vystrahy: Vystraha[] };

const MESICE: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/** Nejnovější soubor výstrah (typ 50) z výpisu adresáře, podle času změny. */
export function nejnovejsiSoubor(vypis: string): string | null {
  let nejlepsi: { jmeno: string; cas: number } | null = null;
  for (const m of vypis.matchAll(
    /href="(alert_cap_50_\d{6}\.xml)"[^\n]*?(\d{2})-([A-Za-z]{3})-(\d{4}) (\d{2}):(\d{2})/g,
  )) {
    const cas = Date.UTC(+m[4], MESICE[m[3]] ?? 0, +m[2], +m[5], +m[6]);
    if (!nejlepsi || cas > nejlepsi.cas) nejlepsi = { jmeno: m[1], cas };
  }
  return nejlepsi?.jmeno ?? null;
}

const odXml = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();

/**
 * Platné výstrahy od žlutého stupně pro Milevsko a Písek. Tatáž událost
 * (jev a platnost) pro oba obvody se sloučí do jedné. Seřazené od
 * nejvyššího stupně, pak podle začátku.
 */
export function vystrahyProObvody(xml: string, ted = new Date()): Vystraha[] {
  const podleUdalosti = new Map<string, Vystraha>();

  for (const [, info] of xml.matchAll(/<info>([\s\S]*?)<\/info>/g)) {
    if (!info.includes("<language>cs</language>")) continue;

    const kody = [...info.matchAll(/<valueName>CISORP<\/valueName>\s*<value>(\d{4})<\/value>/g)]
      .map((m) => m[1])
      .filter((k) => k in OBVODY);
    if (kody.length === 0) continue;

    const stupen = Number(info.match(/<valueName>awareness_level<\/valueName>\s*<value>(\d)/)?.[1] ?? 1);
    if (stupen < 2 || stupen > 4) continue;

    const pole = (nazev: string) => odXml(info.match(new RegExp(`<${nazev}>([\\s\\S]*?)</${nazev}>`))?.[1] ?? "");
    const doKdy = pole("expires") || null;
    if (doKdy && Date.parse(doKdy) <= ted.getTime()) continue;

    const jev = pole("event");
    const od = pole("onset") || null;
    const klic = `${jev}|${od}|${doKdy}`;
    const obvody = kody.map((k) => OBVODY[k]);

    const drivejsi = podleUdalosti.get(klic);
    if (drivejsi) {
      drivejsi.obvody = [...new Set([...drivejsi.obvody, ...obvody])];
    } else {
      podleUdalosti.set(klic, { jev, stupen: stupen as Stupen, popis: pole("description"), od, do: doKdy, obvody });
    }
  }

  return [...podleUdalosti.values()].sort(
    (a, b) => b.stupen - a.stupen || (a.od ?? "").localeCompare(b.od ?? ""),
  );
}

async function stahni(adresa: string) {
  const odpoved = await fetch(adresa, {
    headers: { "user-agent": "OrlickyPohar/1.0 (+https://orlickypohar.klihovka.cz)" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!odpoved.ok) throw new Error(`ČHMÚ odpovědělo ${odpoved.status}`);
  return odpoved.text();
}

/**
 * Stažení a výběr, v cache Next na čtvrt hodiny. Soubor má přes 1,5 MB,
 * ale v cache leží jen pár vybraných výstrah. Chyba se do cache neuloží.
 */
const nactiDoCache = unstable_cache(
  async (): Promise<StavVystrah> => {
    const soubor = nejnovejsiSoubor(await stahni(ADRESAR_VYSTRAH));
    if (!soubor) throw new Error("ČHMÚ: v adresáři není soubor výstrah");
    const xml = await stahni(ADRESAR_VYSTRAH + soubor);
    return {
      odeslano: xml.match(/<sent>([^<]+)<\/sent>/)?.[1] ?? null,
      vystrahy: vystrahyProObvody(xml),
    };
  },
  ["vystrahy-chmi-orlik"],
  { revalidate: 900 },
);

export async function nactiVystrahy(): Promise<StavVystrah | null> {
  try {
    return await nactiDoCache();
  } catch {
    return null;
  }
}
