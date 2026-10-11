import Link from "next/link";
import { notFound } from "next/navigation";
import { nactiClanky, nactiVerejnouTrat, nactiZavod, ApiNedostupne } from "@/lib/api";
import { Vypadek } from "@/app/vypadek";
import { ProcNejsouVysledky } from "@/app/stav";
import { VypisNovinek } from "@/app/novinky";
import { Drobecky } from "@/app/drobecky";
import { Boky } from "@/app/boky";
import { CELKEM, NadpisTridy, TabyTrid, vyberTridu } from "@/app/tridy";
import { Medailonek, maObsah } from "@/app/medailonek";
import { nactiJa } from "@/lib/ja";
import { polozkyZastavky, prava, roleVRocniku } from "@/lib/co-smim";
import { DoSpravy, Hlavicka } from "./hlavicka";
import { PrihlaseneLode } from "./lode";
import { SekcePravidla } from "./pravidla";
import { SekceSmernice } from "./smernice";
import { naRadky, Tabulka } from "./vysledky";

// Stránky stojí na databázi, ne na obsahu známém v době buildu. Bez tohohle
// by je Next předrenderoval při sestavení — a build by pak vyžadoval běžící
// API, což je závislost, kterou nikdo nechce.
export const dynamic = "force-dynamic";

type Parametry = {
  params: Promise<{ slug: string; zavod: string }>;
  searchParams: Promise<{ trida?: string }>;
};

// Viz stránka ročníku: titulek nesmí shodit vykreslení.
export async function generateMetadata({ params }: Parametry) {
  const { slug, zavod } = await params;
  try {
    const z = await nactiZavod(slug, zavod);
    return { title: z?.nazev ?? "Regata" };
  } catch {
    return { title: "Regata" };
  }
}

