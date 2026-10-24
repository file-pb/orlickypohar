import { unstable_cache } from "next/cache";
import { inflateSync } from "node:zlib";

/**
 * Blesková aktivita kolem Orlíku z družice (Filip, 24. 10. 2026).
 *
 * <b>Zdroj je Lightning Imager na Meteosatu třetí generace</b>, optický
 * přístroj, který se na bouřky dívá shora. EUMETSAT ho vydává jako vrstvu
 * `mtg_fd:li_afa` (Accumulated Flash Area) na své WMS službě. Kolekce
 * `EO:EUM:DAT:0686` má v katalogu datovou politiku *free and unrestricted,
 * CC-BY-4.0* a GetCapabilities služby uvádí `Fees: none` i
 * `AccessConstraints: none` — registrace ani klíč nejsou potřeba.
 *
 * <b>Proč družice, a ne pozemní síť.</b> ČHMÚ blesky má a kreslí je na
 * `produkty.chmi.cz` v témže rastru, jaký čteme u radaru, jenže je bere
 * *na základě komerční smlouvy* od externí firmy a na opendata je nedal.
 * Družice je hrubší, ale licenci má jednoznačnou.
 *
 * <b>Přesnost je řádu deseti kilometrů, ne jednoho.</b> ATBD přístroje
 * žádá vzorkování 10 km na 45° šířky; Orlík je na 49,5°, takže reálně ještě
 * o kus víc. Mřížka 2 km, na kterou se akumuluje, je jemnější než data sama
 * — zrnitost snímku je interpolace, ne detail. K tomu parallax: družice se
 * na Orlík dívá pod zenitovým úhlem 58°, takže vrchol bouřky v 10 km leží
 * na snímku o 16 km jinde. ATBD říká, že se korekce dělá na úrovni L2 (a
 * tohle L2 je), ale jakou výškou, to verze v6 neuvádí.
 *
 * Proto se tu <b>netvrdí, kolik udeřilo ani přesně kde</b>. Odpovídá se na
 * to, co takhle hrubá data unesou: je v dosahu blesková aktivita, jak je
 * rozlehlá a kde je nejblíž. Legenda vrstvy sice nese počet výbojů za pět
 * minut, ale dopočítávat ho zpětně z barvy pixelu by byla falešná přesnost.
 *
 * <b>Termín se zadává vždycky.</b> Bez parametru `time` odpovídá služba
 * s `cache-control: max-age=604800`, takže by se týden vracel týž snímek.
 */

/** Střed dosahu: mezi Radavou a Velkým vírem, jako u radaru a počasí. */
const STRED = { lat: 49.516, lon: 14.165 };

/**
 * Jak daleko kolem středu se blesky hledají. Sto kilometrů proto, že
 * užitečná informace je „bouřka se blíží a je ještě daleko" — v osmi
 * kilometrech jako u radaru už je nad hlavou.
 */
export const DOSAH_KM = 100;

/** Hrana staženého výřezu v pixelech: 200 km na 256 px je 0,8 km na pixel. */
const OBRAZ = 256;

const KM_NA_STUPEN_SIRKY = 111.13;
const kmNaStupenDelky = (lat: number) => 111.32 * Math.cos((lat * Math.PI) / 180);

const KM_NA_PX = (2 * DOSAH_KM) / OBRAZ;

const dSirky = DOSAH_KM / KM_NA_STUPEN_SIRKY;
const dDelky = DOSAH_KM / kmNaStupenDelky(STRED.lat);

/** Výřez. WMS 1.3.0 má u EPSG:4326 pořadí os šířka, délka. */
const RAMEC = {
  jih: STRED.lat - dSirky,
  sever: STRED.lat + dSirky,
  zapad: STRED.lon - dDelky,
  vychod: STRED.lon + dDelky,
};

const SLUZBA = "https://view.eumetsat.int/geoserver/wms";
const VRSTVA = "mtg_fd:li_afa";

/** Vrstva na mapě EUMETSAT, pro odkaz pod upozorněním. */
export const STRANKA_BLESKU = "https://view.eumetsat.int/productviewer?v=li_afa";

/**
 * O kolik dozadu se termín žádá. Změřeno 23. 10. 2026: ve 23:11 UTC byl
 * nejnovější snímek z 23:00, tedy zpoždění přes deset minut. Zaokrouhlení
 * dolů na pět minut pak padne na termín, který je venku.
 */
const ZPOZDENI_MIN = 10;

export type Blesky = {
  /** Termín snímku (ISO, UTC) — ten, o který se žádalo. */
  cas: string;
  /** Plocha s bleskovou aktivitou v dosahu, km². Nula znamená klid. */
  plochaKm2: number;
  /** Vzdálenost nejbližší aktivity od středu v km; null, když je klid. */
  nejblizKm: number | null;
  /** Kde ta nejbližší je, slovy: „na jihozápad". Null, když je klid. */
  smer: string | null;
};

const SMERY = [
  "na sever",
  "na severovýchod",
  "na východ",
  "na jihovýchod",
  "na jih",
  "na jihozápad",
  "na západ",
  "na severozápad",
];

/** Azimut ve stupních od severu → světová strana slovy. */
export function smerSlovy(azimut: number): string {
  const i = Math.round(((azimut % 360) + 360) % 360 / 45) % 8;
  return SMERY[i];
}

/**
 * Pixely z PNG s průhledností (typ barvy 6, 8 bitů, bez prokládání) —
 * takové vrací GeoServer. Na cokoliv jiného hodí výjimku, ať se to pozná.
 *
 * Je to druhý rozbalovač PNG v projektu: radar čte paletové obrázky
 * (`lib/radar.ts`). Společná knihovna se zakládá až po třetí kopii, a tahle
 * je druhá — obě jsou navíc krátké a každá rozumí jinému typu barvy.
 */
