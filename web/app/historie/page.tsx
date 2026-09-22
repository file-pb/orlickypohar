import Link from "next/link";
import { ApiNedostupne, nactiSerie } from "@/lib/api";
import { Boky } from "@/app/boky";

export const dynamic = "force-dynamic";
export const metadata = { title: "Historie série" };

/**
 * Všechny ročníky, včetně letošního. Na úvodní stránce překážely —
 * tam patří to, co se právě jede, ne archiv.
 */
export default async function Historie() {
  let rocniky;
  try {
    rocniky = await nactiSerie();
  } catch (e) {
    if (!(e instanceof ApiNedostupne)) throw e;
    return (
      <>
        <h1>Historie série</h1>
        <p className="prazdno">Ročníky se teď nedaří načíst. Zkus to za chvíli znovu.</p>
      </>
    );
  }

  return (
    <Boky serie={rocniky?.[0]?.slug}>
      <h1>Historie série</h1>
      <p className="podtitulek">
        Každý ročník má svůj kalendář, výsledky regat a průběžné pořadí.
      </p>

      {!rocniky?.length ? (
        <p className="prazdno">Zatím není zveřejněný žádný ročník.</p>
      ) : (
        <ul className="seznam">
          {rocniky.map((r, i) => (
            <li key={r.slug}>
              <Link className="karta" href={`/serie/${r.slug}`}>
                <div className="nazev">
                  {r.nazev}
                  {i === 0 && <span className="stitek stav stav-odjety">letošní</span>}
                </div>
                <div className="detail">
                  {r.rok} · {r.pocetZavodu} {zavodu(r.pocetZavodu)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {rocniky?.length === 1 && (
        <p className="poznamka">
          Starší ročníky přibudou, jak se podaří dohledat výsledky od rozhodčího —
          nahrávají se tímtéž souborem jako ten letošní.
        </p>
      )}
    </Boky>
  );
}

function zavodu(n: number) {
  if (n === 1) return "regata";
  if (n >= 2 && n <= 4) return "regaty";
  return "regat";
}
