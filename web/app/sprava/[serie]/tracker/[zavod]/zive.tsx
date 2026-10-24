"use client";

import { useEffect, useState } from "react";
import { MapaTrackeru } from "@/app/mapa-trackeru";
import type { Znacka } from "@/app/nacrt/mapa/plavba";
import type { Poloha } from "@/lib/voda";
import type { PolohaLodi, SnimekPoloh } from "@/lib/polohy";
import { useStopy } from "@/lib/stopy";

/**
 * Jak často si obrazovka říká o nový snímek.
 *
 * <b>Pět vteřin, i když telefony posílají po minutě.</b> Dávky z různých
 * lodí nechodí naráz, takže mezi dvěma minutami pořád něco přibývá —
 * a cache na straně API drží odpověď stejně pět vteřin pro všechny, takže
 * víc dotazů do databáze to neudělá.
 */
const OBNOVA_MS = 5_000;

/** Lidsky „před 8 s" / „před 4 min". */
function predJakDlouho(ms: number | null): string {
  if (ms === null) return "zatím nic";
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `před ${s} s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `před ${m} min` : `před ${Math.floor(m / 60)} h ${m % 60} min`;
}

const NAZVY_STAVU = {
  Cerstva: "hlásí se",
  Starne: "stárne",
  Nedostupna: "nehlásí se",
} as const;

/**
 * Živá mapa regaty pro pořadatele a rozhodčího.
 *
 * <b>Drží poslední dobrý snímek.</b> Když se obnovení nepovede, zůstane
 * na obrazovce to, co bylo, a jen se u toho napíše, jak je to staré —
 * visí na tom rozhodnutí o odkladu startu a prázdná obrazovka by lhala
 * víc než stará data.
 *
 * <b>Dráhy vznikají skládáním snímků.</b> Server posílá poslední polohu
 * každé lodi; obrazovka si z nich staví stopu sama, takže se nepřenáší
 * nic navíc a mapa přesto kreslí, kudy loď jela.
 */
export function ZiveLode({
  serie,
  zavod,
  znacky,
  trasa,
  spojnice,
  prvni,
}: {
  serie: string;
  zavod: string;
  znacky: Znacka[];
  trasa: Poloha[];
  spojnice: Record<number, Poloha[][]>;
  prvni: SnimekPoloh | null;
}) {
  const [snimek, setSnimek] = useState<SnimekPoloh | null>(prvni);
  const [chyba, setChyba] = useState(false);
  const [od, setOd] = useState<number | null>(
    prvni ? Date.parse(prvni.oknoOd ?? prvni.ted) : null,
  );
  const lode = useStopy(snimek?.lode ?? null, od);

  useEffect(() => {
    let zivy = true;
    async function obnov() {
      try {
        const odpoved = await fetch(`/sprava/${serie}/tracker/${zavod}/snimek`, {
          cache: "no-store",
        });
        if (!odpoved.ok) throw new Error(String(odpoved.status));
        const novy = (await odpoved.json()) as SnimekPoloh;
        if (!zivy) return;
        setSnimek(novy);
        setChyba(false);
        setOd((o) => o ?? Date.parse(novy.oknoOd ?? novy.ted));
      } catch {
        // Výpadek nesmí smazat obrazovku: poslední dobrý snímek zůstává.
        if (zivy) setChyba(true);
      }
    }

    const tik = setInterval(() => void obnov(), OBNOVA_MS);
    void obnov();
    return () => {
      zivy = false;
      clearInterval(tik);
    };
  }, [serie, zavod]);

  const ted = snimek ? Date.parse(snimek.ted) : Date.now();

  return (
    <>
      <p className="tracker-stav">
        {!snimek ? (
          "Polohy se zatím nenačetly."
        ) : !snimek.oknoBezi ? (
          <>
            <strong>Okno regaty neběží.</strong> Tracker smí zaznamenávat od
            rozpravy do uzavření závodního dne — co je na mapě, je poslední,
            co došlo.
          </>
        ) : (
          <>
            Okno běží{chyba ? " · obnovení se nedaří, data jsou starší" : ""}.
          </>
        )}
      </p>

      {lode.length > 0 ? (
        <MapaTrackeru znacky={znacky} lode={lode} trasa={trasa} spojnice={spojnice} zive />
      ) : (
        <p className="tracker-prazdno">
          {snimek?.lode.some((l) => l.sirka !== null)
            ? "Stopa se teprve skládá — mapa naskočí s další dávkou poloh."
            : "Zatím se neozvala žádná loď. Mapa se objeví, jakmile přijde první poloha."}
        </p>
      )}

      <h2>Lodě</h2>
      <table className="tracker-lode">
        <thead>
          <tr>
            <th>Loď</th>
            <th>Třída</th>
            <th>Poslední poloha</th>
            <th>Stav</th>
          </tr>
        </thead>
        <tbody>
          {(snimek?.lode ?? []).map((l) => (
            <Radek key={l.lodId} lod={l} ted={ted} />
          ))}
        </tbody>
      </table>
    </>
  );
}

/**
 * Jeden řádek přehledu. <b>Odpovídá na „trackuje nám celé pole?"</b>, takže
 * loď, která mlčí, tu musí být vidět — ne chybět.
 */
function Radek({ lod, ted }: { lod: PolohaLodi; ted: number }) {
  const stari = lod.casGps === null ? null : ted - Date.parse(lod.casGps);
  return (
    <tr className={`tracker-${lod.stav.toLowerCase()}`}>
      <td>
        {lod.lod}
        {lod.cisloPlachty ? <span className="stitek"> {lod.cisloPlachty}</span> : null}
      </td>
      <td>{lod.kategorie ?? "—"}</td>
      <td>{predJakDlouho(stari)}</td>
      <td>{NAZVY_STAVU[lod.stav]}</td>
    </tr>
  );
}
