import Link from "next/link";
import { notFound } from "next/navigation";
import { Drobecky } from "@/app/drobecky";
import { Stav } from "@/app/stav";
import { Vypadek } from "@/app/vypadek";
import { datum } from "@/app/datum";
import {
  nactiKalendar,
  nazevPrechodu,
  prechod,
  VYHODNOCENI,
  type DruhZastavky,
  type StavZavodu,
  type Vyhodnoceni,
  type ZastavkaRadek,
} from "@/lib/kalendar";
import { nactiRocnik } from "@/lib/rocnik";
import { publikaceAkce, publikaceRocnikuAkce, stavAkce, ulozAkce, zalozAkce } from "./akce";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Kalendář — správa" };

type Parametry = {
  params: Promise<{ serie: string }>;
  searchParams: Promise<{
    chyba?: string;
    stav?: string;
    co?: string;
    nastav?: StavZavodu;
    druh?: string;
  }>;
};

/**
 * Kalendář ročníku: zakládání regat, termíny a stavy.
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

  const [{ stav, prehled }, { rocnik }] = await Promise.all([
    nactiKalendar(serie),
    nactiRocnik(serie),
  ]);

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

  // Komunitní akce mají vlastní tab. Druh se nosí v adrese, ať se dá na
  // tab poslat odkaz a přesměrování po zápisu na něm zůstane.
  const naAkcich = zpravy.druh === "akce";
  const druh: DruhZastavky = naAkcich ? "Akce" : "Pohar";
  const zastavky = prehled.zastavky.filter((z) => (z.druh ?? "Pohar") === druh);

  return (
    <>
      {hlava}
      <p className="podtitulek">{prehled.serieNazev}</p>

      <nav className="taby" aria-label="Kalendář">
        <Link href={`/sprava/${serie}/kalendar`} aria-current={naAkcich ? undefined : "page"}>
          Pohár
        </Link>
        <Link href={`/sprava/${serie}/kalendar?druh=akce`} aria-current={naAkcich ? "page" : undefined}>
          Komunitní akce
        </Link>
      </nav>

      {zpravy.chyba && (
        <p className="hlaska chyba" role="alert">
          {zpravy.chyba}
        </p>
      )}
      {zpravy.stav && !zpravy.chyba && (
        <p className="hlaska hotovo" role="status">
          {hotovo(zpravy.stav, zpravy.co, zpravy.nastav, druh)}
        </p>
      )}

      {/* Publikace celého ročníku. Stojí tady, protože kalendář je jediná
          celoroční obrazovka — a hlavně proto, že nepublikovaný ročník
          schová i regaty, které jsou samy publikované. Bez tohohle řádku
          by se hledalo, proč je web prázdný (Filip, 23. 9. 2026). */}
      {rocnik && (
        /* `div`, ne `p`: uvnitř odstavce nesmí být formulář a prohlížeč
           ho z něj vytáhne ven. React pak při hydrataci našel jiný strom,
           než odeslal server, a obrazovku překreslil od začátku — klik do
           rozbaleného řádku uskočil, protože se detail zavřel. */
        <div className={`hlaska ${rocnik.publikovano ? "" : "chyba"}`} role="status">
          <b>Ročník je {rocnik.publikovano ? "venku" : "skrytý"}.</b>{" "}
          {rocnik.publikovano
            ? "Veřejné stránky ho ukazují i s publikovanými regatami."
            : "Veřejné stránky ho neukazují vůbec — ani regaty a výsledky, které jsou samy publikované."}{" "}
          {rocnik.smiPublikovat && (
            <form action={publikaceRocnikuAkce} className="radkove">
              <input type="hidden" name="serie" value={serie} />
              <input type="hidden" name="publikovano" value={rocnik.publikovano ? "ne" : "ano"} />
              <button type="submit" className="maly">
                {rocnik.publikovano ? "Stáhnout ročník z webu" : "Pustit ročník ven"}
              </button>
            </form>
          )}
        </div>
      )}

      {prehled.smiZalozit && (
        <>
          <h2>{naAkcich ? "Nová akce" : "Nová regata"}</h2>
          {/* Jen název a termín jsou povinné. Nová regata je vždycky
              plánovaná a nezveřejněná — potvrdit termín i pustit ji ven
              jsou dvě další rozhodnutí. */}
          <form action={zalozAkce} className="formular">
            <input type="hidden" name="serie" value={serie} />
            <input type="hidden" name="zpet" value={naAkcich ? "akce" : ""} />
            <Pole akce={naAkcich} />
            <button type="submit">
              {naAkcich ? "Založit akci" : "Založit do předběžného kalendáře"}
            </button>
            <p className="poznamka">
              {naAkcich
                ? "Akce vznikne jako plánovaná a veřejnost ji zatím neuvidí. Do poháru se nepočítá a nemá výsledky ani přihlášky lodí; psát se k ní dá jako k regatě."
                : "Regata vznikne jako plánovaná a veřejnost ji zatím neuvidí."}
            </p>
          </form>
        </>
      )}

      <h2>{naAkcich ? "Akce" : "Regaty"}</h2>
      {zastavky.length === 0 ? (
        <p className="prazdno">
          {naAkcich ? "Ročník zatím nemá jedinou komunitní akci." : "Ročník zatím nemá jedinou regatu."}
        </p>
      ) : (
        <ul className="seznam">
          {zastavky.map((z) => (
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
 * Pole regaty. Tentýž tvar při zakládání i úpravě — jsou to tytéž údaje
 * a dva různé formuláře by se rozešly v tom, co je povinné.
 */
function Pole({ zastavka, akce }: { zastavka?: ZastavkaRadek; akce?: boolean }) {
  return (
    <>
      <label>
        Název
        <input
          name="nazev"
          required
          maxLength={120}
          defaultValue={zastavka?.nazev}
          placeholder={akce ? "Setkání u Radavy" : "Radavská regata"}
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

      {/* Akce se nevyhodnocuje, nemá výsledky — volba by u ní nic
          neznamenala. */}
      {!akce && (
        <label>
          Vyhodnocení
          <select name="vyhodnoceni" defaultValue={zastavka?.vyhodnoceni ?? "PoKategoriich"}>
            {(Object.keys(VYHODNOCENI) as Vyhodnoceni[]).map((v) => (
              <option key={v} value={v} title={VYHODNOCENI[v].popis}>
                {VYHODNOCENI[v].stitek}
              </option>
            ))}
          </select>
          <span className="poznamka">
            Do poháru jdou body vždycky po kategoriích. Tohle rozhoduje jen o tom,
            jaké tabulky regata vyhlásí.
          </span>
        </label>
      )}

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
  const akce = zastavka.druh === "Akce";
  const zpet = akce ? "akce" : "";

  return (
    <div className={`karta ${zrusena ? "zrusena" : ""}`}>
      <div className="nazev">
        <span className={zrusena ? "skrtnute" : undefined}>{zastavka.nazev}</span>
        <Stav stav={zastavka.stav} akce={akce} />
        {zastavka.typ && <span className="stitek">{zastavka.typ}</span>}
        {/* Nezveřejněná regata není chyba, ale musí být vidět na první
            pohled: v kalendáři na webu prostě není. */}
        {!zastavka.publikovano && <span className="stitek neverejne">nezveřejněno</span>}
      </div>

      <div className="detail">
        {datum(zastavka.datum, zastavka.datumKonce)}
        {zastavka.poradatel && ` · ${zastavka.poradatel}`}
        {/* Medailonek je u klubu, ne u regaty, ale kalendář je jediné
            místo, odkud se k pořadateli dá dojít. */}
        {zastavka.poradatelSlug && zastavka.smiMedailonek && (
          <>
            {" · "}
            <Link href={`/sprava/${serie}/poradatele/${zastavka.poradatelSlug}`}>medailonek →</Link>
          </>
        )}
        {zastavka.puvodniDatum && (
          <span className="presun"> · přesunuto z {datum(zastavka.puvodniDatum)}</span>
        )}
        {/* Odsud se chodí na přihlášky a výsledky té regaty. Kalendář je
            rozcestník ročníku, takže je to jediné místo, kde se ty cesty
            nabízejí samy. Komunitní akce nemá ani jedno. */}
        {!akce && (
          <>
            {" · "}
            <Link href={`/sprava/${serie}/prihlasky/${zastavka.slug}`}>přihlášky →</Link>
            {" · "}
            <Link href={`/sprava/${serie}/vysledky/${zastavka.slug}`}>výsledky →</Link>
          </>
        )}
      </div>

      {/* Posun stavu rovnou ze seznamu: nejčastější úkon je „potvrdit
          termín" nebo „odjeto", a ten nemá stát otevírání regaty. */}
      <div className="stavy">
        {zastavka.mozneStavy.map((na) => (
          <form key={na} action={stavAkce}>
            <input type="hidden" name="serie" value={serie} />
            <input type="hidden" name="zavod" value={zastavka.slug} />
            <input type="hidden" name="nazev" value={zastavka.nazev} />
            <input type="hidden" name="stav" value={na} />
            <input type="hidden" name="zpet" value={zpet} />
            <button type="submit" title={prechod(na, zastavka.druh).popis}>
              {nazevPrechodu(zastavka.stav, na, zastavka.druh)}
            </button>
          </form>
        ))}

        {zastavka.smiPublikovat && (
          <form action={publikaceAkce}>
            <input type="hidden" name="serie" value={serie} />
            <input type="hidden" name="zavod" value={zastavka.slug} />
            <input type="hidden" name="nazev" value={zastavka.nazev} />
            <input type="hidden" name="publikovano" value={zastavka.publikovano ? "ne" : "ano"} />
            <input type="hidden" name="zpet" value={zpet} />
            <button
              type="submit"
              title={
                zastavka.publikovano
                  ? "Zmizí z webu. Stav regaty se tím nemění."
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
            <input type="hidden" name="zpet" value={zpet} />
            <Pole zastavka={zastavka} akce={akce} />
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

/** Věta po zápisu. Skládá se tady, protože jména regat zná stránka, ne akce. */
function hotovo(stav: string, co?: string, nastav?: StavZavodu, druh?: DruhZastavky) {
  const akce = druh === "Akce";
  const jmeno = co ? `„${co}"` : akce ? "Akce" : "Regata";

  switch (stav) {
    case "zalozeno":
      return akce
        ? `${jmeno} je mezi komunitními akcemi. Veřejnost ji zatím nevidí.`
        : `${jmeno} je v předběžném kalendáři. Veřejnost ji zatím nevidí.`;
    case "ulozeno":
      return `${jmeno} uložena.`;
    case "prepnuto":
      return nastav === "Zruseny" && !akce
        ? `${jmeno} zrušena. Do poháru se nepočítá.`
        : `${jmeno} — ${prechod(nastav ?? "Planovany", druh).popis}`;
    case "venku":
      return `${jmeno} je v kalendáři na webu.`;
    case "stazeno":
      return `${jmeno} z webu zmizela. Stav regaty se tím nezměnil.`;
    case "rocnikVenku":
      return "Ročník je venku. Veřejné stránky ho zase ukazují.";
    case "rocnikSkryty":
      return "Ročník je skrytý. Veřejné stránky neukazují ani jeho regaty a výsledky.";
    default:
      return "Hotovo.";
  }
}
