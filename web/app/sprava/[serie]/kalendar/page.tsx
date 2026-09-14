import Link from "next/link";
import { notFound } from "next/navigation";
import { Drobecky } from "@/app/drobecky";
import { Stav } from "@/app/stav";
import { Vypadek } from "@/app/vypadek";
import { datum } from "@/app/datum";
import {
  PRECHODY,
  nactiKalendar,
  nazevPrechodu,
  type StavZavodu,
  type ZastavkaRadek,
} from "@/lib/kalendar";
import { publikaceAkce, stavAkce, ulozAkce, zalozAkce } from "./akce";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Kalendář — správa" };

type Parametry = {
  params: Promise<{ serie: string }>;
  searchParams: Promise<{ chyba?: string; stav?: string; co?: string; nastav?: StavZavodu }>;
};

/**
 * Kalendář ročníku: zakládání zastávek, termíny a stavy.
 *
 * <b>Celé serverové a bez javascriptu</b> — formulář odešle prohlížeč,
 * odpověď je nová stránka. Chodí se sem zřídka a často z telefonu na břehu;
 * hydratovat kvůli pár polím celou obrazovku nemá co vrátit.
 *
 * <b>Nabídku tlačítek určuje API, ne tahle stránka.</b> Každý řádek nese
 * seznam stavů, do kterých ho ten konkrétní člověk může posunout — pravidla
 * přechodů i oprávnění žijí na serveru a druhá kopie tady by se při první
 * změně rozešla.
 */