export default async function Zastavka({ params, searchParams }: Parametry) {
  const { slug, zavod: slugZavodu } = await params;
  const { trida } = await searchParams;
  let zavod, clanky, trat;
  try {
    // Regatu pořádá jiný subjekt a stránka je jeho — kromě výsledků na ni
    // patří i jeho vlastní blog, viz PLAN.md „Stránka regaty".
    //
    // Trať se tu načítá jen proto, aby se poznalo, jestli na ni vede odkaz.
    // Obsah trati je na vlastní adrese: čte se bez cache a na stránce
    // regaty by minutu starý obrázek trati byl nebezpečný.
    [zavod, clanky, trat] = await Promise.all([
      nactiZavod(slug, slugZavodu),
      nactiClanky(slug, { zavod: slugZavodu }),
      nactiVerejnouTrat(slug, slugZavodu),
    ]);
  } catch (e) {
    if (e instanceof ApiNedostupne) return <Vypadek co="Výsledky" />;
    throw e;
  }
  if (!zavod) notFound();

  const radky = naRadky(zavod);
  // Celé pole napříč kategoriemi je pseudo-třída v tabech, ne druhá
  // tabulka pod tou první: na telefonu by druhá tabulka znamenala
  // rolovat přes celou první (Filip, 22. 9. 2026).
  const radkyCelkem = naRadky(zavod, zavod.poradiCelkem ?? []);
  const kategorie = [
    ...(radkyCelkem.length > 0 && zavod.vyhodnoceni !== "PoKategoriich" ? [CELKEM] : []),
    ...(zavod.vyhodnoceni === "CelePole" ? [] : [...new Set(radky.map((r) => r.kategorie))]),
  ];
  const akce = zavod.druh === "Akce";

  const { ja } = await nactiJa();
  const udelena = prava(ja);
  const maRoli = roleVRocniku(udelena, slug).length > 0;
  // Komunitní akce výsledky ani přihlášky nemá; vede z ní jen rozcestník.
  const prace = akce ? [] : polozkyZastavky(udelena, slug, slugZavodu);

  const aktivni = vyberTridu(kategorie, trida);
  const videt = aktivni === CELKEM ? radkyCelkem : radky.filter((r) => r.kategorie === aktivni);
  const naTridu = (k: string) =>
    `/serie/${slug}/zavody/${slugZavodu}?trida=${encodeURIComponent(k)}`;
  const naPrihlasku = `/serie/${slug}/zavody/${slugZavodu}/prihlaska`;
  // Přihlásit se dá i k regatě s výsledky: loď se často domluví telefonem
  // na startu a zapíše se dodatečně (Filip, 17. 9. 2026).
  const prihlasuje = zavod.stav === "Vypsany" || zavod.stav === "Odjety";

  return (
    <Boky serie={slug}>
      <Drobecky
        cesta={[
          { text: "Domů", kam: "/" },
          { text: "Ročník", kam: `/serie/${slug}` },
          { text: zavod.nazev },
        ]}
      />
      <Hlavicka zavod={zavod} akce={akce} />

      {maRoli && <DoSpravy serie={slug} zavod={slugZavodu} prace={prace} />}

      {/* Plachetní směrnice hned pod hlavičkou: je to dokument, podle
          kterého se jede. */}
      <SekceSmernice smernice={zavod.smernice} />

      {/* Trať pod směrnicí, protože obojí je „podle čeho se jede". Odkaz je
          tu jen tehdy, když je trať doopravdy vyvěšená — slepý odkaz na
          stránku s „zatím nic" je horší než žádný. Přestavbu hlásí už
          rozcestník: kdo stránku otevře mezi rozjížďkami, má vědět, že se
          trať právě mění, a ne až po kliknutí. */}
      {trat && (
        <p className="poznamka">
          {trat.prestavba ? (
            <>
              <b>Trať se právě přestavuje.</b>{" "}
              <Link href={`/serie/${slug}/zavody/${slugZavodu}/trat`}>Co je s tratí →</Link>
            </>
          ) : (
            <Link href={`/serie/${slug}/zavody/${slugZavodu}/trat`}>
              Trať regaty — mapka a soupis bójí →
            </Link>
          )}
        </p>
      )}

      {/* Odkaz na tabuli. <b>Bez něj je stránka nedostupná</b> — postavil
          jsem ji a zapomněl na ni cestu, což je přesně ta vada, kterou
          mělo zavřít #198 u klonování trati (Filip, 10. 10. 2026:
          „je tam někde na to odkaz nebo tlačítko?").

          Ukazuje se od vypsání dál: u plánované regaty, kde se ještě
          nepřihlašuje ani nejede, by tabule neměla co zobrazit. */}
      {(zavod.stav === "Vypsany" || zavod.stav === "Odjety" || zavod.stav === "Potvrzeny") && (
        <p className="poznamka">
          <Link href={`/serie/${slug}/zavody/${slugZavodu}/tabule`}>
            Tabule na velkou obrazovku →
          </Link>{" "}
          Stav regaty, dojezdy a průběžné pořadí přes celou plochu; obnovuje
          se sama.
        </p>
      )}

      {/* Komunitní akce má stránku kvůli článkům a upoutávkám. Výsledky,
          přihlášené lodě ani pravidla závodu nemá — a prázdné nadpisy by
          tvrdily, že je teprve mít bude. */}
      {akce ? (
        <>
          <p className="poznamka">
            Akce mimo pohár — do{" "}
            <Link href={`/serie/${slug}/poradi`}>průběžného pořadí</Link> se
            nepočítá.
          </p>
          {clanky && clanky.length > 0 ? (
            <>
              <h2>Novinky k akci</h2>
              <VypisNovinek serie={slug} clanky={clanky} />
            </>
          ) : (
            <p className="prazdno">K akci zatím nic nevyšlo.</p>
          )}
          {maObsah(zavod.medailonek) && <Medailonek poradatel={zavod.medailonek} />}
        </>
      ) : (
        <>
          <h2>Výsledky</h2>
          {zavod.vysledkySkryte ? (
            <>
              {/* Ročník, u kterého se výsledky jednotlivých regat veřejně
                  neukazují. Bez téhle věty vypadá odjetá regata jako ta, co
                  se nejela — a to je horší než mlčet nahlas. Pořadí seriálu
                  veřejné zůstává, proto na něj odkaz. */}
              <p className="prazdno">
                Výsledky jednotlivých regat tohohle ročníku nejsou zveřejněné —
                vznikaly ručně a jsou v nich nesrovnalosti. Platí{" "}
                <Link href={`/serie/${slug}/poradi`}>konečné pořadí seriálu</Link>.
              </p>
              <PrihlaseneLode lode={zavod.lode} trida={trida} adresa={naTridu} />
            </>
          ) : radky.length === 0 ? (
            <>
              <p className="prazdno">{ProcNejsouVysledky(zavod.stav)}</p>
              <PrihlaseneLode
                lode={zavod.lode}
                trida={trida}
                adresa={naTridu}
                prihlaska={prihlasuje ? naPrihlasku : undefined}
              />
            </>
          ) : (
            <>
              <TabyTrid kategorie={kategorie} aktivni={aktivni} adresa={naTridu} />
              <NadpisTridy kategorie={kategorie} aktivni={aktivni} />
              <Tabulka kategorie={aktivni} radky={videt} rozjizdky={zavod.rozjizdky} />
            </>
          )}
          {radky.length > 0 && prihlasuje && (
            <p className="poznamka">
              <Link href={naPrihlasku}>Přihlásit loď →</Link>
            </p>
          )}

          {/* Výsledky u regaty, která není vedená jako odjetá, do poháru
              nejdou — průběžné pořadí počítá jen z odjetých. Bez téhle věty
              by se čtenář marně sháněl po bodech, které v tabulce seriálu
              nejsou. */}
          {radky.length > 0 && zavod.stav !== "Odjety" && (
            <p className="poznamka">
              Regata není vedená jako odjetá, takže se tyhle výsledky do
              průběžného pořadí seriálu nepočítají —{" "}
              <Link href={`/serie/${slug}/poradi`}>co v pořadí je</Link>.
            </p>
          )}

          {radky.length > 0 && (
            <p className="poznamka">
              {aktivni === CELKEM
                ? "Čísla v rozjížďkách jsou body — pořadí v celém poli, bez ohledu na kategorii."
                : "Čísla v rozjížďkách jsou body — pořadí v této kategorii, ne v celém poli."}
              {zavod.pocetSkrtu > 0 && " Škrtnutá rozjížďka je přeškrtnutá a do součtu se nepočítá."}
              {zavod.rozjizdky.some((r) => !r.doSerie) && " Rozjížďka s * se nepočítá do poháru."}{" "}
              <Link href="/pravidla">Jak se počítají body</Link>
            </p>
          )}

          {clanky && clanky.length > 0 && (
            <>
              <h2>Novinky regaty</h2>
              <VypisNovinek serie={slug} clanky={clanky} />
            </>
          )}

          {/* Pořadatel před pravidly: kdo chce jet, hledá nejdřív, kdo to
              pořádá a kam se ozvat; škrty a koeficient čte ten, kdo už jel. */}
          {maObsah(zavod.medailonek) && <Medailonek poradatel={zavod.medailonek} />}

          {!zavod.vysledkySkryte && <SekcePravidla zavod={zavod} serie={slug} />}
        </>
      )}
    </Boky>
  );
}
