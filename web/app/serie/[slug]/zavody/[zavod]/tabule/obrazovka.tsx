"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { PoradiKategorie } from "@/lib/api";
import type { Snimek } from "@/lib/tabule";
import { Znak } from "@/app/logo";
import { NazevZavodu } from "@/app/tabule-nazev";
import { Teaser } from "./teaser";
import { Vysledky } from "./vysledky";
import { Karusel, type Panel } from "./karusel";
import { PoradiTrid } from "./poradi-tridy";
import { PanylkyRozjizdek } from "./rozjizdky";
import { MapaTrackeru } from "@/app/mapa-trackeru";
import type { VerejnePolohy } from "@/lib/polohy";
import { useStopy } from "@/lib/stopy";
import { pole } from "@/app/nacrt/mapa/plavba";

/**
 * Ukázková rozjížďka — tatáž, jakou ukazuje náčrt.
 *
 * <b>Dočasné, a tabule to u sebe píše.</b> Dokud appka neposílá polohy
 * průběžně, nemá tracker co kreslit, a bez něj se nedá posoudit, co jsme
 * navrhli (Filip, 24. 10. 2026: *„prostě tam ukaž ta data stejně, jako
 * jsi mi pomohl vyladit zadání pro tu předchozí stránku"*). Je to
 * i vlastní trať ukázky, ne trať závodu: po krátké trati o třech prvcích
 * nemá pole kde plout a režie by neměla co střídat.
 *
 * Spočítá se jednou pro celý modul: je deterministická a na každé obnově
 * dat by se jinak generovala znovu.
 */
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
  poradiSerie,
  serieNazev,
}: {
  serie: string;
  zavod: string;
  prvni: Snimek;
  /** Průběžné pořadí celé série. Pásy ho vezou, dokud neběží mapa. */
  poradiSerie?: PoradiKategorie[] | null;
  /** Jak se jmenuje série — nadpis nad pásy, aby se pořadí nepletla. */
  serieNazev?: string | null;
}) {
  const [snimek, setSnimek] = useState(prvni);
  /**
   * Čím karusel točí. <b>Dokud tahle regata nemá odjeto, pořadím série</b>
   * — prázdné panely „zatím se nejelo" zabírají tutéž plochu a neřeknou
   * nic. Jakmile přijde první výsledek, přepne se na regatu: ta je teď
   * ta zajímavější.
   */
  /**
   * Pořadí série jako řádky pro běžící pásy — <b>tytéž pásy, jaké jedou
   * při rozjížďkách</b> (Filip, 26. 10. 2026: *„ten spodní carousel bych
   * udělal podobný jako máme teď na tabuli, to bych neměnil"*). Mění se
   * jen to, co stojí za jménem: v sérii body, na vodě stáří polohy.
   */
  const serieRadky = useMemo(() => {
    if (!poradiSerie?.length) return [];
    return poradiSerie
      .filter((k) => k.kategorie !== "Celkem")
      .flatMap((k, ki) =>
        [...k.lode]
          .sort((a, b) => a.poradiPoSkrtu - b.poradiPoSkrtu)
          .map((l, i) => ({
            id: ki * 1000 + i,
            nazev: l.lod,
            kategorie: k.kategorie,
            stariS: null,
            dojela: false,
            popisek: `${l.bodyPoSkrtu} b`,
          })),
      );
  }, [poradiSerie]);
  const [ted, setTed] = useState(() => Date.now());
  /**
   * Živé polohy, když je regata pouští ven. Dokud nechodí, je na místě
   * mapy teaser se startovní listinou.
   */
  const [polohy, setPolohy] = useState<VerejnePolohy | null>(null);
  /** Okamžik, od kterého mapa počítá čas. První došlá dávka ho určí. */
  const [odkdy, setOdkdy] = useState<number | null>(null);
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

    const adresaPoloh = `/serie/${encodeURIComponent(serie)}/zavody/${encodeURIComponent(zavod)}/tabule/polohy`;

    // Polohy se tahají vedle snímku: mají vlastní cache na API a jiný
    // důvod existence, takže výpadek jednoho nesmí shodit druhé.
    const nactiPolohy = async () => {
      try {
        const odpoved = await fetch(adresaPoloh, { cache: "no-store" });
        if (!odpoved.ok) return;
        const nove = (await odpoved.json()) as VerejnePolohy;
        if (!Array.isArray(nove?.lode)) return;
        setPolohy(nove);
        setOdkdy((o) => o ?? Date.parse(nove.ted));
      } catch {
        // Tabule drží, co má.
      }
    };

    const obnova = setInterval(nacti, OBNOVA_MS);
    const obnovaPoloh = setInterval(() => void nactiPolohy(), OBNOVA_MS);
    void nactiPolohy();
    // Vteřinový tik jen kvůli stáří; data se tahají dvacetkrát méně často.
    const tik = setInterval(() => setTed(Date.now()), 1000);
    return () => {
      clearInterval(obnova);
      clearInterval(obnovaPoloh);
      clearInterval(tik);
    };
  }, [serie, zavod]);

  const zivePolohy = useStopy(polohy?.vysila ? polohy.lode : null, odkdy);
  /**
   * Skutečné lodě se smějí kreslit jen nad skutečnou tratí. Ukázka má
   * vlastní, delší trať — po krátké trati o třech prvcích nemá vymyšlené
   * pole kde plout —, takže bez trati regaty se živé polohy neukazují.
   */
  const trat = snimek.znacky?.length >= 2 ? snimek.znacky : null;
  const skutecne = trat ? zivePolohy : [];

  /**
   * <b>Demo režim</b> (Filip, 26. 10. 2026: *„vpravo dole mít možnost
   * přepnout ji na demo mód, který nám umožní zobrazit si všechny její
   * režimy na simulovaných datech"*). Tabule visí v hospodě a čeká na
   * regatu; aby šlo ukázat, co umí, musí jít její režimy vyvolat ručně.
   *
   * <b>Simulovaná data se nikdy nevydávají za skutečná.</b> Dokud demo
   * běží, je přes obrazovku pruh, který to říká — je to tentýž důvod,
   * proč z ostré tabule zmizely ukázkové plavby.
   */
  const [demo, setDemo] = useState<null | Rezim>(null);
  /**
   * <b>Demo jede po trati té regaty a s jejími loděmi</b> (Filip,
   * 26. 10. 2026: *„vezmi si do simulace třeba trasu jarního větru"*) —
   * jinak by ukazovalo cizí závod a na otázku „jak to bude vypadat u nás"
   * by neodpovědělo.
   *
   * Vlastní trať si bere, jen když ta regatina nestačí: po trati
   * o jednom prvku nemá vymyšlené pole kde plout.
   */
  const ukazka = useMemo(
    () =>
      demo
        ? pole(
            Math.max(6, Math.min(snimek.lode.length || 24, 30)),
            trat ?? undefined,
            snimek.lode.length > 0 ? snimek.lode.map((l) => l.lod) : undefined,
          )
        : null,
    [demo, trat, snimek.lode],
  );
  const zive = demo === "mapa" && ukazka ? ukazka.lode : demo ? [] : skutecne;
  /**
   * <b>Trať za výsledky.</b> Ostrá tabule kreslí tu regatinu, a když ji
   * regata nemá zveřejněnou, nekreslí nic — rozmazaný podklad je ozdoba,
   * ne informace, takže si ho nemá čím vymyslet. V demu ale smysl ztrácí
   * prázdno: tam ukáže trať ukázky, aby bylo vidět, jak podoba vypadá.
   */
  const tratVzadu = demo && ukazka ? ukazka.znacky : trat;

  /**
   * <b>Co tabule zrovna ukazuje.</b> Rozhoduje se na jednom místě, aby
   * se podoby nedaly zapnout dvě naráz — a aby šlo kteroukoli vyvolat
   * v demu (Filip, 26. 10. 2026). Pořadí podmínek je pořadí dne:
   * lodě na vodě přebijí všechno, pak rozhoduje, jestli je po regatě,
   * jestli se už jelo, a nakonec zbyde startovní listina.
   */
  const rezim: Rezim =
    demo ??
    (zive.length > 0
      ? "mapa"
      : snimek.stav === "Odjety" && snimek.rozjizdky.some((r) => r.stav === "Dokoncena")
        ? "po"
        : snimek.rozjizdky.some((r) => r.stav === "Dokoncena")
          ? "mezi"
          : "listina");

  const stari = Math.max(0, Math.round((ted - Date.parse(snimek.kdy)) / 1000));

  /**
   * Události z trackeru do téže fronty jako ty ze zápisu — karta
   * doprostřed obrazovky je jedna a nemá se o co přetahovat (Filip,
   * 24. 10. 2026: *„začni tam zobrazovat ty modaly animované, např. po
   * dojetí nebo swap pořadí"*). Duplicitu hlídá klíč, stejně jako
   * u dojezdů ze zápisu.
   */
  const [poradiLodi, setPoradiLodi] = useState<
    { id: number; nazev: string; kategorie: string; stariS: number | null; dojela: boolean }[]
  >([]);

  const zarad = useCallback((u: Udalost) => {
    setFronta((f) => (f.some((x) => x.klic === u.klic) ? f : [...f, u]));
  }, []);

  /**
   * Kolik z mapy zakrývají panely (Filip, 24. 10. 2026: *„podle mne je
   * schovaná za ostatními komponenty"*).
   *
   * Mapa leží pod horním pruhem i pod karuselem tříd, aby měla tabule
   * pozadí po celé ploše — pole lodí se ale musí vejít do toho, co z ní
   * zbývá vidět. Výšku zná jen tahle obrazovka, protože ji určuje její
   * vlastní CSS (clamp podle šířky televize), takže ji naměří a pošle
   * mapě; natvrdo zapsané číslo by se rozešlo s rozvržením.
   */
  const vrch = useRef<HTMLElement>(null);
  const hlasky = useRef<HTMLDivElement>(null);
  const tridy = useRef<HTMLElement>(null);
  const [odsazeni, setOdsazeni] = useState({ nahore: 0, dole: 0, vrch: 0 });
  const maTridy = poradiLodi.length > 0;
  useEffect(() => {
    const mer = () => {
      // Dvě různá čísla, a plete se to: `vrch` je jen pruh nahoře a
      // odsazuje se podle něj hláška. `nahore` je celý horní blok —
      // pruh i hlášky dohromady — a podle toho se uklízí mapa, aby jí
      // panel s prohozením nevylezl pod text (změřeno 25. 10. 2026).
      const vyskaVrchu = Math.round(vrch.current?.getBoundingClientRect().height ?? 0);
      // Když hláška není, obal se schová (`:empty`) a jeho spodek je
      // nula — bez toho `Math.max` by panel s prohozením vyskočil zpátky
      // pod hlavičku, tedy přesně tam, odkud jsme ho dostávali pryč.
      const spodekHlasek = Math.round(hlasky.current?.getBoundingClientRect().bottom ?? 0);
      const nove = {
        vrch: vyskaVrchu,
        nahore: Math.max(vyskaVrchu, spodekHlasek),
        dole: Math.round(tridy.current?.getBoundingClientRect().height ?? 0),
      };
      setOdsazeni((p) =>
        p.nahore === nove.nahore && p.dole === nove.dole && p.vrch === nove.vrch ? p : nove,
      );
    };
    mer();
    const sleduj = new ResizeObserver(mer);
    if (vrch.current) sleduj.observe(vrch.current);
    if (hlasky.current) sleduj.observe(hlasky.current);
    if (tridy.current) sleduj.observe(tridy.current);
    return () => sleduj.disconnect();
  }, [maTridy]);

  return (
    // Výška hlavičky ven jako proměnná: pruh je `position: absolute`,
    // takže nic pod ním o něm neví. Bez tohohle ležela hláška
    // „Průběžné výsledky…" celá pod ním a nebyla vidět (změřeno
    // 25. 10. 2026 na skutečné televizi — překryv 52 px).
    <div
      className="tabule"
      style={
        {
          "--vrch-vyska": `${odsazeni.vrch}px`,
          "--horni-blok": `${odsazeni.nahore}px`,
          // Kam až smí mapa dolů. Dřív tu stálo `12.6 * --tv` natvrdo,
          // což je o dvacet pixelů víc, než pásy tříd doopravdy měří —
          // a na televizi z toho byla pruh prázdna pod mapou (Filip,
          // 25. 10. 2026). Výšku pásů stejně měříme kvůli výřezu.
          "--dolni-blok": `${odsazeni.dole}px`,
        } as React.CSSProperties
      }
    >
      {/* <b>Jediná klikatelná věc na obrazovce</b> (Filip, 15. 10. 2026:
          *„tam stačí jen hlavní logo, na které když se klepne, tak jsme
          zpět na hlavní stránce webu… jinak ať tam nic neotravuje"*).
          Hlavička webu se na tabuli schovává v CSS, tohle je náhrada za
          cestu zpátky — bez ní by se z televize nedalo odejít jinak než
          adresou. */}
      <Alert udalost={fronta[0]} hotovo={() => setFronta((f) => f.slice(1))} />
      {/* Logo vlevo, název uprostřed, stav vpravo (Filip, 15. 10. 2026).
          Jen kulatá značka: nápis „Orlická série" vedle ní by stál vedle
          názvu závodu v téže grafice a oba by se přebíjely. */}
      {/* <b>Nahoře zůstala jen značka</b> (Filip, 25. 10. 2026: *„logo bych
          chtěl samotné vlevo přímo, možná trochu odstíněné. Název regaty na
          úvod ranku a malý status pod ním"*). Pruh přes celou šířku zmizel
          a s ním i poslední místo, kde se mohlo něco o něco přetlačovat;
          mapa tím dostala plochu až k hornímu okraji. */}
      <header className="vrch" ref={vrch}>
        <Link className="odchod" href="/" aria-label="Zpět na Orlický pohár">
          <Znak />
        </Link>
        {/* Stav rozjížďky se vlajkou patří do téhož pruhu jako všechno
            ostatní (Filip, 24. 10. 2026) — dva pásy nad sebou braly dvakrát
            tolik místa než jeden. */}
        {/* <b>V pruhu zůstává jen regata a co se zrovna děje</b> (Filip,
            25. 10. 2026: *„vlastně nám stačí informace o aktuální regatě.
            Pak nějaká malá informace o rozjížďce a jejím stavu, nebo
            aktuálním statusu"*).

            Je to obrat proti 24. 10., kdy se do pruhu naopak všechno
            slučovalo — a stojí za tím zkušenost z televize: přeplněný
            pruh byl příčinou překryvů. Počet rozjížděk, lodí na startu
            i stav ročníku se dají přečíst z pořadí a z výsledků pod tím;
            nahoře by jen zabíraly místo, o které se pak perou. */}

      </header>

      {/* <b>Nepodepsaná čísla se musí přiznat</b> (Filip, 9. 10. 2026:
          *„tabule nahoře řekne, že hodnoty jsou informativní a jejich
          platnost potvrzuje, případně mění rozhodčí"*). Bez téhle věty
          vypadá předběžné pořadí jako hotové a hospoda si zapamatuje
          výsledek, který se ještě změní. */}
      <div className="tabule-hlasky" ref={hlasky}>
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
      </div>

      {/* <b>Mapa je pozadí celé tabule</b> (Filip, 24. 10. 2026: *„myslel
          jsem, že to sloučíš s tou trackovací mapou, že ta tabule na telku
          bude jen jedna"*). Dřív to byl malý widget v rohu vedle semaforu;
          teď leží pod vším a panely jsou na ní. Lodě do ní přibydou, až
          bude co kreslit — průběžné odesílání poloh je krok 1 trackeru
          a zatím není. */}
      {/* <b>Dokud polohy nechodí, jedou po trati ukázkové plavby</b>
          (Filip, 24. 10. 2026: *„navrhujeme to, tak to tam dej, ten
          tracker, jak jsi mi pomohl ukázat ten webový"*). Je to návrh,
          ne provoz — proto po skutečné trati a se jmény ze startovní
          listiny, ale tabule to u sebe píše. Vydávat vymyšlené polohy za
          skutečné by byla lež, ne ukázka; až přijdou první skutečné,
          tenhle vstup zmizí. */}
      {/* <b>Dokud nikdo nehlásí polohu, je na místě mapy teaser</b>
          (Filip, 26. 10. 2026: *„pokud nemá být vidět mapa, tak alespoň
          teaser se seznamem přihlášených lodí"*). Do té doby tu jezdily
          ukázkové plavby — zástup s cedulkou, ale pořád zástup. Seznam
          lodí, které se opravdu přihlásily, řekne divákovi v hospodě víc
          než simulace cizí regaty, a hlavně je pravdivý. Ukázkové plavby
          zůstaly tam, kam patří: v náčrtu `/nacrt/tabule`. */}
      {rezim === "listina" ? (
        <Teaser snimek={demo ? sDemoDaty(snimek) : snimek} ted={ted} />
      ) : rezim === "mezi" || rezim === "po" ? (
        <>
          {/* <b>Za výsledky mírně rozmazaná trať</b> (Filip, 26. 10.
              2026). Ukáže, kde se jelo, a přitom neprozradí, kdo kde je
              — mezi rozjížďkami se polohy ven nepouštějí. */}
          {tratVzadu && tratVzadu.length >= 2 && (
            <div className="tabule-mapa tabule-mapa-vzadu" aria-hidden="true">
              <MapaTrackeru znacky={tratVzadu} lode={[]} tabule zive={false} odsazeni={odsazeni} />
            </div>
          )}
          <Vysledky snimek={demo ? sDemoDaty(snimek, rezim) : snimek} ted={ted} konec={rezim === "po"} />
        </>
      ) : (
      <div className="tabule-mapa" aria-hidden="true">
        <MapaTrackeru
          znacky={demo === "mapa" && ukazka ? ukazka.znacky : (trat ?? [])}
          lode={zive}
          tabule
          zive
          odsazeni={odsazeni}
          onUdalost={zarad}
          onPoradi={setPoradiLodi}
          // <b>Nad pořadím zůstal jen název</b> (Filip, 25. 10. 2026:
          // *„tyhle řádky odstraň"*). Stav rozjížďky nesou panýlky
          // v rohu mapy a stáří dat se přestěhovalo do kolečka dole.
          hlavickaPoradi={
            <div className="poradi-hlava">
              <h1>
                <NazevZavodu text={snimek.nazev} />
              </h1>
            </div>
          }
        />
      </div>
      )}
      <PanylkyRozjizdek snimek={snimek} ted={ted} />

      {/* <b>Druhé kolečko vedle toho se stářím dat</b> (Filip, 26. 10.
          2026). Na tabuli, kterou nikdo neobsluhuje, nemá co dělat
          tlačítko — ale musí jít ukázat, co obrazovka umí, takže je to
          tatáž nenápadná pecka jako odpočet vedle. */}
      {demo && <span className="tabule-demo-znacka">Demo — simulovaná data</span>}
      {/* <b>Kebab vedle odpočtu, a pod ním volby</b> (Filip, 26. 10.
          2026). Proti cyklování jedním tlačítkem je vidět, co se dá
          zvolit — a na tabuli, kterou nikdo neobsluhuje, je to jediné
          ovládání, takže se nemá kde zeptat. */}
      <details className="tabule-demo">
        <summary aria-label="Ukázat, jak tabule vypadá">⋮</summary>
        <ul>
          <li>
            <button type="button" onClick={() => setDemo("listina")} aria-current={demo === "listina"}>
              Startovní listina
            </button>
          </li>
          <li>
            <button type="button" onClick={() => setDemo("mapa")} aria-current={demo === "mapa"}>
              Mapa se závodem
            </button>
          </li>
          <li>
            <button type="button" onClick={() => setDemo("mezi")} aria-current={demo === "mezi"}>
              Mezi rozjížďkami
            </button>
          </li>
          <li>
            <button type="button" onClick={() => setDemo("po")} aria-current={demo === "po"}>
              Po dojetí regaty
            </button>
          </li>
          <li>
            <button type="button" onClick={() => setDemo(null)} aria-current={demo === null}>
              Zpátky naživo
            </button>
          </li>
        </ul>
      </details>
      {/* <b>Stáří dat jako kolečko v rohu mapy</b> (Filip: *„maximálně ten
          odpočet dej třeba do nějakého kolečka doprava dolů v mapě, ale
          citlivě, ať to neruší"*). Je to jediný údaj, podle kterého se
          pozná, že tabule žije a ne že zamrzla — proto nezmizel docela,
          jen slezl z očí. Zčervená, teprve když data zestárnou. */}
      <p
        className={`tabule-stari-kolecko${stari > 120 ? " zastarale" : ""}`}
        aria-hidden="true"
        title="stáří dat"
      >
        {stari < 60 ? `${stari} s` : `${Math.round(stari / 60)} min`}
      </p>
      {/* <b>Rozhoduje mapa, ne výsledky</b> (Filip, 26. 10. 2026: *„v režimu
            mapa bude ukazovat pořadí v regatě, ale pokud bude mapa bez
            zobrazování, tak tyhle pruhy budou ukazovat pořadí v celé
            sérii"*). Pořadí na vodě navíc plní sama mapa, takže bez ní
            žádné není. */}
        <PoradiTrid
          radky={zive.length > 0 ? poradiLodi : serieRadky}
          nadpis={zive.length > 0 ? undefined : (serieNazev ?? undefined)}
          ref={tridy}
        />

      <div className="sloupce">
        {/* Zbývá jediný karusel: pořadí po třídách. Panel se stavy
            rozjížděk odešel 24. 10. 2026 — totéž říká proužek nahoře,
            a dvakrát totéž zabíralo půl obrazovky, na kterou patří mapa. */}
        {/* <b>Dokud regata nemá odjeto, točí karusel pořadí celé série</b>
            (Filip, 26. 10. 2026). Jsou to tytéž kategorie ve stejném
            rytmu, jen jiná tabulka — prázdné panely s „zatím se nejelo"
            by na televizi zabraly tutéž plochu a neřekly nic. */}
        {/* Panelový karusel patří regatě. Dokud nemá odjeto, nese
            spodek tabule běžící pásy s pořadím série — a dvě tabulky
            téhož pod sebou by si jen braly místo. */}
        {zive.length > 0 && <Karusel panely={tridyPanely(snimek)} />}


      </div>
    </div>
  );
}




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
  zprava: "Vydáno",
  vystraha: "Pozor",
  start: "Start",
  dojezd: "V cíli",
  souboj: "Na vodě",
  dokonceno: "Rozjížďka",
  zrusena: "Zrušeno",
  zavod: "Regata",
  trat: "Trať",
  ceka: "Čeká se",
  lod: "Na startu",
};

