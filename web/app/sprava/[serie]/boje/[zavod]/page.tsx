import Link from "next/link";
import { notFound } from "next/navigation";
import { Drobecky, drobeckySpravy, drobekRegaty } from "@/app/drobecky";
import { Vypadek } from "@/app/vypadek";
import { okamzik } from "@/app/datum";
import {
  NAZEV_NEJVIC,
  NAZVY_ZDROJU,
  nactiTrat,
  type Boje,
  type Byvala,
} from "@/lib/boje";
import { nazevZastavky } from "@/lib/kalendar";
import { MapkaTrati } from "./trat";
import { Pipani } from "./pipani";
import { nactiStavTrati } from "@/lib/trat";
import { StavTrati } from "./stav-trati";
import { nahrajFotkuAkce, odeberFotkuAkce, seberAkce } from "./akce";

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
 * <b>Mapka je od 9. 10. 2026 nad seznamem</b>, pořád ale vedle souřadnic:
 * neposouvá se ani nepřibližuje, takže na „kde přesně ta bóje leží"
 * odpovídá odkaz do mapy u každé z nich, případně stažená trať v GPX.
 */
export default async function BojeZastavky({ params, searchParams }: Parametry) {
  const { serie, zavod } = await params;
  const zpravy = await searchParams;

  // Název regaty v odpovědi o bójích není, a bez něj nadpis neřekne, čí
  // trať se zrovna staví (Filip, 9. 10. 2026).
  const [{ stav, trat, byvale }, nazev, stavTrati] = await Promise.all([
    nactiTrat(serie, zavod),
    nazevZastavky(serie, zavod),
    nactiStavTrati(serie, zavod),
  ]);
  if (stav === "neni") notFound();

  // Přenastavuje se jen bóje, která na trati doopravdy stojí. Podvržené id
  // tím nemá co nabídnout a formulář zůstane na „pípnout novou".
  const prenastav = Number(zpravy.prenastav ?? 0);
  const prenastavovana = trat?.find((b) => b.id === prenastav);

  return (
    <>
      <Drobecky
        cesta={drobeckySpravy(serie, [
          drobekRegaty(serie, zavod, nazev),
          { text: "Bóje na trati" },
        ])}
      />
      <h1>Bóje na trati</h1>
      {nazev && <p className="podtitulek">{nazev}</p>}

      {zpravy.chyba && (
        <p className="hlaska chyba" role="alert">
          {zpravy.chyba}
        </p>
      )}
      {zpravy.stav === "sebrano" && (
        <p className="hlaska" role="status">
          Bóje je označená za sebranou. Z trati zmizela, v historii zůstala —
          i s fotkami, protože ty jsou doklad k poloze.
        </p>
      )}
      {zpravy.stav === "fotka" && (
        <p className="hlaska" role="status">
          Fotka je u bóje. Uložila se přepočtená na web, originál nikam.
        </p>
      )}
      {zpravy.stav === "trat-hotovo" && (
        <p className="hlaska" role="status">
          Hotovo je nahlášené. Teď je řada na rozhodčím — veřejná bude trať, až ji přijme.
        </p>
      )}
      {zpravy.stav === "trat-prijeti" && (
        <p className="hlaska" role="status">
          Trať je přijatá, zamčená a veřejná. Pípnout ani sebrat bóji už nejde;
          na úpravu ji odemkni přestavbou.
        </p>
      )}
      {zpravy.stav === "trat-vraceni" && (
        <p className="hlaska" role="status">
          Trať je zpátky u stavitelů i s důvodem. Veřejně se neukazuje.
        </p>
      )}
      {zpravy.stav === "trat-prestavba" && (
        <p className="hlaska" role="status">
          Trať je odemčená. Veřejně teď stojí, že se přestavuje — stará se už
          neukazuje, aby podle ní nikdo neplul.
        </p>
      )}
      {zpravy.stav === "fotkaPryc" && (
        <p className="hlaska" role="status">
          Fotka je pryč i ze souborů. Poloha a čas u bóje zůstaly.
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
          {stavTrati.stav === "ok" && stavTrati.trat && (
            <StavTrati serie={serie} zavod={zavod} trat={stavTrati.trat} />
          )}

          {/* U zamčené trati se formulář neukazuje vůbec. API pípnutí
              odmítne, ale dozvědět se to až z chyby je na vodě o dvě
              klepnutí a jednu nadávku navíc — důvod stojí v panelu výš. */}
          {stavTrati.trat?.stav !== "Prijato" && (
            <Pipani
              serie={serie}
              zavod={zavod}
              prenastavuje={
                prenastavovana ? { id: prenastavovana.id, nazev: prenastavovana.nazev } : null
              }
              nejvicZnaku={NAZEV_NEJVIC}
            />
          )}

          <h2>Co stojí na trati</h2>
          <MapkaTrati boje={trat} />
          {trat.length === 0 ? (
            <p className="prazdno">
              Zatím nic. Až bóji spustíš do vody, pípni ji — poloha z tvého
              telefonu je ta nejpřesnější, kterou kdo má.
            </p>
          ) : (
            <ul className="seznam">
              {trat.map((b) => (
                <li key={b.id}>
                  <NaTrati
                    boje={b}
                    serie={serie}
                    zavod={zavod}
                    zamceno={stavTrati.trat?.stav === "Prijato"}
                  />
                </li>
              ))}
            </ul>
          )}

          {trat.length > 0 && (
            <p className="poznamka">
              {/* Zoomovat se dá ve vlastním nástroji, ne v naší mapce: víc bodů
                  najednou se do adresy cizí mapy spolehlivě dostat nedá, kdežto
                  GPX otevře Mapy.cz, OsmAnd i chartplotter na lodi. */}
              <a href={`/sprava/${serie}/boje/${zavod}/trat.gpx`} download>
                Stáhnout trať (GPX)
              </a>{" "}
              — otevře se v mapě i v chartplotteru, kde si ji můžeš přiblížit.
            </p>
          )}

          <p className="poznamka">
            Pípnutí bez signálu obrazovka neumí a je to schválně: API u polohy
            nenese čas z telefonu, takže podržené pípnutí by se uložilo s časem
            nahrání, ne s časem postavení. Radši se to nepovede hned.{" "}
            <Link href="/napoveda#boje">Jak se trať staví</Link>
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
            {/* Zpátky na kartu té regaty, ne na kalendář: na kartě jsou
                všechny čtyři věci k ní pohromadě a kalendář je o termínech. */}
            <Link href={`/sprava/${serie}#${zavod}`}>Zpátky na regatu</Link>
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
function NaTrati({
  boje,
  serie,
  zavod,
  zamceno,
}: {
  boje: Boje;
  serie: string;
  zavod: string;
  zamceno: boolean;
}) {
  return (
    <>
      <span className="stitek">{boje.poradi}.</span> <span>{boje.nazev}</span>
      <Puvod boje={boje} />

      <p className="poznamka">
        {/* Přenastavení u zamčené trati mizí taky: vede na formulář
            pípnutí, který tam v tu chvíli není. */}
        {!zamceno && (
          <>
            <Link href={`/sprava/${serie}/boje/${zavod}?prenastav=${boje.id}`}>
              Přenastavit
            </Link>{" "}
            ·{" "}
          </>
        )}
        {/* Kde přesně ta jedna bóje leží. Mapu web nevkládá, odkazuje na ni —
            stejné pravidlo jako u medailonku pořadatele. */}
        <a
          href={`https://www.openstreetmap.org/?mlat=${boje.sirka}&mlon=${boje.delka}#map=17/${boje.sirka}/${boje.delka}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Ukázat na mapě
        </a>
      </p>

      {boje.fotky.length > 0 && (
        <p className="fotky-boje">
          {boje.fotky.map((f) => (
            <span key={f.id} className="fotka">
              <a href={f.velky} target="_blank" rel="noopener noreferrer">
                <img src={f.nahled} alt={f.popis ?? `Bóje ${boje.nazev}`} width={120} height={90} />
              </a>
              <form action={odeberFotkuAkce}>
                <input type="hidden" name="serie" value={serie} />
                <input type="hidden" name="zavod" value={zavod} />
                <input type="hidden" name="boje" value={boje.id} />
                <input type="hidden" name="fotka" value={f.id} />
                <button type="submit" className="maly">Odebrat</button>
              </form>
            </span>
          ))}
        </p>
      )}

      {/* Fotek může být víc: jedna zblízka neukáže, co je za bójí na
          břehu. Obyčejný formulář — fotit umí `capture` sám a u stolu se
          stejně vybírá ze souborů. */}
      <form action={nahrajFotkuAkce} className="formular radkove">
        <input type="hidden" name="serie" value={serie} />
        <input type="hidden" name="zavod" value={zavod} />
        <input type="hidden" name="boje" value={boje.id} />
        <label>
          {boje.fotky.length === 0 ? "Vyfotit bóji" : "Přidat další fotku"}
          <input type="file" name="soubor" accept="image/*" capture="environment" required />
        </label>
        <button type="submit">Nahrát fotku</button>
      </form>

      {/* Sebrání nepotřebuje polohu, takže ani javascript. U zamčené trati
          mizí ze stejného důvodu jako pípnutí: API by ho odmítlo a člověk by
          se to dozvěděl až z chyby. Fotka zůstává — je to doklad k poloze,
          ne změna trati. */}
      {!zamceno && (
        <form action={seberAkce} className="formular">
          <input type="hidden" name="serie" value={serie} />
          <input type="hidden" name="zavod" value={zavod} />
          <input type="hidden" name="boje" value={boje.id} />
          <button type="submit">Sebrat z vody</button>
        </form>
      )}
    </>
  );
}

/** Bóje, která už na trati nestojí. Sebrat ani přenastavit nejde. */
function Byvsi({ boje, proc }: Byvala) {
  return (
    <>
      <span className="stitek">{boje.poradi}.</span> <span>{boje.nazev}</span>{" "}
      <span className="stitek">{proc}</span>
      <Puvod boje={boje} />
      {/* Fotky zůstávají i u bóje, která už na trati nestojí: doklad
          k poloze, podle které se možná jelo. Mazat se nedají odsud —
          historie se neupravuje. */}
      <Fotky boje={boje} />
    </>
  );
}

/**
 * Odkud ta poloha je. <b>Přesnost hlásí jen telefon</b>, takže u bodu
 * z mapy se místo čísla řekne, že se odečetl — prázdné místo by vypadalo
 * jako telefon, který přesnost neumí.
 */
function Puvod({ boje }: { boje: Boje }) {
  const zdroj = boje.zdroj ?? "Telefon";

  return (
    <span className="detail">
      {souradnice(boje)}
      {zdroj === "Telefon"
        ? boje.presnostM !== null
          ? ` · přesnost ${Math.round(boje.presnostM)} m`
          : " · přesnost telefon nehlásil"
        : ` · ${NAZVY_ZDROJU[zdroj]}, neměřeno`}
      {` · ${okamzik(boje.postavenaV)}`}
      {boje.postavil && ` · zapsal ${boje.postavil}`}
    </span>
  );
}

/** Fotky u bóje. Náhled vede na velkou — prohlížeč to umí sám. */
function Fotky({ boje }: { boje: Boje }) {
  if (boje.fotky.length === 0) return null;

  return (
    <p className="fotky-boje">
      {boje.fotky.map((f) => (
        <a key={f.id} href={f.velky} target="_blank" rel="noopener noreferrer">
          {/* Obyčejný `img`: adresy jsou z našeho úložiště a rozměry
              známe z API, takže není co optimalizovat na cizí doméně. */}
          <img src={f.nahled} alt={f.popis ?? `Bóje ${boje.nazev}`} width={120} height={90} />
        </a>
      ))}
    </p>
  );
}
