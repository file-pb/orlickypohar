import { VOLBY, type VolbaKalendare } from "@/lib/kalendar-volba";

/**
 * Malý přepínač kalendáře: Pohár · Vše · Mimo pohár (Filip, 22. 9. 2026).
 *
 * Pilulky, ne taby — taby na stránce ročníku už přepínají třídy lodí a dvoje
 * stejně vypadající taby by nešlo od sebe poznat.
 *
 * <b>Bez javascriptu</b>, stejně jako přepínač vzhledu: jeden formulář
 * s POST na `/kalendar-volba` a tři tlačítka, každé nese svou hodnotu. Volba
 * se uloží do cookie a platí pak všude, kde je kalendář.
 */
export function PrepinacKalendare({
  volba,
  kotva,
}: {
  volba: VolbaKalendare;
  /** Id prvku, na který se po přepnutí vrátit. */
  kotva?: string;
}) {
  return (
    <form
      method="post"
      action="/kalendar-volba"
      className="prepinac-kalendare"
      role="group"
      aria-label="Které akce kalendář ukazuje"
    >
      {kotva && <input type="hidden" name="kotva" value={kotva} />}
      {VOLBY.map((v) => (
        <button key={v.hodnota} type="submit" name="na" value={v.hodnota} aria-pressed={v.hodnota === volba}>
          {v.popis}
        </button>
      ))}
    </form>
  );
}
