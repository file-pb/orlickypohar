import Link from "next/link";
import { notFound } from "next/navigation";
import {
  nactiClanky,
  nactiVerejnouTrat,
  nactiZavod,
  type BodyVRozjizdce,
  type Rozjizdka,
  type UcastLodi,
  type Vysledek,
  type ZavodDetail,
  ApiNedostupne,
} from "@/lib/api";
import { Vypadek } from "@/app/vypadek";
import { ProcNejsouVysledky, Stav } from "@/app/stav";
import { datum, datumClanku } from "@/app/datum";
import { VypisNovinek } from "@/app/novinky";
import { Drobecky } from "@/app/drobecky";
import { Boky } from "@/app/boky";
import { CELKEM, NadpisTridy, TabyTrid, vyberTridu } from "@/app/tridy";
import { Medailonek, maObsah } from "@/app/medailonek";
import { nactiJa } from "@/lib/ja";
import { polozkyZastavky, prava, roleVRocniku } from "@/lib/co-smim";

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

/** Jeden řádek tabulky: loď, její body a co v které rozjížďce dokázala. */
type Radek = {
  lod: string;
  kategorie: string;
  kormidelnik: string | null;
  body: number;
  poradi: number;
  bunky: (Bunka | undefined)[];
};

type Bunka = { vysledek?: Vysledek; body?: BodyVRozjizdce };

/**
 * API vydává výsledky po rozjížďkách, protože tak vznikají. Číst se ale musí
 * po lodích — divák hledá svoji loď, ne třetí rozjížďku. Převod je tady,
 * ne v API: je to věc zobrazení, a mobilní appka bude chtít jiné.
 *
 * Body a pořadí se ale <b>nepočítají</b> — ty vydává API. Dokud počítání
 * neexistovalo, sčítal si je web sám; teď by se ta dvě čísla při první změně
 * pravidla rozešla a hádalo by se, které je pravda.
 */
