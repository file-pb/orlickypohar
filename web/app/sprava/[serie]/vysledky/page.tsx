import Link from "next/link";
import { notFound } from "next/navigation";
import { Drobecky, drobeckySpravy } from "@/app/drobecky";
import { Stav } from "@/app/stav";
import { Vypadek } from "@/app/vypadek";
import { datum } from "@/app/datum";
import { nactiZastavky } from "@/lib/vysledky";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Výsledky — správa" };

/**
 * Rozcestník výsledků: která regata čeká na co.
 *
 * Vlastní stránka, ne seznam rozjížděk všech regat pod sebou — rozjížděk
 * je v ročníku přes třicet a odsud se vybírá, kam jít, ne co udělat. Čísla
 * u regaty stačí sečtená; jsou to jediné dvě věci, kvůli kterým se sem
 * chodí: <b>co ještě není venku</b> a <b>co se vrátilo k revizi</b>.
 */
export default async function SpravaVysledku({
  params,
}: {
  params: Promise<{ serie: string }>;
}) {
  const { serie } = await params;
  const { stav, data: zastavky } = await nactiZastavky(serie);

  if (stav === "vypadek") return <Vypadek />;
  if (stav === "neni") notFound();

  const hlava = (
    <>
      <Drobecky cesta={drobeckySpravy(serie, [{ text: "Výsledky" }])} />
      <h1>Výsledky — správa</h1>
    </>
  );

  if (stav === "neprihlasen")
    return (
      <>
        {hlava}
        <p className="prazdno">
          Na správu výsledků se musíš <Link href="/prihlaseni">přihlásit</Link>.
        </p>
      </>
    );

  if (stav === "odmitnut")
    return (
      <>
        {hlava}
        <p className="prazdno">
          Přihlášení vypršelo. <Link href="/prihlaseni">Přihlas se znovu</Link>.
        </p>
      </>
    );

  if (stav === "nesmi" || !zastavky)
    return (
      <>
        {hlava}
        <p className="prazdno">
          V tomhle ročníku k výsledkům nemáš přístup. Zapisuje je pořadatel
          závodu, ověřuje a schvaluje rozhodčí — o roli požádej správce ročníku.
          Kdo smí který krok, je v{" "}
          <Link href="/napoveda#vysledky">nápovědě</Link>.
        </p>
      </>
    );

  return (
    <>
      {hlava}
      <p className="podtitulek">Vyber regatu, jejíž rozjížďky chceš posunout.</p>

      {zastavky.length === 0 ? (
        <p className="prazdno">
          Ročník zatím nemá jedinou regatu. Zakládá je rozhodčí v{" "}
          <Link href={`/sprava/${serie}/kalendar`}>kalendáři</Link>;{" "}
          <Link href="/napoveda#vypsat-regatu">jak to jde po sobě</Link>.
        </p>
      ) : (
        <ul className="seznam">
          {zastavky.map((z) => (
            <li key={z.zavod}>
              <Link className="karta" href={`/sprava/${serie}/vysledky/${z.zavod}`}>
                <div className="nazev">
                  {z.nazev}
                  <Stav stav={z.stav} />
                  {z.kRevizi > 0 && (
                    <span className="stitek vysledek-krevizi">
                      {z.kRevizi}× k revizi
                    </span>
                  )}
                </div>
                <div className="detail">
                  {datum(z.datum)}
                  {" · "}
                  {z.pocetRozjizdek === 0
                    ? "bez rozjížděk"
                    : `${z.publikovanych} z ${z.pocetRozjizdek} ${rozjizdek(z.pocetRozjizdek)} je venku`}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** „0 z 1 rozjížďky" proti „2 ze 4 rozjížděk" — jinak to škrábe v oku. */
const rozjizdek = (pocet: number) => (pocet === 1 ? "rozjížďky" : "rozjížděk");
