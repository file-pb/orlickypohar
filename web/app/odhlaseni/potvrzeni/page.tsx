import Link from "next/link";

export const metadata = { title: "Odhlášení" };

/**
 * Stránka pro toho, kdo na odhlášení přišel odkazem místo tlačítkem.
 * Existuje proto, aby `GET /odhlaseni` mohl být neškodný.
 */
export default function Potvrzeni() {
  return (
    <>
      <h1>Odhlásit se</h1>
      <p>Odhlášení ukončí sezení i u poskytovatele identity.</p>
      <form action="/odhlaseni" method="post" className="hero-odkazy">
        <button type="submit" className="tlacitko">
          Odhlásit se
        </button>
        <Link className="tlacitko druhotne" href="/">
          Zpátky na web
        </Link>
      </form>
    </>
  );
}
