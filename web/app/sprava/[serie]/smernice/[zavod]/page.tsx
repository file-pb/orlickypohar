import Link from "next/link";
import { notFound } from "next/navigation";
import { Drobecky } from "@/app/drobecky";
import { Vypadek } from "@/app/vypadek";
import { datumClanku } from "@/app/datum";
import { NEJVIC_MB, nactiSmernice } from "@/lib/smernice";
import { vyvesAkce } from "./akce";

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
 * *Appka je oficiální vývěska*), takže oprava je nová verze a mazání tu
 * schválně není. Starší verze jsou pod novou vidět i tady, aby bylo jasné,
 * že se nikam neztratily.
 *
 * Celé serverové a bez javascriptu jako zbytek administrace.
 */
export default async function SmerniceZastavky({ params, searchParams }: Parametry) {
  const { serie, zavod } = await params;
  const zpravy = await searchParams;

  const { stav, data: smernice } = await nactiSmernice(serie, zavod);
  if (stav === "neni") notFound();

  return (
    <>
      <Drobecky
        cesta={[
          { text: "Domů", kam: "/" },
          { text: "Kalendář", kam: `/sprava/${serie}/kalendar` },
          { text: "Plachetní směrnice" },
        ]}
      />
      <h1>Plachetní směrnice</h1>

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

      {stav === "neprihlasen" || stav === "odmitnut" ? (
        <p className="prazdno">
          Na vyvěšení směrnice se musíš <Link href="/prihlaseni">přihlásit</Link>.
        </p>
      ) : stav === "nesmi" ? (
        <p className="prazdno">
          Směrnici smí vyvěsit pořadatel téhle regaty nebo rozhodčí ročníku.
        </p>
      ) : smernice === undefined ? (
        <Vypadek />
      ) : (
        <>
          <form action={vyvesAkce} className="formular">
            <input type="hidden" name="serie" value={serie} />
            <input type="hidden" name="zavod" value={zavod} />
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
            Vyvěšená směrnice se nemaže ani nepřepisuje — oprava je nová verze.
            Appka i web ukazují jako platnou tu nejnovější, starší zůstávají
            k nahlédnutí.
          </p>

          <h2>Vyvěšené verze</h2>
          {smernice.length === 0 ? (
            <p className="prazdno">
              U téhle regaty zatím směrnice není. Bez ní se regata nejede, tak ji vyvěs včas.
            </p>
          ) : (
            <ul className="seznam">
              {smernice.map((s, i) => (
                <li key={s.verze}>
                  <a href={s.adresa} target="_blank" rel="noopener noreferrer">
                    {s.nazev}
                  </a>{" "}
                  <span className="stitek">verze {s.verze}</span>
                  {i === 0 && <span className="stitek">platná</span>}
                  <span className="detail">
                    {datumClanku(s.vyveseneV)}
                    {s.vyvesil && ` · vyvěsil ${s.vyvesil}`}
                    {s.poznamka && ` · ${s.poznamka}`}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="poznamka">
            <Link href={`/sprava/${serie}/kalendar`}>Zpátky na kalendář</Link>
          </p>
        </>
      )}
    </>
  );
}
