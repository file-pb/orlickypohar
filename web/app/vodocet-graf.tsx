"use client";

import { useState } from "react";
import { casPraha, minuty, type BodHladiny } from "@/lib/vodocet";

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
}: {
  /** Řada za 24 h, vykreslená už na serveru. */
  vychozi: BodHladiny[];
  /** Klíče rozsahů, pro které jsou data. Prázdné pole = žádná tlačítka. */
  rozsahy: string[];
}) {
  const [vybrany, setVybrany] = useState("24h");
  const [rady, setRady] = useState<Record<string, BodHladiny[]>>({ "24h": vychozi });
  const [nacitam, setNacitam] = useState<string | null>(null);
  const [chyba, setChyba] = useState(false);

  const body = rady[vybrany] ?? [];

  async function prepni(rozsah: string) {
    setVybrany(rozsah);
    setChyba(false);
    if (rady[rozsah]) return;

    setNacitam(rozsah);
    try {
      const odpoved = await fetch(`/api/vodocet-rada?rozsah=${rozsah}`);
      if (!odpoved.ok) throw new Error(String(odpoved.status));
      const data = (await odpoved.json()) as { body: BodHladiny[] };
      setRady((d) => ({ ...d, [rozsah]: data.body }));
    } catch {
      // Graf zůstane na tom, co se povedlo načíst dřív; řekne se jen, že
      // se tenhle rozsah nepovedl. Spadnout kvůli doplňku nemá smysl.
      setChyba(true);
    } finally {
      setNacitam(null);
    }
  }

  // Jediný rozsah = není co přepínat, tlačítka by jen zabírala místo.
  const prepinat = rozsahy.length > 1;

  return (
    <>
      {prepinat && (
        <div className="vodocet-rozsahy" role="group" aria-label="Rozsah grafu">
          {rozsahy.map((r) => (
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