export default async function SpravaKalendare({ params, searchParams }: Parametry) {
  const { serie } = await params;
  const zpravy = await searchParams;

  const { stav, prehled } = await nactiKalendar(serie);

  // Výpadek nesmí spolknout výsledek zápisu: když se nepovede načíst
  // kalendář, ale akce něco vzkázala, musí to být vidět nad výpadkem.
  if (stav === "vypadek") {
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
  }
  if (stav === "neni") notFound();

  const hlava = (
    <>
      <Drobecky
        cesta={[
          { text: "Domů", kam: "/" },
          { text: "Ročník", kam: `/serie/${serie}` },
          { text: "Kalendář" },
        ]}
      />
      <h1>Kalendář — správa</h1>
    </>
  );

  if (stav === "neprihlasen")
    return (
      <>
        {hlava}
        <p className="prazdno">
          Na správu kalendáře se musíš <Link href="/prihlaseni">přihlásit</Link>.
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
          V tomhle ročníku nemáš ke kalendáři přístup. Termíny spravuje rozhodčí,
          průběh závodu jeho pořadatel — o roli požádej správce ročníku.
        </p>
      </>
    );

  return (
    <>
      {hlava}
      <p className="podtitulek">{prehled.serieNazev}</p>

      {zpravy.chyba && (
        <p className="hlaska chyba" role="alert">
          {zpravy.chyba}
        </p>
      )}
      {zpravy.stav && !zpravy.chyba && (
        <p className="hlaska hotovo" role="status">
          {hotovo(zpravy.stav, zpravy.co, zpravy.nastav)}
        </p>
      )}

      {prehled.smiZalozit && (
        <>
          <h2>Nová zastávka</h2>
          {/* Jen název a termín jsou povinné. Nová zastávka je vždycky
              plánovaná a nezveřejněná — potvrdit termín i pustit ji ven
              jsou dvě další rozhodnutí. */}
          <form action={zalozAkce} className="formular">
            <input type="hidden" name="serie" value={serie} />
            <Pole />
            <button type="submit">Založit do předběžného kalendáře</button>
            <p className="poznamka">
              Zastávka vznikne jako plánovaná a veřejnost ji zatím neuvidí.
            </p>
          </form>
        </>
      )}

      <h2>Zastávky</h2>
      {prehled.zastavky.length === 0 ? (
        <p className="prazdno">Ročník zatím nemá jedinou zastávku.</p>
      ) : (
        <ul className="seznam">
          {prehled.zastavky.map((z) => (
            <li key={z.slug}>
              <Zastavka serie={serie} zastavka={z} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * Pole zastávky. Tentýž tvar při zakládání i úpravě — jsou to tytéž údaje
 * a dva různé formuláře by se rozešly v tom, co je povinné.
 */
function Pole({ zastavka }: { zastavka?: ZastavkaRadek }) {
  return (
    <>
      <label>
        Název
        <input
          name="nazev"
          required
          maxLength={120}
          defaultValue={zastavka?.nazev}
          placeholder="Radavská regata"
        />
        {zastavka && (
          <span className="poznamka">
            Adresa zůstane <code>{zastavka.slug}</code> — odkaz už mohl někam odejít.
          </span>
        )}
      </label>

      <label>
        Termín
        <input type="date" name="datum" required defaultValue={zastavka?.datum} />
      </label>

      <label>
        Konec, u vícedenního závodu
        <input type="date" name="datumKonce" defaultValue={zastavka?.datumKonce ?? undefined} />
      </label>

      <label>
        Typ
        <input
          name="typ"
          maxLength={60}
          defaultValue={zastavka?.typ ?? undefined}
          placeholder="okruhový, vytrvalostní, Izolepa"
        />
      </label>

      <label>
        Pořadatel
        <input
          name="poradatel"
          maxLength={120}
          defaultValue={zastavka?.poradatel ?? undefined}
          placeholder="YC Písek"
        />
      </label>
    </>
  );
}

function Zastavka({ serie, zastavka }: { serie: string; zastavka: ZastavkaRadek }) {
  const zrusena = zastavka.stav === "Zruseny";

  return (
    <div className={`karta ${zrusena ? "zrusena" : ""}`}>
      <div className="nazev">
        <span className={zrusena ? "skrtnute" : undefined}>{zastavka.nazev}</span>
        <Stav stav={zastavka.stav} />
        {zastavka.typ && <span className="stitek">{zastavka.typ}</span>}
        {/* Nezveřejněná zastávka není chyba, ale musí být vidět na první
            pohled: v kalendáři na webu prostě není. */}
        {!zastavka.publikovano && <span className="stitek neverejne">nezveřejněno</span>}
      </div>

      <div className="detail">
        {datum(zastavka.datum, zastavka.datumKonce)}
        {zastavka.poradatel && ` · ${zastavka.poradatel}`}
        {zastavka.puvodniDatum && (
          <span className="presun"> · přesunuto z {datum(zastavka.puvodniDatum)}</span>
        )}
        {" · "}
        {/* Odsud se chodí na přihlášky a výsledky té zastávky. Kalendář je
            rozcestník ročníku, takže je to jediné místo, kde se ty cesty
            nabízejí samy. */}
        <Link href={`/sprava/${serie}/prihlasky/${zastavka.slug}`}>přihlášky →</Link>
        {" · "}
        <Link href={`/sprava/${serie}/vysledky/${zastavka.slug}`}>výsledky →</Link>
      </div>

      {/* Posun stavu rovnou ze seznamu: nejčastější úkon je „potvrdit
          termín" nebo „odjeto", a ten nemá stát otevírání zastávky. */}
      <div className="stavy">
        {zastavka.mozneStavy.map((na) => (
          <form key={na} action={stavAkce}>
            <input type="hidden" name="serie" value={serie} />
            <input type="hidden" name="zavod" value={zastavka.slug} />
            <input type="hidden" name="nazev" value={zastavka.nazev} />
            <input type="hidden" name="stav" value={na} />
            <button type="submit" title={PRECHODY[na].popis}>
              {nazevPrechodu(zastavka.stav, na)}
            </button>
          </form>
        ))}

        {zastavka.smiPublikovat && (
          <form action={publikaceAkce}>
            <input type="hidden" name="serie" value={serie} />
            <input type="hidden" name="zavod" value={zastavka.slug} />
            <input type="hidden" name="nazev" value={zastavka.nazev} />
            <input type="hidden" name="publikovano" value={zastavka.publikovano ? "ne" : "ano"} />
            <button
              type="submit"
              title={
                zastavka.publikovano
                  ? "Zmizí z webu. Stav zastávky se tím nemění."
                  : "Objeví se v kalendáři na webu i s tím, v jakém je stavu."
              }
            >
              {zastavka.publikovano ? "Stáhnout z webu" : "Zveřejnit"}
            </button>
          </form>
        )}
      </div>

      {zastavka.smiUpravit && (
        <details className="uprava">
          <summary>Upravit termín a údaje</summary>
          <form action={ulozAkce} className="formular">
            <input type="hidden" name="serie" value={serie} />
            <input type="hidden" name="zavod" value={zastavka.slug} />
            <Pole zastavka={zastavka} />
            <button type="submit">Uložit</button>
            {zastavka.stav !== "Planovany" && (
              <p className="poznamka">
                Posun termínu si zapamatuje ten původní — lidé se na něj chystali.
              </p>
            )}
          </form>
        </details>
      )}
    </div>
  );
}

/** Věta po zápisu. Skládá se tady, protože jména zastávek zná stránka, ne akce. */
function hotovo(stav: string, co?: string, nastav?: StavZavodu) {
  const jmeno = co ? `„${co}"` : "Zastávka";

  switch (stav) {
    case "zalozeno":
      return `${jmeno} je v předběžném kalendáři. Veřejnost ji zatím nevidí.`;
    case "ulozeno":
      return `${jmeno} uložena.`;
    case "prepnuto":
      return nastav === "Zruseny"
        ? `${jmeno} zrušena. Do poháru se nepočítá.`
        : `${jmeno} — ${PRECHODY[nastav ?? "Planovany"].popis}`;
    case "venku":
      return `${jmeno} je v kalendáři na webu.`;
    case "stazeno":
      return `${jmeno} z webu zmizela. Stav zastávky se tím nezměnil.`;
    default:
      return "Hotovo.";
  }
}
