import Link from "next/link";

/**
 * Drobečková navigace. Poslední položka je místo, kde stojíš, takže není
 * odkaz — odkaz sám na sebe je jen šum, stejně jako „Domů" na domovské
 * stránce.
 *
 * Skládá se z toho, co stránka stejně zná; nic se pro ni nenačítá. Nahrazuje
 * dřívější „← zpět na ročník", což byla drobečková navigace pro jedinou
 * úroveň — jenže z ní nešlo skočit dál než o krok.
 */
export type Drobek = { text: string; kam?: string };

export function Drobecky({ cesta }: { cesta: Drobek[] }) {
  return (
    <nav className="drobecky" aria-label="Kde jsem">
      {cesta.map((d, i) => (
        <span key={`${d.text}-${i}`}>
          {/* Oddělovač patří před položku, ne za ni — za poslední by visel
              do prázdna. */}
          {i > 0 && <span className="oddelovac" aria-hidden="true">»</span>}
          {d.kam ? <Link href={d.kam}>{d.text}</Link> : <span aria-current="page">{d.text}</span>}
        </span>
      ))}
    </nav>
  );
}
