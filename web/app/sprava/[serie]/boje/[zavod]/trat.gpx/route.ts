import { nactiTrat } from "@/lib/boje";

/**
 * Trať ke stažení jako GPX.
 *
 * <b>Proč soubor, a ne body v cizí mapě</b> (Filip, 9. 10. 2026: *„když
 * budou chtít zoomovat, tak jim necháme target blank na mapy s pointama
 * našich bójí"*): víc bodů najednou se do adresy cizí mapy spolehlivě
 * dostat nedá. OSM umí v URL jediný marker, Mapy.cz mají vlastní body za
 * nedokumentovaným zakódovaným parametrem a Google víc bodů umí jen jako
 * trasu, kterou plánuje po silnicích — na vodě z toho vyjde nesmysl.
 *
 * GPX je standard, nepatří nikomu a otevře se v Mapy.cz, OsmAnd i
 * <b>v chartplotteru na lodi</b>, což je u závodní trati užitečnější než
 * jakákoliv webová mapa. Kdo chce zoomovat, zoomuje ve svém nástroji.
 *
 * <b>Není to veřejné.</b> Trať je informace do závodu a kdo ji smí vidět,
 * řeší API — tahle cesta se jen ptá stejnou cestou jako obrazovka a bez
 * práva nevydá nic.
 */

// Odpověď závisí na tom, kdo se ptá, a trať se během dne mění.
export const dynamic = "force-dynamic";

/** Pět znaků, které v XML nesmějí zůstat samy sebou. */
function xml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/** Z názvu regaty jméno souboru, které projde i na Windows. */
function jmenoSouboru(zavod: string) {
  const zaklad = zavod.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "");
  return `trat-${zaklad || "regaty"}.gpx`;
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ serie: string; zavod: string }> },
) {
  const { serie, zavod } = await params;
  const { stav, trat } = await nactiTrat(serie, zavod);

  if (stav === "neprihlasen" || stav === "odmitnut")
    return new Response("Na stažení trati se musíš přihlásit.", { status: 401 });
  if (stav === "nesmi")
    return new Response("Trať vidí pořadatel regaty nebo rozhodčí ročníku.", { status: 403 });
  if (stav === "neni") return new Response("Tahle regata neexistuje.", { status: 404 });
  if (stav !== "ok" || !trat)
    return new Response("Trať se teď nedaří načíst.", { status: 502 });

  // Bóje jdou v pořadí objíždění — jako body i jako jedna trasa, aby se
  // v chartplotteru dalo jet podle ní, ne jen koukat na tečky.
  const vPoradi = [...trat].sort((a, b) => a.poradi - b.poradi);

  const bod = (b: (typeof vPoradi)[number], znacka: string) =>
    `  <${znacka} lat="${b.sirka.toFixed(6)}" lon="${b.delka.toFixed(6)}">\n` +
    `    <name>${xml(`${b.poradi}. ${b.nazev}`)}</name>\n` +
    (b.presnostM !== null
      ? `    <cmt>${xml(`Přesnost při postavení ${Math.round(b.presnostM)} m`)}</cmt>\n`
      : "") +
    `    <time>${b.postavenaV}</time>\n` +
    `  </${znacka}>`;

  const gpx =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<gpx version="1.1" creator="Orlický pohár" xmlns="http://www.topografix.com/GPX/1/1">\n` +
    `  <metadata>\n` +
    `    <name>${xml(`Trať — ${zavod}`)}</name>\n` +
    `    <desc>${xml(`Bóje postavené pořadatelem, v pořadí objíždění. Ročník ${serie}.`)}</desc>\n` +
    `  </metadata>\n` +
    vPoradi.map((b) => bod(b, "wpt")).join("\n") +
    (vPoradi.length > 1
      ? `\n  <rte>\n    <name>${xml(`Trať — ${zavod}`)}</name>\n` +
        vPoradi.map((b) => bod(b, "rtept").replace(/^ {2}/gm, "    ")).join("\n") +
        `\n  </rte>`
      : "") +
    `\n</gpx>\n`;

  return new Response(gpx, {
    headers: {
      "content-type": "application/gpx+xml; charset=utf-8",
      "content-disposition": `attachment; filename="${jmenoSouboru(zavod)}"`,
      // Trať se mění pípnutím; stažený soubor má být ten, co platí teď.
      "cache-control": "no-store",
    },
  });
}
