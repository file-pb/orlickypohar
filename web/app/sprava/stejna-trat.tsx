import Link from "@/app/sprava/odkaz";

/**
 * „Totéž jedou ještě…" — malá rozbalovací poznámka s odkazy na rozjížďky,
 * které mají shodný předpis trati.
 *
 * <b>Jedna komponenta pro dvě obrazovky</b>: ukazuje se u tratě v bójích
 * i u rozjížďky ve výsledcích. Kdyby to byly dvě podobné, rozejdou se —
 * a tahle věta má na obou místech znamenat přesně totéž.
 *
 * <b>Rozbalovací a malá</b> (Filip, 15. 10. 2026: *„udělej ji malou
 * a rozbalovací, aby to nerušilo hlavní panel"*). Je to doplňující pohled,
 * ne údaj, kvůli kterému se na obrazovku chodí — zabalená zabere řádek
 * a řekne počet, rozbalená vydá odkazy.
 *
 * <b>Počítá se z otisku předpisu</b>, ne z původu klonu (Filip, 12. 10.
 * 2026). Jakmile se jedna z tratí upraví, dvojice se rozpadne a věta
 * zmizí — to je přesně to, co má říct.
 */
export function StejnaTrat({
  serie,
  zavod,
  cisla,
}: {
  serie: string;
  zavod: string;
  /** Čísla rozjížděk se shodným předpisem, bez té vlastní. Seřazená. */
  cisla: number[];
}) {
  if (cisla.length === 0) return null;

  return (
    <details className="stejna-trat">
      <summary>
        Totéž jede {cisla.length === 1 ? "ještě jedna rozjížďka" : `ještě ${cisla.length} rozjížďky`}
      </summary>
      <p>
        {cisla.map((c, i) => (
          <span key={c}>
            {i > 0 && ", "}
            <Link href={`/sprava/${serie}/vysledky/${zavod}/${c}`}>{c}. rozjížďka</Link>
          </span>
        ))}
      </p>
    </details>
  );
}
