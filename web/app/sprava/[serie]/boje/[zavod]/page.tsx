import Link from "@/app/sprava/odkaz";
import { notFound } from "next/navigation";
import { Drobecky, drobeckySpravy, drobekRegaty } from "@/app/drobecky";
import { PruhUkonuRegaty } from "@/app/sprava/pruh-ukonu";
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
import { Puvod, ZnackaNaTrati } from "./znacka-na-trati";
import { StavTrati } from "./stav-trati";
import { Stavba } from "./stavba";
import { nactiRozjizdky } from "@/lib/vysledky";
import { nactiUkony } from "@/lib/ukony";
import { VyberTrati } from "./vyber-trati";
import { uklidAkce, zahodZaznamAkce } from "./akce";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Závodní trať — správa" };

type Parametry = {
  params: Promise<{ serie: string; zavod: string }>;
  searchParams: Promise<{
    chyba?: string;
    stav?: string;
    prenastav?: string;
    uklizeno?: string;
    otevrit?: string;
    /** Kterou trať regaty obrazovka ukazuje. Bez ní tu nejnovější. */
    trat?: string;
    /**
     * Na co se server zeptal podruhé: `odpojit`, nebo `smazat`.
     * Odpověď na 409 je druhé odeslání téhož, takže se to nese adresou.
     */
    potvrdit?: string;
  }>;
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

  // Která trať se ukazuje. Nula znamená „nevybráno" — API pak vydá tu
  // nejnovější, jako dřív.
  const vybranaTrat = Number(zpravy.trat ?? 0) || undefined;
  const potvrdit = zpravy.potvrdit;

  // Název regaty v odpovědi o bójích není, a bez něj nadpis neřekne, čí
  // trať se zrovna staví (Filip, 9. 10. 2026).
  // Rozjížďky se čtou jen kvůli plusu: nabízí ty, které trať nemají.
  // Výpadek jejich čtení nesmí shodit stavbu — plus pak nenabídne nic.
  const [{ stav, trat, byvale }, nazev, stavTrati, prvky, kUklizeni, trate, prehled] =
    await Promise.all([
    nactiTrat(serie, zavod),
    nazevZastavky(serie, zavod),
    nactiStavTrati(serie, zavod, vybranaTrat),
    nactiPrvky(serie, zavod, vybranaTrat),
    nactiKUklizeni(serie, zavod),
    nactiTrate(serie, zavod),
    nactiRozjizdky(serie, zavod),
  ]);
  const rozjizdky = (prehled.data?.rozjizdky ?? []).map((r) => r.cislo);
  if (stav === "neni") notFound();

  // Co komise vyhlásila za jízdy. Čte se až po stavu trati, protože bez
  // přiřazené rozjížďky není co číst — a výpadek tohohle nesmí shodit
  // stavbu, proto `null` místo výjimky (rozlišuje se od prázdna).
  const cisloRozjizdky = stavTrati.trat?.cisloRozjizdky ?? null;
  const ukony = cisloRozjizdky
    ? await nactiUkony(serie, zavod, cisloRozjizdky).catch(() => null)
    : [];

  // Přenastavuje se jen bóje, která na trati doopravdy stojí. Podvržené id
  // tím nemá co nabídnout a formulář zůstane na „pípnout novou".
  const prenastav = Number(zpravy.prenastav ?? 0);
  const prenastavovana = trat?.find((b) => b.id === prenastav);

  // Po akci se znovu rozbalí detail prvku, kterého se týkala. „posledni"
  // posílá zopakování průjezdu: API při zakládání vrací jen chybu, ne id,
  // takže nový prvek se pozná tím, že je na konci.
  const otevreny =
    zpravy.otevrit === "posledni"
      ? prvky[prvky.length - 1]?.id
      : Number(zpravy.otevrit) || undefined;

  // Kam se otevře mapa, když se bod bere z ní: u poslední pípnuté bóje,
  // a bez bójí u Orlické přehrady — ne u nulového poledníku. Platí pro
  // pípnutí jedné bóje i pro průvodce, takže se počítá jen jednou.
  const stredMapy =
    trat && trat.length > 0
      ? { sirka: trat[trat.length - 1].sirka, delka: trat[trat.length - 1].delka }
      : { sirka: 49.5163, delka: 14.1651 };

  return (
    <>
      <Drobecky
        cesta={drobeckySpravy(serie, [
          drobekRegaty(serie, zavod, nazev),
          { text: "Závodní trať" },
        ])}
      />
      <h1>Závodní trať</h1>
      {nazev && <p className="podtitulek">{nazev}</p>}
      <PruhUkonuRegaty serie={serie} zavod={zavod} aktivni="boje" />

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
      {zpravy.stav === "tratOdpojena" && (
        <p className="hlaska" role="status">
          Trať už žádnou rozjížďku nejede. Stojí dál ve vodě a dá se přiřadit
          jiné rozjížďce, nebo smazat.
        </p>
      )}
      {zpravy.stav === "tratSmazana" && (
        <p className="hlaska" role="status">
          Trať je smazaná i s prvky a rozjížďka ji tím ztratila. Bóje zůstaly —
          pořád stojí ve vodě a jejich poloha je měření, které se stalo.
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
      {zpravy.stav === "prvekUpraven" && (
        <p className="hlaska" role="status">
          Uloženo. Změnil se jen předpis — značky i jejich poloha zůstávají.
        </p>
      )}
      {zpravy.stav === "prvekZnovu" && (
        <p className="hlaska" role="status">
          Další průjezd týchž značek je na konci trati. Dopiš u něj, jak se
          jede — fyzika prvku už daná je.
        </p>
      )}
      {zpravy.stav === "prvekPresunut" && (
        <p className="hlaska" role="status">
          Pořadí se přečíslovalo. Trať se jede v tom pořadí, v jakém prvky
          stojí v seznamu.
        </p>
      )}
      {zpravy.stav === "prvekPryc" && (
        <p className="hlaska" role="status">
          Prvek je pryč a jeho značky jsou sebrané z vody. V historii bójí
          zůstaly — smazalo se rozhodnutí o trati, ne měření.
        </p>
      )}
      {/* Druhý průjezd týchž značek. Bóje se nesbírají, protože na nich
          stojí jiný prvek — a sebrat je by rozbilo trať jinde, než kam
          člověk klikl. */}
      {zpravy.stav === "novaTrat" && (
        <p className="hlaska" role="status">
          Nová trať je založená a obrazovka je na ní. Rozjížďku jí přiřadíš,
          až bude postavená — nebo klidně hned, když se na ni čeká na vodě.
        </p>
      )}
      {zpravy.stav === "prujezdPryc" && (
        <p className="hlaska" role="status">
          Průjezd je pryč. Značky zůstaly ve vodě, protože je používá ještě
          jiný prvek trati.
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
          {/* <b>Záložky tratí nahoru</b> (Filip, 19. 10. 2026: *„chtěl bych
              mít možnost přepínat tratě nahoře jako tab, nikoli dole"*).
              Dřív stály až pod mapkou s odůvodněním, že výběr trati je
              úkol od stolu — jenže když má regata tratí víc, je první
              otázka na té obrazovce „kterou vlastně vidím", a odpověď byla
              o dvě obrazovky níž. Všechno pod tím se jich týká, takže
              patří nad to. */}
          <VyberTrati
            serie={serie}
            zavod={zavod}
            trate={trate}
            rozjizdky={rozjizdky}
            vybrana={stavTrati.trat?.id}
            potvrdit={potvrdit}
          />

          {stavTrati.stav === "ok" && stavTrati.trat && (
            <StavTrati serie={serie} zavod={zavod} trat={stavTrati.trat} />
          )}

          {/* Stavba prvku je první věc pod stavem trati: na vodě je to
              to, kvůli čemu tam člověk je. Pípnutí jedné bóje zůstává
              níž — je to cesta pro zvláštní případ, ne hlavní. */}
          {stavTrati.trat?.stav !== "Prijato" && (
            <Stavba
              serie={serie}
              zavod={zavod}
              dalsiPoradi={prvky.length + 1}
              stred={stredMapy}
              tratId={stavTrati.trat?.id}
            />
          )}

          {/* <b>Pípnutí jedné bóje je zvláštní případ, ne hlavní cesta</b>
              (Filip, 11. 10. 2026: *„proč mám Pípnout bóji jako úvodní
              možnost, když to stavím od prvku?"*). Proto až pod
              průvodcem a schované — rozbalí se samo, když se přenastavuje,
              protože to je jediná věc, která sem posílá odjinud.

              U zamčené trati se formulář neukazuje vůbec. API pípnutí
              odmítne, ale dozvědět se to až z chyby je na vodě o dvě
              klepnutí a jednu nadávku navíc — důvod stojí v panelu výš. */}
          {stavTrati.trat?.stav !== "Prijato" && (
            <details className="jedna-boje" open={!!prenastavovana}>
              <summary>
                {prenastavovana ? "Přenastavit bóji" : "Pípnout jednu bóji zvlášť"}
              </summary>
              <Pipani
                bezNadpisu
                serie={serie}
                zavod={zavod}
                prenastavuje={
                  prenastavovana
                    ? {
                        id: prenastavovana.id,
                        nazev: prenastavovana.nazev,
                        // Poloha jde s sebou kvůli mapě: u přenastavení
                        // se má otevřít na staré poloze té bóje, ne
                        // u poslední na trati.
                        sirka: prenastavovana.sirka,
                        delka: prenastavovana.delka,
                        // Barva a tvar jdou taky: formulář je předvybere,
                        // aby bylo vidět, co ta bóje je. Bez nich vypadá
                        // růžový plameňák jako bóje bez tvaru.
                        barva: prenastavovana.barva ?? null,
                        tvar: prenastavovana.tvar ?? null,
                      }
                    : null
                }
                nejvicZnaku={NAZEV_NEJVIC}
                stojici={trat.map((b) => b.nazev)}
                byvala={[...(byvale ?? []).map(({ boje }) => boje.nazev)].reverse()}
                stred={stredMapy}
              />
            </details>
          )}

          {/* <b>Seznam prvků je nosný přehled a mapka patří hned pod něj</b>
              (Filip, 12. 10. 2026: *„Seznam »Prvky trati« hlavní nosný
              přehled a pod ním rovnou mapka"*). Mapka prvky kreslí, takže
              čte se shora dolů: co trať je, a jak to vypadá.

              <b>Seznam všech bójí pod mapkou je pryč</b> (Filip tamtéž:
              *„pod mapkou je stale seznam prvků trati a ten je
              zbytečný/matoucí, stačí ten list nahoře"*). Co se s bójí dá
              dělat, je v detailu jejího prvku; bóje, kterou žádný prvek
              nepoužívá, se nabídne v hlášce „stojí mimo trať". */}
          <PrvkyTrati
            serie={serie}
            zavod={zavod}
            prvky={prvky}
            boje={trat}
            zamceno={stavTrati.trat?.stav === "Prijato"}
            tratId={stavTrati.trat?.id}
            smiZkratit={stavTrati.trat?.smiZkratit ?? false}
            zkraceniU={stavTrati.trat?.zkracenoUPrvkuId ?? null}
            otevrit={otevreny}
            rozjizdka={stavTrati.trat?.cisloRozjizdky ?? null}
            ukony={ukony}
          />

          <MapkaTrati prvky={prvky.map((p) => naMapu(p, trat))} />
          {trat.length === 0 && (
            <p className="prazdno">
              Zatím nic. Až bóji spustíš do vody, pípni ji — poloha z tvého
              telefonu je ta nejpřesnější, kterou kdo má.
            </p>
          )}

          {/* <b>Lodě jsou na vlastní obrazovce, ne tady</b> (24. 10. 2026).
              Plán chtěl vrstvu do téhle mapky, jenže ta se kreslí na
              serveru a nedá se v ní posouvat ani rozkliknout loď — a to
              rozhodčí potřebuje. Živá mapa je proto vedle, jako samostatná
              obrazovka s toutéž tratí; sloučit se dají, až bude mapka
              interaktivní. */}
          {prvky.length >= 2 && (
            <p className="poznamka">
              <Link href={`/sprava/${serie}/tracker/${zavod}`}>
                Živé polohy lodí na mapě
              </Link>{" "}
              — kdo se hlásí, jak je to staré a kde zrovna je.
            </p>
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
            /* <b>Historie je sbalená</b> (Filip, 12. 10. 2026: *„Historie
               […] bude zabalená v tabu, nebo akordeonu, rozbalí se až po
               kliknutí na tlačítko, aby nerušila"*). Je to doklad, do
               kterého se kouká výjimečně — rozbalená zabírala konec
               obrazovky pokaždé, i když se zrovna stavěla trať. */
            <details className="historie-boji">
              <summary>
                Historie{" "}
                <span className="stitek">
                  {byvale.length === 1 ? "1 záznam" : `${byvale.length} záznamů`}
                </span>
              </summary>
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
                    <Byvsi boje={boje} proc={proc} serie={serie} zavod={zavod} />
                  </li>
                ))}
              </ul>
            </details>
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
/**
 * Prvek ze správy pro mapku. Bod se kreslí jako konec stejně jako bóje,
/**
 * Prvek pro mapku. <b>Barvu si dohledá ze seznamu bójí</b>, který stránka
 * stejně má: `KonecBojeDto` ji nenese a kvůli jednomu poli by se měnil
 * kontrakt a čekalo na další nasazení. Veřejná strana ji v DTO má, protože
 * tam žádný seznam bójí k ruce není.
 */
function naMapu(p: Prvek, boje: Boje[]): PrvekNaMape {
  const znak = (id: number) => {
    const b = boje.find((x) => x.id === id);
    return { barva: b?.barva, tvar: b?.tvar, znaceni: b?.znaceni };
  };

  const konce = [
    { nazev: p.a.nazev, sirka: p.a.sirka, delka: p.a.delka, ...znak(p.a.id) },
  ];
  if (p.b) konce.push({ nazev: p.b.nazev, sirka: p.b.sirka, delka: p.b.delka, ...znak(p.b.id) });

  return {
    klic: p.id,
    typ: p.typ,
    poradi: p.poradi,
    konce,
    smer: p.smer,
    strana: p.strana,
  };
}



/** Bóje, která už na trati nestojí. Sebrat ani přenastavit nejde. */
function Byvsi({
  boje,
  proc,
  serie,
  zavod,
}: Byvala & { serie: string; zavod: string }) {
  return (
    <>
      <span className="stitek">{boje.poradi}.</span> <span>{boje.nazev}</span>{" "}
      <span className="stitek">{proc}</span>
      <Puvod boje={boje} />
      {/* Fotky zůstávají i u bóje, která už na trati nestojí: doklad
          k poloze, podle které se možná jelo. Mazat se nedají odsud —
          historie se neupravuje. */}
      <Fotky boje={boje} />

      {/* <b>Zahodit jeden záznam</b> (Filip, 12. 10. 2026: *„Historie bude
          mít možnost záznam smazat"*). Vedle hromadného úklidu výš, který
          bere všechno k ničemu naráz — tohle je na jeden konkrétní překlep.

          Tlačítko je tu u každého záznamu, i u toho, na kterém něco visí:
          rozsudek patří serveru a ten odpoví větou, proč ne. Schovat ho
          podle `kUklizeni` by znamenalo počítat pravidlo podruhé
          a obrazovka by si ho nutně spočítala jinak. */}
      <form action={zahodZaznamAkce} className="formular radkove">
        <input type="hidden" name="serie" value={serie} />
        <input type="hidden" name="zavod" value={zavod} />
        <input type="hidden" name="boje" value={boje.id} />
        <button type="submit" className="maly nebezpecne">
          Zahodit záznam
        </button>
      </form>
    </>
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
