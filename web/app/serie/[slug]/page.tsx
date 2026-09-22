import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiNedostupne, nactiSerii, type Prihlaska, type ZavodShrnuti } from "@/lib/api";
import { Vypadek } from "@/app/vypadek";
import { Stav } from "@/app/stav";
import { datum } from "@/app/datum";
import { Boky } from "@/app/boky";
import { NadpisTridy, TabyTrid, vyberTridu } from "@/app/tridy";
import { PrepinacKalendare } from "@/app/kalendar-volba";
import { volbaKalendare, zastavkyKalendare, type SAkci, type VolbaKalendare } from "@/lib/kalendar-volba";

// Stránky stojí na databázi, ne na obsahu známém v době buildu. Bez tohohle
// by je Next předrenderoval při sestavení — a build by pak vyžadoval běžící
// API, což je závislost, kterou nikdo nechce.
export const dynamic = "force-dynamic";

type Parametry = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ kalendar?: string; trida?: string }>;
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
  const { kalendar, trida } = await searchParams;

  // Výpadek API se ošetřuje tady, ne přes `error.tsx` — viz app/vypadek.tsx.
  let serie;
  try {
    serie = await nactiSerii(slug);
  } catch (e) {
    if (e instanceof ApiNedostupne) return <Vypadek />;
    throw e;
  }
  if (!serie) notFound();

  const odjete = serie.zavody.filter((z: ZavodShrnuti) => z.stav === "Odjety");
  // Starší API akce nevydává — pak prostě žádné nejsou.
  const akce = serie.akce ?? [];
  const volba = await volbaKalendare(kalendar);
  const zastavky = zastavkyKalendare(serie.zavody, akce, volba);

  // Lodě po kategoriích, v pořadí, které si drží série — abecedně by Nad7m
  // předběhlo Race bez důvodu.
  const podleKategorii = serie.kategorie.map((k) => ({
    nazev: k.nazev,
    lode: serie.prihlasky.filter((p) => p.kategorie === k.nazev),
  }));
  const tridy = podleKategorii.filter((k) => k.lode.length > 0);
  const aktivniTrida = vyberTridu(tridy.map((k) => k.nazev), trida);

  // Přepnutí třídy nesmí shodit kalendář z odkazu (`?kalendar=`), kvůli
  // kterému sem čtenář přišel. Odkaz proto nese oba parametry.
  const odkaz = (t: string) => {
    const dotaz = new URLSearchParams();
    if (kalendar) dotaz.set("kalendar", kalendar);
    dotaz.set("trida", t);
    return `/serie/${serie.slug}?${dotaz}`;
  };

  return (
    // Kalendář je tady ve středu, takže do boků jdou novinky a plakát akce.
    <Boky
      serie={serie.slug}
      vlevo="novinky"
      vpravo="akce"
      vlevoDoplnky={["vitr", "vystrahy"]}
      vpravoDoplnky={["koupani"]}
      stredDoplnky={["vodocet", "teplota"]}
    >
      <h1>{serie.nazev}</h1>
      <p className="podtitulek">
        {serie.zavody.length} regat · {odjete.length} odjetých ·{" "}
        {serie.prihlasky.length} přihlášených lodí
      </p>

      <p style={{ margin: "-1.25rem 0 2rem" }}>
        <Link href={`/serie/${serie.slug}/poradi`}>Průběžné pořadí seriálu →</Link>
        {" · "}
        <Link href={`/serie/${serie.slug}/novinky`}>Novinky ročníku →</Link>
      </p>

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

      <h2>Přihlášené lodě</h2>
      <TabyTrid
        kategorie={tridy.map((k) => k.nazev)}
        aktivni={aktivniTrida}
        adresa={odkaz}
      />
      <NadpisTridy kategorie={tridy.map((k) => k.nazev)} aktivni={aktivniTrida} />
      {tridy.filter((k) => k.nazev === aktivniTrida).map((k) => (
        <div key={k.nazev}>
          <div className="tabulka-obal">
            <table>
              <thead>
                <tr>
                  <th className="lod">Loď</th>
                  <th style={{ textAlign: "left" }}>Typ</th>
                  <th style={{ textAlign: "left" }}>Číslo plachty</th>
                  <th style={{ textAlign: "left" }}>Majitel</th>
                </tr>
              </thead>
              <tbody>
                {k.lode.map((p: Prihlaska) => (
                  <tr key={p.lod}>
                    <td className="lod">{p.lod}</td>
                    <td style={{ textAlign: "left" }}>{p.typLodi ?? "—"}</td>
                    <td style={{ textAlign: "left" }}>{p.cisloPlachty ?? "—"}</td>
                    <td style={{ textAlign: "left" }}>{p.majitel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
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