export function pixelyRgba(png: Buffer): { w: number; h: number; data: Uint8Array } {
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
      if (obsah[8] !== 8 || obsah[9] !== 6 || obsah[12] !== 0) throw new Error("blesky: neznámý formát PNG");
    } else if (typ === "IDAT") idat.push(obsah);
    else if (typ === "IEND") break;
    i += 12 + delka;
  }
  const surova = inflateSync(Buffer.concat(idat));
  const radekBajtu = w * 4;
  const data = new Uint8Array(w * h * 4);
  let predchozi = new Uint8Array(radekBajtu);
  for (let y = 0; y < h; y++) {
    const filtr = surova[y * (radekBajtu + 1)];
    const radek = surova.subarray(y * (radekBajtu + 1) + 1, (y + 1) * (radekBajtu + 1));
    const ven = new Uint8Array(radekBajtu);
    for (let x = 0; x < radekBajtu; x++) {
      const a = x >= 4 ? ven[x - 4] : 0;
      const b = predchozi[x];
      const c = x >= 4 ? predchozi[x - 4] : 0;
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
    data.set(ven, y * radekBajtu);
    predchozi = ven;
  }
  return { w, h, data };
}

/**
 * Z výřezu spočítá plochu aktivity a nejbližší zásah. Neprůhledný pixel
 * znamená, že tam přístroj za pět minut něco zaznamenal; jak silné to bylo,
 * se záměrně neodhaduje (viz hlavička).
 */
export function vyhodnot(png: Buffer): Omit<Blesky, "cas"> {
  const { w, h, data } = pixelyRgba(png);
  if (w !== OBRAZ || h !== OBRAZ) throw new Error(`blesky: čekal jsem ${OBRAZ} × ${OBRAZ}, přišlo ${w} × ${h}`);

  const kmDelky = kmNaStupenDelky(STRED.lat);
  let pocet = 0;
  let nejbliz: number | null = null;
  let azimut = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] === 0) continue;
      const lon = RAMEC.zapad + ((x + 0.5) / w) * (RAMEC.vychod - RAMEC.zapad);
      const lat = RAMEC.sever - ((y + 0.5) / h) * (RAMEC.sever - RAMEC.jih);
      const dx = (lon - STRED.lon) * kmDelky;
      const dy = (lat - STRED.lat) * KM_NA_STUPEN_SIRKY;
      const km = Math.hypot(dx, dy);
      // Výřez je čtverec, zajímá nás kruh — roh je přes 140 km daleko.
      if (km > DOSAH_KM) continue;
      pocet++;
      if (nejbliz === null || km < nejbliz) {
        nejbliz = km;
        azimut = (Math.atan2(dx, dy) * 180) / Math.PI;
      }
    }
  }

  return {
    plochaKm2: Math.round(pocet * KM_NA_PX * KM_NA_PX),
    nejblizKm: nejbliz === null ? null : Math.round(nejbliz),
    smer: nejbliz === null ? null : smerSlovy(azimut),
  };
}

/** Termín snímku: teď bez zpoždění, zaokrouhleno dolů na pět minut. */
export function termin(ted: Date): Date {
  return new Date(Math.floor((ted.getTime() - ZPOZDENI_MIN * 60_000) / 300_000) * 300_000);
}

/**
 * Pro vývoj: `BLESKY_TERMIN=2026-06-20T15:00:00Z` vezme snímek z archivu
 * místo aktuálního. Bez něj se nedá nic ověřit osm měsíců v roce — blesky
 * jsou tu od května do září a pruh se ukazuje jen v den regaty. Archiv
 * vrstvy sahá k 30. 5. 2025 a chodí po pěti minutách.
 */
function zvolenyTermin(): Date {
  const rucne = process.env.BLESKY_TERMIN;
  if (!rucne) return termin(new Date());
  const t = new Date(rucne);
  if (Number.isNaN(t.getTime())) throw new Error(`blesky: BLESKY_TERMIN="${rucne}" není datum`);
  return t;
}

/** Výřez pro daný termín. Exportované, ať jde snímek stáhnout i ručně. */
export function adresa(cas: Date) {
  const q = new URLSearchParams({
    service: "WMS",
    version: "1.3.0",
    request: "GetMap",
    layers: VRSTVA,
    styles: "",
    format: "image/png",
    transparent: "true",
    width: String(OBRAZ),
    height: String(OBRAZ),
    crs: "EPSG:4326",
    bbox: `${RAMEC.jih},${RAMEC.zapad},${RAMEC.sever},${RAMEC.vychod}`,
    time: cas.toISOString().replace(/\.\d{3}Z$/, "Z"),
  });
  return `${SLUZBA}?${q}`;
}

/**
 * Stažení a vyhodnocení v cache Next na pět minut, stejně často, jako
 * přístroj vydává. V cache leží tři čísla, ne obrázek.
 */
const nactiDoCache = unstable_cache(
  async (): Promise<Blesky> => {
    const cas = zvolenyTermin();
    const odpoved = await fetch(adresa(cas), {
      headers: { "user-agent": "OrlickyPohar/1.0 (+https://orlickypohar.klihovka.cz)" },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!odpoved.ok) throw new Error(`EUMETSAT odpovědělo ${odpoved.status}`);
    const png = Buffer.from(await odpoved.arrayBuffer());
    return { cas: cas.toISOString(), ...vyhodnot(png) };
  },
  ["blesky-eumetsat-orlik"],
  { revalidate: 300 },
);

export async function nactiBlesky(): Promise<Blesky | null> {
  try {
    return await nactiDoCache();
  } catch {
    return null;
  }
}
