import { dvaBody, nazevStrany, type StranaPrvku, type TypPrvku } from "@/lib/trat";

/**
 * Štítek boku barevně a průhledně (Filip, 15. 10. 2026: *„tag točení dej
 * barevně trochu průhledně — levá je červená a pravá je zelená, střed je
 * kombinací obou barev"*).
 *
 * <b>Barva je o boku lodi, ne o straně značky.</b> Levobok znamená, že loď
 * má značku po levé ruce — a červená se zelenou jsou pozičními světly lodi,
 * takže barva mluví týmž jazykem jako název i jako rozhodčí na vodě.
 *
 * <b>Start a cíl mají vlastní barvu</b> místo kombinace: nejsou to boky,
 * jsou to linie. Start vodní modrou jako zbytek webu, cíl zlatou — je to
 * konec, ne průjezd.
 *
 * <b>Jedna komponenta pro správu i veřejnou stránku</b>: závodník a
 * pořadatel mají u téhož prvku vidět tentýž štítek. Dvě podobné by se
 * rozešly.
 */
export function StitekBoku({ typ, strana }: { typ: TypPrvku; strana: StranaPrvku }) {
  if (typ === "Start") return <span className="stitek bok-start">start</span>;
  if (typ === "Cil") return <span className="stitek bok-cil">cíl</span>;

  // Brána a otočná zóna stranu nemají: projíždí se mezi značkami, takže
  // štítek nese to, a ne bok, který nikdo nerozhodl.
  if (!strana) return dvaBody(typ) ? <span className="stitek bok-mezi">mezi nimi</span> : null;

  return (
    <span className={`stitek ${strana === "PoLeve" ? "bok-levy" : "bok-pravy"}`}>
      {nazevStrany(strana)}
    </span>
  );
}
