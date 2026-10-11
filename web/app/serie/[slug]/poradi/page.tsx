import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiNedostupne, nactiPoradi, type PoradiKategorie, type Zastavka } from "@/lib/api";
import { Vypadek } from "@/app/vypadek";
import { Boky } from "@/app/boky";
import { NadpisTridy, TabyTrid, vyberTridu } from "@/app/tridy";

// Stránky stojí na databázi, ne na obsahu známém v době buildu. Bez tohohle
// by je Next předrenderoval při sestavení — a build by pak vyžadoval běžící
// API, což je závislost, kterou nikdo nechce.
export const dynamic = "force-dynamic";

type Parametry = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ trida?: string }>;
};

// Viz stránka ročníku: titulek nesmí shodit vykreslení.
export async function generateMetadata({ params }: Parametry) {
  const { slug } = await params;
  try {
    const poradi = await nactiPoradi(slug);
    return { title: poradi ? `Průběžné pořadí — ${poradi.nazev}` : "Průběžné pořadí" };
  } catch {
    return { title: "Průběžné pořadí" };
  }
}

export default async function Poradi({ params, searchParams }: Parametry) {
  const { slug } = await params;
  const { trida } = await searchParams;
  let poradi;
  try {
    poradi = await nactiPoradi(slug);
  } catch (e) {
    if (e instanceof ApiNedostupne) return <Vypadek co="Pořadí" />;
    throw e;
  }
  if (!poradi) notFound();

  const nic = poradi.kategorie.every((k) => k.lode.length === 0);
  // Taby jen pro třídy, které v pořadí něco mají — prázdný tab je slepá ulička.
  const tridy = poradi.kategorie.filter((k) => k.lode.length > 0);
  const aktivni = vyberTridu(tridy.map((k) => k.kategorie), trida);

  return (
    // Pořadí je tady ve středu, takže do boků jdou novinky a plakát akce.
    <Boky
      serie={slug}
      vlevo="novinky"
      vpravo="akce"
      vpravoDoplnky={["vodocet"]}
    >
      <p style={{ margin: "0 0 0.5rem" }}>
        <Link href={`/serie/${slug}`}>← zpět na ročník</Link>
      </p>
      <h1>Průběžné pořadí</h1>
      <p className="podtitulek">
        {poradi.nazev} · po {poradi.zastavky.length}{" "}
        {poradi.zastavky.length === 1 ? "odjeté regatě" : "odjetých regatách"}
      </p>

      {nic ? (
        <p className="prazdno">Zatím není odjetá žádná regata.</p>
      ) : (
        <>
          <TabyTrid
            kategorie={tridy.map((k) => k.kategorie)}
            aktivni={aktivni}
            adresa={(k) => `/serie/${slug}/poradi?trida=${encodeURIComponent(k)}`}
          />
          <NadpisTridy kategorie={tridy.map((k) => k.kategorie)} aktivni={aktivni} />
          <Tabulka
            kategorie={tridy.find((k) => k.kategorie === aktivni)!}
            zastavky={poradi.zastavky}
            slug={slug}
          />
        </>
      )}

      <p className="poznamka">
        Vítěz regaty má v seriálu nula bodů, druhý jeden a tak dál — vyhrává tedy
        nejnižší součet. Nejhorší závody se škrtají (přeškrtnuté číslo); podle sloupce{" "}
        <b>po škrtu</b> se řadí pořadí, celkový součet je vedle, protože rozhodčí
        vede obojí. <code>DNC</code> znamená, že loď na regatě nebyla a dostala tolik
        bodů, kolik lodí její kategorie bylo přihlášených do závodu; <code>DSQ</code> je diskvalifikace
        v regatě za 20 bodů. <Link href="/pravidla">Jak se body počítají →</Link>
      </p>
    </Boky>
  );
}

function Tabulka({
  kategorie,
  zastavky,
  slug,
}: {
  kategorie: PoradiKategorie;
  zastavky: Zastavka[];
  slug: string;
}) {
  if (kategorie.lode.length === 0) return null;

  return (
    // Třídu nese tab nad tabulkou, nebo `NadpisTridy`, když je jediná.
    <div style={{ marginBottom: "1.5rem" }}>
      <div className="tabulka-obal">
        <table>
          <thead>
            <tr>
              <th className="lod">Loď</th>
              {/* Body hned za jménem, ne na konci řádku: na telefonu se
                  tabulka posouvá vodorovně a tohle je číslo, kvůli kterému
                  se na ni divák dívá. */}
              <th className="body">Po škrtu</th>
              <th>Celkem</th>
              {zastavky.map((z) => (
                <th key={z.slug} title={z.nazev}>
                  {/* Rovnou do výsledků té regaty, ne na její úvod: kdo
                      stojí v tabulce pořadí, chce vidět, odkud ta čísla
                      jsou. */}
                  <Link href={`/serie/${slug}/zavody/${z.slug}/vysledky`}>{zkratka(z.nazev)}</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {kategorie.lode.map((l) => (
              <tr key={l.lod}>
                <td className="lod">
                  <span className="poradi-cislo">{l.poradiPoSkrtu}.</span> {l.lod}
                  {l.majitel && <div className="majitel">{l.majitel}</div>}
                </td>
                <td className="body">{l.bodyPoSkrtu}</td>
                <td className="cislo">{l.body}</td>
                {l.zastavky.map((b, i) => {
                  // Kód říká, odkud číslo je, když to není umístění. Starší
                  // API pole `kody` a `skrtnute` nevydávalo, proto `?.`.
                  const kod = l.kody?.[i];
                  const skrtnuto = l.skrtnute?.includes(i);
                  return (
                    <td
                      key={i}
                      className={skrtnuto ? "cislo skrtnuto" : "cislo"}
                      title={
                        [kod && POPIS_KODU[kod], skrtnuto && "škrtnuto"].filter(Boolean).join(", ") ||
                        undefined
                      }
                    >
                      {b ?? "—"}
                      {kod && <sup className="kod-serie">{kod}</sup>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const POPIS_KODU: Record<string, string> = {
  DNC: "na regatě nebyla: tolik bodů, kolik lodí kategorie bylo přihlášených do závodu",
  DSQ: "diskvalifikace v regatě: 20 bodů",
};

/** Hlavička sloupce musí být úzká — celý název regaty by tabulku roztáhl. */
function zkratka(nazev: string) {
  const slova = nazev.split(" ").filter((s) => s.length > 2);
  return (slova.length > 1 ? slova.map((s) => s[0]).join("") : nazev.slice(0, 4)).toUpperCase();
}
