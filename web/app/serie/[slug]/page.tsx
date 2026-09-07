import Link from "next/link";
import { notFound } from "next/navigation";
import { nactiSerii, type Prihlaska } from "@/lib/api";

// Stránky stojí na databázi, ne na obsahu známém v době buildu. Bez tohohle
// by je Next předrenderoval při sestavení — a build by pak vyžadoval běžící
// API, což je závislost, kterou nikdo nechce.
export const dynamic = "force-dynamic";

type Parametry = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Parametry) {
  const { slug } = await params;
  const serie = await nactiSerii(slug);
  return { title: serie?.nazev ?? "Ročník" };
}

export default async function Rocnik({ params }: Parametry) {
  const { slug } = await params;
  const serie = await nactiSerii(slug);
  if (!serie) notFound();

  // Lodě po kategoriích, v pořadí, které si drží série — abecedně by Nad7m
  // předběhlo Race bez důvodu.
  const podleKategorii = serie.kategorie.map((k) => ({
    nazev: k.nazev,
    lode: serie.prihlasky.filter((p) => p.kategorie === k.nazev),
  }));

  return (
    <>
      <h1>{serie.nazev}</h1>
      <p className="podtitulek">
        {serie.zavody.length} zastávek · {serie.prihlasky.length} přihlášených lodí
      </p>

      <h2>Zastávky</h2>
      {serie.zavody.length === 0 ? (
        <p className="prazdno">Zatím není zveřejněná žádná zastávka.</p>
      ) : (
        <ul className="seznam">
          {serie.zavody.map((z) => (
            <li key={z.slug}>
              <Link className="karta" href={`/serie/${serie.slug}/zavody/${z.slug}`}>
                <div className="nazev">
                  {z.nazev}
                  {z.typ && <span className="stitek">{z.typ}</span>}
                </div>
                <div className="detail">
                  {datum(z.datum, z.datumKonce)}
                  {z.poradatel && ` · ${z.poradatel}`}
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
  return do_ ? `${f(od)} – ${f(do_)}` : f(od);
}
