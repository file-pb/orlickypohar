/**
 * Mapové dlaždice přes náš server.
 *
 * <b>Proč přes nás a ne rovnou z prohlížeče</b> (Filip, 9. 10. 2026):
 * stejný důvod jako u radaru ČHMÚ — kdyby si dlaždice tahal prohlížeč,
 * odešla by IP každého, kdo obrazovku otevře, na cizí server. Takhle
 * z návštěvníka ven nejde nic a zdroj se dá vyměnit na jednom místě.
 *
 * <b>Zdroj je OpenStreetMap</b>, protože nechce klíč ani účet. Jejich
 * pravidla provozu chtějí dvě věci a obě tu jsou: poznatelný
 * `User-Agent` s kontaktem a cachování, ať se táž dlaždice netahá
 * pořád dokola. Objem je tu beztak malý — plánek trati otevře pár
 * pořadatelů, ne návštěvníci webu.
 *
 * Přepnout na Mapy.com jde výměnou adresy a přidáním klíče; tarif Basic
 * (250 tis. kreditů měsíčně zdarma) by na tohle stačil, ale chce
 * registraci, logo a copyright v obrázku.
 *
 * <b>Satelitní podklad je Esri World Imagery</b> (Filip, 11. 10. 2026:
 * *„umožnil bych přepínač na satelitní pohled"*). Nechce klíč ani účet
 * a chce uvedení zdroje, které obrazovka píše pod mapou.
 *
 * <para>
 * <b>Ortofoto ČÚZK by nad Orlíkem bylo ostřejší</b>, ale jeho WMTS
 * 11. 10. 2026 neběželo: `ags.cuzk.cz/arcgis1` vracelo „Error handling
 * service request: Service not started" a `arcgis2` čtyřistačtyřku.
 * Adresa je správná, služba ne — vyměnit zdroj je tady jeden řádek, až
 * se vrátí.
 * </para>
 */

type Podklad = "mapa" | "satelit";

/**
 * <b>Kolik dlaždic se smí tahat ze zdroje naráz.</b>
 *
 * Mapa si při otevření řekne o celý výřez — na tabuli přes ultrawide to
 * bylo 68 dlaždic v jedné vlně. Prohlížeč je přes HTTP/2 pustí všechny
 * najednou, náš server je všechny přepošle a OSM, jehož pravidla mluví
 * o dvou souběžných stahováních, část odmítne: změřeno 16 z 68 na
 * produkci (24. 10. 2026). Na obrazovce z toho byla mozaika rozbitých
 * obrázků — ta „rozhozená mapa", které si Filip všiml u dojezdu.
 *
 * Fronta je proto tady, ne v prohlížeči: tím platí pro všechny, kdo si
 * stránku otevřou, a drží pravidla zdroje i při deseti divácích.
 */
const NARAZ = 2;

/** Jak dlouho smí dlaždice čekat ve frontě, než se to vzdá. */
const CEKANI_MS = 8_000;

let bezi = 0;
const fronta: (() => void)[] = [];

function pusti() {
  bezi -= 1;
  fronta.shift()?.();
}

/** Pustí práci, až bude volno. Čekání má strop — radši prázdná dlaždice než visící požadavek. */
async function vRade<T>(prace: () => Promise<T>): Promise<T | null> {
  if (bezi >= NARAZ) {
    const dockal = await new Promise<boolean>((hotovo) => {
      const casovac = setTimeout(() => hotovo(false), CEKANI_MS);
      fronta.push(() => {
        clearTimeout(casovac);
        hotovo(true);
      });
    });
    if (!dockal) return null;
  } else {
    bezi += 1;
  }

  try {
    return await prace();
  } finally {
    pusti();
  }
}

/**
 * Průhledný pixel pro dlaždici, která nedorazila.
 *
 * <b>Lepší než 502.</b> Rozbitý obrázek je na mapě vidět jako bílý
 * čtverec s ikonou; průhledná dlaždice nechá prosvítat hrubý podklad pod
 * sebou, takže z výpadku zbyde jen rozmazané místo. Cache je krátká —
 * za minutu to má smysl zkusit znovu.
 */
const PRAZDNA = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

function prazdnaDlazdice() {
  return new Response(new Uint8Array(PRAZDNA), {
    headers: { "content-type": "image/png", "cache-control": "public, max-age=60" },
  });
}

const ZDROJE: Record<Podklad, (z: number, x: number, y: number) => string> = {
  mapa: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
  satelit: (z, x, y) =>
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
};

/** Kontakt v hlavičce chtějí pravidla OSM; bez něj dlaždice odmítají. */
const KDO = "OrlickyPohar/1.0 (+https://orlickypohar.klihovka.cz)";

/** Přiblížení, které plánek trati používá. Mimo rozsah se nic netahá. */
const Z_NEJMENE = 10;
const Z_NEJVIC = 17;

export async function GET(
  zadost: Request,
  { params }: { params: Promise<{ z: string; x: string; y: string }> },
) {
  const { z, x, y } = await params;
  // Podklad přijde dotazem, ať zůstane jedna cesta a jedna mezipaměť.
  const podklad: Podklad =
    new URL(zadost.url).searchParams.get("podklad") === "satelit" ? "satelit" : "mapa";
  const cz = Number(z);
  const cx = Number(x);
  const cy = Number(y);

  // Hranice se hlídají, aby z adresy nešlo udělat stahovač cizího obsahu.
  const naSvete = 2 ** cz;
  if (
    !Number.isInteger(cz) || cz < Z_NEJMENE || cz > Z_NEJVIC ||
    !Number.isInteger(cx) || cx < 0 || cx >= naSvete ||
    !Number.isInteger(cy) || cy < 0 || cy >= naSvete
  ) {
    return new Response("Mimo rozsah", { status: 400 });
  }

  const odpoved = await vRade(async () => {
    for (let pokus = 0; pokus < 2; pokus += 1) {
      try {
        const r = await fetch(ZDROJE[podklad](cz, cx, cy), {
          headers: { "user-agent": KDO, accept: "image/png,image/jpeg" },
          // Dlaždice se nemění; den je u OSM běžná doba, kterou drží i prohlížeč.
          next: { revalidate: 86_400 },
        });
        if (r.ok) return r;
        // Odmítnutí kvůli náporu má smysl zkusit znovu, chybnou adresu ne.
        if (r.status !== 429 && r.status < 500) return null;
      } catch {
        // Síť selhala; druhý pokus za chvíli.
      }
      await new Promise((d) => setTimeout(d, 300));
    }
    return null;
  });

  // Prázdná dlaždice místo chyby: pod ní leží hrubý podklad, takže z toho
  // na mapě zbude rozmazané místo, ne bílý čtverec s ikonou.
  if (!odpoved) return prazdnaDlazdice();

  return new Response(odpoved.body, {
    headers: {
      // Satelit chodí jako JPEG, mapa jako PNG — typ se bere z odpovědi,
      // ne z přání.
      "content-type": odpoved.headers.get("content-type") ?? "image/png",
      "cache-control": "public, max-age=86400, immutable",
    },
  });
}
