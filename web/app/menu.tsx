import { ZavriMimo } from "@/app/zavri-mimo";
import { OdkazJinam } from "@/app/odkaz-jinam";

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
export function Menu({
  rocnik,
  rucniRezim,
}: {
  rocnik?: { slug: string; rok: number };
  /** Vzhled je přepnutý ručně — nabídne se návrat k systému. */
  rucniRezim?: boolean;
}) {
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
            <OdkazJinam className="jen-uzke" href={`/serie/${rocnik.slug}`}>
              Ročník {rocnik.rok}
            </OdkazJinam>
            <OdkazJinam className="jen-uzke" href={`/serie/${rocnik.slug}/poradi`}>
              Průběžné pořadí
            </OdkazJinam>
          </>
        )}
        {/* Tabule do hospody. Vede na rozcestník, ne na konkrétní závod:
            hlavička by jinak musela na každé stránce zjišťovat, co se jede. */}
        <OdkazJinam href="/tabule">Tabule na telku</OdkazJinam>
        <OdkazJinam href="/historie">Historie</OdkazJinam>
        <OdkazJinam href="/pravidla">Pravidla</OdkazJinam>
        <OdkazJinam href="/napoveda">Nápověda</OdkazJinam>
        <OdkazJinam href="/appka">Appka</OdkazJinam>
        <OdkazJinam href="/osobni-udaje">Osobní údaje</OdkazJinam>
        {/* Jen když je vzhled přepnutý ručně: bez toho by se z ruční volby
            nedalo vrátit k systému jinak než smazáním cookie. */}
        {rucniRezim && (
          <form method="post" action="/rezim">
            <input type="hidden" name="na" value="system" />
            <button type="submit">Vzhled podle systému</button>
          </form>
        )}
      </div>
    </details>
  );
}
