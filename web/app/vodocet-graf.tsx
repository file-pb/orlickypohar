"use client";

import { useState } from "react";
import { casPraha, minuty, type BodHladiny } from "@/lib/vodocet";

/** Co o rozsahu víme: body do grafu a čísla pod něj. */
type Rada = {
  body: BodHladiny[];
  pritok: number | null;
  odtok: number | null;
  zmenaObjemu: number | null;
  zmenaHladinyCm: number | null;
};

/** Jak se rozsahy jmenují na tlačítkách. Klíče jsou z API. */
const POPISKY: Record<string, string> = {
  "24h": "24 h",
  "3d": "3 d",
  "1t": "1 t",
  "2t": "2 t",
  "1m": "1 m",
  "3m": "3 m",
  "1r": "1 r",
};

/** Co se řekne nevidomému i do titulku tlačítka. */
const CELYM_SLOVEM: Record<string, string> = {
  "24h": "posledních 24 hodin",
  "3d": "poslední tři dny",
  "1t": "poslední týden",
  "2t": "poslední dva týdny",
  "1m": "poslední měsíc",
  "3m": "poslední tři měsíce",
  "1r": "poslední rok",
};

const f = (n: number, mist: number) =>
  n.toLocaleString("cs-CZ", { minimumFractionDigits: mist, maximumFractionDigits: mist });

/**
 * Průběh hladiny s přepínáním rozsahu (Filip, 15. 10. 2026: *„chtěl bych,
 * aby se dal nahoře malými tlačítečky v řádku přepínat na 24h 3d 1t 2t 1m
 * 3m 1r"*).
 *
 * <b>Je to vylepšení, ne podmínka.</b> Server vykreslí graf za 24 h do
 * HTML jako dřív; tlačítka jen dotahují ostatní rozsahy. Bez javascriptu
 * tedy graf zůstane — a to je u widgetu, který visí na každé stránce,
 * důležitější než plynulé přepínání.
 *
 * <b>Nabízí se jen rozsahy, které API hlásí jako dostupné.</b> Pevný
 * seznam by sliboval grafy, pro které nejsou data: sběr běží od 16. 9.
 * 2026 a historie se po prořídnutí drží rok, takže roční graf bude mít
 * smysl až za rok.
 *
 * <b>Načtená řada se pamatuje.</b> Kdo přepíná sem a tam, nemá se každou
 * druhou vteřinou ptát znovu — a je to i ohleduplnost k API, které
 * mezitím stejně nic nového nemá.
 */
