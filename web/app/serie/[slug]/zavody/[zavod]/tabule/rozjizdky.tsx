"use client";

import type { Snimek } from "@/lib/tabule";
import { mmss, popis, procedura } from "@/lib/rozjizdky-tabule";

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

export function PanylkyRozjizdek({ snimek, ted }: { snimek: Snimek; ted: number }) {
  if (snimek.rozjizdky.length === 0) return null;

  const doStartu = procedura(snimek, ted);

  return (
    <div className="rozjizdky-panylky" aria-hidden="true">
      {/* <b>Startovní procedura stojí před čísly</b> (Filip, 25. 10. 2026).
          Je to moment dne, ne vlastnost jedné rozjížďky — a když neběží,
          není tu po ní ani stopa. */}
      {doStartu !== null && (
        <i className="rozjizdka-procedura">startovní procedura {mmss(doStartu)}</i>
      )}
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
