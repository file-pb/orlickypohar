import { unstable_cache } from "next/cache";
import { inflateSync } from "node:zlib";

/**
 * Radar ČHMÚ nad Orlíkem: teď a na hodinu dopředu (Filip, 18. 9. 2026).
 *
 * <b>Zdroj jsou PNG kompozity</b> na opendata.chmi.cz, popsané v
 * `meteorology/weather/radar/radar_popis_cz.pdf` (verze 1.2):
 * - teď: `composite/maxz/png/pacz2gmaps3.z_max3d.<YYYYMMDD>.<hhmm>.0.png`,
 * - předpověď: `composite/fct_maxz/png/pacz2gmaps3.fct_z_max.<YYYYMMDD>.<hhmm>.ft60s10.tar`,
 *   šest PNG na +10 až +60 minut.
 * Obojí po 5 minutách (UTC), soubor bývá venku do pár minut po termínu.
 *
 * <b>Předpověď jen posouvá, co už je na radaru</b> (metoda COTREC):
 * intenzitu nemění a bouřku, která teprve vznikne, nepředpoví.
 *
 * <b>Obrázek</b> je 680 × 460 px v Mercatorově projekci (EPSG:3857),
 * 11,267–20,770° v. d. a 48,047–52,167° s. š., 1 px ≈ 1 km. Ověřeno
 * 18. 9. 2026: z měřítka osy x vychází výška přesně 460 px a hranice dat
 * (19,624° v. d.) padne na sloupec 598, kde je v obrázku čára.
 *
 * <b>Barvy</b> jsou indexy palety: 195 = 4 dBZ, každý index níž o 4 dBZ víc,
 * 181 = 60 dBZ. Přiřazené podle stupnice `radar/scl/scl-dbz-mmh.png`.
 * Ostatní indexy jsou pozadí, hranice a popisky.
 */

/** Radar a blesky pro čtenáře. Ověřeno 18. 9. 2026 (200). */
export const STRANKA_RADARU = "https://www.chmi.cz/namerena-data/radar-nowcast/srazky-a-blesky";

const ADRESAR = "https://opendata.chmi.cz/meteorology/weather/radar/composite/";

/** Střed jako u počasí z Windy: mezi Radavou a Velkým vírem. */
const STRED = { lat: 49.516, lon: 14.165 };
/** Jak daleko od středu se hledá srážka. */
export const POLOMER_KM = 8;

const OBRAZ = { w: 680, h: 460, zapad: 11.267, vychod: 20.77, jih: 48.047, sever: 52.167 };

/** Od kolika dBZ je to déšť: podle stupnice ČHMÚ ~1 mm/h. */
export const DEST_DBZ = 24;
/** Silný déšť: ~10 mm/h a víc. */
export const SILNY_DBZ = 40;
/** Přívalový déšť, zpravidla bouřka: ~50 mm/h a víc. */
export const BOURKA_DBZ = 52;

export type Krok = {
  /** 0 = měření, jinak minuty předpovědi. */
  minut: number;
  /** Čas platnosti (ISO, UTC). */
  cas: string;
  /** Nejsilnější odrazivost v okruhu, nebo null, když nic není. */
  dbz: number | null;
};

export type Radar = { kroky: Krok[] };

const merc = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

/** Pixel obrázku pro zeměpisný bod. */
export function pixel(lat: number, lon: number) {
  const x = ((lon - OBRAZ.zapad) / (OBRAZ.vychod - OBRAZ.zapad)) * OBRAZ.w;
  const y = ((merc(OBRAZ.sever) - merc(lat)) / (merc(OBRAZ.sever) - merc(OBRAZ.jih))) * OBRAZ.h;
  return { x, y };
}

/** Index palety → dBZ, nebo null pro pozadí, hranice a popisky. */
export function dbzZIndexu(i: number): number | null {
  if (i < 181 || i > 195) return null;
  return 4 + (195 - i) * 4;
}

/**
 * Indexy palety z PNG s paletou (typ barvy 3, 8 bitů, bez prokládání) —
 * jiné ČHMÚ neposílá; na cokoliv jiného hodí výjimku, ať se to pozná.
 */