/** Panely levého sloupce: co se jede a kdo je na startu. */

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

/** Které podoby tabule umí. */
type Rezim = "listina" | "mapa" | "mezi" | "po";

/**
 * Snímek doplněný o to, co demo potřebuje ukázat.
 *
 * <b>Doplňuje se jen prázdné.</b> Když regata zprávy má, ukážou se její
 * vlastní — demo není náhrada dat, ale způsob, jak projít režimy i na
 * tabuli, kde se zrovna nic neděje.
 */
function sDemoDaty(snimek: Snimek, rezim?: Rezim): Snimek {
  /**
   * <b>Po dojetí je zajímavý právě ten nehotový stav</b> (Filip, 26. 10.
   * 2026: *„tam bude důležité oznamovat stavy výsledků a výsledků
   * rozjížděk"*). Na regatě, kde je všechno dávno potvrzené, by demo
   * ukázalo jen klidný seznam a na otázku „jak to vypadá, když se ještě
   * zapisuje" by neodpovědělo. Hýbe se tím nejvýš o krok zpátky a jen
   * když je všechno hotové — a přes obrazovku přitom běží pruh, že jsou
   * data simulovaná.
   */
  if (
    (rezim === "mezi" || rezim === "po") &&
    snimek.rozjizdky.some((r) => r.stav === "Dokoncena") &&
    snimek.rozjizdky.every((r) => r.stav !== "Dokoncena" || r.stavVysledku === "Potvrzeno")
  ) {
    const posledni = snimek.rozjizdky.filter((r) => r.stav === "Dokoncena").at(-1);
    snimek = {
      ...snimek,
      rozjizdky: snimek.rozjizdky.map((r) =>
        r === posledni ? { ...r, stavVysledku: "Navrzeno" } : r,
      ),
    };
  }
  if (snimek.zpravy.length > 0) return snimek;

  const ted = Date.now();
  const kdy = (minut: number) => new Date(ted - minut * 60_000).toISOString();
  return {
    ...snimek,
    zpravy: [
      {
        id: -1,
        text: "Přechod bouřky — lodě zůstávají na břehu, čekáme na pokyn.",
        druh: "Vystraha",
        vydanoV: kdy(6),
        platiDo: null,
        stazenoV: null,
      },
      {
        id: -2,
        text: "Start první rozjížďky se odkládá o 45 minut.",
        druh: "Program",
        vydanoV: kdy(28),
        platiDo: null,
        stazenoV: null,
      },
      {
        id: -3,
        text: "Rozprava v 9:00 u klubovny, startovní procedura v 10:25.",
        druh: "Informace",
        vydanoV: kdy(150),
        platiDo: null,
        stazenoV: null,
      },
    ],
  };
}
