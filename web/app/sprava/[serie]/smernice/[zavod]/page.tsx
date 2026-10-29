import Link from "@/app/sprava/odkaz";
import { notFound } from "next/navigation";
import { Drobecky, drobeckySpravy, drobekRegaty } from "@/app/drobecky";
import { PruhUkonuRegaty } from "@/app/sprava/pruh-ukonu";
import { Vypadek } from "@/app/vypadek";
import { datumClanku } from "@/app/datum";
import { NEJVIC_MB, nactiSmernice, visi, type Smernice } from "@/lib/smernice";
import { nazevZastavky } from "@/lib/kalendar";
import { stahniAkce } from "./akce";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Plachetní směrnice — správa" };

type Parametry = {
  params: Promise<{ serie: string; zavod: string }>;
  searchParams: Promise<{ chyba?: string; stav?: string }>;
};

/**
 * Vyvěšení plachetní směrnice u regaty.
 *
 * <b>Vyvěšené verze zůstávají.</b> Appka je oficiální vývěska (plán, oddíl
 * *Appka je oficiální vývěska*), takže oprava je nová verze a mazání záznamu
 * tu schválně není. Starší verze jsou pod novou vidět i tady, aby bylo
 * jasné, že se nikam neztratily.
 *
 * <b>Stáhnout z vývěsky ale jde</b> (oponentura, 5. 10. 2026). Nová verze
 * neodvolá tu chybnou, takže omylem nahrané PDF s neveřejnými údaji se do
 * té doby nedalo vzít zpět. Stažení smaže soubor z úložiště a z veřejného
 * čtení; řádek, důvod a jméno zůstanou tady.
 *
 * Celé serverové a bez javascriptu jako zbytek administrace.
 */
export default async function SmerniceZastavky({ params, searchParams }: Parametry) {
  const { serie, zavod } = await params;
  const zpravy = await searchParams;

  // Název regaty obrazovka z vlastního API nedostane — a bez něj neřekne,
  // u které regaty se vlastně vyvěšuje (Filip, 9. 10. 2026).
  const [{ stav, data: smernice }, nazev] = await Promise.all([
    nactiSmernice(serie, zavod),
    nazevZastavky(serie, zavod),
  ]);
  if (stav === "neni") notFound();

  // Platná je nejnovější verze, která visí. Stažená platná být nemůže —
  // jinak by obrazovka tvrdila, že se jede podle něčeho, co není venku.
  const platna = smernice?.find(visi);

  return (
    <>
      <Drobecky
        cesta={drobeckySpravy(serie, [
          drobekRegaty(serie, zavod, nazev),
          { text: "Plachetní směrnice" },
        ])}
      />
      <h1>Plachetní směrnice</h1>
      {nazev && <p className="podtitulek">{nazev}</p>}
      <PruhUkonuRegaty serie={serie} zavod={zavod} aktivni="smernice" />

      {zpravy.chyba && (
        <p className="hlaska chyba" role="alert">
          {zpravy.chyba}
        </p>
      )}
      {zpravy.stav === "vyveseno" && (
        <p className="hlaska" role="status">
          Směrnice je vyvěšená. Na stránce regaty je hned vidět.
        </p>
      )}
      {zpravy.stav === "stazeno" && (
        <p className="hlaska" role="status">
          Verze je stažená z vývěsky a soubor je z úložiště smazaný. Kopie,
          které si už někdo stáhl, vzít zpět nejde.
        </p>
      )}

      {stav === "neprihlasen" || stav === "odmitnut" ? (
        <p className="prazdno">
          Na vyvěšení směrnice se musíš <Link href="/prihlaseni">přihlásit</Link>.
        </p>
      ) : stav === "nesmi" ? (
        <p className="prazdno">
          Směrnici smí vyvěsit pořadatel téhle regaty nebo rozhodčí ročníku —{" "}
          <Link href="/napoveda#role">co která role smí</Link>.
        </p>
      ) : smernice === undefined ? (
        <Vypadek />
      ) : (
        <>
          {/* <b>Obyčejný formulář na vlastní koncový bod</b>, ne serverová
              akce: Cloudflare před webem odmítal nahrávání se stavem 403,
              protože se jeho pravidlo chytá na kombinaci „soubor + hlavička
              `Next-Action`". Podrobně v `nahrat/route.ts`. Série a zastávka
              jsou v cestě, takže skrytá pole nejsou potřeba. */}
          <form
            method="post"
            action={`/sprava/${encodeURIComponent(serie)}/smernice/${encodeURIComponent(zavod)}/nahrat`}
            encType="multipart/form-data"
            className="formular"
          >
            <label>
              Soubor směrnice (PDF, nejvýš {NEJVIC_MB} MB)
              <input type="file" name="soubor" accept="application/pdf" required />
            </label>
            <label>
              Co se mění (nepovinné)
              <input
                type="text"
                name="poznamka"
                maxLength={300}
                placeholder="Např. změna času startu druhé rozjížďky"
              />
            </label>
            <button type="submit">
              {smernice.length === 0 ? "Vyvěsit směrnici" : "Vyvěsit novou verzi"}
            </button>
          </form>

          <p className="poznamka">
            Vyvěšená směrnice se nepřepisuje — oprava je nová verze. Appka
            i web ukazují jako platnou tu nejnovější, starší zůstávají
            k nahlédnutí. Když je v nahraném souboru něco, co venku být nemá,
            stáhni tu verzi z vývěsky: soubor zmizí, záznam o vyvěšení ne.
          </p>

          <h2>Vyvěšené verze</h2>
          {smernice.length === 0 ? (
            <p className="prazdno">
              U téhle regaty zatím směrnice není. Bez ní se regata nejede, tak
              ji vyvěs včas formulářem výš —{" "}
              <Link href="/napoveda#smernice">co o směrnici platí</Link>.
            </p>
          ) : (
            <ul className="seznam verze-smernice">
              {smernice.map((s) => (
                <li key={s.verze}>
                  <Verze
                    smernice={s}
                    serie={serie}
                    zavod={zavod}
                    platna={s.verze === platna?.verze}
                  />
                </li>
              ))}
            </ul>
          )}

          <p className="poznamka">
            {/* Zpátky na kartu té regaty, ne na kalendář: na kartě jsou
                všechny čtyři věci k ní pohromadě a kalendář je o termínech. */}
            <Link href={`/sprava/${serie}#${zavod}`}>Zpátky na regatu</Link>
          </p>
        </>
      )}
    </>
  );
}