export function VodocetGraf({
  vychozi,
  rozsahy,
  pritokTed,
  odtokTed,
  objem,
}: {
  /** Co se vykreslilo na serveru: řada za 24 h i čísla k ní. */
  vychozi: Rada;
  /** Klíče rozsahů, pro které jsou data. Prázdné pole = žádná tlačítka. */
  /** Může chybět, když API vrací starší tvar — viz `prepinat`. */
  rozsahy?: string[];
  /** Okamžitý průtok — „teď", nezávisí na rozsahu. */
  pritokTed: number | null;
  odtokTed: number | null;
  /** Objem nádrže teď, v mil. m³. */
  objem: number | null;
}) {
  const [vybrany, setVybrany] = useState("24h");
  const [rady, setRady] = useState<Record<string, Rada>>({ "24h": vychozi });
  const [nacitam, setNacitam] = useState<string | null>(null);
  const [chyba, setChyba] = useState(false);

  const rada = rady[vybrany];
  const body = rada?.body ?? [];

  async function prepni(rozsah: string) {
    setVybrany(rozsah);
    setChyba(false);
    if (rady[rozsah]) return;

    setNacitam(rozsah);
    try {
      const odpoved = await fetch(`/api/vodocet-rada?rozsah=${rozsah}`);
      if (!odpoved.ok) throw new Error(String(odpoved.status));
      const data = (await odpoved.json()) as Rada;
      setRady((d) => ({ ...d, [rozsah]: data }));
    } catch {
      // Graf zůstane na tom, co se povedlo načíst dřív; řekne se jen, že
      // se tenhle rozsah nepovedl. Spadnout kvůli doplňku nemá smysl.
      setChyba(true);
    } finally {
      setNacitam(null);
    }
  }

  // Jediný rozsah = není co přepínat, tlačítka by jen zabírala místo.
  //
  // <b>Chybějící pole se bere jako „žádné rozsahy".</b> Vodočet je doplněk
  // a nesmí shodit stránku (`lib/vodocet.ts`), jenže `rozsahy.length` na
  // odpovědi bez `dostupneRozsahy` shodilo celý postranní panel, a tím
  // každou veřejnou stránku — stačilo starší API nebo starší odpověď
  // v cache (16. 10. 2026).
  const prepinat = (rozsahy?.length ?? 0) > 1;

  return (
    <>
      {prepinat && (
        <div className="vodocet-rozsahy" role="group" aria-label="Rozsah grafu">
          {(rozsahy ?? []).map((r) => (
            <button
              key={r}
              type="button"
              className={r === vybrany ? "vybrany" : undefined}
              aria-pressed={r === vybrany}
              title={CELYM_SLOVEM[r] ?? r}
              onClick={() => prepni(r)}
            >
              {POPISKY[r] ?? r}
            </button>
          ))}
        </div>
      )}

      <Krivka body={body} rozsah={vybrany} prazdny={nacitam !== null} />

      {chyba && (
        <p className="vodocet-chyba" role="status">
          Ten rozsah se teď nenačetl.
        </p>
      )}

      {/* <b>Velké číslo je průměr za vybraný rozsah, ne okamžitý průtok</b>
          (Filip, 19. 10. 2026: *„nepočítá se nám odtok"*). Odtok se
          nepočítal — Povodí ho hlásí správně a my taky, jenže Orlík pouští
          vodu nárazově: v řadě za 18. 10. stojí dvacet hodin po 0,00 m³/s
          a ve 20:00 skok na 252,93. Okamžitá hodnota je tedy většinu času
          nula a na tabuli to vypadá, že se nic nepočítá, i když denní
          objem dva miliony kubíků sedí.

          Průměr se dopočítá z objemu děleno délkou rozsahu — žádný nový
          údaj z API. Okamžitý průtok zůstává pod ním jako „právě teď":
          je to pravda o téhle vteřině, jen to není ta pravda, kvůli které
          se na vodočet člověk dívá. */}
      <dl className="vodocet-toky">
        <div>
          <dt>Přítok</dt>
          <dd>{prumer(rada?.pritok, vybrany)}</dd>
          <dd className="vodocet-den">
            {rada?.pritok != null
              ? `${objemem(rada.pritok)} za ${ZA[vybrany] ?? vybrany}`
              : `za ${ZA[vybrany] ?? vybrany} se nespočítá`}
          </dd>
          <dd className="vodocet-ted">
            {pritokTed == null ? "teď neznámý" : `právě teď ${f(pritokTed, 1)} m³/s`}
          </dd>
        </div>
        <div>
          <dt>Odtok</dt>
          <dd>{prumer(rada?.odtok, vybrany)}</dd>
          <dd className="vodocet-den">
            {rada?.odtok != null
              ? `${objemem(rada.odtok)} za ${ZA[vybrany] ?? vybrany}`
              : `za ${ZA[vybrany] ?? vybrany} se nespočítá`}
          </dd>
          <dd className="vodocet-ted">
            {odtokTed == null ? "teď neznámý" : `právě teď ${f(odtokTed, 1)} m³/s`}
          </dd>
        </div>
      </dl>

      <Bilance rada={rada} rozsah={vybrany} objem={objem} />
    </>
  );
}

/**
 * Samotná křivka. Osa se roztahuje na rozsah dat, ale nejméně na 5 cm —
 * jinak by centimetrové kolísání vypadalo jako povodeň.
 */
