"use client";

import { Karusel, type Panel } from "@/app/serie/[slug]/zavody/[zavod]/tabule/karusel";
import { ZnakTridy } from "@/app/tridy";
import type { Lod } from "../mapa/plavba";

/**
 * Panely živé tabule nad mapou.
 *
 * <b>Tohle není nová tabule</b>, je to ukázka, jak by do té stávající
 * (`serie/[slug]/zavody/[zavod]/tabule/`) zapadl tracker: mapa jako
 * pozadí celé obrazovky a panely, které tabule ukazuje dnes, na ní
 * (Filip, 24. 10. 2026). Karusel je proto tentýž, ne kopie — kdyby se
 * tempo střídání někdy změnilo, změní se oběma najednou.
 *
 * Obsah je vymyšlený, protože náčrt nemá API. Jde o rozvržení.
 */
export function PanelyTabule({ lode }: { lode: Lod[] }) {
  const panely: Panel[] = [
    {
      klic: "rozjizdky",
      nadpis: "Rozjížďky",
      obsah: (
        <ul className="stavy">
          <li>
            <b>1.</b>
            <span className="stitek stav-rozjizdky odjeta">odjetá</span>
          </li>
          <li>
            <b>2.</b>
            <span className="stitek stav-rozjizdky bezi">běží</span>
          </li>
          <li>
            <b>3.</b>
            <span className="stitek stav-rozjizdky planovana">plánovaná</span>
          </li>
        </ul>
      ),
    },
    {
      klic: "trida",
      nadpis: (
        <>
          <ZnakTridy nazev="Race" /> Race
        </>
      ),
      obsah: (
        <ol className="poradi-tabule">
          {lode
            .filter((l) => l.kategorie === "Race")
            .slice(0, 5)
            .map((l, i) => (
              <li key={l.id}>
                <b>{i + 1}.</b> {l.nazev}
              </li>
            ))}
        </ol>
      ),
    },
  ];

  return (
    <div className="nacrt-panely-tv">
      <Karusel panely={panely} />
    </div>
  );
}
