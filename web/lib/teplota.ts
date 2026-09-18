import { unstable_cache } from "next/cache";

/**
 * Teplota vody na přítocích Orlíku z otevřených dat ČHMÚ (Filip, 18. 9. 2026).
 *
 * <b>Přítoky, ne nádrž.</b> Teplotu v samotné nádrži měří Povodí Vltavy jen
 * od dubna do října, po týdnech, a vydává ji jen jako graf na mapě. ČHMÚ
 * měří každých deset minut, ale v řekách. Nádrž bývá v létě teplejší než
 * přítoky a na podzim naopak — widget to proto říká nahlas.
 *
 * <b>Zdroj:</b> `hydrology/now/data/{stanice}.json` (dnešek) a
 * `hydrology/recent/data/{RRRRMMDD}_{stanice}.json` (denní archiv). Řada
 * s teplotou má `tsConID` „TH". Stanice ověřené 18. 9. 2026: všechny tři
 * TH mají, Písek na Otavě ne.
 */

const ZDROJ = "https://opendata.chmi.cz/hydrology";

/** Stránka hlásné služby ČHMÚ pro čtenáře. Ověřeno 18. 9. 2026 (200). */
export const STRANKA_HYDRO = "https://hydro.chmi.cz/hpps/";

export const STANICE = [
  { id: "0-203-1-133000", tok: "Lužnice", misto: "Bechyně" },
  { id: "0-203-1-152000", tok: "Lomnice", misto: "Dolní Ostrovec" },
  { id: "0-203-1-153000", tok: "Skalice", misto: "Varvažov" },
] as const;

/** Kolik dní zpátky ukazuje graf. */
export const DNI = 7;

export type Bod = { cas: string; hodnota: number };

export type TeplotaStanice = {
  tok: string;
  misto: string;
  /** Poslední měření. */
  aktualni: Bod;
  /** Změna proti měření zhruba před 24 hodinami, °C. */
  zaDen: number | null;
  /** Hodinové průměry za posledních sedm dní, od nejstaršího. */
  rada: Bod[];
};

type Soubor = { objList?: { tsList?: { tsConID: string; tsData?: { dt: string; value: number }[] }[] }[] };

/** Měření teploty ze souboru ČHMÚ. Chybějící řada nebo nesmysl → prázdno. */
export function teplotyZeSouboru(json: Soubor): Bod[] {
  const rada = json.objList?.[0]?.tsList?.find((t) => t.tsConID === "TH")?.tsData ?? [];
  return rada
    .filter((b) => typeof b.value === "number" && Number.isFinite(b.value) && b.value > -5 && b.value < 40)
    .map((b) => ({ cas: b.dt, hodnota: b.value }));
}

/**
 * Hodinové průměry. Desetiminutových bodů je za týden tisíc a do grafu na
 * 240 pixelů se nevejdou; hodina je pořád jemnější, než oko rozliší.
 */
export function hodinove(body: Bod[]): Bod[] {
  const hodiny = new Map<string, { soucet: number; pocet: number }>();
  for (const b of body) {
    const hodina = b.cas.slice(0, 13) + ":00:00Z";
    const h = hodiny.get(hodina) ?? { soucet: 0, pocet: 0 };
    h.soucet += b.hodnota;
    h.pocet += 1;
    hodiny.set(hodina, h);
  }
  return [...hodiny.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cas, h]) => ({ cas, hodnota: Math.round((h.soucet / h.pocet) * 10) / 10 }));
}

/** Změna proti bodu nejbližšímu okamžiku před 24 h; nejvýš tři hodiny vedle. */
export function zmenaZaDen(body: Bod[]): number | null {
  if (body.length < 2) return null;
  const posledni = body[body.length - 1];
  const cil = Date.parse(posledni.cas) - 24 * 3600_000;
  const drive = body.reduce((a, b) =>
    Math.abs(Date.parse(b.cas) - cil) < Math.abs(Date.parse(a.cas) - cil) ? b : a,
  );
  if (Math.abs(Date.parse(drive.cas) - cil) > 3 * 3600_000) return null;
  return Math.round((posledni.hodnota - drive.hodnota) * 10) / 10;
}

/** Dny archivu, které graf potřebuje: včerejšek a šest dní před ním, jako RRRRMMDD v UTC. */
export function dnyArchivu(ted: Date, dni = DNI): string[] {
  return Array.from({ length: dni }, (_, i) => {
    const d = new Date(Date.UTC(ted.getUTCFullYear(), ted.getUTCMonth(), ted.getUTCDate() - (dni - i)));
    return d.toISOString().slice(0, 10).replaceAll("-", "");
  });
}

async function stahni(adresa: string): Promise<Bod[]> {
  try {
    const odpoved = await fetch(adresa, { cache: "no-store", headers: { accept: "application/json" } });
    return odpoved.ok ? teplotyZeSouboru((await odpoved.json()) as Soubor) : [];
  } catch {
    // Jeden chybějící den graf zkrátí, nerozbije.
    return [];
  }
}

async function stanice(s: (typeof STANICE)[number], ted: Date): Promise<TeplotaStanice | null> {
  const soubory = [
    ...dnyArchivu(ted).map((den) => `${ZDROJ}/recent/data/${den}_${s.id}.json`),
    `${ZDROJ}/now/data/${s.id}.json`,
  ];
  const body = (await Promise.all(soubory.map(stahni))).flat();

  // Archiv a „now" se o dnešek můžou překrývat; každý čas jednou.
  const podleCasu = new Map(body.map((b) => [b.cas, b]));
  const vse = [...podleCasu.values()].sort((a, b) => a.cas.localeCompare(b.cas));
  if (vse.length === 0) return null;

  const od = Date.parse(vse[vse.length - 1].cas) - DNI * 24 * 3600_000;
  const tyden = vse.filter((b) => Date.parse(b.cas) >= od);

  return {
    tok: s.tok,
    misto: s.misto,
    aktualni: tyden[tyden.length - 1],
    zaDen: zmenaZaDen(tyden),
    rada: hodinove(tyden),
  };
}

/**
 * Teploty všech stanic, v cache na hodinu. Měří se po deseti minutách,
 * ale teplota řeky se za hodinu skoro nehne a stahuje se 24 souborů.
 */
const nactiDoCache = unstable_cache(
  async () => {
    const vysledek = (await Promise.all(STANICE.map((s) => stanice(s, new Date())))).filter(
      (s): s is TeplotaStanice => s !== null,
    );
    // Prázdný výsledek se do cache neukládá — příští načtení to zkusí znovu.
    if (vysledek.length === 0) throw new Error("ČHMÚ nevrátilo teplotu vody");
    return vysledek;
  },
  ["teplota-vody-1"],
  { revalidate: 3600 },
);

export async function nactiTeplotyVody(): Promise<TeplotaStanice[] | null> {
  try {
    return await nactiDoCache();
  } catch {
    return null;
  }
}
