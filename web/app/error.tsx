"use client";

import Link from "next/link";

/**
 * Když spadne načtení dat, návštěvník nemá vidět chybu z Nextu.
 *
 * Nejčastější příčina není chyba v kódu, ale nedostupné API — proto ta
 * nabídka zkusit znovu. Musí to být klientská komponenta, jinak nejde
 * `reset` navázat na tlačítko.
 */
export default function Chyba({ reset }: { error: Error; reset: () => void }) {
  return (
    <>
      <h1>Výsledky se teď nedaří načíst</h1>
      <p className="podtitulek">
        Nejspíš je to chvilkový výpadek na naší straně, ne chyba u tebe.
      </p>
      <p className="prazdno">
        <button className="tlacitko" onClick={reset} type="button">
          Zkusit znovu
        </button>
        <br />
        <br />
        Když to nepomůže, zkus <Link href="/">začít od ročníků</Link> za chvíli
        znovu.
      </p>
    </>
  );
}
