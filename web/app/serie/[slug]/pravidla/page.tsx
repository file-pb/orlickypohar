import { notFound } from "next/navigation";
import Link from "next/link";
import { ApiNedostupne, nactiSerii } from "@/lib/api";
import { Vypadek } from "@/app/vypadek";
import { Boky } from "@/app/boky";
import { NadpisSerie, PruhSerie } from "@/app/serie/[slug]/pruh-serie";

// Stránka stojí na databázi, ne na obsahu známém v době buildu.
export const dynamic = "force-dynamic";

type Parametry = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Parametry) {
  const { slug } = await params;
  try {
    const serie = await nactiSerii(slug);
    return { title: serie ? `Pravidla ročníku — ${serie.nazev}` : "Pravidla ročníku" };
  } catch {
    return { title: "Pravidla ročníku" };
  }
}

/**
 * <b>Podle čeho se ročník boduje</b> — veřejně a dřív, než se loď přihlásí.
 *
 * Prosadil to jachtař v konziliu (12. 11. 2026): ZPJ 25.1 žádá podmínky
 * dostupné před přihláškou a nález R24 říká, že pravidlo, podle kterého loď
 * patří do kategorie, stojí ve vypsání a nikde jinde. U jednotlivé regaty to
 * vypsání řeší; u ročníku ekvivalent nebyl, a stránka `/pravidla` ročníková
 * čísla neunese — škrty i verze pravidel jsou vlastnost ročníku.
 *
 * <b>Nic se tu nepočítá a nic nevymýšlí.</b> Každé číslo přišlo z API
 * (`SerieDetailDto.Pravidla`) a pochází z té verze pravidel, kterou ročník
 * nese — takže uzavřený ročník ukáže, podle čeho se vyhlašoval, ne podle
 * čeho by se počítal dnes.
 */
export default async function PravidlaRocniku({ params }: Parametry) {
  const { slug } = await params;

  let serie;
  try {
    serie = await nactiSerii(slug);
  } catch (e) {
    if (e instanceof ApiNedostupne) return <Vypadek co="Ročník" />;
    throw e;
  }
  if (!serie) notFound();

  const p = serie.pravidla;
  const odjetych = serie.zavody.filter((z) => z.stav === "Odjety").length;

  return (
    <Boky vlevo="novinky" vpravo="akce" vpravoDoplnky={["vodocet"]}>
      <PruhSerie slug={slug} aktivni="pravidla" />
      <NadpisSerie
        nazevRocniku={serie.nazev}
        cast="pravidla"
        podtitulek={`verze pravidel ${p.verzePravidel}`}
      />

      <h2>Jak se počítají body</h2>
      <p>
        Jede se <b>nízkobodovým systémem</b>: vítěz regaty ve své kategorii má
        do seriálu <b>0 bodů</b>, druhý 1, třetí 2 a tak dál. Vyhrává tedy
        nejnižší součet. Body se počítají <b>zvlášť v každé kategorii</b> —
        pořadí napříč kategoriemi seriál nezná.
      </p>

      <h2>Škrty</h2>
      <p>
        {/* Číslovka řídí sloveso i pád, ne naopak: „škrtá se nejhorší
            regata", ale „škrtají se dvě nejhorší regaty" a „škrtá se pět
            nejhorších regat". */}
        {p.pocetSkrtu === 0 ? (
          <>V tomhle ročníku se <b>neškrtá</b> — do součtu jdou všechny regaty.</>
        ) : (
          <>
            Ze součtu se {p.pocetSkrtu > 1 && p.pocetSkrtu < 5 ? "škrtají" : "škrtá"}{" "}
            <b>
              {p.pocetSkrtu === 1
                ? "nejhorší regata"
                : p.pocetSkrtu < 5
                  ? `${p.pocetSkrtu} nejhorší regaty`
                  : `${p.pocetSkrtu} nejhorších regat`}
            </b>
            . Přeškrtnuté číslo se do celkového součtu nepočítá.
          </>
        )}{" "}
        {odjetych === 0
          ? "Zatím není odjetá žádná regata."
          : `Odjeto je ${odjetych} ${odjetych === 1 ? "regata" : odjetych < 5 ? "regaty" : "regat"}.`}
      </p>

      <h2>Kódy místo umístění</h2>
      <p>
        Když loď nedojede nebo se nezúčastní, dostane místo umístění kód.
        Co který znamená v bodech:
      </p>
      <div className="tabulka-obal">
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Kód</th>
              <th style={{ textAlign: "left" }}>Co to je</th>
              <th style={{ textAlign: "left" }}>Body</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>DNC</td>
              <td>Nezúčastnila se</td>
              {/* Pevné číslo tu stát nesmí: u každé regaty je jiné, protože
                  vychází z počtu přihlášených v té kategorii (ZPJ A5.2). */}
              <td>
                počet přihlášených lodí v kategorii
                {p.prirazkaZaKod !== 0 && <> + {p.prirazkaZaKod}</>}
              </td>
            </tr>
            <tr>
              <td>DSQ</td>
              <td>Diskvalifikace v celé regatě</td>
              <td>{p.bodyZaDiskvalifikaci}</td>
            </tr>
            <tr>
              <td>RDG</td>
              <td>Náprava od protestní komise</td>
              <td>
                o {p.prirazkaZaNapravu} hůř než poslední, kdo dojel
              </td>
            </tr>
            <tr>
              <td>ZFP</td>
              <td>Bodový trest</td>
              <td>+{p.trestZfpProcent} % k bodům za nedokončila</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Kategorie</h2>
      {serie.kategorie.length === 0 ? (
        <p className="prazdno">Ročník zatím nemá vypsané kategorie.</p>
      ) : (
        <>
          <p>
            Ročník se vyhodnocuje {serie.kategorie.length === 1 ? "v jedné kategorii" : `ve ${serie.kategorie.length} kategoriích`}:{" "}
            <b>{serie.kategorie.map((k) => k.nazev).join(" · ")}</b>.
          </p>
          {/* Pravidlo, podle kterého loď do kategorie patří, aplikace nevede
              — stojí ve vypsání závodu (nález R24). Mlčet o tom by znamenalo
              tvrdit, že kategorie jsou jen jména. */}
          <p className="poznamka">
            Podle čeho loď do které kategorie patří, stojí ve vypsání závodu
            u jednotlivých regat — aplikace to pravidlo sama nevede.
          </p>
        </>
      )}

      <p className="poznamka">
        Obecná pravidla jachtingu, podle kterých se jede, jsou na stránce{" "}
        <Link href="/pravidla">Pravidla</Link>. Tady stojí jen to, co je
        vlastní tomuhle ročníku.
      </p>
    </Boky>
  );
}
