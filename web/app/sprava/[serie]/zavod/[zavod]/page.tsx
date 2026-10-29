import { notFound, redirect } from "next/navigation";
import { Drobecky, drobeckySpravy } from "@/app/drobecky";
import { Vypadek } from "@/app/vypadek";
import { Stav } from "@/app/stav";
import { datum } from "@/app/datum";
import { nactiJa } from "@/lib/ja";
import { nactiKalendar } from "@/lib/kalendar";
import { polozkyZastavky, prava } from "@/lib/co-smim";
import { PruhUkonuRegaty } from "@/app/sprava/pruh-ukonu";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Regata — správa" };

/**
 * <b>Regata ve správě má konečně vlastní stránku</b> (Filip, 29. 10. 2026).
 * Do teď byla jen `<li>` v seznamu na rozcestníku ročníku — karta s kotvou,
 * u které si to tehdejší komentář sám přiznával: *„«regata ve správě»
 * vlastní stránku nemá a tahle karta je ona"*. Pracovní obrazovky pak
 * neměly kam vést zpátky než do seznamu všech regat.
 *
 * <b>Úkony jsou dlaždice, ne řádek odkazů</b> (Filip: *„no a nebo dlaždice
 * místo tabů co?"*). Řádek `výsledky · přihlášky · směrnice · trať · polohy`
 * unese jen jména, kdežto položky nesou i `popis` — větu, co se na té
 * obrazovce dělá — a ta se do dneška nikde neukazovala. Čerstvý pořadatel
 * přitom z „bóje" nepozná, že tam jde pípnout polohu a sebrat ji z vody.
 *
 * <b>Dlaždice jsou vstup, ne navigace mezi sekcemi.</b> Uvnitř sekcí bude
 * pruh (`app/prepinac-sekci.tsx`) — šest karet nad každou pracovní
 * obrazovkou by obsah pokaždé odtlačilo o tři řádky (změřeno: ve středu
 * stránky vyjdou dva sloupce i na 1920 px).
 */
export default async function RegataVeSprave({
  params,
}: {
  params: Promise<{ serie: string; zavod: string }>;
}) {
  const { serie, zavod } = await params;
  const { ja } = await nactiJa();
  if (!ja) redirect("/prihlaseni");

  // Název, termín a stav regaty. Čte se kalendář, protože ho smí číst každý,
  // kdo se na úkony regaty dostane — rozhodčí, správce i pořadatel jediné
  // zastávky (`KalendarEndpoints.PohledAsync`).
  const { stav, prehled } = await nactiKalendar(serie);
  if (stav === "vypadek") return <Vypadek co="Regata" />;
  if (stav === "neni" || stav === "nesmi") notFound();

  const radek = prehled?.zastavky.find((z) => z.slug === zavod);
  if (!radek) notFound();

  const udelena = prava(ja);
  const ukony = polozkyZastavky(udelena, serie, zavod);

  return (
    <>
      <Drobecky cesta={drobeckySpravy(serie, [{ text: radek.nazev }])} />

      {/* I tady stojí pruh hned pod drobečky, ať je na všech obrazovkách
          regaty na témže místě. Zrušená regata nemá výsledky ani přihlášky
          a API je odmítne — dlaždice na ně by byly slib naprázdno. */}
      {radek.stav === "Zruseny" ? null : ukony.length === 0 ? null : (
        <PruhUkonuRegaty serie={serie} zavod={zavod} />
      )}

      <div className="radek-nadpisu">
        <h1>
          <span className={radek.stav === "Zruseny" ? "skrtnute" : undefined}>{radek.nazev}</span>{" "}
          <Stav stav={radek.stav} />
        </h1>
        <p className="podtitulek">
          {datum(radek.datum, radek.datumKonce)}
          {radek.poradatel && ` · pořádá ${radek.poradatel}`}
          {radek.puvodniDatum && (
            <span className="presun"> · přesunuto z {datum(radek.puvodniDatum)}</span>
          )}
        </p>
      </div>

      {radek.stav === "Zruseny" ? (
        <p className="prazdno">Zrušeno. Nic se tu nezapisuje.</p>
      ) : (
        ukony.length === 0 && <p className="prazdno">U téhle regaty nemáš žádný úkon.</p>
      )}
    </>
  );
}
