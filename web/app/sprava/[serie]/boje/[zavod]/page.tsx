import Link from "next/link";
import { notFound } from "next/navigation";
import { Drobecky } from "@/app/drobecky";
import { Vypadek } from "@/app/vypadek";
import { okamzik } from "@/app/datum";
import { NAZEV_NEJVIC, nactiTrat, type Boje, type Byvala } from "@/lib/boje";
import { Pipani } from "./pipani";
import { seberAkce } from "./akce";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Bóje na trati — správa" };

type Parametry = {
  params: Promise<{ serie: string; zavod: string }>;
  searchParams: Promise<{ chyba?: string; stav?: string; prenastav?: string }>;
};

/**
 * Trať regaty: co stojí ve vodě, kdo to tam postavil a kdy.
 *
 * <b>Nic se nepřepisuje</b> (plán, *Trať staví pořadatel, pípnutím
 * u bóje*). Přenastavení je nový záznam a to staré zůstane v historii,
 * sebrání je razítko. Obrazovka to musí být vidět — jinak si pořadatel
 * myslí, že přenastavením něco zahodil.
 *
 * <b>Veřejně se trať neukazuje.</b> Kdy se smí ukázat divákům, patří
 * rozhodčímu, takže tyhle endpointy jsou celé pod `/sprava/` a veřejná
 * cesta k bójím neexistuje.
 *
 * <b>Mapa tu není.</b> Zatím se vypisují souřadnice: mapa je samostatná
 * práce (plán, fáze 8) a bez ní je obrazovka použitelná — pořadatel
 * potřebuje hlavně vědět, že se pípnutí zapsalo a s jakou přesností.
 */
export default async function BojeZastavky({ params, searchParams }: Parametry) {
  const { serie, zavod } = await params;
  const zpravy = await searchParams;

  const { stav, trat, byvale } = await nactiTrat(serie, zavod);
  if (stav === "neni") notFound();

  // Přenastavuje se jen bóje, která na trati doopravdy stojí. Podvržené id
  // tím nemá co nabídnout a formulář zůstane na „pípnout novou".
  const prenastav = Number(zpravy.prenastav ?? 0);
  const prenastavovana = trat?.find((b) => b.id === prenastav);

  return (
    <>
      <Drobecky
        cesta={[
          { text: "Domů", kam: "/" },
          { text: "Kalendář", kam: `/sprava/${serie}/kalendar` },
          { text: "Bóje na trati" },
        ]}
      />
      <h1>Bóje na trati</h1>

      {zpravy.chyba && (
        <p className="hlaska chyba" role="alert">
          {zpravy.chyba}
        </p>
      )}
      {zpravy.stav === "sebrano" && (
        <p className="hlaska" role="status">
          Bóje je označená za sebranou. Z trati zmizela, v historii zůstala.
        </p>
      )}

      {stav === "neprihlasen" || stav === "odmitnut" ? (
        <p className="prazdno">
          Na stavění bójí se musíš <Link href="/prihlaseni">přihlásit</Link>.
        </p>
      ) : stav === "nesmi" ? (
        <p className="prazdno">
          Bóje smí stavět pořadatel téhle regaty nebo rozhodčí ročníku.
        </p>
      ) : trat === undefined ? (
        <Vypadek />
      ) : (
        <>
          <Pipani
            serie={serie}
            zavod={zavod}
            prenastavuje={
              prenastavovana ? { id: prenastavovana.id, nazev: prenastavovana.nazev } : null
            }
            nejvicZnaku={NAZEV_NEJVIC}
          />

          <h2>Co stojí na trati</h2>
          {trat.length === 0 ? (
            <p className="prazdno">
              Zatím nic. Až bóji spustíš do vody, pípni ji — poloha z tvého
              telefonu je ta nejpřesnější, kterou kdo má.
            </p>
          ) : (
            <ul className="seznam">
              {trat.map((b) => (
                <li key={b.id}>
                  <NaTrati boje={b} serie={serie} zavod={zavod} />
                </li>
              ))}
            </ul>
          )}

          <p className="poznamka">
            Pípnutí bez signálu obrazovka neumí a je to schválně: API u polohy
            nenese čas z telefonu, takže podržené pípnutí by se uložilo s časem
            nahrání, ne s časem postavení. Radši se to nepovede hned.
          </p>

          {byvale && byvale.length > 0 && (
            <>
              <h2>Historie</h2>
              <p className="poznamka">
                Přenastavené a sebrané bóje. Zůstávají, protože trasa lodi se
                k trati vztahuje tak, jak stála tehdy — ne jak stojí teď.
              </p>
              <ul className="seznam">
                {byvale.map(({ boje, proc }) => (
                  <li key={boje.id}>
                    <Byvsi boje={boje} proc={proc} />
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="poznamka">
            <Link href={`/sprava/${serie}/kalendar`}>Zpátky na kalendář</Link>
          </p>
        </>
      )}
    </>
  );
}

/** Souřadnice tak, aby se daly přečíst nahlas i opsat do mapy. */
const souradnice = (b: Boje) => `${b.sirka.toFixed(5)}, ${b.delka.toFixed(5)}`;

/**
 * Bóje, která stojí ve vodě: přenastavit, nebo sebrat.
 *
 * <b>Přenastavení jde přes adresu</b> (`?prenastav=`), ne přes stav
 * v prohlížeči — seznam tím zůstane serverový a odkaz se dá poslat.
 */
function NaTrati({ boje, serie, zavod }: { boje: Boje; serie: string; zavod: string }) {
  return (
    <>
      <span className="stitek">{boje.poradi}.</span> <span>{boje.nazev}</span>
      <span className="detail">
        {souradnice(boje)}
        {boje.presnostM !== null && ` · přesnost ${Math.round(boje.presnostM)} m`}
        {` · ${okamzik(boje.postavenaV)}`}
        {boje.postavil && ` · postavil ${boje.postavil}`}
      </span>

      <p className="poznamka">
        <Link href={`/sprava/${serie}/boje/${zavod}?prenastav=${boje.id}`}>
          Přenastavit
        </Link>
      </p>

      {/* Sebrání nepotřebuje polohu, takže ani javascript. */}
      <form action={seberAkce} className="formular">
        <input type="hidden" name="serie" value={serie} />
        <input type="hidden" name="zavod" value={zavod} />
        <input type="hidden" name="boje" value={boje.id} />
        <button type="submit">Sebrat z vody</button>
      </form>
    </>
  );
}

/** Bóje, která už na trati nestojí. Sebrat ani přenastavit nejde. */
function Byvsi({ boje, proc }: Byvala) {
  return (
    <>
      <span className="stitek">{boje.poradi}.</span> <span>{boje.nazev}</span>{" "}
      <span className="stitek">{proc}</span>
      <span className="detail">
        {souradnice(boje)}
        {boje.presnostM !== null && ` · přesnost ${Math.round(boje.presnostM)} m`}
        {` · ${okamzik(boje.postavenaV)}`}
        {boje.postavil && ` · postavil ${boje.postavil}`}
      </span>
    </>
  );
}
