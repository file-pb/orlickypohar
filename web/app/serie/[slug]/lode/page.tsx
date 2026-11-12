import { notFound } from "next/navigation";
import { ApiNedostupne, nactiSerii, type Prihlaska } from "@/lib/api";
import { Vypadek } from "@/app/vypadek";
import { Boky } from "@/app/boky";
import { NadpisTridy, TabyTrid, vyberTridu } from "@/app/tridy";
import { NadpisSerie, PruhSerie } from "@/app/serie/[slug]/pruh-serie";

// Stránka stojí na databázi, ne na obsahu známém v době buildu.
export const dynamic = "force-dynamic";

type Parametry = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ trida?: string }>;
};

export async function generateMetadata({ params }: Parametry) {
  const { slug } = await params;
  try {
    const serie = await nactiSerii(slug);
    return { title: serie ? `Lodě ročníku — ${serie.nazev}` : "Lodě ročníku" };
  } catch {
    return { title: "Lodě ročníku" };
  }
}

/**
 * <b>Lodě ročníku</b> — kdo je přihlášený do seriálu.
 *
 * Do 12. 11. 2026 to byla sekce dole na stránce ročníku, pod kalendářem.
 * Vlastní adresu dostala s pruhem částí (konzilium): posílá se na ni odkaz,
 * a mikrocache drží každou adresu zvlášť, takže kdo přijde pro kalendář,
 * nestahuje s ním i seznam lodí.
 *
 * <b>Jméno není „Přihlášené lodě"</b> (5-jachting, nález 9): přihláška do
 * ročníku a přihláška na zastávku jsou dvě různé věci a kdo se hlásí do
 * seriálu, by si myslel, že je tím přihlášený i na regatu — omyl, který
 * stojí body za neúčast.
 */
export default async function LodeRocniku({ params, searchParams }: Parametry) {
  const { slug } = await params;
  const { trida } = await searchParams;

  let serie;
  try {
    serie = await nactiSerii(slug);
  } catch (e) {
    if (e instanceof ApiNedostupne) return <Vypadek co="Ročník" />;
    throw e;
  }
  if (!serie) notFound();

  const tridy = serie.kategorie
    .map((k) => ({
      nazev: k.nazev,
      lode: serie.prihlasky.filter((p: Prihlaska) => p.kategorie === k.nazev),
    }))
    .filter((k) => k.lode.length > 0);

  const aktivniTrida = vyberTridu(tridy.map((k) => k.nazev), trida);
  const odkaz = (t: string) => `/serie/${serie.slug}/lode?trida=${encodeURIComponent(t)}`;

  return (
    <Boky vlevo="novinky" vpravo="akce" vpravoDoplnky={["vodocet"]}>
      <PruhSerie slug={slug} aktivni="lode" />
      <NadpisSerie
        nazevRocniku={serie.nazev}
        cast="lode"
        podtitulek={`${serie.prihlasky.length} přihlášených lodí`}
      />

      {/* Ročník se zveřejňuje jako kalendář dřív, než sezóna začne, takže
          nula přihlášených lodí je běžný stav, ne chyba dat. */}
      {tridy.length === 0 ? (
        <p className="prazdno">Do ročníku se zatím nepřihlásila žádná loď.</p>
      ) : (
        <>
          <TabyTrid
            kategorie={tridy.map((k) => k.nazev)}
            aktivni={aktivniTrida}
            adresa={odkaz}
          />
          <NadpisTridy kategorie={tridy.map((k) => k.nazev)} aktivni={aktivniTrida} />
          {tridy
            .filter((k) => k.nazev === aktivniTrida)
            .map((k) => (
              <div key={k.nazev} className="tabulka-obal">
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
            ))}
        </>
      )}
    </Boky>
  );
}
