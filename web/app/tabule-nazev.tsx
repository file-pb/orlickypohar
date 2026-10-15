"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LOGO } from "@/app/znacka-loga";

/**
 * Název závodu na tabuli ve stejné grafice jako nápis „Orlická série"
 * (Filip, 15. 10. 2026: *„Jarní vítr v grafice, jako mají stránky nápis
 * Orlická série, ale zarovnané na střed"*).
 *
 * <b>Živý text, ne hotové křivky.</b> Nápis u loga vyrábí
 * `web/scripts/napis.py` jako cesty, protože se nikdy nemění. Název
 * závodu se mění s každou regatou, takže se kreslí jako `<text>` toutéž
 * Inter Black (podmnožina z `web/scripts/pismo-nadpis.py`, 7 kB) a týmž
 * vzorem proužků. Stejné písmo a stejné proužky znamenají stejnou
 * grafiku, i když cesta k ní je jiná.
 */

/** Výška verzálek Interu v em — totéž číslo jako `app/scripts/ikona.py`. */
const VERZALKY = 1490 / 2048;
/**
 * Výška verzálek, pro kterou jsou proužky navržené (`napis.py`, monitor).
 * Hustota proužků se k ní přepočítává, aby nápis u loga a název závodu
 * měly proužky stejně husté bez ohledu na to, jak velká je obrazovka.
 */
const VERZALKA_PREDLOHY = 190;

export function NazevZavodu({ text }: { text: string }) {
  const pismo = useRef<SVGTextElement>(null);
  const pruhy = `nazev-pruhy-${useId().replace(/:/g, "")}`;
  // Perioda 0 = ještě neměřeno; do té doby se kreslí plnou barvou, což je
  // horší, ale čitelné. Proužky o nulové periodě by nenakreslily nic.
  const [perioda, setPeriodu] = useState(0);

  useEffect(() => {
    let zivy = true;
    const zmer = () => {
      const el = pismo.current;
      if (!el || !zivy) return;
      const px = parseFloat(getComputedStyle(el).fontSize);
      setPeriodu((px * VERZALKY * LOGO.pruhy.perioda) / VERZALKA_PREDLOHY);
    };
    zmer();
    // Písmo dorazí až po prvním vykreslení a mění výšku verzálek; bez
    // tohohle by proužky zůstaly v hustotě náhradního písma.
    document.fonts?.ready.then(zmer).catch(() => {});
    window.addEventListener("resize", zmer);
    return () => {
      zivy = false;
      window.removeEventListener("resize", zmer);
    };
  }, [text]);

  const tloustka = (perioda * LOGO.pruhy.tloustka) / LOGO.pruhy.perioda;

  return (
    // Třída `logo` tu není kvůli vzhledu, ale kvůli paletě: `--logo-napis`
      // je definovaný na ní, včetně tmavé varianty. Bez něj by proužky
      // spadly na výchozí černou a na tmavé tabuli by nápis zmizel.
      <svg className="logo tabule-nazev" role="img" aria-label={text}>
      <defs>
        {perioda > 0 && (
          <pattern id={pruhy} patternUnits="userSpaceOnUse" width={perioda} height={perioda}>
            <rect className="logo-pruhy" width={perioda} height={tloustka} />
          </pattern>
        )}
      </defs>
      <text
        ref={pismo}
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fill={perioda > 0 ? `url(#${pruhy})` : "var(--logo-napis)"}
      >
        {text}
      </text>
    </svg>
  );
}
