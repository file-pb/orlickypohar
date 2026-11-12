import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiNedostupne, nactiSerii, type ZavodShrnuti } from "@/lib/api";
import { Vypadek } from "@/app/vypadek";
import { Stav } from "@/app/stav";
import { datum } from "@/app/datum";
import { Boky } from "@/app/boky";
import { PrepinacKalendare } from "@/app/kalendar-volba";
import { NadpisSerie, PruhSerie } from "@/app/serie/[slug]/pruh-serie";
import { volbaKalendare, zastavkyKalendare, type SAkci, type VolbaKalendare } from "@/lib/kalendar-volba";

// Stránky stojí na databázi, ne na obsahu známém v době buildu. Bez tohohle
// by je Next předrenderoval při sestavení — a build by pak vyžadoval běžící
// API, což je závislost, kterou nikdo nechce.
export const dynamic = "force-dynamic";

type Parametry = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ kalendar?: string }>;
};

// Titulek se nesmí stát důvodem, proč stránka spadne. Chyba z API tady
// končí, aby ji obsloužila až samotná stránka — ta umí rozlišit „neexistuje"
// od „nedaří se načíst", kdežto tohle by skončilo hláškou o titulku.
export async function generateMetadata({ params }: Parametry) {
  const { slug } = await params;
  try {
    const serie = await nactiSerii(slug);
    return { title: serie?.nazev ?? "Ročník" };
  } catch {
    return { title: "Ročník" };
  }
}

export default async function Rocnik({ params, searchParams }: Parametry) {
  const { slug } = await params;
  const { kalendar } = await searchParams;

  // Výpadek API se ošetřuje tady, ne přes `error.tsx` — viz app/vypadek.tsx.
  let serie;
  try {
    serie = await nactiSerii(slug);
  } catch (e) {
    if (e instanceof ApiNedostupne) return <Vypadek co="Ročník" />;
    throw e;
  }
  if (!serie) notFound();

  const odjete = serie.zavody.filter((z: ZavodShrnuti) => z.stav === "Odjety");
  // Starší API akce nevydává — pak prostě žádné nejsou.
  const akce = serie.akce ?? [];
  const volba = await volbaKalendare(kalendar);

  // Odkaz do správy se přestěhoval do pruhu částí (`pruh-serie.tsx`), kde
  // se na roli ptá sám. Mikrocache požadavek s cookie sezení nekešuje,
  // takže se dlaždice nemůže vydat někomu, kdo roli nemá.
  const zastavky = zastavkyKalendare(serie.zavody, akce, volba);


  return (
    // Kalendář je tady ve středu, takže do boků jdou novinky a plakát akce.
    <Boky
      serie={serie.slug}
      vlevo="novinky"
      vpravo="akce"
      vpravoDoplnky={["vodocet"]}
    >
      <PruhSerie slug={slug} aktivni="kalendar" />
      <NadpisSerie
        nazevRocniku={serie.nazev}
        cast="kalendar"
        podtitulek={`${serie.zavody.length} regat · ${odjete.length} odjetých · ${serie.prihlasky.length} přihlášených lodí`}
      />

      {/* Kalendář je zároveň rozcestník: každá regata nese svůj stav
          a proklikem se jde na její vlastní stránku. Bez stavu vypadá
          regata, která teprve bude, stejně jako ta, která se nekonala. */}
      {/* Přepínač vedle nadpisu: pohár, vše, nebo akce mimo pohár. Volba
          je v cookie (app/kalendar-volba.tsx), takže platí i v boku a na
          úvodu. Bez akcí nemá co přepínat, a proto chybí. */}
      <div className="kalendar-hlava">
        <h2 id="kalendar">Kalendář</h2>
        {akce.length > 0 && <PrepinacKalendare volba={volba} kotva="kalendar" />}
      </div>

      {zastavky.length === 0 ? (
        <p className="prazdno">Zatím není zveřejněná žádná regata.</p>
      ) : (
        <Kalendar slug={serie.slug} zastavky={zastavky} volba={volba} />
      )}

    </Boky>
  );
}

/**
 * Seznam regat a akcí. Karta vypadá stejně, liší se štítek stavu —
 * a ve „Vše" navíc štítek akce, protože tam se akce míchají mezi kola.
 */
function Kalendar({
  slug,
  zastavky,
  volba,
}: {
  slug: string;
  zastavky: SAkci<ZavodShrnuti>[];
  volba: VolbaKalendare;
}) {
  return (
    <ul className="seznam">
      {zastavky.map((z) => (
        <li key={z.slug}>
          <Link
            className={`karta ${z.stav === "Zruseny" ? "zrusena" : ""}`}
            href={`/serie/${slug}/zavody/${z.slug}`}
          >
            <div className="nazev">
              <span className={z.stav === "Zruseny" ? "skrtnute" : undefined}>{z.nazev}</span>
              {z.akce && volba === "vse" && <span className="stitek stitek-akce">komunitní akce</span>}
              <Stav stav={z.stav} akce={z.akce} />
              {z.typ && <span className="stitek">{z.typ}</span>}
            </div>
            <div className="detail">
              {datum(z.datum, z.datumKonce)}
              {z.poradatel && ` · ${z.poradatel}`}
              {z.puvodniDatum && (
                <span className="presun"> · přesunuto z {datum(z.puvodniDatum)}</span>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
