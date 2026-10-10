import Link from "next/link";

/**
 * Co uvidí návštěvník, když nejede API.
 *
 * <b>Řekne, co se nenačetlo</b> (Filip, 10. 10. 2026). Dřív tu stálo
 * „Výsledky se teď nedaří načíst" na každé stránce — i na přihlášce lodi,
 * kam člověk přišel něco odeslat a o výsledky mu vůbec nešlo. Hláška,
 * která mluví o něčem jiném, zní jako porucha jinde a pošle člověka
 * hledat tam, kde nic není.
 *
 * Vykresluje se **přímo ze stránky**, ne přes `error.tsx`. Next totiž
 * u výjimky v serverové komponentě dynamické cesty ukázal stránku
 * „nenalezeno" se stavem 500 — tedy „stránka neexistuje" v situaci, kdy
 * existuje a jen se k ní nedá dostat. Přetahovat se s jeho vnitřní logikou
 * je horší než ošetřit to tam, kde chyba vzniká: tohle je předvídatelné
 * a dá se to otestovat.
 */
export function Vypadek({ co = "Stránka" }: { co?: string }) {
  // Odkaz na pravidla dává smysl u výsledků, ne u přihlášky nebo trati:
  // „zatím se podívej, jak se počítají body" je u formuláře mimo.
  const vysledky = co === "Výsledky";

  return (
    <>
      <h1>{co} se teď nedaří načíst</h1>
      <p className="podtitulek">
        Je to výpadek na naší straně, ne chyba u tebe — stránka existuje.
      </p>
      <p className="prazdno">
        Zkus to za chvíli znovu. Když to bude trvat, napiš pořadateli;
        nic se mezitím neztratilo.
        {vysledky && (
          <>
            <br />
            <br />
            <Link href="/pravidla">Zatím se můžeš podívat, jak se počítají body →</Link>
          </>
        )}
      </p>
    </>
  );
}
