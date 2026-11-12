import Link from "@/app/sprava/odkaz";
import { redirect } from "next/navigation";
import { Drobecky, drobeckySpravy } from "@/app/drobecky";
import { nactiSerie } from "@/lib/api";
import { nactiJa } from "@/lib/ja";
import { NAZVY_ROLI, polozkyWebu, prava, roleVRocniku, rocniky } from "@/lib/co-smim";
import { NadpisWebu, PruhWebu } from "@/app/sprava/pruh-webu";

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
      <Drobecky cesta={drobeckySpravy(null)} />
      <PruhWebu aktivni="rocniky" maRocniky={mam.length > 0} />
      <NadpisWebu tab="rocniky" />

      {/* <b>Řádky, ne karty</b> (konzilium, 12. 11. 2026). Karta nesla jméno
          a pod ním větu „Kalendář, výsledky, přihlášky, směrnice." — výčet
          obrazovek, který je o patro níž stejně v pruhu. Řádek nese to, co
          se o ročníku doopravdy ví zvenčí: jak se jmenuje a čím v něm ten
          člověk je. */}
      <ul className="seznam seznam-rocniku">
        {mam.map((serie) => (
          <li key={serie}>
            <Link className="radek-rocniku" href={`/sprava/${serie}`}>
              <span className="nazev">{nazev(serie)}</span>
              <span className="role">
                {roleVRocniku(udelena, serie).map((m, i) => (
                  <span key={`${m.role}-${m.zavod ?? ""}-${i}`} className="stitek">
                    {NAZVY_ROLI[m.role]}
                  </span>
                ))}
              </span>
              <span className="sipka" aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
