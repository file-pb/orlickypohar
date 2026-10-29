import Link from "@/app/sprava/odkaz";
import { notFound } from "next/navigation";
import { Drobecky, drobeckySpravy, drobekRegaty } from "@/app/drobecky";
import { CisloRozjizdky, Stav } from "@/app/stav";
import { Vypadek } from "@/app/vypadek";
import {
  krokZe,
  STAVY,
  nactiRozjizdky,
  nazevStavu,
  type RozjizdkaRadek,
  type StavVysledku,
} from "@/lib/vysledky";
import { NAZVY_STAVU, nactiTrate, type TratNaVyber } from "@/lib/trat";
import { nactiJa } from "@/lib/ja";
import { prava, smi } from "@/lib/co-smim";
import { dataTrackeru, PanelTrackeru } from "../../tracker/[zavod]/panel";
import {
  poharAkce,
  pridejRozjizdkuAkce,
  publikaceAkce,
  novaTratAkce,
  odpojTratAkce,
  stavAkce,
  stavTratiURozjizdkyAkce,
  tratRozjizdceAkce,
} from "../akce";
import { StejnaTrat } from "@/app/sprava/stejna-trat";
import { NadpisUkonu, PruhUkonuRegaty } from "@/app/sprava/pruh-ukonu";

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

  // Tratě jen kvůli ukazateli u rozjížďky. Vlastní volání schválně: když
  // selže, ukazatel prostě nic netvrdí a zbytek obrazovky jede dál —
  // workflow výsledků na trati nestojí.
  const [{ stav, data: prehled }, trate, { ja }] = await Promise.all([
    nactiRozjizdky(serie, zavod),
    nactiTrate(serie, zavod),
    nactiJa(),
  ]);

  // <b>Živé polohy mají vlastní podmínku, a užší</b> (oponentura, 24. 10.
  // 2026). Čtení výsledků je otázka na celý ročník —
  // `VysledkyEndpoints.PohledAsync` se ptá jen na `SerieId` a pouští
  // i pořadatele jediné zastávky, kterého pak na cizí regatě omezují
  // příznaky v řádcích. Polohy chtějí pořadatele **té** regaty, nebo
  // rozhodčího (`PolohyEndpoints.SmiAsync`). Půjčit si sem podmínku od
  // výsledků znamenalo nakreslit panel i tomu, komu API polohy odmítne —
  // a protože `nactiPrvky` vrací na 403 prázdno, vyšlo odmítnutí jako věta
  // „trať nemá dva prvky" u trati, která má tři (změřeno).
  //
  // Panel je přídavek k zápisu, takže se kdo na něj nemá rovnou nekreslí;
  // věta by na téhle obrazovce odpovídala na otázku, kterou si nikdo
  // nepoložil. Vlastní stránka trackeru odmítnutí říká slovy — tam se
  // člověk na polohy ptal.
  //
  // Vlastní volání schválně: výpadek trackeru nesmí vzít celou obrazovku
  // (`dataTrackeru` vrací prázdno, ne výjimku). `nactiJa` je v rámci
  // požadavku cachované, takže tohle čekání nic nestojí.
  const smiPolohy =
    smi(prava(ja), { role: "Organizator", serie, zavod }) ||
    smi(prava(ja), { role: "Rozhodci", serie });
  const tracker = smiPolohy ? await dataTrackeru(serie, zavod) : null;
  // `null` je výpadek čtení, ne „žádné tratě" (viz `nactiTrate`). Pro
  // odvozené seznamy se chová jako prázdno; u výběru trati se ale musí
  // poznat, jinak by řádek tvrdil „bez trati" o rozjížďce, která ji má.
  const seznamTrati = trate ?? [];
  // Trať podle čísla rozjížďky. Karta potřebuje celou, ne jen příznak:
  // stav, id pro odkaz a jestli ji smí rozhodčí přijmout.
  const podleRozjizdky = new Map<number, TratNaVyber>();
  for (const t of trate ?? []) if (t.cisloRozjizdky !== null) podleRozjizdky.set(t.cisloRozjizdky, t);

  const sTrati = new Set(
    seznamTrati.map((t) => t.cisloRozjizdky).filter((c): c is number => c !== null),
  );

  // Které rozjížďky jedou totéž co která. Počítá se z otisku předpisu,
  // takže jakmile se jedna trať upraví, dvojice se rozpadne — a právě to
  // má ta věta u rozjížďky říct (Filip, 15. 10. 2026: „to samé můžeme dát
  // do rozjížďky malou info poznámku, že má stejnou trať jako vedlejší").
  const stejnaTrat = new Map<number, number[]>();
  for (const t of seznamTrati) {
    if (t.otisk === null || t.cisloRozjizdky === null) continue;
    const shodne = seznamTrati
      .filter((x) => x.otisk === t.otisk && x.cisloRozjizdky !== null && x.id !== t.id)
      .map((x) => x.cisloRozjizdky!)
      .sort((a, b) => a - b);
    if (shodne.length > 0) stejnaTrat.set(t.cisloRozjizdky, shodne);
  }

  // Postavené tratě na výběr. <b>Prázdná se nenabízí</b>: vybrat trať
  // bez prvků znamená nevybrat nic a jen si vyrobit druhou prázdnou.
  const naVyber = trate === null
    ? null
    : trate
    .filter((t) => t.pocetPrvku > 0)
    .map((t) => ({
      id: t.id,
      popis:
        (t.cisloRozjizdky ? `jako ${t.cisloRozjizdky}. rozjížďka` : "zatím bez rozjížďky") +
        ` — ${t.pocetPrvku === 1 ? "1 prvek" : `${t.pocetPrvku} prvků`}, ${NAZVY_STAVU[t.stav]}`,
    }));

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
        cesta={drobeckySpravy(serie, [
          drobekRegaty(serie, zavod),
          { text: "Výsledky" },
        ])}
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
          ověřuje a schvaluje rozhodčí ročníku —{" "}
          <Link href="/napoveda#vysledky">který krok komu patří</Link>.
        </p>
      </>
    );

  return (
    <>
      <Drobecky
        cesta={drobeckySpravy(serie, [
          drobekRegaty(serie, zavod, prehled.zavodNazev),
          { text: "Výsledky" },
        ])}
      />
      {/* Pruh stojí hned pod drobečky, nadpis až za ním (Filip, 29. 10.
          2026). Je to navigace, ne obsah — a drobeček s dlaždicí tak drží
          při sobě to, co obojí říká: kde jsem.
          Odkaz „přihlášené lodě →" z podtitulku odešel: pruh na ně vede taky
          a dvě cesty k témuž na jedné obrazovce se čtou jako dvě různé věci. */}
      <PruhUkonuRegaty serie={serie} zavod={zavod} aktivni="vysledky" />
      <NadpisUkonu
        serie={serie}
        zavod={zavod}
        ukon="vysledky"
        regata={prehled.zavodNazev}
        podtitulek={
          <>
            {prehled.serieNazev} <Stav stav={prehled.stavZavodu} />
          </>
        }
      />

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
          {prehled.smiPridatRozjizdku ? (
            "Přidej první a rovnou do ní zapiš výsledky."
          ) : (
            <>
              Přidat ji může pořadatel regaty, jakmile je závod vypsaný —
              vypisuje se v{" "}
              <Link href={`/sprava/${serie}/kalendar`}>kalendáři</Link>.
            </>
          )}
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
                trat={podleRozjizdky.get(r.cislo)}
                stejnaTrat={stejnaTrat.get(r.cislo) ?? []}
                naVyber={naVyber}
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

      {/* <b>Kdo zapisuje cíl, chce vědět, kdo je ještě na vodě</b> (Filip,
          24. 10. 2026). Je to tatáž osoba ve stejnou chvíli, takže mapa
          patří sem, ne o obrazovku vedle. Stojí dole, protože zápis je
          důvod, proč sem člověk přišel; mapa je k němu kontext.

          Mimo závod se kreslí jen řádek s odkazem (`jenOdkazKdyzNic`):
          prázdná mapa by byla velká díra, která nic neříká, a klientská
          část by se každých pět vteřin ptala na nic. Mapa se objeví při
          příštím načtení stránky — a při zápisu se stránka překresluje po
          každé akci, takže v praxi hned.

          Obal nepotřebuje: `.nacrt` je v obsahovém sloupci mřížka mapa +
          žebříček a pod 900 px se skládá pod sebe. Celou šířku si bere jen
          vlastní stránka trackeru (`.tracker-strana`). */}
      {tracker && (
        <>
          <h2>Kdo je na vodě</h2>
          <PanelTrackeru serie={serie} zavod={zavod} data={tracker} jenOdkazKdyzNic />
        </>
      )}
    </>
  );
}

