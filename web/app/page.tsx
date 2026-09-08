import Link from "next/link";
import { nactiSerie } from "@/lib/api";

// Stránky stojí na databázi, ne na obsahu známém v době buildu. Bez tohohle
// by je Next předrenderoval při sestavení — a build by pak vyžadoval běžící
// API, což je závislost, kterou nikdo nechce.
export const dynamic = "force-dynamic";

export default async function Rozcestnik() {
  const rocniky = await nactiSerie();

  if (!rocniky?.length) {
    return (
      <>
        <h1>Ročníky</h1>
        <p className="prazdno">Zatím není zveřejněný žádný ročník.</p>
      </>
    );
  }

  return (
    <>
      <h1>Ročníky</h1>
      <p className="podtitulek">Vyber ročník a podívej se na jeho zastávky a výsledky.</p>
      <p style={{ margin: "-1.25rem 0 2rem" }}>
        <Link href="/appka">Appka do telefonu →</Link>
      </p>
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
    </>
  );
}

function zavodu(n: number) {
  if (n === 1) return "zastávka";
  if (n >= 2 && n <= 4) return "zastávky";
  return "zastávek";
}
