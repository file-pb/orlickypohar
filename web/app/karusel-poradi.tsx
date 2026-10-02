import Link from "next/link";
import type { PoradiSerie } from "@/lib/api";
import { ZnakTridy } from "@/app/tridy";

/**
 * Průběžné pořadí jako karusel (Filip, 15. 9. 2026): ne jen první tři
 * lodě, ale celá třída, pomalu dokola.
 *
 * <b>Bez javascriptu.</b> Pás lodí je v HTML dvakrát za sebou a CSS ho
 * posouvá o polovinu své délky. Na konci animace tak stojí druhá kopie
 * přesně tam, kde začínala první, a smyčka nemá viditelný skok. Kopie je
 * skrytá před čtečkou obrazovky, ta přečte pořadí jednou.
 *
 * Na najetí myší se karusel zastaví, aby šlo dočíst. Kdo má v systému
 * vypnuté animace, dostane obyčejný seznam, který se dá posouvat.
 */

type Trida = PoradiSerie["kategorie"][number];
type Lod = Trida["lode"][number];

/**
 * V boku je vidět šest řádků (Filip, 16. 9. 2026: v bocích využít výšku,
 * aspoň dvakrát víc obsahu). Musí sedět s výškou okna v CSS.
 */
const VIDET_V_BOKU = 6;

function Lode({ lode, kopie }: { lode: Lod[]; kopie?: boolean }) {
  return lode.map((l) => (
    <li key={`${kopie ? "kopie-" : ""}${l.lod}`} aria-hidden={kopie || undefined}>
      <span className="poradi-cislo">{l.poradiPoSkrtu}.</span>
      <span className="bok-lod">{l.lod}</span>
      <span className="bok-body">{l.bodyPoSkrtu}</span>
    </li>
  ));
}

const pocet = (n: number) => ({ "--pocet": n }) as React.CSSProperties;

/**
 * Svislý karusel do boku: okno na tři lodě, pás jede nahoru. Třída se třemi
 * a méně loďmi stojí, není co posouvat.
 */
export function KaruselTridy({ lode }: { lode: Lod[] }) {
  const jede = lode.length > VIDET_V_BOKU;

  return (
    <div className={`karusel karusel-svisly${jede ? " jede" : ""}`} style={pocet(lode.length)}>
      <ol className="bok-poradi karusel-pas">
        <Lode lode={lode} />
        {jede && <Lode lode={lode} kopie />}
      </ol>
    </div>
  );
}

/**
 * Pořadí na úvodu tam, kde boky nejsou. Co třída, to řádek: znak a název
 * stojí vlevo pevně a lodě plynou doleva. Jakmile jsou boky vidět, CSS tenhle
 * blok schová — pořadí je pak v levém boku.
 */
export function PoradiRadky({
  slug,
  tridy,
  zRocniku,
}: {
  slug: string;
  tridy: Trida[];
  /**
   * Rok, ze kterého pořadí je, když letos ještě nikdo nejel. Nadpis to pak
   * řekne rovnou — „průběžné" o loňské sezóně by byla nepravda.
   */
  zRocniku?: number;
}) {
  if (tridy.length === 0) return null;

  return (
    <section className="poradi-radky">
      <h2>{zRocniku ? `Konečné pořadí ${zRocniku}` : "Průběžné pořadí"}</h2>
      {tridy.map((k) => (
        <div key={k.kategorie} className="poradi-radek">
          <Link
            className="poradi-radek-trida"
            href={`/serie/${slug}/poradi?trida=${encodeURIComponent(k.kategorie)}`}
          >
            <ZnakTridy nazev={k.kategorie} />
            {k.kategorie}
          </Link>
          <div className="karusel karusel-vodorovny jede" style={pocet(k.lode.length)}>
            <ol className="karusel-pas">
              <Lode lode={k.lode} />
              <Lode lode={k.lode} kopie />
            </ol>
          </div>
        </div>
      ))}
      <p className="poznamka">
        {zRocniku && "Letos se zatím nejelo. "}
        <Link href={`/serie/${slug}/poradi`}>Celé pořadí →</Link>
      </p>
    </section>
  );
}