function Rozjizdka({
  serie,
  zavod,
  rozjizdka,
  otevriRevizi,
  trat,
  stejnaTrat,
  naVyber,
}: {
  serie: string;
  zavod: string;
  rozjizdka: RozjizdkaRadek;
  otevriRevizi: boolean;
  /** Trať rozjížďky, nebo `undefined`. */
  trat?: TratNaVyber;
  /** Čísla rozjížděk, které jedou totéž. Prázdné, když je trať jedinečná. */
  stejnaTrat: number[];
  /** Postavené tratě regaty na výběr. */
  naVyber: { id: number; popis: string }[] | null;
}) {
  const skryta = ["Navrzeno", "Overeno", "Schvaleno"] as const;

  return (
    <div className="karta">
      <div className="nazev">
        {/* <b>Číslo nese stav rozjížďky</b>, štítek za ním stav zápisu —
            dvě různé otázky. „Jede se" je o vodě, „ověřeno" o tom, kdo za
            čísla ručí. Na tabuli se první z nich pozná z druhého konce
            hospody, ve správě se do 27. 10. 2026 nepoznala vůbec. */}
        <CisloRozjizdky cislo={rozjizdka.cislo} stav={rozjizdka.stav} />
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
        {/* <b>Jen to říká, nenastavuje</b> (Filip, 10. 10. 2026). Trať se
            přiřazuje u bójí; druhé místo, kde by to šlo nastavit, by se
            s tím prvním dřív nebo později rozešlo. Bez téhle věty ale nic
            nepřipomene, že nově založená rozjížďka trať nemá — zjistilo
            by se to až u vody. */}
        <TratRozjizdky
          serie={serie}
          zavod={zavod}
          rozjizdka={rozjizdka}
          trat={trat}
          stejnaTrat={stejnaTrat}
          naVyber={naVyber}
        />
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
          {/* <b>Co bude dál, musí stát u důvodu</b> (Filip, 20. 10. 2026).
              Důvod sám říká, co je špatně, ne kudy ven — a ven vede jediná
              cesta, přes odemčení zápisu. Jen dokud je rozjížďka v revizi:
              po opravě by tahle věta překážela, důvod zůstává. */}
          {rozjizdka.stavVysledku === "KRevizi" && (
            <span className="dal">
              {" "}
              Zápis je zamčený. Otevři ho k opravě, pak projde ověřením
              a schválením znovu.
            </span>
          )}
        </p>
      )}

      <div className="stavy">
        {rozjizdka.mozneStavy
          // <b>Zrušení má od 28. 10. 2026 povinný důvod</b> (nálezy R13
          // a R17), takže se stejně jako revize nevejde mezi tlačítka na
          // jedno kliknutí — má vlastní rozbalovací formulář níž.
          .filter((na) => na !== "KRevizi" && na !== "Eliminovano")
          .map((na) => {
            // Text podle toho, odkud se jde — „Vrátit do návrhu" je
            // z revize krok vpřed, ne couvnutí (viz `krokZe`).
            const krok = krokZe(rozjizdka.stavVysledku, na);
            return (
              <form key={na} action={stavAkce}>
                <input type="hidden" name="serie" value={serie} />
                <input type="hidden" name="zavod" value={zavod} />
                <input type="hidden" name="cislo" value={rozjizdka.cislo} />
                <input type="hidden" name="stav" value={na} />
                {/* Viditelný text napřed — viz obrazovka přihlášek. */}
                <button
                  type="submit"
                  title={krok.popis}
                  aria-label={`${krok.tlacitko} — ${krok.popis}`}
                >
                  {krok.tlacitko}
                </button>
              </form>
            );
          })}

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

      {/* <b>Zrušení s důvodem</b> (nálezy R13 a R17, 28. 10. 2026).
          Zrušená rozjížďka mizí z poháru, takže se bude vysvětlovat —
          a ZPJ 32.1 má po startu čtyři různé příčiny, které v zápisu
          vypadaly stejně. „Nefouká" a „vytlačili je z čáry" jsou přitom
          dvě různé věci: druhé z toho je náprava, o které se vede spor. */}
      {rozjizdka.mozneStavy.includes("Eliminovano") && (
        <details className="uprava">
          <summary>Zrušit rozjížďku</summary>
          <form action={stavAkce} className="formular">
            <input type="hidden" name="serie" value={serie} />
            <input type="hidden" name="zavod" value={zavod} />
            <input type="hidden" name="cislo" value={rozjizdka.cislo} />
            <input type="hidden" name="stav" value="Eliminovano" />
            <label>
              Proč se ruší
              <textarea
                name="duvod"
                required
                rows={2}
                maxLength={400}
                placeholder="Přešla bouřka, zrušeno pro bezpečnost."
              />
            </label>
            <button type="submit">Zrušit rozjížďku</button>
            <p className="poznamka">
              Rozjížďka přestane platit v závodě i v poháru. ZPJ 32.1
              rozlišují chybu v proceduře, počasí, posunutou značku a jiný
              důvod, který ovlivnil regulérnost — napiš, který to byl.
            </p>
          </form>
        </details>
      )}

      {/* Proč byla zrušená, musí být vidět i potom — je to to, co se bude
          vysvětlovat. */}
      {rozjizdka.duvodZruseni && (
        <p className="poznamka">
          <b>Zrušeno:</b> {rozjizdka.duvodZruseni}
        </p>
      )}

      {skryta.includes(rozjizdka.stavVysledku as (typeof skryta)[number]) &&
        rozjizdka.publikovano && (
          <p className="poznamka">
            Čísla jsou venku, i když zápis ještě neprošel celým workflow.
            Publikace je vlastní příznak, ne poslední stupeň —{" "}
            <Link href="/napoveda#vysledky">jak to spolu souvisí</Link>.
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

/**
 * Trať rozjížďky: co se s ní smí dělat, určuje stav rozjížďky
 * (Filip, 15. 10. 2026).
 *
 * <b>Odjetá se nepřenastavuje.</b> Trať je to, podle čeho se jelo —
 * přepsat ji zpětně by přepsalo výsledek. Zůstává jen údaj.
 *
 * <b>Když se jede, nestaví se, ale přestavuje.</b> Lodě jsou na vodě
 * a něco už tam stojí; slovo „postavit" by lhalo o tom, co se děje.
 *
 * <b>Před startem bez trati se přiřazuje</b> z postavených, a kdo si
 * nevybere, odejde ji postavit.
 */
function TratRozjizdky({
  serie,
  zavod,
  rozjizdka,
  trat,
  stejnaTrat,
  naVyber,
}: {
  serie: string;
  zavod: string;
  rozjizdka: RozjizdkaRadek;
  /** Trať rozjížďky, nebo `undefined`, když žádnou nemá. */
  trat?: TratNaVyber;
  stejnaTrat: number[];
  naVyber: { id: number; popis: string }[] | null;
}) {
  const editor = `/sprava/${serie}/boje/${zavod}`;
  const jede = rozjizdka.stav === "Probiha";
  const odjeto = rozjizdka.stav === "Dokoncena";

  if (trat)
    return (
      <>
        <Link href={`${editor}?trat=${trat.id}`}>
          {odjeto ? "jelo se podle trati" : jede ? "trať — přestavit" : "trať přiřazená"}
        </Link>
        <span className="stitek">{NAZVY_STAVU[trat.stav]}</span>
        <StejnaTrat serie={serie} zavod={zavod} cisla={stejnaTrat} />

        {/* <b>Co s tratí, rovnou od rozjížďky</b> (Filip, 15. 10. 2026:
            *„je-li vybrána a připojena, tak musí umožnit její schválení
            nebo zadání k přepracování"*). Chodit kvůli tomu na obrazovku
            bójí znamenalo odejít od zápisu.

            Odjetá rozjížďka nenabízí nic: trať je to, podle čeho se jelo. */}
        {!odjeto && (
          <span className="co-s-trati">
            {trat.smiPrijmout && (
              <form action={stavTratiURozjizdkyAkce} className="formular radkove">
                <input type="hidden" name="serie" value={serie} />
                <input type="hidden" name="zavod" value={zavod} />
                <input type="hidden" name="trat" value={trat.id} />
                <input type="hidden" name="krok" value="prijeti" />
                <button type="submit">Schválit trať</button>
              </form>
            )}
            {trat.smiPrijmout && trat.stav === "Hotovo" && (
              <details className="vratit-trat">
                <summary>K přepracování</summary>
                <form action={stavTratiURozjizdkyAkce} className="formular radkove">
                  <input type="hidden" name="serie" value={serie} />
                  <input type="hidden" name="zavod" value={zavod} />
                  <input type="hidden" name="trat" value={trat.id} />
                  <input type="hidden" name="krok" value="vraceni" />
                  <label>
                    <span className="skryte">Co chybí</span>
                    <input name="duvod" placeholder="chybí cílová bóje" maxLength={200} />
                  </label>
                  <button type="submit">Vrátit stavitelům</button>
                </form>
              </details>
            )}
            {/* Odpojení je pod tlačítkem, ne vedle (Filip tamtéž): je to
                krok zpátky, ne jedna z rovnocenných voleb. */}
            <details className="odpojit-trat">
              <summary>Odpojit</summary>
              <form action={odpojTratAkce} className="formular radkove">
                <input type="hidden" name="serie" value={serie} />
                <input type="hidden" name="zavod" value={zavod} />
                <input type="hidden" name="trat" value={trat.id} />
                <input type="hidden" name="potvrzeno" value="ano" />
                <button type="submit">Opravdu odpojit</button>
                <span className="poznamka">Rozjížďka zůstane, trať se uvolní.</span>
              </form>
            </details>
          </span>
        )}
      </>
    );

  // Odjetá rozjížďka bez trati je historie, ne úkol: přiřadit ji teď
  // zpětně by tvrdilo, že se podle ní jelo.
  if (odjeto) return <>bez trati</>;

  // Výpadek čtení není „žádná trať": nabídnout tu „postavit" by poslalo
  // stavitele stavět něco, co už možná stojí.
  if (naVyber === null) return <>trati se teď nedaří načíst</>;

  // Postavit novou jde vždycky, i když je z čeho vybírat: dřív to byl
  // jen odkaz do bójí a trať se tam musela zakládat zvlášť.
  const postavit = (
    <form action={novaTratAkce} className="formular radkove postavit-trat">
      <input type="hidden" name="serie" value={serie} />
      <input type="hidden" name="zavod" value={zavod} />
      <input type="hidden" name="cislo" value={rozjizdka.cislo} />
      <button type="submit">{jede ? "Postavit novou a přestavět" : "Postavit novou"}</button>
    </form>
  );

  if (naVyber.length === 0) return <>bez trati — {postavit}</>;

  return (
    <>
      <Vyber serie={serie} zavod={zavod} cislo={rozjizdka.cislo} naVyber={naVyber} />
      {postavit}
    </>
  );
}

/** Nabídka postavených tratí pro rozjížďku, která žádnou nemá. */
function Vyber({
  serie,
  zavod,
  cislo,
  naVyber,
}: {
  serie: string;
  zavod: string;
  cislo: number;
  naVyber: { id: number; popis: string }[];
}) {

  return (
    <form action={tratRozjizdceAkce} className="formular radkove vybrat-trat">
      <input type="hidden" name="serie" value={serie} />
      <input type="hidden" name="zavod" value={zavod} />
      <input type="hidden" name="cislo" value={cislo} />
      <label>
        <span className="skryte">Trať pro {cislo}. rozjížďku</span>
        <select name="trat" defaultValue={String(naVyber[0].id)}>
          {naVyber.map((t) => (
            <option key={t.id} value={t.id}>
              {t.popis}
            </option>
          ))}
        </select>
      </label>
      <button type="submit">Přiřadit</button>
    </form>
  );
}
