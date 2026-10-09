import Link from "next/link";
import { redirect } from "next/navigation";
import { Drobecky, drobeckySpravy } from "@/app/drobecky";
import { nactiSerie } from "@/lib/api";
import { nactiJa } from "@/lib/ja";
import { NAZVY_ROLI, polozkyWebu, prava, roleVRocniku, rocniky } from "@/lib/co-smim";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Správa" };

/**
 * Vstup do správy. Jedna adresa, kterou si jde zapamatovat a poslat dál —
 * dřív žádná neexistovala a do správy se dalo jen přes rozbalovací nabídku
 * pod ikonkou účtu (audit, 6. 10. 2026).
 *
 * <b>Kdo má jediný ročník, tu nestojí.</b> Rozcestník přes jednu položku je
 * jen klepnutí navíc, takže se jde rovnou do něj. Stránka má smysl pro toho,
 * kdo má roli ve víc ročnících nebo na celý web.
 */
export default async function Sprava() {
  const { ja } = await nactiJa();
  const udelena = prava(ja);

  const hlava = (
    <>
      <Drobecky cesta={drobeckySpravy(null)} />
      <h1>Správa</h1>
    </>
  );

  if (!ja)
    return (
      <>
        {hlava}
        <p className="prazdno">
          Na správu se musíš <Link href="/prihlaseni">přihlásit</Link>.
        </p>
      </>
    );

  // Seznam ročníků je potřeba jen kvůli roli na celý web — ta platí ve všech
  // a z vlastních oprávnění se jejich jména nedozvíme.
  const vsechny = await nactiSerie().catch(() => []);
  const mam = rocniky(
    udelena,
    (vsechny ?? []).map((s) => s.slug),
  );
  const web = polozkyWebu(udelena);

  if (mam.length === 0 && web.length === 0)
    return (
      <>
        {hlava}
        <p className="prazdno">
          Žádnou roli ve správě nemáš. Svoje lodě najdeš pod{" "}
          <Link href="/moje-lode">Moje lodě</Link>. Jak se role udělují, je
          v <Link href="/napoveda#role">nápovědě</Link>.
        </p>
      </>
    );

  // Jediný ročník a nic nad ním: rozcestník přes jednu položku nemá co ukázat.
  if (mam.length === 1 && web.length === 0) redirect(`/sprava/${mam[0]}`);

  const nazev = (slug: string) =>
    (vsechny ?? []).find((s) => s.slug === slug)?.nazev ?? slug;

  return (
    <>
      {hlava}

      {mam.length > 0 && (
        <>
          <h2>Ročníky</h2>
          <ul className="seznam">
            {mam.map((serie) => (
              <li key={serie}>
                <Link className="karta" href={`/sprava/${serie}`}>
                  <div className="nazev">
                    {nazev(serie)}
                    {roleVRocniku(udelena, serie).map((m, i) => (
                      <span key={`${m.role}-${m.zavod ?? ""}-${i}`} className="stitek">
                        {NAZVY_ROLI[m.role]}
                      </span>
                    ))}
                  </div>
                  <div className="detail">Kalendář, výsledky, přihlášky, směrnice.</div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {web.length > 0 && (
        <>
          <h2>Celý web</h2>
          <ul className="seznam">
            {web.map((p) => (
              <li key={p.kam}>
                <Link className="karta" href={p.kam}>
                  <div className="nazev">
                    {p.nazev}
                    <span className="stitek">{NAZVY_ROLI[p.role]} webu</span>
                  </div>
                  <div className="detail">{p.popis}</div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
