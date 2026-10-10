import Link from "next/link";
import { notFound } from "next/navigation";
import { Drobecky, drobeckySpravy, drobekRegaty } from "@/app/drobecky";
import { Vypadek } from "@/app/vypadek";
import { okamzik } from "@/app/datum";
import {
  NAZEV_NEJVIC,
  NAZVY_ZDROJU,
  nactiKUklizeni,
  nactiTrat,
  type Boje,
  type Byvala,
} from "@/lib/boje";
import { nazevZastavky } from "@/lib/kalendar";
import { MapkaTrati, type PrvekNaMape } from "@/app/mapka-trati";
import { ZnakVRadku } from "@/app/znak-boje";
import { Pipani } from "./pipani";
import { nactiPrvky, nactiStavTrati, nactiTrate, type Prvek } from "@/lib/trat";
import { PrvkyTrati } from "./prvky";
import { StavTrati } from "./stav-trati";
import { Stavba } from "./stavba";
import { VyberTrati } from "./vyber-trati";
import { nahrajFotkuAkce, odeberFotkuAkce, seberAkce, uklidAkce } from "./akce";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Bóje na trati — správa" };

type Parametry = {
  params: Promise<{ serie: string; zavod: string }>;
  searchParams: Promise<{ chyba?: string; stav?: string; prenastav?: string; uklizeno?: string }>;
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
  const [{ stav, trat, byvale }, nazev, stavTrati, prvky, kUklizeni, trate] =
    await Promise.all([
    nactiTrat(serie, zavod),
    nazevZastavky(serie, zavod),
    nactiStavTrati(serie, zavod),
    nactiPrvky(serie, zavod),
    nactiKUklizeni(serie, zavod),
    nactiTrate(serie, zavod),
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
      {zpravy.uklizeno && (
        <p className="hlaska" role="status">
          {zpravy.uklizeno === "1"
            ? "Zahodil se jeden záznam historie."
            : `Zahodilo se ${zpravy.uklizeno} záznamů historie.`}
        </p>
      )}
      {zpravy.stav === "trat-prirazena" && (
        <p className="hlaska" role="status">
          Trať je přiřazená rozjížďce.
        </p>
      )}
      {zpravy.stav === "trat-klon" && (
        <p className="hlaska" role="status">
          Trať je naklonovaná i s prvky. Bóje zůstaly tytéž — nic se nepípalo znovu.
        </p>
      )}
      {zpravy.stav === "prvek" && (
        <p className="hlaska" role="status">
          Prvek je na trati. Mapka ho kreslí podle typu — čára a brána jako
          úsečku mezi konci, dráha jejím středem.
        </p>
      )}
      {zpravy.stav === "prvekPryc" && (
        <p className="hlaska" role="status">
          Prvek je pryč. Bóje zůstaly — smazalo se rozhodnutí, ne měření.
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

          {/* Výběr a klonování hned pod stavem: obojí je o tom, která
              trať platí, a patří to k sobě dřív než k bójím. */}
          <VyberTrati serie={serie} zavod={zavod} trate={trate} />

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
              stojici={trat.map((b) => b.nazev)}
              byvala={[...(byvale ?? []).map(({ boje }) => boje.nazev)].reverse()}
            />
          )}

          {/* Stavba prvku je první věc pod stavem trati: na vodě je to
              to, kvůli čemu tam člověk je. Pípnutí jedné bóje zůstává
              níž — je to cesta pro zvláštní případ, ne hlavní. */}
          {stavTrati.trat?.stav !== "Prijato" && (
            <Stavba
              serie={serie}
              zavod={zavod}
              dalsiPoradi={prvky.length + 1}
              // Mapa se otevře u poslední pípnuté bóje; bez bójí
              // u Orlické přehrady, ne u nulového poledníku.
              stred={
                trat.length > 0
                  ? { sirka: trat[trat.length - 1].sirka, delka: trat[trat.length - 1].delka }
                  : { sirka: 49.5163, delka: 14.1651 }
              }
            />
          )}

          {/* Prvky stojí nad mapkou: mapka je kreslí, takže kdo chce něco
              změnit, má to mít nad obrázkem, ne pod ním. */}
          <PrvkyTrati
            serie={serie}
            zavod={zavod}
            prvky={prvky}
            boje={trat}
            zamceno={stavTrati.trat?.stav === "Prijato"}
          />

          <h2>Co stojí na trati</h2>
          <MapkaTrati prvky={prvky.map((p) => naMapu(p, trat))} />
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
                Přenastavené a sebrané bóje. Drží se ty, na kterých něco visí:
                ukazuje na ně prvek trati, nebo stály ve vodě, když rozhodčí
                trať přijal — tedy když už byly venku.
              </p>

              {/* Úklid nabídne obrazovka jen tehdy, když je co uklidit,
                  a vždycky řekne kolik. Mazání nejde vzít zpátky, takže
                  tlačítko „ukliď" bez čísla by byl výstřel naslepo. */}
              {kUklizeni !== null && kUklizeni > 0 && (
                <form action={uklidAkce} className="formular radkove">
                  <input type="hidden" name="serie" value={serie} />
                  <input type="hidden" name="zavod" value={zavod} />
                  <p className="poznamka">
                    {kUklizeni === 1
                      ? "Jeden záznam tu zůstal po překlepu nebo přestavbě a nic na něm nevisí."
                      : `${kUklizeni} záznamů tu zůstalo po překlepech a přestavbách a nic na nich nevisí.`}{" "}
                    <button type="submit">
                      {kUklizeni === 1 ? "Zahodit ho" : "Zahodit je"}
                    </button>{" "}
                    Smaže se i s fotkami a nejde to vrátit.
                  </p>
                </form>
              )}
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
      <span className="stitek">{boje.poradi}.</span>{" "}
      {/* Značka u jména: na vodě se bóje hledá podle toho, jak vypadá,
          ne podle pořadí v seznamu. */}
      <ZnakVRadku barva={boje.barva} tvar={boje.tvar} />
      <span>{boje.nazev}</span>{" "}
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

/**
 * Prvek ze správy pro mapku. Bod se kreslí jako konec stejně jako bóje,
 * jen prázdným kolečkem — tam nic neplave.
 */
/**
 * Prvek pro mapku. <b>Barvu si dohledá ze seznamu bójí</b>, který stránka
 * stejně má: `KonecBojeDto` ji nenese a kvůli jednomu poli by se měnil
 * kontrakt a čekalo na další nasazení. Veřejná strana ji v DTO má, protože
 * tam žádný seznam bójí k ruce není.
 */
function naMapu(p: Prvek, boje: Boje[]): PrvekNaMape {
  const znak = (id: number) => {
    const b = boje.find((x) => x.id === id);
    return { barva: b?.barva, tvar: b?.tvar };
  };

  const konce = [
    { nazev: p.a.nazev, sirka: p.a.sirka, delka: p.a.delka, ...znak(p.a.id) },
  ];
  if (p.b) konce.push({ nazev: p.b.nazev, sirka: p.b.sirka, delka: p.b.delka, ...znak(p.b.id) });
  else if (p.bodB)
    konce.push({
      nazev: p.bodB.popis,
      sirka: p.bodB.sirka,
      delka: p.bodB.delka,
      barva: undefined,
      tvar: undefined,
    });

  return {
    klic: p.id,
    typ: p.typ,
    poradi: p.poradi,
    konce,
    druhyNeniBoje: !!p.bodB,
    smer: p.smer,
  };
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
