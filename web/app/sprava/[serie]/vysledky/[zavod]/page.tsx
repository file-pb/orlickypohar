import Link from "next/link";
import { notFound } from "next/navigation";
import { Drobecky } from "@/app/drobecky";
import { Stav } from "@/app/stav";
import { Vypadek } from "@/app/vypadek";
import {
  STAVY,
  nactiRozjizdky,
  nazevStavu,
  type RozjizdkaRadek,
  type StavVysledku,
} from "@/lib/vysledky";
import { poharAkce, pridejRozjizdkuAkce, publikaceAkce, stavAkce } from "../akce";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Výsledky regaty — správa" };

type Parametry = {
  params: Promise<{ serie: string; zavod: string }>;
  searchParams: Promise<{
    chyba?: string;
    stav?: string;
    cislo?: string;
    nastav?: StavVysledku;
    revize?: string;
  }>;
};

/**
 * Workflow výsledků jedné regaty.
 *
 * <b>Celé serverové a bez javascriptu</b>, stejně jako zbytek administrace.
 * Nabídku kroků posílá API v každém řádku — pravidla přechodů i oprávnění
 * žijí na serveru a druhá kopie tady by se při první změně rozešla.
 */
export default async function VysledkyZastavky({ params, searchParams }: Parametry) {
  const { serie, zavod } = await params;
  const zpravy = await searchParams;

  const { stav, data: prehled } = await nactiRozjizdky(serie, zavod);

  // Výpadek nesmí spolknout výsledek zápisu.
  if (stav === "vypadek")
    return (
      <>
        {zpravy.chyba && (
          <p className="hlaska chyba" role="alert">
            {zpravy.chyba}
          </p>
        )}
        <Vypadek />
      </>
    );

  if (stav === "neni") notFound();

  const hlava = (
    <>
      <Drobecky
        cesta={[
          { text: "Domů", kam: "/" },
          { text: "Ročník", kam: `/serie/${serie}` },
          { text: "Výsledky", kam: `/sprava/${serie}/vysledky` },
          { text: "Regata" },
        ]}
      />
      <h1>Výsledky regaty</h1>
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

  if (stav === "nesmi" || !prehled)
    return (
      <>
        {hlava}
        <p className="prazdno">
          K výsledkům téhle regaty nemáš přístup. Zapisuje je její pořadatel,
          ověřuje a schvaluje rozhodčí ročníku.
        </p>
      </>
    );

  return (
    <>
      <Drobecky
        cesta={[
          { text: "Domů", kam: "/" },
          { text: "Ročník", kam: `/serie/${serie}` },
          { text: "Výsledky", kam: `/sprava/${serie}/vysledky` },
          { text: prehled.zavodNazev },
        ]}
      />
      <h1>{prehled.zavodNazev}</h1>
      <p className="podtitulek">
        {prehled.serieNazev} <Stav stav={prehled.stavZavodu} />
        {" · "}
        <Link href={`/sprava/${serie}/prihlasky/${zavod}`}>přihlášené lodě →</Link>
      </p>

      {/* Nepublikovaná regata schová i publikovanou rozjížďku — veřejně
          neexistuje. Bez téhle věty by správce pouštěl čísla ven a divil se,
          že na webu nejsou. */}
      {!prehled.zavodPublikovan && (
        <p className="hlaska" role="status">
          Regata sama není zveřejněná, takže veřejnost neuvidí ani výsledky,
          které pustíš ven. Zveřejnit ji jde{" "}
          <Link href={`/sprava/${serie}/kalendar`}>v kalendáři</Link>.
        </p>
      )}

      {zpravy.chyba && (
        <p className="hlaska chyba" role="alert">
          {zpravy.chyba}
        </p>
      )}
      {zpravy.stav && !zpravy.chyba && (
        <p className="hlaska hotovo" role="status">
          {hotovo(zpravy.stav, zpravy.cislo, zpravy.nastav)}
        </p>
      )}

      {prehled.rozjizdky.length === 0 ? (
        <p className="prazdno">
          Regata zatím nemá jedinou rozjížďku.{" "}
          {prehled.smiPridatRozjizdku
            ? "Přidej první a rovnou do ní zapiš výsledky."
            : "Přidat ji může pořadatel regaty, jakmile je závod vypsaný."}
        </p>
      ) : (
        <ul className="seznam">
          {prehled.rozjizdky.map((r) => (
            <li key={r.cislo}>
              <Rozjizdka
                serie={serie}
                zavod={zavod}
                rozjizdka={r}
                otevriRevizi={zpravy.revize === String(r.cislo)}
              />
            </li>
          ))}
        </ul>
      )}

      {prehled.smiPridatRozjizdku && (
        <form action={pridejRozjizdkuAkce} className="pridat">
          <input type="hidden" name="serie" value={serie} />
          <input type="hidden" name="zavod" value={zavod} />
          <label className="zaskrtnuti">
            <input type="checkbox" name="doSerie" value="ano" defaultChecked /> do poháru
          </label>
          {/* Na vodě rovnou cílová obrazovka, doma formulář z papíru. */}
          <button type="submit" name="kam" value="cil">
            Nová rozjížďka — cílová obrazovka
          </button>
          <button type="submit" name="kam" value="formular">
            Nová rozjížďka — přepis z papíru
          </button>
        </form>
      )}
    </>
  );
}

function Rozjizdka({
  serie,
  zavod,
  rozjizdka,
  otevriRevizi,
}: {
  serie: string;
  zavod: string;
  rozjizdka: RozjizdkaRadek;
  otevriRevizi: boolean;
}) {
  const skryta = ["Navrzeno", "Overeno", "Schvaleno"] as const;

  return (
    <div className="karta">
      <div className="nazev">
        {rozjizdka.cislo}. rozjížďka
        <span className={`stitek vysledek-${rozjizdka.stavVysledku.toLowerCase()}`}>
          {nazevStavu(rozjizdka.stavVysledku)}
        </span>
        {rozjizdka.publikovano ? (
          <span className="stitek venku">venku</span>
        ) : (
          <span className="stitek neverejne">nezveřejněno</span>
        )}
        {/* Že se rozjížďka nepočítá do poháru, je něco jiného než že
            neplatí — u Izolepy je to běh pro míčky z kopce. */}
        {!rozjizdka.doSerie && <span className="stitek">mimo pohár</span>}
        {/* Papír z cíle je doklad k číslům. Rozhodčí, který zápis ověřuje,
            potřebuje vidět, jestli u něj je, ještě než ho otevře. */}
        {rozjizdka.maPapir && (
          <span className="stitek" title="U zápisu je fotka papíru z cíle">
            papír
          </span>
        )}
      </div>

      <div className="detail">
        {rozjizdka.pocetVysledku === 0
          ? "zatím bez zapsaných výsledků"
          : `${rozjizdka.pocetVysledku} zapsaných výsledků`}
        {" · "}
        {/* Zápis vidí i ten, kdo ho nemění — rozhodčí ověřuje právě tohle. */}
        <Link href={`/sprava/${serie}/vysledky/${zavod}/${rozjizdka.cislo}`}>
          {rozjizdka.smiZapisovat ? "zapsat výsledky" : "zobrazit zápis"}
        </Link>
        {rozjizdka.smiZapisovat && (
          <>
            {" · "}
            <Link href={`/sprava/${serie}/vysledky/${zavod}/${rozjizdka.cislo}/cil`}>cílová obrazovka</Link>
          </>
        )}
      </div>

      {/* Důvod revize zůstává u rozjížďky i potom, co se vrátí do návrhu —
          kdo zápis opravuje, potřebuje ho vidět právě tehdy. */}
      {rozjizdka.duvodRevize && (
        <p className="duvod">
          <b>K revizi:</b> {rozjizdka.duvodRevize}
        </p>
      )}

      <div className="stavy">
        {rozjizdka.mozneStavy
          .filter((na) => na !== "KRevizi")
          .map((na) => (
            <form key={na} action={stavAkce}>
              <input type="hidden" name="serie" value={serie} />
              <input type="hidden" name="zavod" value={zavod} />
              <input type="hidden" name="cislo" value={rozjizdka.cislo} />
              <input type="hidden" name="stav" value={na} />
              <button type="submit" title={STAVY[na].popis}>
                {STAVY[na].tlacitko}
              </button>
            </form>
          ))}

        {/* Do poháru, nebo mimo něj. Výsledku regaty se to netýká —
            ten se počítá ze všech odjetých rozjížděk. */}
        {rozjizdka.smiDoPoharu && (
          <form action={poharAkce}>
            <input type="hidden" name="serie" value={serie} />
            <input type="hidden" name="zavod" value={zavod} />
            <input type="hidden" name="cislo" value={rozjizdka.cislo} />
            <input type="hidden" name="doSerie" value={rozjizdka.doSerie ? "ne" : "ano"} />
            <button
              type="submit"
              title={
                rozjizdka.doSerie
                  ? "Body z téhle rozjížďky přestanou platit v poháru. Výsledek regaty zůstává."
                  : "Body z téhle rozjížďky se zase budou počítat do poháru."
              }
            >
              {rozjizdka.doSerie ? "Vyndat z poháru" : "Vrátit do poháru"}
            </button>
          </form>
        )}

        {rozjizdka.smiPublikovat && (
          <form action={publikaceAkce}>
            <input type="hidden" name="serie" value={serie} />
            <input type="hidden" name="zavod" value={zavod} />
            <input type="hidden" name="cislo" value={rozjizdka.cislo} />
            <input type="hidden" name="publikovano" value={rozjizdka.publikovano ? "ne" : "ano"} />
            <button
              type="submit"
              title={
                rozjizdka.publikovano
                  ? "Čísla z webu zmizí. Stav zápisu se tím nemění."
                  : "Čísla uvidí veřejnost. Stav zápisu se tím nemění."
              }
            >
              {rozjizdka.publikovano ? "Stáhnout z webu" : "Pustit ven"}
            </button>
          </form>
        )}
      </div>

      {/* Vrácení má povinný důvod, takže se nevejde mezi tlačítka na jedno
          kliknutí. Rozbaluje se v kartě, ne na vlastní stránce. */}
      {rozjizdka.mozneStavy.includes("KRevizi") && (
        <details className="uprava" open={otevriRevizi}>
          <summary>Vrátit k revizi</summary>
          <form action={stavAkce} className="formular">
            <input type="hidden" name="serie" value={serie} />
            <input type="hidden" name="zavod" value={zavod} />
            <input type="hidden" name="cislo" value={rozjizdka.cislo} />
            <input type="hidden" name="stav" value="KRevizi" />
            <label>
              Co je špatně
              <textarea
                name="duvod"
                required
                rows={2}
                maxLength={400}
                placeholder="U Aničky sedí čas, ne pořadí."
              />
            </label>
            <button type="submit">Vrátit k revizi</button>
            <p className="poznamka">
              Zápis se vrátí tomu, kdo ho pořídil. Opravený projde ověřením
              znovu — i když už byl potvrzený.
            </p>
          </form>
        </details>
      )}

      {skryta.includes(rozjizdka.stavVysledku as (typeof skryta)[number]) &&
        rozjizdka.publikovano && (
          <p className="poznamka">
            Čísla jsou venku, i když zápis ještě neprošel celým workflow.
            Publikace je vlastní příznak, ne poslední stupeň.
          </p>
        )}
    </div>
  );
}

/** Věta po zápisu. Skládá se tady, protože akce zná jen čísla a slugy. */
function hotovo(stav: string, cislo?: string, nastav?: StavVysledku) {
  const kdo = cislo ? `${cislo}. rozjížďka` : "Rozjížďka";

  switch (stav) {
    case "prepnuto":
      return `${kdo} — ${nastav ? STAVY[nastav].popis : "hotovo."}`;
    case "venku":
      return `${kdo}: čísla jsou venku.`;
    case "stazeno":
      return `${kdo}: čísla z webu zmizela. Stav zápisu se nezměnil.`;
    case "vPoharu":
      return `${kdo} se počítá do poháru.`;
    case "mimoPohar":
      return `${kdo} je mimo pohár. Do výsledku regaty se počítá dál.`;
    default:
      return "Hotovo.";
  }
}
