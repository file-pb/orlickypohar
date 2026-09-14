import Link from "next/link";

/**
 * Lodní třídy: znak a taby.
 *
 * <b>Znaky kreslí `app/scripts/ikona.py`</b> ze stejných tvarů jako hlavní
 * logo — jedna plachta v barvě třídy a písmeno. Web je jen najde podle
 * názvu kategorie; neznámá kategorie znak nemá, a to je v pořádku.
 */

/** Soubory, které skript vyrábí. Kategorie mimo seznam se zobrazí bez znaku. */
const ZNAKY = new Set(["race", "nad7m", "pod7m"]);

/** „Nad7m" → „nad7m". Tak se jmenuje soubor znaku. */
export function slugTridy(nazev: string) {
  return nazev
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Znak třídy. Dekorace vedle názvu, proto prázdný `alt`. */
export function ZnakTridy({ nazev }: { nazev: string }) {
  const slug = slugTridy(nazev);
  if (!ZNAKY.has(slug)) return null;

  return <img className="znak-tridy" src={`/tridy/${slug}.svg`} alt="" width={33} height={22} />;
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
    <nav className="taby" aria-label="Lodní třídy">
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
