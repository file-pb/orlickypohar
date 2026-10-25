"use client";

import type { Snimek } from "@/lib/tabule";

/**
 * Panýlky rozjížděk v rohu mapy (Filip, 25. 10. 2026: *„v pravém rohu mapy
 * nahoře bych udělal malé panýlky s čísly rozjížděk a indikací statusu"*).
 *
 * <b>Ta, na které je zrovna pozornost, se rozšíří a řekne co se děje</b>
 * (Filip: *„rozjížďka, na které je zrovna kladena pozornost, by nějak mohla
 * citlivě signalizovat, co se děje"*). Ostatní zůstanou čtverečky s číslem.
 *
 * <b>Citlivě znamená bez blikání.</b> Televize v obýváku dopočítávají
 * mezisnímky a cokoli pulzujícího na nich zdvojí — to už jsme jednou
 * spravovali u karty dojezdu. Pozornost proto nese velikost a text, ne
 * pohyb.
 */

/** Kolik vteřin uplynulo od startu, nebo kolik do něj zbývá. */
function odStartu(startV: string | null, ted: number): number | null {
  if (!startV) return null;
  const t = Date.parse(startV);
  return Number.isFinite(t) ? Math.round((ted - t) / 1000) : null;
}

function mmss(vterin: number): string {
  const s = Math.abs(Math.round(vterin));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Co panýlek řekne. <b>Prázdné znamená „jen číslo"</b> — dokud se na
 * rozjížďce nic neděje, nemá co dodat.
 */
function popis(r: Snimek["rozjizdky"][number], ted: number): string | null {
  const od = odStartu(r.startV, ted);
  if (r.stav === "Probiha") return od !== null && od >= 0 ? `jede se ${mmss(od)}` : "jede se";
  // Odpočet jen těsně před startem: „za 2:30" dvě hodiny dopředu nikoho
  // nezajímá a panýlek by zabíral místo zbytečně.
  if (r.stav === "Planovana" && od !== null && od < 0 && od > -15 * 60) return `start za ${mmss(od)}`;
  if (r.stav === "Zrusena") return "zrušena";
  return null;
}

export function PanylkyRozjizdek({ snimek, ted }: { snimek: Snimek; ted: number }) {
  if (snimek.rozjizdky.length === 0) return null;

  return (
    <div className="rozjizdky-panylky" aria-hidden="true">
      {snimek.rozjizdky.map((r) => {
        const text = popis(r, ted);
        return (
          <i
            key={r.cislo}
            className={`rozjizdka-panylek panylek-${r.stav.toLowerCase()}${
              text ? " panylek-siroky" : ""
            }`}
          >
            <b>{r.cislo}</b>
            {text && <span>{text}</span>}
          </i>
        );
      })}
    </div>
  );
}
