import Link from "next/link";

/**
 * Co uvidí návštěvník, když nejede API.
 *
 * Vykresluje se **přímo ze stránky**, ne přes `error.tsx`. Next totiž
 * u výjimky v serverové komponentě dynamické cesty ukázal stránku
 * „nenalezeno" se stavem 500 — tedy „stránka neexistuje" v situaci, kdy
 * existuje a jen se k ní nedá dostat. Přetahovat se s jeho vnitřní logikou
 * je horší než ošetřit to tam, kde chyba vzniká: tohle je předvídatelné
 * a dá se to otestovat.
 */
export function Vypadek() {
  return (
    <>
      <h1>Výsledky se teď nedaří načíst</h1>
      <p className="podtitulek">
        Je to výpadek na naší straně, ne chyba u tebe — stránka existuje.
      </p>
      <p className="prazdno">
        Zkus to za chvíli znovu. Když to bude trvat, napiš pořadateli;
        výsledky mezitím nikam nezmizely.
        <br />
        <br />
        <Link href="/pravidla">Zatím se můžeš podívat, jak se počítají body →</Link>
      </p>
    </>
  );
}
