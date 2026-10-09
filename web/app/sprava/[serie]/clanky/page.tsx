import Link from "next/link";
import { notFound } from "next/navigation";
import { Drobecky, drobeckySpravy } from "@/app/drobecky";
import { Vypadek } from "@/app/vypadek";
import { datumClanku } from "@/app/datum";
import { STAVY, jeWeb, nactiPrehled, nazevStavu, type ClanekRadek, type StavClanku } from "@/lib/clanky";
import { zalozAkce, stavAkce } from "./akce";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Novinky — správa" };

type Parametry = {
  params: Promise<{ serie: string }>;
  searchParams: Promise<{ chyba?: string; stav?: string; nastav?: StavClanku }>;
};

/**
 * Psaní novinek. <b>Celé serverové a bez javascriptu</b> — formulář odešle
 * prohlížeč, odpověď je nová stránka. Píše se odsud zřídka a často z
 * telefonu na břehu; hydratovat kvůli dvěma polím celou obrazovku nemá co
 * vrátit.
 *
 * Seznam nese stav, protože bez něj se nepozná rozepsané od staženého —
 * veřejnost nevidí ani jedno, ale pro autora je to rozdíl mezi „dopiš to"
 * a „rozhodni, jestli se to vrátí".
 */
export default async function SpravaClanku({ params, searchParams }: Parametry) {
  const { serie } = await params;
  const zpravy = await searchParams;

  const { stav, prehled } = await nactiPrehled(serie);

  // Výpadek nesmí spolknout výsledek zápisu: když se nepovede načíst
  // seznam, ale akce něco vzkázala, musí to být vidět nad výpadkem.
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

  // Obecné články mimo ročník mají tutéž obrazovku, jen bez ročníku
  // a bez volby regaty (viz WEB v lib/clanky.ts).
  const web = jeWeb(serie);

  const hlava = (
    <>
      <Drobecky
        cesta={
          web
            ? drobeckySpravy(null, [{ text: "Obecné články" }])
            : drobeckySpravy(serie, [{ text: "Novinky" }])
        }
      />
      <h1>{web ? "Obecné články — správa" : "Novinky — správa"}</h1>
    </>
  );

  if (stav === "neprihlasen")
    return (
      <>
        {hlava}
        <p className="prazdno">
          Na psaní novinek se musíš <Link href="/prihlaseni">přihlásit</Link>.
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
          {web
            ? "Obecné články smí psát editor webu. O roli požádej správce webu."
            : "V tomhle ročníku nemáš právo psát. O roli editora požádej správce ročníku."}{" "}
          <Link href="/napoveda#role">Co která role smí</Link>
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
      {zpravy.stav === "prepnuto" && zpravy.nastav && (
        <p className="hlaska hotovo" role="status">
          Stav změněn na „{nazevStavu(zpravy.nastav)}".
        </p>
      )}

      <h2>Nový článek</h2>
      {/* Jen titulek, text a kam patří. Perex a autor se doplní při úpravě —
          na začátku psaní je důležité začít, ne vyplnit formulář. */}
      <form action={zalozAkce} className="formular">
        <input type="hidden" name="serie" value={serie} />

        <label>
          Titulek
          <input name="titulek" required maxLength={200} placeholder="Pozvánka na Radavskou regatu" />
        </label>

        {web ? (
          <input type="hidden" name="zavod" value="" />
        ) : (
          <label>
            Kam patří
            <select name="zavod" defaultValue="">
              {/* Článek ročníku smí psát jen ten, kdo má právo na celý ročník.
                  Komu patří jen regata, tuhle volbu nedostane. */}
              {prehled.smiNaRocnik && <option value="">Celý ročník</option>}
              {prehled.zastavky.map((z) => (
                <option key={z.slug} value={z.slug}>
                  {z.nazev}
                </option>
              ))}
            </select>
          </label>
        )}

        <label>
          Text
          <textarea name="telo" required rows={6} placeholder={"Odstavce odděl prázdným řádkem."} />
        </label>

        {/* Bez javascriptu, jako zbytek správy: políčko říká serveru, jak
            text číst. Vložený obsah se čistí při uložení — projdou odstavce,
            nadpisy, seznamy, tučné, kurzíva, odkazy a obrázky, zbytek se
            zahodí i s formátováním z Wordu. */}
        <label>
          <input type="checkbox" name="vlozene" value="1" /> Text je vložený z Wordu nebo z webu
        </label>

        <button type="submit">Založit jako koncept</button>
        <p className="poznamka">
          Nový článek je vždycky koncept — veřejnost ho uvidí, až ho publikuješ.
        </p>
      </form>

      <h2>Články</h2>
      {prehled.clanky.length === 0 ? (
        <p className="prazdno">Zatím tu nic není.</p>
      ) : (
        <ul className="seznam novinky">
          {prehled.clanky.map((c) => (
            <li key={c.slug}>
              <Radek serie={serie} clanek={c} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Radek({ serie, clanek }: { serie: string; clanek: ClanekRadek }) {
  return (
    <div className="karta">
      <div className="nazev">
        <Link href={`/sprava/${serie}/clanky/${clanek.slug}`}>{clanek.titulek}</Link>
        <span className={`stitek clanek-${clanek.stav.toLowerCase()}`}>
          {nazevStavu(clanek.stav)}
        </span>
        {clanek.zavodNazev && <span className="stitek">{clanek.zavodNazev}</span>}
      </div>
      <div className="detail">
        {datumClanku(clanek.publikovanoV)}
        {clanek.autor && ` · ${clanek.autor}`}
      </div>

      {/* Přepnutí stavu rovnou ze seznamu: nejčastější úkon je „vydat to",
          a ten nemá stát otevření článku. */}
      <div className="stavy">
        {STAVY.filter((s) => s.stav !== clanek.stav).map((s) => (
          <form key={s.stav} action={stavAkce}>
            <input type="hidden" name="serie" value={serie} />
            <input type="hidden" name="slug" value={clanek.slug} />
            <input type="hidden" name="stav" value={s.stav} />
            <button type="submit" title={s.popis}>
              {s.nazev}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
