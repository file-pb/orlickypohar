import Link from "next/link";

export const metadata = { title: "Stránka neexistuje" };

/**
 * Vlastní 404. Bez ní ukazuje Next svoji anglickou hlášku, což je na
 * českém veřejném webu vidět hned.
 *
 * Nepublikovaný ročník a nepublikovaná regata **taky končí tady** —
 * schválně: „existuje, ale neukážu" je taky informace a nemá se prozrazovat.
 */
export default function Nenalezeno() {
  return (
    <>
      <h1>Tady nic není</h1>
      <p className="podtitulek">
        Stránka neexistuje — nebo ještě není zveřejněná.
      </p>
      <p className="prazdno">
        Zkus <Link href="/">seznam ročníků</Link>. Pokud jsi šel z odkazu na
        konkrétní závod, může být ještě neveřejný; výsledky se zveřejňují,
        až je rozhodčí uzavře.
      </p>
    </>
  );
}
