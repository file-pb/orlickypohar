import Link from "next/link";
import { notFound } from "next/navigation";
import { nactiZavod, type Rozjizdka, type Vysledek, type ZavodDetail } from "@/lib/api";

// Stránky stojí na databázi, ne na obsahu známém v době buildu. Bez tohohle
// by je Next předrenderoval při sestavení — a build by pak vyžadoval běžící
// API, což je závislost, kterou nikdo nechce.
export const dynamic = "force-dynamic";

type Parametry = { params: Promise<{ slug: string; zavod: string }> };

export async function generateMetadata({ params }: Parametry) {
  const { slug, zavod } = await params;
  const z = await nactiZavod(slug, zavod);
  return { title: z?.nazev ?? "Zastávka" };
}

/** Jeden řádek tabulky: loď a její výsledek v každé rozjížďce. */
type Radek = {
  lod: string;
  kategorie: string;
  kormidelnik: string | null;
  vysledky: (Vysledek | undefined)[];
  body: number | null;
};

/**
 * API vydává výsledky po rozjížďkách, protože tak vznikají. Číst se ale musí
 * po lodích — divák hledá svoji loď, ne třetí rozjížďku. Převod je tady,
 * ne v API: je to věc zobrazení, a mobilní appka bude chtít jiné.
 */
function naRadky(zavod: ZavodDetail): Radek[] {
  const lode = new Map<string, Radek>();

  zavod.rozjizdky.forEach((r, i) => {
    for (const v of r.vysledky) {
      let radek = lode.get(v.lod);
      if (!radek) {
        radek = {
          lod: v.lod,
          kategorie: v.kategorie,
          kormidelnik: v.kormidelnik,
          vysledky: new Array(zavod.rozjizdky.length).fill(undefined),
          body: null,
        };
        lode.set(v.lod, radek);
      }
      radek.vysledky[i] = v;
    }
  });

  // Body závodu jsou součet pořadí v kategorii. Ukazují se jen tam, kde je
  // pořadí známé u všech rozjížděk — nedopočítáváme za rozhodčího.
  for (const radek of lode.values()) {
    const poradi = radek.vysledky.map((v) => v?.poradiVCili);
    radek.body = poradi.every((p) => typeof p === "number")
      ? (poradi as number[]).reduce((a, b) => a + b, 0)
      : null;
  }

  return [...lode.values()].sort(
    (a, b) => (a.body ?? Infinity) - (b.body ?? Infinity) || a.lod.localeCompare(b.lod, "cs"),
  );
}

export default async function Zastavka({ params }: Parametry) {
  const { slug, zavod: slugZavodu } = await params;
  const zavod = await nactiZavod(slug, slugZavodu);
  if (!zavod) notFound();

  const radky = naRadky(zavod);
  const kategorie = [...new Set(radky.map((r) => r.kategorie))];

  return (
    <>
      <p style={{ margin: "0 0 0.5rem" }}>
        <Link href={`/serie/${slug}`}>← zpět na ročník</Link>
      </p>
      <h1>{zavod.nazev}</h1>
      <p className="podtitulek">
        {datum(zavod.datum, zavod.datumKonce)}
        {zavod.poradatel && ` · pořádá ${zavod.poradatel}`}
      </p>

      <h2>Výsledky</h2>
      {radky.length === 0 ? (
        <p className="prazdno">Výsledky zatím nejsou zveřejněné.</p>
      ) : (
        kategorie.map((k) => (
          <Tabulka
            key={k}
            kategorie={k}
            radky={radky.filter((r) => r.kategorie === k)}
            rozjizdky={zavod.rozjizdky}
          />
        ))
      )}

      <h2>Pravidla závodu</h2>
      <dl className="pravidla">
        <dt>Vyhodnocení</dt>
        <dd>{zavod.vyhodnoceni === "CelePole" ? "celé pole dohromady" : "po kategoriích"}</dd>
        <dt>Škrty</dt>
        <dd>{zavod.pocetSkrtu === 0 ? "žádné" : `nejhorších ${zavod.pocetSkrtu}`}</dd>
        <dt>Do poháru</dt>
        <dd>
          {zavod.rozjizdky.filter((r) => r.doSerie).length} z {zavod.rozjizdky.length} rozjížděk
          {zavod.koeficientDoSerie !== 1 && `, koeficient ${zavod.koeficientDoSerie}`}
        </dd>
      </dl>
      <p className="poznamka">
        Body v tabulce jsou součet pořadí z rozjížděk. Do průběžného pořadí seriálu jde
        pořadí v kategorii, ne tenhle součet.
      </p>
    </>
  );
}

function Tabulka({
  kategorie,
  radky,
  rozjizdky,
}: {
  kategorie: string;
  radky: Radek[];
  rozjizdky: Rozjizdka[];
}) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <h3 style={{ fontSize: "0.95rem", margin: "1.25rem 0 0.5rem" }}>{kategorie}</h3>
      <div className="tabulka-obal">
        <table>
          <thead>
            <tr>
              <th className="lod">Loď</th>
              {/* Body hned za jménem, ne na konci řádku. Na telefonu se
                  tabulka posouvá vodorovně a číslo, kvůli kterému se divák
                  dívá, musí zůstat vidět bez posouvání. */}
              <th className="body">Body</th>
              {rozjizdky.map((r) => (
                <th key={r.cislo} className={r.doSerie ? undefined : "mimo-serii"}>
                  {r.cislo}.{!r.doSerie && <span title="nepočítá se do poháru">*</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {radky.map((radek) => (
              <tr key={radek.lod}>
                <td className="lod">
                  {radek.lod}
                  {radek.kormidelnik && (
                    <div style={{ fontSize: "0.78rem", color: "var(--tlumeny)" }}>
                      {radek.kormidelnik}
                    </div>
                  )}
                </td>
                <td className="body">{radek.body ?? "—"}</td>
                {radek.vysledky.map((v, i) => (
                  <td key={i} className={v?.kod ? "kod" : "cislo"}>
                    {bunka(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rozjizdky.some((r) => !r.doSerie) && (
        <p className="poznamka">* rozjížďka se nepočítá do poháru</p>
      )}
    </div>
  );
}

function bunka(v?: Vysledek) {
  if (!v) return "—";
  if (v.kod) return v.kod.toUpperCase();
  return v.poradiVCili ?? "—";
}

function datum(od: string, do_?: string | null) {
  const f = (d: string) =>
    new Date(d).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" });
  return do_ ? `${f(od)} – ${f(do_)}` : f(od);
}
