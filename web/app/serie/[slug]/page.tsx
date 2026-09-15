import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiNedostupne, nactiSerii, type Prihlaska, type ZavodShrnuti } from "@/lib/api";
import { Vypadek } from "@/app/vypadek";
import { Stav } from "@/app/stav";
import { datum } from "@/app/datum";
import { Boky } from "@/app/boky";
import { NadpisTridy, TabyTrid, vyberTridu } from "@/app/tridy";

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
  const naAkcich = kalendar === "akce" && akce.length > 0;

  // Lodě po kategoriích, v pořadí, které si drží série — abecedně by Nad7m
  // předběhlo Race bez důvodu.
  const podleKategorii = serie.kategorie.map((k) => ({
    nazev: k.nazev,
    lode: serie.prihlasky.filter((p) => p.kategorie === k.nazev),
  }));
  const tridy = podleKategorii.filter((k) => k.lode.length > 0);
  const aktivniTrida = vyberTridu(tridy.map((k) => k.nazev), trida);

  // Stránka má dvoje taby — kalendář a třídy — a přepnutí jedněch nesmí
  // shodit ty druhé. Odkaz proto nese oba parametry.
  const odkaz = (zmena: { kalendar?: string; trida?: string }) => {
    const dotaz = new URLSearchParams();
    const k = "kalendar" in zmena ? zmena.kalendar : kalendar;
    const t = "trida" in zmena ? zmena.trida : trida;
    if (k) dotaz.set("kalendar", k);
    if (t) dotaz.set("trida", t);
    return `/serie/${serie.slug}${dotaz.size ? `?${dotaz}` : ""}`;
  };

  return (
    // Kalendář je tady ve středu, takže do boků jdou novinky a plakát akce.
    <Boky serie={serie.slug} vlevo="novinky" vpravo="akce">
      <h1>{serie.nazev}</h1>
      <p className="podtitulek">
        {serie.zavody.length} zastávek · {odjete.length} odjetých ·{" "}
        {serie.prihlasky.length} přihlášených lodí
      </p>

      <p style={{ margin: "-1.25rem 0 2rem" }}>
        <Link href={`/serie/${serie.slug}/poradi`}>Průběžné pořadí seriálu →</Link>
        {" · "}
        <Link href={`/serie/${serie.slug}/novinky`}>Novinky ročníku →</Link>
      </p>

      {/* Kalendář je zároveň rozcestník: každá zastávka nese svůj stav
          a proklikem se jde na její vlastní stránku. Bez stavu vypadá
          zastávka, která teprve bude, stejně jako ta, která se nekonala. */}
      <h2>Kalendář</h2>

      {/* Komunitní akce na vlastním tabu, ať se nepletou mezi kola poháru.
          Tab je odkaz s parametrem v adrese: stránka se vykreslí na serveru
          a dá se na ni poslat odkaz. Bez akcí se taby neukazují vůbec. */}
      {akce.length > 0 && (
        <nav className="taby" aria-label="Kalendář">
          <Link href={odkaz({ kalendar: undefined })} scroll={false} aria-current={naAkcich ? undefined : "page"}>
            Pohár
          </Link>
          <Link href={odkaz({ kalendar: "akce" })} scroll={false} aria-current={naAkcich ? "page" : undefined}>
            Komunitní akce
          </Link>
        </nav>
      )}

      {naAkcich ? (
        <Kalendar slug={serie.slug} zastavky={akce} akce />
      ) : serie.zavody.length === 0 ? (
        <p className="prazdno">Zatím není zveřejněná žádná zastávka.</p>
      ) : (
        <Kalendar slug={serie.slug} zastavky={serie.zavody} />
      )}

      <h2>Přihlášené lodě</h2>
      <TabyTrid
        kategorie={tridy.map((k) => k.nazev)}
        aktivni={aktivniTrida}
        adresa={(k) => odkaz({ trida: k })}
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

/** Seznam zastávek nebo akcí. Karta vypadá stejně, liší se jen štítek stavu. */
function Kalendar({
  slug,
  zastavky,
  akce,
}: {
  slug: string;
  zastavky: ZavodShrnuti[];
  akce?: boolean;
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
              <Stav stav={z.stav} akce={akce} />
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
