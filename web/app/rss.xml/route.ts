import { nactiSerie, nactiVlastniNovinky, ApiNedostupne } from "@/lib/api";

/**
 * RSS kanál Orlického poháru.
 *
 * **Jen náš vlastní obsah** (`nactiVlastniNovinky`). Novinky ze svazu se na
 * webu ukazují s odkazem na zdroj, protože přesně na to máme povolení —
 * přeposílat je dál vlastním kanálem by bylo něco jiného a nikdo nám to
 * nedovolil (Filip, 23. 9. 2026).
 *
 * Kanál žije na webu, ne v API: odkazy musejí mířit na stránky, které si
 * čtenář otevře, a čtečky hledají feed na doméně webu. API vydává data,
 * web z nich dělá stránky — a tohle je stránka jako každá jiná.
 */

// Články přibývají po dnech, ne po vteřinách. Půlhodina drží kanál čerstvý
// a přitom nejde na API při každém dotazu čtečky, kterých bývá víc.
export const revalidate = 1800;

const NAZEV = "Orlický pohár";
const POPIS = "Novinky seriálu závodů plachetnic na Orlíku.";

/** Pět znaků, které v XML nesmějí zůstat samy sebou. */
function xml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET(request: Request) {
  // Adresa webu se bere z požadavku, ne z konstanty: lokálně je to
  // localhost:3000 a na produkci vlastní doména, a odkazy v kanálu musí
  // vést tam, odkud si ho čtečka stáhla.
  const web = new URL(request.url).origin;

  let novinky;
  try {
    // Novinky nejnovějšího publikovaného ročníku a k nim obecné články.
    // Starší ročníky se do kanálu nedávají — je to zdroj novinek, ne archiv.
    const serie = await nactiSerie();
    novinky = (await nactiVlastniNovinky(serie?.[0]?.slug ?? null, 30)) ?? [];
  } catch (e) {
    // Výpadek API není chyba kanálu. Čtečka dostane 503 a zkusí to znovu;
    // prázdný kanál s kódem 200 by vypadal jako „nic nevyšlo".
    if (e instanceof ApiNedostupne) return new Response("API je nedostupné", { status: 503 });
    throw e;
  }

  const polozky = novinky
    .map((c) => {
      const odkaz = `${web}${c.adresa}`;
      return [
        "    <item>",
        `      <title>${xml(c.titulek)}</title>`,
        `      <link>${xml(odkaz)}</link>`,
        // Odkaz jako guid: adresa článku se nemění a čtečky podle ní poznají,
        // co už ukázaly.
        `      <guid isPermaLink="true">${xml(odkaz)}</guid>`,
        `      <pubDate>${new Date(c.publikovanoV).toUTCString()}</pubDate>`,
        ...(c.perex ? [`      <description>${xml(c.perex)}</description>`] : []),
        ...(c.autor ? [`      <author>${xml(c.autor)}</author>`] : []),
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  const kanal = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${xml(NAZEV)}</title>`,
    `    <link>${xml(web)}</link>`,
    `    <description>${xml(POPIS)}</description>`,
    "    <language>cs</language>",
    `    <atom:link href="${xml(`${web}/rss.xml`)}" rel="self" type="application/rss+xml" />`,
    polozky,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");

  return new Response(kanal, {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  });
}
