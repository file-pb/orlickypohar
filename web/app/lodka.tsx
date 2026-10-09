import { STAVY_UCASTI, type StavUcasti } from "@/lib/prihlasky";

/**
 * Loďka u přihlášené lodi: <b>tvar podle kategorie, barva podle stavu</b>
 * (Filip, 9. 10. 2026: *„přihlášky by mohly mít loďku podle kategorie
 * a stavu"*).
 *
 * <para>
 * <b>Tohle je jediné místo v kódu, které sahá na jména kategorií.</b>
 * Kategorie nejsou výčet, jsou to řádky v databázi — ročník 2026 má
 * `Pod7m`, `Nad7m` a `Race` ze sešitu rozhodčího a nic v nich neříká, jak
 * je loď velká. Tvar se proto přiřazuje podle jména, a <b>co se netrefí,
 * dostane neutrální loďku</b>. Jiný ročník tím nerozbije obrazovku, jen
 * nedostane rozlišení — a to je správný způsob, jak se mýlit.
 * </para>
 *
 * <para>
 * Barva nese stav: <b>vybarvená loď jede</b>, prázdná čeká na pořadatele,
 * tlumená je mimo závod. Je to totéž dělení, jaké obrazovka už používá na
 * rozdělení seznamu (`skupinaStavu`), takže ikona a sloupce nemůžou říkat
 * každý něco jiného.
 * </para>
 */
export function Lodka({
  kategorie,
  stav,
}: {
  kategorie?: string | null;
  stav?: StavUcasti | null;
}) {
  const tvar = TVARY[(kategorie ?? "").trim()] ?? "neutral";
  const nazev = [
    stav ? STAVY_UCASTI[stav].stitek : "bez přihlášky",
    kategorie,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <svg
      className={`lodka lodka-${stav ? skupina(stav) : "bez"}`}
      viewBox="0 0 28 24"
      width="26"
      height="22"
      role="img"
      aria-label={nazev}
    >
      {/* Trup je pro všechny stejný: loď je loď. Rozlišují plachty.
          Mezi tvary se nechává mezera — při dvaceti pixelech se jinak
          slijí do jednoho trojúhelníku a ikona přestane rozlišovat to,
          kvůli čemu je. */}
      <path
        d="M 4 18 L 24 18 L 21 22 L 7 22 Z"
        fill="currentColor"
        fillOpacity="var(--lodka-vypln, 1)"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <line x1="14" y1="17" x2="14" y2="3" stroke="currentColor" strokeWidth="1.3" />

      {/* Hlavní plachta za stěžněm. Malá loď ji má nízkou a je to všechno,
          co má; větší ji má až k vrcholu. */}
      <path
        d={tvar === "mala" ? "M 15 9 L 15 16 L 20 16 Z" : "M 15 4 L 15 16 L 22 16 Z"}
        fill="currentColor"
        fillOpacity="var(--lodka-vypln, 1)"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />

      {/* Kosatka před stěžněm — jen u větší lodi. */}
      {tvar === "velka" && (
        <path
          d="M 12 7 L 12 16 L 6 16 Z"
          fill="currentColor"
          fillOpacity="var(--lodka-vypln, 1)"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
      )}

      {/* Spinakr: vyboulený, a proto se pozná od kosatky i v malém. Plný
          vždycky — prázdný by se slil se stěžněm. */}
      {tvar === "race" && (
        <path
          d="M 12 6 C 2 9 1 15 4 16 L 12 16 Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

/**
 * Jméno kategorie → tvar. Záměrně krátký seznam: co v něm není, dostane
 * neutrální loďku. Klíče jsou jména z ročníku 2026 (sešit rozhodčího).
 */
const TVARY: Record<string, "mala" | "velka" | "race"> = {
  Pod7m: "mala",
  "do 7 m": "mala",
  Nad7m: "velka",
  "nad 7 m": "velka",
  Race: "race",
  RACE: "race",
};

/** Totéž dělení jako u seznamu, jen jako jméno třídy. */
function skupina(stav: StavUcasti) {
  if (stav === "Pozadavek" || stav === "KDoplneni") return "ceka";
  if (stav === "Prihlasena" || stav === "Potvrzena") return "jede";
  if (stav === "Vyloucena") return "vyloucena";
  return "mimo";
}