function naRadky(zavod: ZavodDetail, poradi = zavod.poradi): Radek[] {
  const vysledky = new Map<string, Map<number, Vysledek>>();
  for (const r of zavod.rozjizdky)
    for (const v of r.vysledky) {
      if (!vysledky.has(v.lod)) vysledky.set(v.lod, new Map());
      vysledky.get(v.lod)!.set(r.cislo, v);
    }

  const kormidelnici = new Map(
    [...vysledky].map(([lod, podleCisla]) => [lod, [...podleCisla.values()][0].kormidelnik]),
  );

  return poradi
    .map((v) => ({
      lod: v.lod,
      kategorie: v.kategorie,
      kormidelnik: kormidelnici.get(v.lod) ?? null,
      body: v.body,
      poradi: v.poradi,
      bunky: zavod.rozjizdky.map((r) => {
        const vysledek = vysledky.get(v.lod)?.get(r.cislo);
        const body = v.rozjizdky.find((b) => b.cislo === r.cislo);
        return vysledek || body ? { vysledek, body } : undefined;
      }),
    }))
    .sort((a, b) => a.poradi - b.poradi);
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
    if (e instanceof ApiNedostupne) return <Vypadek />;
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

  // Cesta do správy rovnou odsud (Filip, 9. 10. 2026: „klidně ať do správy
  // mohu ze zastávky, když na to mám práva"). Veřejná stránka regaty je
  // místo, kde pořadatel stejně stojí — a dřív z ní do své práce nevedlo
  // nic, muselo se přes nabídku účtu a rozcestník.
  //
  // Na cache to nemá vliv: mikrocache před webem pouští požadavek s cookie
  // sezení mimo cache (`deploy/cache/default.conf`, mapa `$sezeni`), takže
  // se tenhle rámeček nemůže uložit a vydat někomu jinému.
  const { ja } = await nactiJa();
  const udelena = prava(ja);
  const maRoli = roleVRocniku(udelena, slug).length > 0;
  // Komunitní akce výsledky ani přihlášky nemá; vede z ní jen rozcestník.
  const prace = akce ? [] : polozkyZastavky(udelena, slug, slugZavodu);

  const aktivni = vyberTridu(kategorie, trida);
  const videt = aktivni === CELKEM ? radkyCelkem : radky.filter((r) => r.kategorie === aktivni);

  return (
    <Boky serie={slug}>
      <Drobecky
        cesta={[
          { text: "Domů", kam: "/" },
          { text: "Ročník", kam: `/serie/${slug}` },
          { text: zavod.nazev },
        ]}
      />
      <h1>
        <span className={zavod.stav === "Zruseny" ? "skrtnute" : undefined}>{zavod.nazev}</span>{" "}
        <Stav stav={zavod.stav} akce={akce} />
      </h1>
      <p className="podtitulek">
        {akce && "Komunitní akce · "}
        {datum(zavod.datum, zavod.datumKonce)}
        {zavod.poradatel &&
          (maObsah(zavod.medailonek) ? (
            // Jméno vede na medailonek níž na stránce — tam je web i kontakt.
            <>
              {" · pořádá "}
              <a href="#poradatel">{zavod.poradatel}</a>
            </>
          ) : (
            ` · pořádá ${zavod.poradatel}`
          ))}
        {/* Přesun není vlastní stav — přesunutá regata je pořád plánovaná,
            jen jindy. Termín, na který se lidé chystali, ale nemá smysl
            zahodit. */}
        {zavod.puvodniDatum && (
          <span className="presun"> · přesunuto z {datum(zavod.puvodniDatum)}</span>
        )}
      </p>

      {maRoli && (
        <p className="do-spravy">
          {prace.length > 0 ? (
            <>
              <b>Tuhle regatu spravuješ.</b>{" "}
              {prace.map((p, i) => (
                <span key={p.kam}>
                  {i > 0 && " · "}
                  <Link href={p.kam}>{p.kratky ?? p.nazev} →</Link>
                </span>
              ))}
              {" · "}
              <Link href={`/sprava/${slug}#${slugZavodu}`}>vše k regatě →</Link>
            </>
          ) : (
            <>
              <b>V tomhle ročníku máš roli.</b>{" "}
              <Link href={`/sprava/${slug}`}>Správa ročníku →</Link>
            </>
          )}
        </p>
      )}

      {/* Plachetní směrnice hned pod hlavičkou: je to dokument, podle kterého
          se jede, a appka i web jsou oficiální vývěska (plán, oddíl *Appka je
          oficiální vývěska*). Starší verze zůstávají k nahlédnutí — co bylo
          vyvěšené, musí jít doložit. */}
      {zavod.smernice && zavod.smernice.length > 0 && (
        <section className="smernice">
          <h2>Plachetní směrnice</h2>
          <p>
            <a href={zavod.smernice[0].adresa} target="_blank" rel="noopener noreferrer">
              {zavod.smernice[0].nazev}
            </a>{" "}
            <span className="stitek">verze {zavod.smernice[0].verze}</span>
            <span className="detail">
              {" vyvěšeno "}
              {datumClanku(zavod.smernice[0].vyveseneV)}
              {zavod.smernice[0].poznamka && ` · ${zavod.smernice[0].poznamka}`}
            </span>
          </p>
          {zavod.smernice.length > 1 && (
            <details>
              <summary>Starší verze ({zavod.smernice.length - 1})</summary>
              <ul className="seznam">
                {zavod.smernice.slice(1).map((s) => (
                  <li key={s.verze}>
                    <a href={s.adresa} target="_blank" rel="noopener noreferrer">
                      {s.nazev}
                    </a>{" "}
                    <span className="stitek">verze {s.verze}</span>
                    <span className="detail">
                      {datumClanku(s.vyveseneV)}
                      {s.poznamka && ` · ${s.poznamka}`}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

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
              neukazují. Bez téhle věty vypadá odjetá regata jako ta, co se
              nejela — a to je horší než mlčet nahlas. Pořadí seriálu veřejné
              zůstává, proto na něj odkaz. */}
          <p className="prazdno">
            Výsledky jednotlivých regat tohohle ročníku nejsou zveřejněné —
            vznikaly ručně a jsou v nich nesrovnalosti. Platí{" "}
            <Link href={`/serie/${slug}/poradi`}>konečné pořadí seriálu</Link>.
          </p>
          <PrihlaseneLode
            lode={zavod.lode}
            trida={trida}
            adresa={(k) => `/serie/${slug}/zavody/${slugZavodu}?trida=${encodeURIComponent(k)}`}
          />
        </>
      ) : radky.length === 0 ? (
        <>
          <p className="prazdno">{ProcNejsouVysledky(zavod.stav)}</p>
          <PrihlaseneLode
            lode={zavod.lode}
            trida={trida}
            adresa={(k) => `/serie/${slug}/zavody/${slugZavodu}?trida=${encodeURIComponent(k)}`}
            prihlaska={
              zavod.stav === "Vypsany" || zavod.stav === "Odjety"
                ? `/serie/${slug}/zavody/${slugZavodu}/prihlaska`
                : undefined
            }
          />
        </>
      ) : (
        <>
          <TabyTrid
            kategorie={kategorie}
            aktivni={aktivni}
            adresa={(k) => `/serie/${slug}/zavody/${slugZavodu}?trida=${encodeURIComponent(k)}`}
          />
          <NadpisTridy kategorie={kategorie} aktivni={aktivni} />
          <Tabulka kategorie={aktivni} radky={videt} rozjizdky={zavod.rozjizdky} />
        </>
      )}
      {/* Přihlásit se dá i k regatě s výsledky: loď se často domluví
          telefonem na startu a zapíše se dodatečně (Filip, 17. 9. 2026). */}
      {radky.length > 0 && (zavod.stav === "Vypsany" || zavod.stav === "Odjety") && (
        <p className="poznamka">
          <Link href={`/serie/${slug}/zavody/${slugZavodu}/prihlaska`}>Přihlásit loď →</Link>
        </p>
      )}

      {/* Výsledky u regaty, která není vedená jako odjetá, do poháru
          nejdou — průběžné pořadí počítá jen z odjetých. Bez téhle věty by
          se čtenář marně sháněl po bodech, které v tabulce seriálu nejsou. */}
      {radky.length > 0 && zavod.stav !== "Odjety" && (
        <p className="poznamka">
          Regata není vedená jako odjetá, takže se tyhle výsledky do průběžného
          pořadí seriálu nepočítají —{" "}
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

      {/* Pravidla se vydávají kvůli tomu, aby šlo výsledky zkontrolovat.
          Bez výsledků nemají co doprovázet — a „Do poháru" by muselo buď
          prozradit počet rozjížděk, nebo tvrdit, že se žádná nejela. */}
      {!zavod.vysledkySkryte && (
        <>
      <h2>Pravidla závodu</h2>
      <dl className="pravidla">
        <dt>Vyhodnocení</dt>
        <dd>
          {zavod.vyhodnoceni === "CelePole"
            ? "celé pole dohromady"
            : zavod.vyhodnoceni === "Oboje"
              ? "celé pole i kategorie"
              : "po kategoriích"}
        </dd>
        <dt>Škrty</dt>
        <dd>{zavod.pocetSkrtu === 0 ? "žádné" : `nejhorších ${zavod.pocetSkrtu}`}</dd>
        <dt>Do poháru</dt>
        <dd>
          {zavod.rozjizdky.length === 0
            ? "zatím se nejela žádná rozjížďka"
            : `${zavod.rozjizdky.filter((r) => r.doSerie).length} z ${zavod.rozjizdky.length} rozjížděk`}
          {zavod.koeficientDoSerie !== 1 && `, koeficient ${zavod.koeficientDoSerie}`}
        </dd>
      </dl>
      <p className="poznamka">
        Vítěz závodu má jeden bod. Do průběžného pořadí seriálu jde pořadí v kategorii,
        ne tenhle součet —{" "}
        <Link href={`/serie/${slug}/poradi`}>průběžné pořadí je vedle</Link>.
      </p>
        </>
      )}
        </>
      )}
    </Boky>
  );
}

/**
 * Seznam lodí místo výsledků. Regata, která se teprve pojede, jinak nemá
 * co ukázat — a kdo se chystá jet, je to jediné, co je o ní v tu chvíli známo.
 */
function PrihlaseneLode({
  lode,
  trida,
  adresa,
  prihlaska,
}: {
  lode: UcastLodi[];
  trida?: string;
  adresa: (trida: string) => string;
  /** Odkaz na veřejnou přihlášku, když se na regatu přihlašuje. */
  prihlaska?: string;
}) {
  // Vypsaná regata bez jediné lodi má aspoň pozvat k přihlášce.
  if (lode.length === 0)
    return prihlaska ? (
      <p className="poznamka">
        <Link href={prihlaska}>Přihlásit loď →</Link>
      </p>
    ) : null;

  // Třídy v taby jako u výsledků (Filip, 15. 9. 2026) — seznam lodí na
  // regatě, která se teprve pojede, je jinak stejně dlouhý svitek.
  const kategorie = [...new Set(lode.map((l) => l.kategorie))];
  const aktivni = vyberTridu(kategorie, trida);

  return (
    <>
      <h2>Přihlášené lodě</h2>
      <p className="podtitulek" style={{ margin: "0 0 1rem" }}>
        {lode.length} {lode.length === 1 ? "loď" : lode.length < 5 ? "lodě" : "lodí"}
        {prihlaska && (
          <>
            {" · "}
            <Link href={prihlaska}>Přihlásit loď →</Link>
          </>
        )}
      </p>
      <TabyTrid kategorie={kategorie} aktivni={aktivni} adresa={adresa} />
      <NadpisTridy kategorie={kategorie} aktivni={aktivni} />
      {[aktivni].map((k) => (
        <div key={k} style={{ marginBottom: "1.5rem" }}>
          <div className="tabulka-obal">
            <table>
              <thead>
                <tr>
                  <th className="lod">Loď</th>
                  <th style={{ textAlign: "left" }}>Kormidelník</th>
                </tr>
              </thead>
              <tbody>
                {lode
                  .filter((l) => l.kategorie === k)
                  .map((l) => (
                    <tr key={l.lod}>
                      <td className="lod">
                        {l.lod}
                        {/* Přihlášená, ale nepotvrzená: pořadatel o ní ví,
                            jistá ještě není. Starší API pole nemá — pak platí. */}
                        {l.vyloucena ? (
                          <div className="majitel">vyloučená ze závodu</div>
                        ) : (
                          l.potvrzena === false && <div className="majitel">čeká na potvrzení</div>
                        )}
                      </td>
                      <td style={{ textAlign: "left" }}>{l.kormidelnik ?? "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}

function Tabulka({
  kategorie,
  radky,
  rozjizdky,
}: {
  kategorie: string;
  radky: Radek[];
  rozjizdky: Rozjizdka[];
}) {
  return (
    // Třídu nese tab nad tabulkou. Když je třída jediná a taby nejsou,
    // dá nadpis stránka (`NadpisTridy`) — jinak by nebylo poznat, čí jsou
    // to výsledky.
    <div style={{ marginBottom: "1.5rem" }}>
      <div className="tabulka-obal">
        <table>
          <thead>
            <tr>
              <th className="lod">Loď</th>
              {/* Body hned za jménem, ne na konci řádku. Na telefonu se
                  tabulka posouvá vodorovně a číslo, kvůli kterému se divák
                  dívá, musí zůstat vidět bez posouvání. */}
              <th className="body">Body</th>
              {rozjizdky.map((r) => (
                <th key={r.cislo} className={r.doSerie ? undefined : "mimo-serii"}>
                  {r.cislo}.{!r.doSerie && <span title="nepočítá se do poháru">*</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {radky.map((radek) => (
              <tr key={radek.lod}>
                <td className="lod">
                  <span className="poradi-cislo">{radek.poradi}.</span> {radek.lod}
                  {/* V celém poli je vidět, ze které kategorie loď je —
                      jinde ji nese tab nad tabulkou. */}
                  {(radek.kormidelnik || kategorie === CELKEM) && (
                    <div className="majitel">
                      {radek.kormidelnik}
                      {kategorie === CELKEM && (
                        <span className="stitek kategorie-lodi">{radek.kategorie}</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="body">{radek.body}</td>
                {radek.bunky.map((b, i) => (
                  <td key={i} className={b?.body?.skrtnuto ? "cislo skrtnuto" : "cislo"}>
                    {bunka(b)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function bunka(b?: Bunka) {
  if (!b?.body) return "—";
  return (
    <>
      {b.body.body}
      {b.vysledek?.kod && <span className="znacka">{b.vysledek.kod.toUpperCase()}</span>}
    </>
  );
}
