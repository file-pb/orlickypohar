import { nazevTypu, type StranaPrvku, type TypPrvku } from "@/lib/trat";

/**
 * Tvar prvku. <b>Jedno místo pro správu i pro web</b>: kdo si tvar
 * zvykne číst v seznamu ve správě, pozná ho na veřejné stránce i na mapce.
 *
 * <para>
 * Původní znění (Filip, 9. 10. 2026): *„pokud plánuješ nějaké typy: brána,
 * otocna boje… tak možná jestli bys k tomu neudělal nějaké ikonky, ať je to
 * veselejší a přehlednější"*.
 * </para>
 *
 * Tentýž jazyk jako na mapě: kolečko je konec, plná úsečka mezi dvěma konci
 * je čára nebo brána, obloučky ukazují stranu.
 */
export function IkonaPrvku({ typ, strana }: { typ: TypPrvku; strana: StranaPrvku }) {
  const vlevo = strana === "PoLeve";

  return (
    <svg
      className="ikona-prvku"
      viewBox="0 0 32 20"
      width="32"
      height="20"
      role="img"
      aria-label={nazevTypu(typ)}
    >
      {typ !== "Znacka" && (
        <line x1="6" y1="10" x2="26" y2="10" stroke="currentColor" strokeWidth="2" />
      )}
      {typ === "Znacka" ? (
        <>
          <circle cx="16" cy="10" r="4" fill="currentColor" />
          {strana && (
            <path
              d={vlevo ? "M 9 4 A 7 7 0 0 0 9 16" : "M 23 4 A 7 7 0 0 1 23 16"}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
          )}
        </>
      ) : (
        <>
          <circle cx="6" cy="10" r="4" fill="currentColor" />
          <circle cx="26" cy="10" r="4" fill="currentColor" />
          {/* Start a cíl mají navíc písmeno: tytéž dvě polohy můžou být
              ráno start a odpoledne cíl, takže tvar sám je nerozliší. */}
          {(typ === "CaraStart" || typ === "CaraCil") && (
            <text x="16" y="7" textAnchor="middle" fontSize="8" fill="currentColor">
              {typ === "CaraStart" ? "S" : "C"}
            </text>
          )}
          {typ === "Odskok" && strana && (
            <path
              d={vlevo ? "M 2 5 A 5 5 0 0 0 2 15" : "M 30 5 A 5 5 0 0 1 30 15"}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
          )}
        </>
      )}
    </svg>
  );
}
