"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Snimek } from "@/lib/tabule";
import { Znak } from "@/app/logo";
import { NazevZavodu } from "@/app/tabule-nazev";
import { Atributy } from "./atributy";
import { Karusel, type Panel } from "./karusel";
import { StavovyProuzek } from "./semafor";
import { MapkaTrati } from "@/app/mapka-trati";
import { ZnakTridy } from "@/app/tridy";
import { udalosti, type Udalost } from "@/lib/tabule-udalosti";

/**
 * Tabule, která se obnovuje sama a přežije výpadek.
 *
 * <b>Drží poslední dobrý snímek</b> (plán, *Tabule do hospody*): visí na
 * telce, kterou nikdo neobsluhuje, takže „nedaří se načíst" by znamenalo
 * prázdnou obrazovku až do rána. Když obnovení selže, zůstane to, co
 * bylo, a jen se u toho napíše, jak je to staré.
 *
 * <b>Stáří počítá prohlížeč</b>, ne server. Mikrocache před webem drží
 * odpověď deset vteřin, takže serverem vypsané „před 8 s" by v ní zmrzlo
 * a lhalo o deset vteřin plus dobu vykreslení.
 */
/**
 * Jak často si obrazovka říká o nový snímek.
 *
 * <b>Pět vteřin, ne dvacet</b> (Filip, 20. 10. 2026: *„ten modal po dojetí
 * lodě… by měl přijít ihned po projetí cílem"*). Dvacet vteřin plus
 * minutová cache v `nactiZavod` znamenalo, že dojezd se ohlásil se
 * zpožděním, které vypadalo náhodně. Cache je pryč a tohle je zbytek:
 * mezi klepnutím v cíli a kartou na tabuli má být vteřin pár, ne půl
 * minuty.
 *
 * Dotazů na API to nepřidá: mikrocache před webem drží odpověď deset
 * vteřin pro všechny, takže se stejně ptá nanejvýš jednou za deset.
 */
const OBNOVA_MS = 5_000;