/**
 * Jedna verze: odkaz na soubor, dokud visí, a stažení z vývěsky.
 *
 * <b>Stažená verze odkaz nemá</b>, protože soubor už v úložišti není.
 *
 * <b>Purge se připomíná jen tam, kde má smysl.</b> Směrnice vyvěšené dřív,
 * než se přestalo cachovat, nesou roční hlavičku, takže u nich dá jistotu
 * až ruční *Purge by URL* v Cloudflare — a jen u nich se vypisuje adresa.
 * U novějších je stažení účinné hned a připomínka by byla šum, který člověk
 * časem začne přehlížet. Rozhoduje o tom API (`mohlaUvaznoutVCache`), ne
 * datum opsané sem.
 */
function Verze({
  smernice,
  serie,
  zavod,
  platna,
}: {
  smernice: Smernice;
  serie: string;
  zavod: string;
  platna: boolean;
}) {
  if (!visi(smernice))
    return (
      <>
        <span>{smernice.nazev}</span> <span className="stitek">verze {smernice.verze}</span>
        <span className="stitek">stažená z vývěsky</span>
        {/* Kdo a kdy — jeden řádek. Důvod stažení sem nepatří: je to věta,
            ne údaj, a za „stáhl Filip Burda · " se slila s hláškou
            o smazaném souboru do „stará verze Soubor je smazaný." */}
        <span className="detail">
          vyvěšeno {datumClanku(smernice.vyveseneV)}
          {smernice.vyvesil && ` · vyvěsil ${smernice.vyvesil}`}
          {smernice.stazenoV && ` · staženo ${datumClanku(smernice.stazenoV)}`}
          {smernice.stahl && ` · stáhl ${smernice.stahl}`}
        </span>
        <span className="detail">
          Soubor je smazaný.
          {smernice.duvodStazeni && ` Důvod stažení: ${smernice.duvodStazeni}`}
          {smernice.mohlaUvaznoutVCache && (
            <>
              {" "}Tahle verze je starší než vypnutí cache, takže ji ještě
              může vydávat Cloudflare — pročisti adresu (Purge by URL):{" "}
              {smernice.adresa}
            </>
          )}
        </span>
      </>
    );

  return (
    <>
      <a href={smernice.adresa} target="_blank" rel="noopener noreferrer">
        {smernice.nazev}
      </a>{" "}
      <span className="stitek">verze {smernice.verze}</span>
      {platna && <span className="stitek">platná</span>}
      <span className="detail">
        {datumClanku(smernice.vyveseneV)}
        {smernice.vyvesil && ` · vyvěsil ${smernice.vyvesil}`}
        {smernice.poznamka && ` · ${smernice.poznamka}`}
      </span>

      {/* Důvod je povinný: u dokumentu, podle kterého se jede, musí jít
          po sezóně dohledat, co se odvolalo a proč. */}
      <form action={stahniAkce} className="formular">
        <input type="hidden" name="serie" value={serie} />
        <input type="hidden" name="zavod" value={zavod} />
        <input type="hidden" name="verze" value={smernice.verze} />
        <label>
          Stáhnout z vývěsky — proč
          <input
            type="text"
            name="duvod"
            maxLength={300}
            required
            placeholder="Např. v souboru jsou telefony posádky"
          />
        </label>
        <button type="submit">Stáhnout verzi {smernice.verze}</button>
      </form>
    </>
  );
}