export function pixelyPng(png: Buffer): { w: number; h: number; data: Uint8Array } {
  let i = 8;
  let w = 0;
  let h = 0;
  const idat: Buffer[] = [];
  while (i < png.length) {
    const delka = png.readUInt32BE(i);
    const typ = png.toString("latin1", i + 4, i + 8);
    const obsah = png.subarray(i + 8, i + 8 + delka);
    if (typ === "IHDR") {
      w = obsah.readUInt32BE(0);
      h = obsah.readUInt32BE(4);
      if (obsah[8] !== 8 || obsah[9] !== 3 || obsah[12] !== 0) throw new Error("radar: neznámý formát PNG");
    } else if (typ === "IDAT") idat.push(obsah);
    else if (typ === "IEND") break;
    i += 12 + delka;
  }
  const surova = inflateSync(Buffer.concat(idat));
  const data = new Uint8Array(w * h);
  let predchozi = new Uint8Array(w);
  for (let y = 0; y < h; y++) {
    const filtr = surova[y * (w + 1)];
    const radek = surova.subarray(y * (w + 1) + 1, (y + 1) * (w + 1));
    const ven = new Uint8Array(w);
    for (let x = 0; x < w; x++) {
      const a = x > 0 ? ven[x - 1] : 0;
      const b = predchozi[x];
      const c = x > 0 ? predchozi[x - 1] : 0;
      let p = 0;
      if (filtr === 1) p = a;
      else if (filtr === 2) p = b;
      else if (filtr === 3) p = (a + b) >> 1;
      else if (filtr === 4) {
        const q = a + b - c;
        const pa = Math.abs(q - a);
        const pb = Math.abs(q - b);
        const pc = Math.abs(q - c);
        p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      ven[x] = (radek[x] + p) & 255;
    }
    data.set(ven, y * w);
    predchozi = ven;
  }
  return { w, h, data };
}

/** Nejsilnější odrazivost v okruhu kolem středu. */
export function nejvicVOkruhu(png: Buffer, stred = STRED, polomerKm = POLOMER_KM): number | null {
  const { w, h, data } = pixelyPng(png);
  if (w !== OBRAZ.w || h !== OBRAZ.h) throw new Error(`radar: čekal jsem ${OBRAZ.w} × ${OBRAZ.h}, přišlo ${w} × ${h}`);
  const { x: sx, y: sy } = pixel(stred.lat, stred.lon);
  // Kolik km měří pixel na šířce Orlíku: stupně délky na pixel × 111,32 km × cos(šířky).
  const kmNaPx = ((OBRAZ.vychod - OBRAZ.zapad) / OBRAZ.w) * 111.32 * Math.cos((stred.lat * Math.PI) / 180);
  const r = polomerKm / kmNaPx;
  let nejvic: number | null = null;
  for (let y = Math.floor(sy - r); y <= Math.ceil(sy + r); y++) {
    for (let x = Math.floor(sx - r); x <= Math.ceil(sx + r); x++) {
      if ((x - sx) ** 2 + (y - sy) ** 2 > r * r) continue;
      const dbz = dbzZIndexu(data[y * w + x]);
      if (dbz !== null && (nejvic === null || dbz > nejvic)) nejvic = dbz;
    }
  }
  return nejvic;
}

/** Soubory z TARu (jen běžné soubory, bez rozšíření hlaviček). */
export function souboryTaru(tar: Buffer): { jmeno: string; obsah: Buffer }[] {
  const ven: { jmeno: string; obsah: Buffer }[] = [];
  let i = 0;
  while (i + 512 <= tar.length) {
    const jmeno = tar.toString("latin1", i, i + 100).split("\0")[0];
    if (!jmeno) break;
    const velikost = parseInt(tar.toString("latin1", i + 124, i + 136).split("\0")[0].trim() || "0", 8);
    const typ = tar[i + 156];
    // "0" nebo NUL je běžný soubor.
    if (typ === 0x30 || typ === 0) ven.push({ jmeno, obsah: tar.subarray(i + 512, i + 512 + velikost) });
    i += 512 + Math.ceil(velikost / 512) * 512;
  }
  return ven;
}

const termin = (d: Date) => {
  const iso = d.toISOString();
  return `${iso.slice(0, 10).replaceAll("-", "")}.${iso.slice(11, 13)}${iso.slice(14, 16)}`;
};

async function stahni(adresa: string): Promise<Buffer | null> {
  const odpoved = await fetch(adresa, {
    headers: { "user-agent": "OrlickyPohar/1.0 (+https://orlickypohar.klihovka.cz)" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  // Termín, který ještě nevyšel.
  if (odpoved.status === 404) return null;
  if (!odpoved.ok) throw new Error(`ČHMÚ odpovědělo ${odpoved.status}`);
  return Buffer.from(await odpoved.arrayBuffer());
}

/**
 * Nejnovější termín, pro který je venku předpověď i měření. Zkouší
 * posledních 30 minut po pěti, od nejnovějšího.
 */
async function nejnovejsi(ted: Date) {
  const posledni = Math.floor(ted.getTime() / 300_000) * 300_000;
  for (let k = 0; k <= 6; k++) {
    const t = new Date(posledni - k * 300_000);
    const tar = await stahni(`${ADRESAR}fct_maxz/png/pacz2gmaps3.fct_z_max.${termin(t)}.ft60s10.tar`);
    if (!tar) continue;
    const mereni = await stahni(`${ADRESAR}maxz/png/pacz2gmaps3.z_max3d.${termin(t)}.0.png`);
    if (!mereni) continue;
    return { t, tar, mereni };
  }
  return null;
}

/**
 * Stažení a vyhodnocení v cache Next na 5 minut, stejně často jako ČHMÚ
 * radar vydává. V cache leží jen sedm čísel. Chyba se do cache neuloží.
 */
const nactiDoCache = unstable_cache(
  async (): Promise<Radar> => {
    const posledni = await nejnovejsi(new Date());
    if (!posledni) throw new Error("ČHMÚ: radar za posledních 30 minut nevyšel");
    const kroky: Krok[] = [{ minut: 0, cas: posledni.t.toISOString(), dbz: nejvicVOkruhu(posledni.mereni) }];
    for (const { jmeno, obsah } of souboryTaru(posledni.tar)) {
      const m = jmeno.match(/fct_z_max\.\d{8}\.\d{4}\.(\d+)\.png$/);
      if (!m) continue;
      const minut = Number(m[1]);
      kroky.push({
        minut,
        cas: new Date(posledni.t.getTime() + minut * 60_000).toISOString(),
        dbz: nejvicVOkruhu(obsah),
      });
    }
    kroky.sort((a, b) => a.minut - b.minut);
    if (kroky.length < 7) throw new Error(`ČHMÚ: v předpovědi je ${kroky.length - 1} kroků místo 6`);
    return { kroky };
  },
  ["radar-chmi-orlik"],
  { revalidate: 300 },
);

export async function nactiRadar(): Promise<Radar | null> {
  try {
    return await nactiDoCache();
  } catch {
    return null;
  }
}
