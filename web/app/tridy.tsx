import Link from "next/link";
import { ZNAKY_TRID } from "@/app/znaky-trid";

/**
 * Lodní třídy: znak a taby.
 *
 * <b>Tvary znaků kreslí `app/scripts/ikona.py`</b> ze stejných tvarů jako
 * hlavní logo — jedna plachta v barvě třídy a písmeno jako vodoznak. Web
 * dostane jen body a kreslí je přímo do stránky, ne přes `<img>`: tak má
 * znak průhledné pozadí a barvy mu dává CSS podle režimu. Neznámá kategorie
 * znak nemá, a to je v pořádku.
 */

type Klic = keyof typeof ZNAKY_TRID;

/** „Nad7m" → „nad7m". Tak se jmenuje znak. */
export function slugTridy(nazev: string) {
  return nazev
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Ořez vodoznaku potřebuje id unikátní v rámci stránky — na jedné stránce
// je znak třídy v tabu i v boku. Komponenta běží jen na serveru, takže
// počítadlo nemusí sedět s ničím v prohlížeči.
let citac = 0;

/** Znak třídy. Dekorace vedle názvu, proto skrytý před čtečkou obrazovky. */
export function ZnakTridy({ nazev }: { nazev: string }) {
  const slug = slugTridy(nazev);
  if (!(slug in ZNAKY_TRID)) return null;

  const z = ZNAKY_TRID[slug as Klic];
  const orez = `znak-${slug}-${++citac}`;
  const pismeno = (trida: string, clipPath?: string) => (
    <text
      className={trida}
      x={z.pismeno.x}
      y={z.pismeno.y}
      fontSize={z.pismeno.velikost}
      textAnchor="middle"
      clipPath={clipPath}
    >
      {z.pismeno.text}
    </text>
  );

  return (
    <svg className={`znak-tridy znak-${slug}`} viewBox={z.viewBox} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={orez}>
          <polygon points={z.plachta} />
          <polygon points={z.oblouk} />
        </clipPath>
      </defs>
      {/* Vodoznak ve dvou vrstvách: slabý v barvě třídy přes celou plochu
          a světlý jen tam, kde leží plachta a oblouk. */}
      {pismeno("vodoznak")}
      <polygon className="plachta" points={z.plachta} />
      <polygon className="oblouk" points={z.oblouk} />
      {pismeno("vodoznak-na-plachte", `url(#${orez})`)}
    </svg>
  );
}

/**
 * Která třída je otevřená. Podle adresy, jinak první — Filip, 15. 9. 2026:
 * výchozí je první třída, ne „všechny", ať se nemusí rolovat.
 */
export function vyberTridu(kategorie: string[], trida?: string) {
  return kategorie.find((k) => k.toLowerCase() === trida?.toLowerCase()) ?? kategorie[0];
}

/**
 * Taby tříd. Odkazy s parametrem v adrese, bez javascriptu: stránka se
 * vykreslí na serveru a dá se poslat odkaz rovnou na Pod7m. `scroll={false}`
 * nechá stránku na místě — přepnutí třídy nemá odskočit nahoru.
 *
 * Jedna třída taby nemá; nadpis jí pak dává stránka sama.
 */
export function TabyTrid({
  kategorie,
  aktivni,
  adresa,
}: {
  kategorie: string[];
  aktivni: string;
  adresa: (trida: string) => string;
}) {
  if (kategorie.length < 2) return null;

  return (
    <nav className="taby taby-trid" aria-label="Lodní třídy">
      {kategorie.map((k) => (
        <Link
          key={k}
          href={adresa(k)}
          scroll={false}
          aria-current={k === aktivni ? "page" : undefined}
        >
          <ZnakTridy nazev={k} />
          {k}
        </Link>
      ))}
    </nav>
  );
}

/** Nadpis třídy tam, kde taby nejsou, protože třída je jen jedna. */
export function NadpisTridy({ kategorie, aktivni }: { kategorie: string[]; aktivni: string }) {
  if (kategorie.length !== 1) return null;

  return (
    <h3 className="nadpis-tridy">
      <ZnakTridy nazev={aktivni} />
      {aktivni}
    </h3>
  );
}