function Krivka({
  body,
  rozsah,
  prazdny,
}: {
  body: BodHladiny[];
  rozsah: string;
  prazdny: boolean;
}) {
  if (body.length < 2) {
    // Místo grafu se drží jeho výška, ať obsah pod ním při přepnutí
    // nepodskakuje.
    return <div className="vodocet-graf-misto" aria-hidden="true" />;
  }

  const W = 240;
  const H = 56;
  const hodnoty = body.map((m) => m.hladina);
  const stred = (Math.max(...hodnoty) + Math.min(...hodnoty)) / 2;
  const rozpeti = Math.max(Math.max(...hodnoty) - Math.min(...hodnoty), 0.05);
  const spodek = stred - rozpeti / 2;

  // Osa podle času měření, ne podle pořadí: body jsou po prořídnutí
  // různě daleko od sebe a rovnoměrné rozložení by křivku zkreslilo.
  const t0 = minuty(body[0].cas);
  const t1 = minuty(body[body.length - 1].cas);
  const souradnice = hodnoty.map((h, i) => {
    const x = ((minuty(body[i].cas) - t0) / Math.max(t1 - t0, 1)) * W;
    const y = H - 4 - ((h - spodek) / rozpeti) * (H - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const od = body[0];
  const doCas = body[body.length - 1];

  return (
    <svg
      className={`vodocet-graf${prazdny ? " nacita" : ""}`}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Hladina za ${CELYM_SLOVEM[rozsah] ?? rozsah}: od ${casPraha(od.cas)} (${f(od.hladina, 2)} m) do ${casPraha(doCas.cas)} (${f(doCas.hladina, 2)} m)`}
    >
      <polygon className="plocha" points={`0,${H} ${souradnice.join(" ")} ${W},${H}`} />
      <polyline className="cara" points={souradnice.join(" ")} />
    </svg>
  );
}

/**
 * Délka rozsahu v sekundách, pro přepočet objemu na průměrný průtok.
 *
 * <b>Musí sedět s `RozsahyGrafu.Vsechny` v API</b> (1, 3, 7, 14, 30, 90
 * a 365 dní — ověřeno 19. 10. 2026), protože objem se tam počítá přes
 * tohle okno. Klíč, který tu není, dá pomlčku, ne špatné číslo: kdyby
 * API přidalo rozsah navíc, radši se nenapíše nic.
 */
const SEKUND: Record<string, number> = {
  "24h": 24 * 3600,
  "3d": 3 * 24 * 3600,
  "1t": 7 * 24 * 3600,
  "2t": 14 * 24 * 3600,
  "1m": 30 * 24 * 3600,
  "3m": 90 * 24 * 3600,
  "1r": 365 * 24 * 3600,
};

/**
 * Průměrný průtok za rozsah, v m³/s. <b>Nedosazuje se nic</b>: bez objemu
 * nebo u neznámého rozsahu se napíše pomlčka, ne nula — nula by tvrdila,
 * že neteklo, místo aby přiznala, že se to nespočítalo.
 */
function prumer(objem: number | null | undefined, rozsah: string) {
  const sekund = SEKUND[rozsah];
  if (objem == null || !sekund) return "—";
  return `${f(objem / sekund, 1)} m³/s`;
}

/** Jak se rozsah řekne ve větě „…za poslední týden". */
const ZA: Record<string, string> = {
  "24h": "24 h",
  "3d": "3 dny",
  "1t": "týden",
  "2t": "dva týdny",
  "1m": "měsíc",
  "3m": "tři měsíce",
  "1r": "rok",
};

/** Objem v m³ čitelně: pod milion v tisících, nad ním v milionech. */
const objemem = (m3: number) =>
  Math.abs(m3) >= 1_000_000
    ? `${f(m3 / 1_000_000, 2)} mil. m³`
    : `${f(m3 / 1000, 0)} tis. m³`;

/**
 * Věta „za ten čas přiteklo o tolik víc, než odteklo".
 *
 * <b>Počítá se z rozdílu průtoků, ne ze změny objemu</b> — tak to bylo od
 * 16. 9. 2026 a je to to, co widget vysvětluje. Změna objemu je vedle toho
 * kontrola: API ji vydává zvlášť a obě čísla by se měla zhruba potkat.
 *
 * <b>Když se průtoky za rozsah spočítat nedají</b>, řekne se aspoň změna
 * objemu nádrže. Ta vyjde skoro vždycky, protože stačí dvě měření — kdežto
 * integrál potřebuje celou řadu bez děr.
 */
function Bilance({
  rada,
  rozsah,
  objem,
}: {
  rada: Rada | undefined;
  rozsah: string;
  objem: number | null;
}) {
  const za = ZA[rozsah] ?? rozsah;
  const rozdil =
    rada?.pritok != null && rada.odtok != null ? rada.pritok - rada.odtok : null;

  if (rozdil === null) {
    if (rada?.zmenaObjemu == null) return null;
    const pribylo = rada.zmenaObjemu >= 0;
    return (
      <p className="vodocet-bilance">
        Za {za} v nádrži{" "}
        <b className={`vodocet-rozdil ${pribylo ? "stoupa" : "klesa"}`}>
          {pribylo ? "přibylo" : "ubylo"} {objemem(Math.abs(rada.zmenaObjemu))}
        </b>
        . Kolik přiteklo a odteklo, se za tohle období spočítat nedá — starší
        měření se prořeďují a v řadě jsou díry.
      </p>
    );
  }

  return (
    <p className="vodocet-bilance">
      Za {za} {rozdil >= 0 ? "přiteklo" : "odteklo"}{" "}
      <b className={`vodocet-rozdil ${rozdil >= 0 ? "stoupa" : "klesa"}`}>
        o {objemem(Math.abs(rozdil))} víc
        <Trend nahoru={rozdil >= 0} />
      </b>
      , než {rozdil >= 0 ? "odteklo" : "přiteklo"}.
      {objem != null && <> V nádrži je {f(objem, 0)} mil. m³.</>}
      <span className="vodocet-pozn">
        {" "}
        Elektrárna pouští vodu nárazově, proto se sčítá celé období, ne okamžitý
        průtok.
      </span>
    </p>
  );
}

/**
 * Piktogram trendu: lomená čára se šipkou. Čtečka obrazovky ho přeskočí —
 * směr už říká věta („přiteklo" / „odteklo").
 */
function Trend({ nahoru }: { nahoru: boolean }) {
  return (
    <svg className="vodocet-trend" viewBox="0 0 16 12" aria-hidden="true">
      {nahoru ? (
        <>
          <polyline points="1,10 6,5 9,8 15,2" />
          <polyline points="11,2 15,2 15,6" />
        </>
      ) : (
        <>
          <polyline points="1,2 6,7 9,4 15,10" />
          <polyline points="11,10 15,10 15,6" />
        </>
      )}
    </svg>
  );
}
