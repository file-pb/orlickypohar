import Link from "next/link";
import {
  ApiNedostupne,
  nactiClanky,
  nactiPoradi,
  nactiSerie,
  nactiSerii,
  type ClanekShrnuti,
  type SerieShrnuti,
} from "@/lib/api";
import { denAMesic } from "@/app/datum";
import { VypisNovinek } from "@/app/novinky";
import { Boky } from "@/app/boky";

// Stránky stojí na databázi, ne na obsahu známém v době buildu.
export const dynamic = "force-dynamic";

/** Jak dlouho svítí jedna fotka, než se prolne do další. */
const DELKA = 7;

const FOTKY = [
  { src: "/foto/hero.jpg", popis: "Závodní plachetnice v náklonu na Orlické přehradě" },
  { src: "/foto/hero-2.jpg", popis: "Lodě před zámkem Orlík" },
  { src: "/foto/hero-3.jpg", popis: "Loď s červeným spinakrem" },
];

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
  // Filip chce novinky na úvodní stránce. Tři poslední: dost na to, aby bylo
  // vidět, že se něco děje, a málo na to, aby odsunuly tlačítka na výsledky.
  let clanky: ClanekShrnuti[] | null = null;
  if (aktualni) {
    try {
      const [detail, poradi, novinky] = await Promise.all([
        nactiSerii(aktualni.slug),
        nactiPoradi(aktualni.slug),
        nactiClanky(aktualni.slug, { limit: 3 }),
      ]);
      clanky = novinky;
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
      {/* Fotky se prolínají čistě v CSS — žádný javascript, žádná hydratace.
          Kdo má v systému vypnuté animace, uvidí první a nic se nehýbe.

          Fotka leží ve vrstvě pod celým úvodem, ne jen pod pruhem s nadpisem
          (Filip, 15. 9. 2026: velký obrázek na pozadí, za obsahem ztmavený
          jako na svém spodku). Proto je mimo <section> a obal úvodu drží
          hero i boky pohromadě. */}
      <div className="uvod">
        <div className="hero-fotky" aria-hidden="true">
          {FOTKY.map((f, i) => (
            <picture key={f.src} style={{ animationDelay: `${i * DELKA}s` }}>
              {/* Prohlížeč si vezme AVIF ve velikosti podle displeje —
                  telefon 800px za desetinu toho, co by stáhl v JPEG.
                  JPEG zůstává jako záloha pro ty, co AVIF neumí. */}
              <source
                type="image/avif"
                sizes="100vw"
                srcSet={[800, 1200, 1600]
                  .map((w) => `${f.src.replace(".jpg", "")}-${w}.avif ${w}w`)
                  .join(", ")}
              />
              <img src={f.src} alt={f.popis} fetchPriority={i === 0 ? "high" : "low"} />
            </picture>
          ))}
        </div>
      <section className="hero">
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

      {/* Fotka jde přes celou šířku okna, boky až pod ní. */}
      <Boky serie={aktualni?.slug}>
      {/* Bez seznamu ročníků by výpadek ani prázdný stav nebyly nikde vidět —
          návštěvník by koukal na fotku bez tlačítek a nevěděl proč. */}
      {vypadek ? (
        <p className="prazdno">
          Data se teď nedaří načíst. Je to výpadek na naší straně, zkus to za
          chvíli znovu.
        </p>
      ) : !aktualni ? (
        <p className="prazdno">Zatím není zveřejněný žádný ročník.</p>
      ) : null}

      {aktualni && clanky && clanky.length > 0 && (
        <section className="novinky-blok">
          <h2>Novinky</h2>
          <VypisNovinek serie={aktualni.slug} clanky={clanky} />
          <p className="poznamka">
            <Link href={`/serie/${aktualni.slug}/novinky`}>Všechny novinky ročníku →</Link>
          </p>
        </section>
      )}

      <p className="poznamka">
        Nevíš, proč má loď zrovna takové číslo?{" "}
        <Link href="/pravidla">Podívej se, jak se počítají body</Link>. Starší
        ročníky najdeš v <Link href="/historie">historii série</Link> a výsledky
        nosí do telefonu i <Link href="/appka">appka</Link>.
      </p>
      </Boky>
      </div>
    </>
  );
}

function zavodu(n: number) {
  if (n === 1) return "zastávka";
  if (n >= 2 && n <= 4) return "zastávky";
  return "zastávek";
}
