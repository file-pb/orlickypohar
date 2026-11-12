import type { ReactNode } from "react";
import { nactiJa } from "@/lib/ja";
import { prava, roleVRocniku } from "@/lib/co-smim";
import { DlazdiceSekci } from "@/app/prepinac-sekci";

/** Části veřejného ročníku, v pořadí, v jakém stojí v pruhu. */
const CASTI = [
  { klic: "kalendar", nazev: "Kalendář", cesta: "", popis: "Kdy se která regata jede." },
  // Pravidla stojí před pořadím schválně: ZPJ 25.1 je chce čitelná dřív,
  // než se loď přihlásí, a kdo přijde pro pořadí, prochází kolem nich.
  { klic: "pravidla", nazev: "Pravidla ročníku", cesta: "/pravidla", popis: "Jak se boduje, co se škrtá, co znamenají kódy." },
  { klic: "poradi", nazev: "Průběžné pořadí", cesta: "/poradi", popis: "Jak to vypadá v kategoriích." },
  { klic: "lode", nazev: "Lodě ročníku", cesta: "/lode", popis: "Kdo je přihlášený do seriálu." },
  { klic: "novinky", nazev: "Novinky", cesta: "/novinky", popis: "Co je nového v ročníku." },
] as const;

export type CastSerie = (typeof CASTI)[number]["klic"];

/**
 * <b>Pruh částí veřejného ročníku</b> (konzilium, 12. 11. 2026) — týž tvar,
 * jaký má veřejná regata o patro níž a správa o patro výš. Filipovo zadání
 * znělo *„na tabu by byl kalendář, průběžné pořadí, přihlášené lodě"*.
 *
 * Do 12. 11. 2026 stál kalendář i přihlášené lodě pod sebou na jedné
 * stránce a pořadí s novinkami viselo na řádku odkazů nad kalendářem.
 * Rozdělením dostane každá část vlastní adresu — a <b>mikrocache drží
 * každou adresu zvlášť</b>, takže kdo přijde pro pořadí, nestahuje s ním
 * i seznam lodí.
 *
 * <b>Vlajky tu nejsou.</b> Sekce regaty je nesou, protože to jsou signály
 * konkrétního závodu; ročník je rovina nad ním a žádný závodní signál
 * neznamená.
 *
 * <b>Poslední dlaždice vede do správy</b> (3-ux), a jen tomu, kdo v ročníku
 * roli má. Stěhuje se tím odkaz, který na stránce stál od 9. 10. 2026 —
 * nevzniká nová cesta. Barvu má šedou: není to agenda ročníku a teplou si
 * vzít nesmí, protože na veřejné stránce nic teplého není.
 */
export async function PruhSerie({
  slug,
  aktivni,
}: {
  slug: string;
  aktivni: CastSerie;
}) {
  const { ja } = await nactiJa();
  const maRoli = roleVRocniku(prava(ja), slug).length > 0;
  const kam = (cesta: string) => `/serie/${encodeURIComponent(slug)}${cesta}`;

  return (
    <DlazdiceSekci
      popisek="Části ročníku"
      aktivni={aktivni}
      polozky={[
        ...CASTI.map((c) => ({
          klic: c.klic,
          nazev: c.nazev,
          kam: kam(c.cesta),
          popis: c.popis,
        })),
        ...(maRoli
          ? [
              {
                klic: "sprava",
                nazev: "Správa ročníku →",
                kam: `/sprava/${encodeURIComponent(slug)}`,
                popis: "Co teď, regaty, kalendář, zápis výsledků.",
              },
            ]
          : []),
      ]}
    />
  );
}

/**
 * Nadpis veřejného ročníku: <b>{ročník} — {část}</b>.
 *
 * Táž apozice jako ve správě, a ze stejného důvodu: jméno ročníku se do ní
 * nikdy nemusí ohnout. *Pořadí Orlického poháru 2027* by se u každého jména
 * skloňovalo jinak.
 */
export function NadpisSerie({
  nazevRocniku,
  cast,
  podtitulek,
  children,
}: {
  nazevRocniku: string;
  cast: CastSerie;
  podtitulek?: ReactNode;
  children?: ReactNode;
}) {
  const nazev = CASTI.find((c) => c.klic === cast)?.nazev;

  return (
    <div className="radek-nadpisu vybrany-ukon" data-ukon={cast}>
      <h1>
        <span className="nadpis-ukonu">
          <span className="ctvrt">{nazevRocniku}&nbsp;—</span>{" "}
          {nazev && <strong className="agenda">{nazev}</strong>}
        </span>
        {children}
      </h1>
      {podtitulek && <p className="podtitulek">{podtitulek}</p>}
    </div>
  );
}
