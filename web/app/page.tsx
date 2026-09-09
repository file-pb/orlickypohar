import Link from "next/link";
import {
  ApiNedostupne,
  nactiPoradi,
  nactiSerie,
  nactiSerii,
  type SerieShrnuti,
} from "@/lib/api";

// Stránky stojí na databázi, ne na obsahu známém v době buildu.
export const dynamic = "force-dynamic";

export default async function Rozcestnik() {
  // Fotka a nadpis se vykreslí vždycky, i když API nejede. Úvodní stránka
  // má říct, co to je, dřív než cokoliv načte — a výpadek se pak přizná
  // jen na místě, kde měly být ročníky.
  let rocniky: SerieShrnuti[] | null = null;
  let vypadek = false;
  try {
    rocniky = await nactiSerie();
  } catch (e) {
    if (!(e instanceof ApiNedostupne)) throw e;
    vypadek = true;
  }

  const aktualni = rocniky?.[0];

  // Živá věta nad fotkou. Fotka udělá dojem, ale tohle řekne, že se něco
  // děje — a je to spočítané z dat, ne napsané natvrdo. Když se to nepovede
  // načíst, prostě tam není; kvůli jedné větě nemá padat úvodní stránka.
  let stav: { odjeto: number; celkem: number; dalsi?: string; vedou: string[] } | null = null;
  if (aktualni) {
    try {
      const [detail, poradi] = await Promise.all([
        nactiSerii(aktualni.slug),
        nactiPoradi(aktualni.slug),
      ]);
      if (detail) {
        const cekaji = detail.zavody.filter((z) => z.stav === "Planovany" || z.stav === "Vypsany");
        stav = {
          odjeto: detail.zavody.filter((z) => z.stav === "Odjety").length,
          celkem: detail.zavody.length,
          dalsi: cekaji[0] && `${cekaji[0].nazev}, ${denAMesic(cekaji[0].datum)}`,
          vedou:
            poradi?.kategorie
              .map((k) => k.lode[0]?.lod)
              .filter((l): l is string => Boolean(l)) ?? [],
        };
      }
    } catch {
      // Výpadek řeší blok níž; tahle věta se prostě neukáže.
    }
  }

  return (
    <>
      <section className="hero">
        <img src="/foto/hero.jpg" alt="Závodní plachetnice v náklonu na Orlické přehradě" />
        <div className="hero-text">
          <h1>Orlický pohár</h1>
          <p>
            Seriál závodů plachetnic na Orlické přehradě. Devět zastávek, tři
            kategorie, jedno průběžné pořadí.
          </p>
          {stav && (
            <p className="hero-zivot">
              {stav.odjeto > 0 && (
                <span>
                  Odjeto {stav.odjeto} z {stav.celkem} zastávek
                </span>
              )}
              {stav.vedou.length > 0 && <span>Vedou {stav.vedou.join(", ")}</span>}
              {stav.dalsi && <span>Další: {stav.dalsi}</span>}
            </p>
          )}
          {aktualni && (
            <p className="hero-odkazy">
              <Link className="tlacitko" href={`/serie/${aktualni.slug}`}>
                Ročník {aktualni.rok}
              </Link>
              <Link className="tlacitko druhotne" href={`/serie/${aktualni.slug}/poradi`}>
                Průběžné pořadí
              </Link>
            </p>
          )}
        </div>
        <p className="kredit">Foto Jiří Tašl</p>
      </section>

      <h2>Ročníky</h2>
      {vypadek ? (
        <p className="prazdno">
          Ročníky se teď nedaří načíst — je to výpadek na naší straně. Zkus to
          za chvíli znovu.
        </p>
      ) : !rocniky?.length ? (
        <p className="prazdno">Zatím není zveřejněný žádný ročník.</p>
      ) : (
        <ul className="seznam">
          {rocniky.map((r) => (
            <li key={r.slug}>
              <Link className="karta" href={`/serie/${r.slug}`}>
                <div className="nazev">{r.nazev}</div>
                <div className="detail">
                  {r.pocetZavodu} {zavodu(r.pocetZavodu)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="poznamka">
        Nevíš, proč má loď zrovna takové číslo?{" "}
        <Link href="/pravidla">Podívej se, jak se počítají body</Link>. Výsledky
        nosí do telefonu i <Link href="/appka">appka</Link>.
      </p>
    </>
  );
}

/** „19. září" — rok v téhle větě nikoho nezajímá. */
function denAMesic(iso: string) {
  const mesice = [
    "ledna", "února", "března", "dubna", "května", "června",
    "července", "srpna", "září", "října", "listopadu", "prosince",
  ];
  const [, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d}. ${mesice[m - 1]}`;
}

function zavodu(n: number) {
  if (n === 1) return "zastávka";
  if (n >= 2 && n <= 4) return "zastávky";
  return "zastávek";
}
