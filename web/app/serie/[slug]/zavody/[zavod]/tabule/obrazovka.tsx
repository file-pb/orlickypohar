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
import { trida, useStopy } from "@/lib/stopy";
import { JMENA, pole } from "@/app/nacrt/mapa/plavba";
import type { ZaznamRozjizdky } from "@/lib/zaznam";

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
  const kebab = useRef<HTMLDetailsElement>(null);
  const kebabZhasne = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zavriKebab = useCallback(() => {
    if (kebab.current) kebab.current.open = false;
  }, []);
  const zvolDemo = useCallback(
    (volba: Rezim | null) => {
      setDemo(volba);
      zavriKebab();
    },
    [zavriKebab],
  );
  /** Otevřené menu na tabuli nikdo nezavře, tak se zavře samo. */
  const hlidejKebab = useCallback(() => {
    if (kebabZhasne.current) clearTimeout(kebabZhasne.current);
    if (kebab.current?.open) kebabZhasne.current = setTimeout(zavriKebab, KEBAB_ZHASNE_MS);
  }, [zavriKebab]);
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
            // <b>Aspoň osmnáct lodí</b> (Filip, 26. 10. 2026: *„do
            // simulace dej víc lodí"*). Regata se šesti přihlášenými
            // ukázala šest teček a režie neměla co porovnávat; zbytek
            // pole si ukázka doplní vlastními jmény.
            Math.max(18, Math.min(snimek.lode.length || 24, 30)),
            trat ?? undefined,
            snimek.lode.length > 0 ? snimek.lode.map((l) => l.lod) : undefined,
          )
        : null,
    [demo, trat, snimek.lode],
  );
  const zive = demo === "mapa" && ukazka ? ukazka.lode : demo ? [] : skutecne;

  /**
   * <b>Co tabule zrovna ukazuje.</b> Rozhoduje se na jednom místě, aby
   * se podoby nedaly zapnout dvě naráz — a aby šlo kteroukoli vyvolat
   * v demu (Filip, 26. 10. 2026). Pořadí podmínek je pořadí dne:
   * lodě na vodě přebijí všechno, pak rozhoduje, jestli je po regatě,
   * jestli se už jelo, a nakonec zbyde startovní listina.
   */
  /** Poslední dojetá rozjížďka — ta, jejíž záznam má smysl přehrávat. */
  const posledniDojeta = useMemo(
    () =>
      [...snimek.rozjizdky]
        .filter((r) => r.stav === "Dokoncena")
        .sort((a, b) => a.cislo - b.cislo)
        .at(-1)?.cislo ?? null,
    [snimek.rozjizdky],
  );

  const rezim: Rezim =
    demo ??
    (zive.length > 0
      ? "mapa"
      : snimek.stav === "Odjety" && snimek.rozjizdky.some((r) => r.stav === "Dokoncena")
        ? "po"
        : snimek.rozjizdky.some((r) => r.stav === "Dokoncena")
          ? "mezi"
          : "listina");
  /**
   * <b>Záznam poslední dojeté rozjížďky.</b> Stahuje se jednou, až když je
   * co přehrávat — je o dva řády větší než snímek, takže do něj nepatří.
   * `vydava: false` je odpověď, kterou tabule poslechne: rozhodčí přenos
   * ven nepustil, nebo z rozjížďky nic nepřišlo.
   */
  const [zaznam, setZaznam] = useState<ZaznamRozjizdky | null>(null);

  /**
   * Stáhne záznam, až když je co přehrávat. <b>Výpadek poslední dobrý
   * záznam nemaže</b> — tabule ho přehrává dál a nikdo u ní nestojí, aby
   * ji obnovil.
   */
  useEffect(() => {
    if (demo) return;
    if (rezim !== "mezi" && rezim !== "po") return;
    if (posledniDojeta === null) return;

    let platne = true;
    const adresa =
      `/serie/${encodeURIComponent(serie)}/zavody/${encodeURIComponent(zavod)}` +
      `/tabule/zaznam/${posledniDojeta}`;
    fetch(adresa, { cache: "no-store" })
      .then((o) => (o.ok ? (o.json() as Promise<ZaznamRozjizdky>) : null))
      .then((z) => {
        if (platne && z) setZaznam(z);
      })
      .catch(() => {});
    return () => {
      platne = false;
    };
  }, [demo, rezim, posledniDojeta, serie, zavod]);

  /**
   * Záznam přepočtený na plavby, jak je kreslí mapa. Je to týž tvar, jaký
   * jede po trati při rozjížďce — mapa o záznamu nemusí vědět nic, jen
   * dostane jiný čas (`prehravkaMs`).
   *
   * V demu se přehrává ukázková plavba: na tabuli, kde se zrovna nejelo,
   * by se jinak zrychlené review nedalo ukázat vůbec.
   */
  const prehravka = useMemo(() => {
    if (demo) return ukazka?.lode ?? null;
    if (!zaznam?.vydava || zaznam.lode.length === 0 || !zaznam.od) return null;

    const od = Date.parse(zaznam.od);
    if (!Number.isFinite(od)) return null;

    return zaznam.lode.map((l, i) => ({
      id: l.lodId || -(i + 1),
      nazev: l.nazev,
      kategorie: trida(l.kategorie),
      body: l.body.map((b) => ({
        sirka: b.sirka,
        delka: b.delka,
        cas: Math.max(0, (Date.parse(b.cas) - od) / 1000),
      })),
      // Záznam je hotový, žádná díra na konci: všechno, co přišlo, přišlo.
      dosloDo: l.body.length,
    }));
  }, [demo, ukazka, zaznam]);

  /**
   * <b>Dlouho seznam, krátce přehrávka</b> (Filip, 26. 10. 2026). Střídání
   * běží jen tam, kde je co střídat — a začíná seznamem, protože to je
   * ten, kvůli komu se divák dívá.
   */
  const [ukazujeZaznam, setUkazujeZaznam] = useState(false);
  const lzePrehrat =
    (rezim === "mezi" || rezim === "po") && (prehravka?.length ?? 0) > 0;
  useEffect(() => {
    if (!lzePrehrat) {
      setUkazujeZaznam(false);
      return;
    }
    const kdy = setTimeout(
      () => setUkazujeZaznam((v) => !v),
      ukazujeZaznam ? PREHRAVKA_MS : SEZNAM_MS,
    );
    return () => clearTimeout(kdy);
  }, [lzePrehrat, ukazujeZaznam]);

  /** Snímek, jak ho vidí demo — počítá se jednou pro celou obrazovku. */
  const snimekDemo = useMemo(() => (demo ? sDemoDaty(snimek, rezim) : snimek), [demo, snimek, rezim]);

  /**
   * <b>I běžící pruhy dole jedou v demu na simulovaných datech</b>
   * (Filip, 26. 10. 2026: *„na demodatech u tabule simuluj i ta data
   * dole, to celkové pořadí v poháru, ty běžící řádky"*). Série po
   * jednom odjetém závodě má v pruhu pár jmen, takže se nedá posoudit,
   * jak se bude chovat plný pohár.
   */
  const radkyDole = useMemo(() => {
    if (!demo) return serieRadky;
    const uz = new Set(serieRadky.map((r) => r.nazev));
    const vsechny = [
      ...serieRadky.map((r) => ({ ...r, body: Number.parseInt(r.popisek ?? "", 10) || 0 })),
      ...snimekDemo.lode
        .filter((l) => !uz.has(l.lod))
        .map((l, i) => ({
          id: 900_000 + i,
          nazev: l.lod,
          kategorie: l.kategorie,
          stariS: null,
          dojela: false,
          popisek: "",
          // Pevné rozdělení bodů: táž tabulka při každém překreslení.
          body: 4 + ((i * 13) % 57),
        })),
    ];
    const tridy = [...new Set(vsechny.map((r) => r.kategorie))];
    return tridy.flatMap((trida) =>
      vsechny
        .filter((r) => r.kategorie === trida)
        .sort((a, b) => a.body - b.body)
        .map(({ body, ...r }) => ({ ...r, popisek: `${body} b` })),
    );
  }, [demo, serieRadky, snimekDemo]);


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

      {/* <b>Pruh „čísla jsou informativní" je pryč</b> (Filip, 26. 10.
          2026: *„tohle schovej"*). Požadavek z 9. 10. — aby nepodepsaná
          čísla nevypadala jako hotová — zůstává splněný, jen ho plní
          obrazovka výsledků: u pořadí stojí, jak daleko je zápis
          (`zapisuje se / ověřeno / schváleno / potvrzeno`), a dokud není
          potvrzený, visí u nadpisu cedulka. Pruh přes celou šířku to
          říkal potřetí, a na mapě navíc přes vodu. */}
      <div className="tabule-hlasky" ref={hlasky}>
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
        <Teaser snimek={snimekDemo} ted={ted} />
      ) : rezim === "mezi" || rezim === "po" ? (
        /* <b>Žádná trať vzadu</b> (Filip, 26. 10. 2026: *„měla by mít
           stejné pozadí jak ta startovní listina; ten rank vpravo
           u těchhle oken není, tak tam nemusí být to pozadí"*). Mapa je
           pozadí jen tam, kde se po ní něco pohybuje a vpravo u ní stojí
           žebříček; pod seznamem pořadí je z ní jen šmouha. Pozadí si
           tyhle podoby berou totéž co startovní listina, aby se tabule
           mezi fázemi dne nepřevlékala. */
        ukazujeZaznam && prehravka ? (
          /* <b>Zrychlené review</b>: na půl minuty se místo pořadí ukáže,
             jak se rozjížďka jela. Je to tatáž mapa jako při závodě, jen
             jí běží jiný čas — dvě komponenty by se musely opravovat
             obě. */
          <div className="tabule-mapa tabule-prehravka" aria-hidden="true">
            <MapaTrackeru
              znacky={demo && ukazka ? ukazka.znacky : (trat ?? [])}
              lode={prehravka}
              trasa={demo && ukazka && ukazka.znacky !== trat ? undefined : snimek.trasa}
              tabule
              ukazka={!!demo}
              prehravkaMs={PREHRAVKA_MS}
              odsazeni={odsazeni}
              hlavickaPoradi={
                <p className="tabule-prehravka-popis">
                  {posledniDojeta !== null ? `${posledniDojeta}. rozjížďka` : "Rozjížďka"}
                  <span>záznam, zrychleně</span>
                </p>
              }
            />
          </div>
        ) : (
          <Vysledky snimek={snimekDemo} ted={ted} konec={rezim === "po"} />
        )
      ) : (
      <div className="tabule-mapa" aria-hidden="true">
        <MapaTrackeru
          znacky={demo === "mapa" && ukazka ? ukazka.znacky : (trat ?? [])}
          /* <b>Měřicí trasa po vodě patří i k ukázce</b> — ale jen když
             jede po trati regaty. Když si ukázka vymyslela vlastní
             (regata trať nezveřejnila), trasa ze snímku by měřila podle
             úplně jiné vody. */
          trasa={demo === "mapa" && ukazka && ukazka.znacky !== trat ? undefined : snimek.trasa}
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
      {/* <b>Po volbě se zavře a sám zhasne</b> (Filip, 26. 10. 2026:
          *„zůstává viset to kebab menu"*). Tabuli nikdo neobsluhuje,
          takže otevřené menu by na ní zůstalo do rána a překrývalo by
          pořadí. */}
      <details className="tabule-demo" ref={kebab} onToggle={hlidejKebab}>
        <summary aria-label="Ukázat, jak tabule vypadá">⋮</summary>
        <ul>
          {(
            [
              ["listina", "Startovní listina"],
              ["mapa", "Mapa se závodem"],
              ["mezi", "Mezi rozjížďkami"],
              ["po", "Po dojetí regaty"],
              [null, "Zpátky naživo"],
            ] as [Rezim | null, string][]
          ).map(([volba, popis]) => (
            <li key={popis}>
              <button type="button" onClick={() => zvolDemo(volba)} aria-current={demo === volba}>
                {popis}
              </button>
            </li>
          ))}
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
          radky={zive.length > 0 ? poradiLodi : radkyDole}
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

/**
 * Kolik lodí má mít pole v demu (Filip, 26. 10. 2026: *„do těch
 * simulovaných dat mi dej víc lodí i do obrazů před, mezi rozjížďkami
 * a po závodě"*). Na regatě se šesti přihlášenými ukazovaly všechny tři
 * podoby šest řádků, a to se nedá posoudit: tabule se navrhuje na plné
 * pole, kde se o místo perou.
 */
const DEMO_LODI = 22;

/** Kolik řádků se vejde do panelu pořadí — totéž `NEJVIC` jako v `lib/tabule.ts`. */
const NEJVIC_V_PANELU = 10;

/** Kormidelníci k dopsaným lodím — vymyšlení, jako celé to pole. */
const DEMO_KORMIDELNICI = [
  "J. Hradil", "M. Vávrová", "P. Šimek", "L. Bartoš", "T. Nedvědová",
  "R. Kalous", "O. Fiala", "V. Doležalová", "Z. Mareš", "K. Pospíšil",
];

/** Stavy baterie, aby šlo vidět i vybitý telefon. */
const DEMO_BATERIE = [84, 61, 12, 97, 38, 7, 73, 25];

/**
 * Jak dlouho stojí seznam a jak dlouho běží přehrávka záznamu (Filip,
 * 26. 10. 2026: *„po dojetí rozjížděk by se tento infopanel mohl na
 * chvíli prohodit s mapkou, která nám ukáže záznam závodu z trekru a jak
 * se jel — takové zrychlené review — a pak zase delší dobu ten seznam"*).
 * Poměr je schválně nerovný: výsledky jsou to, kvůli čemu se divák dívá,
 * přehrávka je vsuvka.
 */
const SEZNAM_MS = 75_000;
const PREHRAVKA_MS = 30_000;

/** Za jak dlouho se samo zavře otevřené demo menu. */
const KEBAB_ZHASNE_MS = 20_000;

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
  snimek = sPlnymPolem(snimek);
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

/**
 * <b>Demo dopíše pole do plného počtu.</b>
 *
 * Startovní listina i obě podoby s pořadím kreslí to, co regata má —
 * a před závodem to bývá pár lodí. Na to se nedá navrhovat plocha, která
 * má v květnu unést celé startovní pole. Doplňuje se **jen chybějící
 * počet**: lodě, které se opravdu přihlásily, zůstávají první a tak, jak
 * jsou. Přes obrazovku přitom běží pruh, že jsou data simulovaná.
 *
 * Rozdělení je **pevné, ne náhodné** — počítá se z pořadí dopsané lodi,
 * takže se při každém překreslení vrátí tatáž tabule a nic neposkakuje.
 */
function sPlnymPolem(snimek: Snimek): Snimek {
  if (snimek.lode.length >= DEMO_LODI) return snimek;

  const uz = new Set(snimek.lode.map((l) => l.lod));
  const tridy = snimek.lode.length > 0
    ? [...new Set(snimek.lode.map((l) => l.kategorie))]
    : ["Race", "Nad7m", "Pod7m"];

  const pribyle: Snimek["lode"] = [];
  for (const jmeno of JMENA) {
    if (snimek.lode.length + pribyle.length >= DEMO_LODI) break;
    if (uz.has(jmeno)) continue;
    const i = pribyle.length;
    // Většina lodí má dva telefony, pár jeden, jedna z šesti žádný —
    // ať je na kostičkách vidět i loď, kterou neuvidíme.
    const telefonu = [2, 1, 2, 0, 3, 1][i % 6];
    pribyle.push({
      lod: jmeno,
      kategorie: tridy[i % tridy.length],
      kormidelnik: DEMO_KORMIDELNICI[i % DEMO_KORMIDELNICI.length],
      potvrzena: i % 7 !== 3,
      telefonu,
      baterie: Array.from(
        { length: telefonu },
        (_, j) => DEMO_BATERIE[(i * 2 + j) % DEMO_BATERIE.length],
      ),
    });
  }
  if (pribyle.length === 0) return snimek;

  const lode = [...snimek.lode, ...pribyle];
  const tabule = snimek.tabule.map((panel) => {
    const vPanelu = new Set(panel.lode.map((l) => l.lod));
    const doPanelu = pribyle.filter(
      (l) => !vPanelu.has(l.lod) && (panel.kategorie === "Celkem" || l.kategorie === panel.kategorie),
    );
    const zbyva = Math.max(0, NEJVIC_V_PANELU - panel.lode.length);
    const posledni = panel.lode.at(-1);
    return {
      ...panel,
      lode: [
        ...panel.lode,
        ...doPanelu.slice(0, zbyva).map((l, i) => ({
          lod: l.lod,
          misto: (posledni?.misto ?? 0) + i + 1,
          body: (posledni?.body ?? 0) + (i + 1) * 3,
        })),
      ],
      dalsich: panel.dalsich + Math.max(0, doPanelu.length - zbyva),
    };
  });

  return { ...snimek, lode, tabule };
}
