import Link from "next/link";
import { ZavriMimo } from "@/app/zavri-mimo";

/**
 * Kebab (⋮) v hlavičce. Na očích zůstává jen Domů a profil, zbytek webu je
 * o klepnutí dál.
 *
 * Filip, 15. 9. 2026: schovat vždycky, nejen na telefonu. Hlavička je pak
 * na všech šířkách stejná a klidná a nabídka se dá doplňovat, aniž by se
 * řádek menu začal lámat.
 *
 * Postavené stejně jako profil: `<details>` rozbalí prohlížeč sám a
 * `ZavriMimo` jen doplní zavření klepnutím jinam a na Escape.
 */
export function Menu({ rocnik }: { rocnik?: { slug: string; rok: number } }) {
  return (
    <details className="menu">
      <ZavriMimo />
      <summary aria-label="Další stránky" title="Další stránky">
        <span aria-hidden="true">⋮</span>
      </summary>
      <div className="nabidka">
        {/* Na širokém displeji stojí ročník a pořadí v hlavičce, na úzkém
            se nevejdou a jsou tady. */}
        {rocnik && (
          <>
            <Link className="jen-uzke" href={`/serie/${rocnik.slug}`}>
              Ročník {rocnik.rok}
            </Link>
            <Link className="jen-uzke" href={`/serie/${rocnik.slug}/poradi`}>
              Průběžné pořadí
            </Link>
          </>
        )}
        <Link href="/historie">Historie</Link>
        <Link href="/pravidla">Pravidla</Link>
        <Link href="/appka">Appka</Link>
      </div>
    </details>
  );
}
