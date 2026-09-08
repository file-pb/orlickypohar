import Link from "next/link";
import { notFound } from "next/navigation";
import {
  nactiZavod,
  type BodyVRozjizdce,
  type Rozjizdka,
  type Vysledek,
  type ZavodDetail,
} from "@/lib/api";

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

/** Jeden řádek tabulky: loď, její body a co v které rozjížďce dokázala. */
type Radek = {
  lod: string;
  kategorie: string;
  kormidelnik: string | null;
  body: number;
  poradi: number;
  bunky: (Bunka | undefined)[];
};

type Bunka = { vysledek?: Vysledek; body?: BodyVRozjizdce };

/**
 * API vydává výsledky po rozjížďkách, protože tak vznikají. Číst se ale musí
 * po lodích — divák hledá svoji loď, ne třetí rozjížďku. Převod je tady,
 * ne v API: je to věc zobrazení, a mobilní appka bude chtít jiné.
 *
 * Body a pořadí se ale <b>nepočítají</b> — ty vydává API. Dokud počítání
 * neexistovalo, sčítal si je web sám; teď by se ta dvě čísla při první změně
 * pravidla rozešla a hádalo by se, které je pravda.
 */
function naRadky(zavod: ZavodDetail): Radek[] {
  const vysledky = new Map<string, Map<number, Vysledek>>();
  for (const r of zavod.rozjizdky)
    for (const v of r.vysledky) {
      if (!vysledky.has(v.lod)) vysledky.set(v.lod, new Map());
      vysledky.get(v.lod)!.set(r.cislo, v);
    }

  const kormidelnici = new Map(
    [...vysledky].map(([lod, podleCisla]) => [lod, [...podleCisla.values()][0].kormidelnik]),
  );

  return zavod.poradi
    .map((v) => ({
      lod: v.lod,
      kategorie: v.kategorie,
      kormidelnik: kormidelnici.get(v.lod) ?? null,
      body: v.body,
      poradi: v.poradi,
      bunky: zavod.rozjizdky.map((r) => {
        const vysledek = vysledky.get(v.lod)?.get(r.cislo);
        const body = v.rozjizdky.find((b) => b.cislo === r.cislo);
        return vysledek || body ? { vysledek, body } : undefined;
      }),
    }))
    .sort((a, b) => a.poradi - b.poradi);
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
      {radky.length > 0 && (
        <p className="poznamka">
          Čísla v rozjížďkách jsou body — pořadí v této kategorii, ne v celém poli.
          {zavod.pocetSkrtu > 0 && " Škrtnutá rozjížďka je přeškrtnutá a do součtu se nepočítá."}
          {zavod.rozjizdky.some((r) => !r.doSerie) && " Rozjížďka s * se nepočítá do poháru."}
        </p>
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
        Vítěz závodu má jeden bod. Do průběžného pořadí seriálu jde pořadí v kategorii,
        ne tenhle součet —{" "}
        <Link href={`/serie/${slug}/poradi`}>průběžné pořadí je vedle</Link>.
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
                  <span className="poradi-cislo">{radek.poradi}.</span> {radek.lod}
                  {radek.kormidelnik && <div className="majitel">{radek.kormidelnik}</div>}
                </td>
                <td className="body">{radek.body}</td>
                {radek.bunky.map((b, i) => (
                  <td key={i} className={b?.body?.skrtnuto ? "cislo skrtnuto" : "cislo"}>
                    {bunka(b)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function bunka(b?: Bunka) {
  if (!b?.body) return "—";
  return (
    <>
      {b.body.body}
      {b.vysledek?.kod && <span className="znacka">{b.vysledek.kod.toUpperCase()}</span>}
    </>
  );
}

function datum(od: string, do_?: string | null) {
  const f = (d: string) =>
    new Date(d).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" });
  return do_ ? `${f(od)} – ${f(do_)}` : f(od);
}
