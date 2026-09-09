import Link from "next/link";
import { notFound } from "next/navigation";
import { nactiSerii, type Prihlaska, type ZavodShrnuti } from "@/lib/api";
import { Stav } from "@/app/stav";
import { PruhUkazky } from "@/app/ukazka";

// Stránky stojí na databázi, ne na obsahu známém v době buildu. Bez tohohle
// by je Next předrenderoval při sestavení — a build by pak vyžadoval běžící
// API, což je závislost, kterou nikdo nechce.
export const dynamic = "force-dynamic";

type Parametry = { params: Promise<{ slug: string }> };

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

export default async function Rocnik({ params }: Parametry) {
  const { slug } = await params;
  const serie = await nactiSerii(slug);
  if (!serie) notFound();

  const odjete = serie.zavody.filter((z: ZavodShrnuti) => z.stav === "Odjety");

  // Lodě po kategoriích, v pořadí, které si drží série — abecedně by Nad7m
  // předběhlo Race bez důvodu.
  const podleKategorii = serie.kategorie.map((k) => ({
    nazev: k.nazev,
    lode: serie.prihlasky.filter((p) => p.kategorie === k.nazev),
  }));

  return (
    <>
      <PruhUkazky slug={serie.slug} />
      <h1>{serie.nazev}</h1>
      <p className="podtitulek">
        {serie.zavody.length} zastávek · {odjete.length} odjetých ·{" "}
        {serie.prihlasky.length} přihlášených lodí
      </p>

      <p style={{ margin: "-1.25rem 0 2rem" }}>
        <Link href={`/serie/${serie.slug}/poradi`}>Průběžné pořadí seriálu →</Link>
      </p>

      {/* Kalendář je zároveň rozcestník: každá zastávka nese svůj stav
          a proklikem se jde na její vlastní stránku. Bez stavu vypadá
          zastávka, která teprve bude, stejně jako ta, která se nekonala. */}
      <h2>Kalendář</h2>
      {serie.zavody.length === 0 ? (
        <p className="prazdno">Zatím není zveřejněná žádná zastávka.</p>
      ) : (
        <ul className="seznam">
          {serie.zavody.map((z) => (
            <li key={z.slug}>
              <Link
                className={`karta ${z.stav === "Zruseny" ? "zrusena" : ""}`}
                href={`/serie/${serie.slug}/zavody/${z.slug}`}
              >
                <div className="nazev">
                  <span className={z.stav === "Zruseny" ? "skrtnute" : undefined}>{z.nazev}</span>
                  <Stav stav={z.stav} />
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
      )}

      <h2>Přihlášené lodě</h2>
      {podleKategorii.map((k) => (
        <div key={k.nazev}>
          <h3 style={{ fontSize: "0.95rem", margin: "1.25rem 0 0.5rem" }}>{k.nazev}</h3>
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
    </>
  );
}

function datum(od: string, do_?: string | null) {
  const f = (d: string) =>
    new Date(d).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" });
  if (!do_) return f(od);

  // Vícedenní závod uvnitř jednoho měsíce: „23.–24. května 2026". Dvakrát
  // vypsaný měsíc a rok se na telefonu zalomí přes dva řádky pro nic.
  const [a, b] = [new Date(od), new Date(do_)];
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
    ? `${a.getDate()}.–${f(do_)}`
    : `${f(od)} – ${f(do_)}`;
}