export function Obrazovka({
  serie,
  zavod,
  prvni,
}: {
  serie: string;
  zavod: string;
  prvni: Snimek;
}) {
  const [snimek, setSnimek] = useState(prvni);
  const [ted, setTed] = useState(() => Date.now());
  /**
   * Fronta alertů doprostřed obrazovky. <b>Fronta, ne jeden</b>: v cíli
   * dojede několik lodí během jednoho obnovení, a překrýt je navzájem by
   * znamenalo, že se dvě z nich na televizi vůbec neobjeví.
   */
  const [fronta, setFronta] = useState<Udalost[]>([]);
  /**
   * Snímek, proti kterému se porovnává. <b>Ref, ne stav</b>: čte se
   * uvnitř obnovovací smyčky, která se nesmí restartovat pokaždé, když
   * dorazí nová data.
   */
  const posledni = useRef(prvni);

  useEffect(() => {
    const adresa = `/serie/${encodeURIComponent(serie)}/zavody/${encodeURIComponent(zavod)}/tabule/data`;

    const nacti = async () => {
      try {
        const odpoved = await fetch(adresa, { cache: "no-store" });
        if (odpoved.ok) {
          const novy = (await odpoved.json()) as Snimek;
          // Snímek ze starší verze webu se zahodí. Mikrokeš před webem
          // drží odpověď deset vteřin, takže při nasazení může do nového
          // prohlížeče dorazit tělo bez polí, která komponenta čeká —
          // a tabule by spadla místo toho, aby počkala na další obnovu.
          if (!Array.isArray(novy?.tabule) || !novy?.zavod) return;

          // Alerty se počítají proti snímku, který právě visí na
          // obrazovce — ne proti tomu, co bylo při načtení stránky.
          //
          // <b>Mimo updater `setSnimek`.</b> Dokud se počítaly uvnitř něj,
          // volalo se v updateru `setFronta` — vedlejší efekt ve stavové
          // funkci. React updater spouští i víckrát, takže se každá
          // událost zařadila dvakrát. Druhá kopie měla tentýž klíč, React
          // element recykloval, animace se nespustila znovu a karta
          // zůstala v DOM neviditelná — a protože fronta se nehnula,
          // nevyjel od té chvíle **žádný další alert**. Změřeno 15. 10.
          // 2026: hlava fronty stála 37 s, zatímco tabule běžela dál.
          const nove = udalosti(posledni.current, novy);
          posledni.current = novy;
          setSnimek(novy);
          if (nove.length > 0)
            setFronta((f) => [...f, ...nove.filter((u) => !f.some((x) => x.klic === u.klic))]);
        }
        // Neúspěch se schválně nikam nepíše: tabule drží, co má.
      } catch {
        // Totéž u spadlé sítě.
      }
    };

    const obnova = setInterval(nacti, OBNOVA_MS);
    // Vteřinový tik jen kvůli stáří; data se tahají dvacetkrát méně často.
    const tik = setInterval(() => setTed(Date.now()), 1000);
    return () => {
      clearInterval(obnova);
      clearInterval(tik);
    };
  }, [serie, zavod]);

  const stari = Math.max(0, Math.round((ted - Date.parse(snimek.kdy)) / 1000));

  return (
    <div className="tabule">
      {/* <b>Jediná klikatelná věc na obrazovce</b> (Filip, 15. 10. 2026:
          *„tam stačí jen hlavní logo, na které když se klepne, tak jsme
          zpět na hlavní stránce webu… jinak ať tam nic neotravuje"*).
          Hlavička webu se na tabuli schovává v CSS, tohle je náhrada za
          cestu zpátky — bez ní by se z televize nedalo odejít jinak než
          adresou. */}
      <Alert udalost={fronta[0]} hotovo={() => setFronta((f) => f.slice(1))} />
      <StavovyProuzek snimek={snimek} ted={ted} />
      {/* Logo vlevo, název uprostřed, stav vpravo (Filip, 15. 10. 2026).
          Jen kulatá značka: nápis „Orlická série" vedle ní by stál vedle
          názvu závodu v téže grafice a oba by se přebíjely. */}
      <header className="vrch">
        <Link className="odchod" href="/" aria-label="Zpět na Orlický pohár">
          <Znak />
        </Link>
        <h1>
          <NazevZavodu text={snimek.nazev} />
        </h1>
        <div className="stav">
          <p className={`stitek stav-${snimek.stav.toLowerCase()}`}>{STAVY[snimek.stav]}</p>
          <p className={stari > 120 ? "stari zastarale" : "stari"}>
            {stari < 60 ? `data před ${stari} s` : `data stará ${Math.round(stari / 60)} min`}
          </p>
        </div>
        {/* Atributy jedou v témž pruhu jako název (Filip, 24. 10. 2026:
            *„toto všechno dej nějak do jednoho pruhu nahoře, aby nám to
            nebralo tolik míst"*). Samostatný pás dlaždic pod hlavičkou
            ukrajoval desetinu obrazovky na pět čísel, která se vejdou na
            řádek. */}
        <Atributy snimek={snimek} />
      </header>

      {/* <b>Nepodepsaná čísla se musí přiznat</b> (Filip, 9. 10. 2026:
          *„tabule nahoře řekne, že hodnoty jsou informativní a jejich
          platnost potvrzuje, případně mění rozhodčí"*). Bez téhle věty
          vypadá předběžné pořadí jako hotové a hospoda si zapamatuje
          výsledek, který se ještě změní. */}
      {snimek.procesniDej && !snimek.vysledkySkryte && (
        <p className="hlaska dej">
          <b>Průběžné výsledky.</b> Čísla jsou informativní — jejich
          platnost potvrzuje, případně mění rozhodčí. U každé rozjížďky je
          vidět, jak daleko je zápis.
        </p>
      )}

      {snimek.vysledkySkryte && (
        <p className="hlaska">
          Ročník má výsledky zatím skryté, takže tady čísla nejsou. Tabule
          ukazuje jen to, co je venku — není to cesta okolo.
        </p>
      )}

      <div className="sloupce">
        {/* Rozjížďky a lodě na startu se střídají v jednom sloupci
            (Filip, 15. 10. 2026: *„na startu a rozjížďky se dá udělat
            karuselem taky a přidat tam jenom stavy, tím se ušetří jedna
            tabulka"*). Rozjížďka tu nese jen stav — kdo dojel, říká
            widget vpravo a alert uprostřed. */}
        <Karusel panely={polePanely(snimek)} />
        <Karusel panely={tridyPanely(snimek)} />

        <div className="sloupecek">
          {snimek.mapa.length > 0 && (
            <div className="mapka-mala">
              <MapkaTrati prvky={snimek.mapa} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Jména stavů. <b>Opsaná z výčtu, ne z hlavy</b> — napsal jsem nejdřív
 * „Dojeta" a na tabuli se vypsalo syrové „Dokoncena", protože takhle se
 * ta hodnota doopravdy jmenuje.
 */
const STAVY: Record<Snimek["stav"], string> = {
  Planovany: "plánováno",
  Vypsany: "vypsáno",
  Odjety: "odjeto",
  Potvrzeny: "potvrzeno",
  Zruseny: "zrušeno",
};

const STAVY_ROZJIZDEK: Record<Snimek["rozjizdky"][number]["stav"], string> = {
  Planovana: "čeká",
  Probiha: "jede se",
  Dokoncena: "dojeto",
  Zrusena: "zrušena",
};

/** Jak dlouho alert visí, než se usadí. Dost na přečtení přes místnost. */
const ALERT_MS = 4500;

/**
 * Alert doprostřed obrazovky (Filip, 15. 10. 2026: *„ideálně vyanimovat
 * modal na střed a pak tu informaci vrátit na její místečko v prvku"*).
 *
 * <b>Usazení dělá animace, ne přesun v DOM.</b> Karta se na konci zmenší
 * a odjede k místu, kam informace patří. Opravdu ji tam přenést by
 * znamenalo měřit polohu cíle a dopočítávat dráhu — na televizi, která se
 * nehýbe, je to práce navíc za výsledek, který nikdo nerozezná.
 *
 * <b>Bez tlačítka na zavření.</b> Panel je pasivní: alert zmizí sám
 * a další z fronty nastoupí po něm.
 */
function Alert({ udalost, hotovo }: { udalost?: Udalost; hotovo: () => void }) {
  useEffect(() => {
    if (!udalost) return;
    const casovac = setTimeout(hotovo, ALERT_MS);
    return () => clearTimeout(casovac);
    // Časovač má běžet od chvíle, kdy se objevila tahle událost, takže
    // závisí jen na jejím klíči — `hotovo` se mezi vykresleními mění.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [udalost?.klic]);

  if (!udalost) return null;

  return (
    <>
      {/* Clona pod kartou. Televize visí v hospodě, kde se na ni nedívá
          každý pořád — ztmavení na vteřinu je to, co pohled přitáhne. */}
      <div className="tabule-clona" key={`clona-${udalost.klic}`} aria-hidden="true" />
      <div className={`tabule-alert ${udalost.druh}`} role="status" key={udalost.klic}>
        {/* Nadpisek říká, o jaký druh zprávy jde, dřív než divák dočte
            co se stalo — barva sama o sobě význam nenese, komu barvy
            splývají, ten by měl jen „LUNA" bez kontextu. */}
        <i className="druh">{NADPISKY[udalost.druh]}</i>
        <b>{udalost.titulek}</b>
        {udalost.detail && <span>{udalost.detail}</span>}
      </div>
    </>
  );
}

/** Nadpisek nad zprávou. Jedno slovo, verzálky, v barvě druhu. */
const NADPISKY: Record<Udalost["druh"], string> = {
  start: "Start",
  dojezd: "V cíli",
  dokonceno: "Rozjížďka",
  zrusena: "Zrušeno",
  zavod: "Regata",
  trat: "Trať",
  ceka: "Čeká se",
  lod: "Na startu",
};

/** Panely levého sloupce: co se jede a kdo je na startu. */
function polePanely(snimek: Snimek): Panel[] {
  return [
    {
      klic: "rozjizdky",
      nadpis: "Rozjížďky",
      obsah:
        snimek.rozjizdky.length === 0 ? (
          <p className="prazdno">Zatím žádná.</p>
        ) : (
          <ul className="stavy">
            {snimek.rozjizdky.map((r) => (
              <li key={r.cislo}>
                <b>{r.cislo}.</b>
                <span className={`stitek stav-rozjizdky ${r.stav.toLowerCase()}`}>
                  {STAVY_ROZJIZDEK[r.stav]}
                </span>
                {!r.doSerie && <span className="stitek">mimo pohár</span>}
                {/* Jen u regaty s procesním dějem: jinde jsou venku pouze
                    publikovaná čísla a „potvrzeno" u všech by byl šum. */}
                {snimek.procesniDej && r.poradi.length > 0 && r.stavVysledku && (
                  <span className={`stitek zapis-${r.stavVysledku.toLowerCase()}`}>
                    {ZAPIS[r.stavVysledku]}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ),
    },
    // <b>Startovní listina na tabuli není</b> (Filip, 24. 10. 2026:
    // *„na startu nevím, jestli má smysl, když tam máme pořadí, tak je
    // to jasný"*). Pořadí nese tytéž lodě a navíc říká, jak jim to jde;
    // dva seznamy týchž jmen vedle sebe jsou jen víc čtení.
  ];
}

/**
 * Jak se stav zápisu jmenuje na tabuli. <b>Divácká slova, ne úřední</b>:
 * „ověřeno" a „schváleno" jsou dva podpisy, které u piva nikdo nerozliší,
 * takže obojí říká totéž — někdo se na to už díval. Potvrzené je hotové,
 * návrh je čerstvý z vody.
 */
const ZAPIS: Record<NonNullable<Snimek["rozjizdky"][number]["stavVysledku"]>, string> = {
  Navrzeno: "čerstvé z vody",
  Overeno: "u rozhodčího",
  Schvaleno: "u rozhodčího",
  Potvrzeno: "potvrzeno",
  KRevizi: "přepisuje se",
  Eliminovano: "zrušeno",
};

/**
 * Kolik řádků panel unese, aby zůstaly čitelné přes místnost. Totéž
 * číslo jako `NEJVIC` v `lib/tabule.ts`, odkud se krátí pořadí — kdyby
 * se rozešla, jeden sloupec by se stlačil a druhý ne.
 */
const NA_STRANKU = 10;

/** Rozdělí seznam na části po `kolik`. Prázdný seznam dá jednu prázdnou. */
function stranky<T>(vse: T[], kolik: number): T[][] {
  if (vse.length === 0) return [[]];
  const ven: T[][] = [];
  for (let i = 0; i < vse.length; i += kolik) ven.push(vse.slice(i, i + kolik));
  return ven;
}

/** Panely pořadí: jeden na třídu, plus celkové, když se počítá. */
function tridyPanely(snimek: Snimek): Panel[] {
  return snimek.tabule.map((t) => ({
    klic: t.kategorie,
    nadpis: (
      <>
        <ZnakTridy nazev={t.kategorie} />
        {t.kategorie === "Celkem" ? "Celkové pořadí" : t.kategorie}
      </>
    ),
    obsah:
      t.lode.length === 0 ? (
        <p className="prazdno">Zatím se nejelo.</p>
      ) : (
        <>
          <ol className="poradi">
            {t.lode.map((p) => (
              <li key={p.lod}>
                <b>{p.misto}.</b> {p.lod}
                <span className="body">{p.body}</span>
              </li>
            ))}
          </ol>
          {t.dalsich > 0 && <p className="dalsi">{jesteLodi(t.dalsich)}</p>}
        </>
      ),
  }));
}

/**
 * „A ještě tři lodě" pod zkráceným pořadím. Na telku se víc než deset
 * řádků nevejde, ale pole dvanácti lodí nesmí vypadat jako pole deseti.
 */
function jesteLodi(kolik: number) {
  if (kolik === 1) return "a ještě jedna loď";
  return `a ještě ${kolik} ${kolik < 5 ? "lodě" : "lodí"}`;
}
