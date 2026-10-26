"use client";

import { useEffect, useState } from "react";
import type { ZpravaRegaty } from "@/lib/api";

/**
 * Vývěska regaty na tabuli (Filip, 26. 10. 2026: *„infopanel, kde budeme
 * zobrazovat informace vydané k regatě, jako např. že rozprava bude tehdy
 * a tehdy tam a tam, nebo že start první rozjížďky se odkládá po přechodu
 * bouřky"*).
 *
 * <b>Výstraha nahoru, pak podle stáří.</b> Řadí to už server, ale pravidlo
 * patří i sem: na obrazovku se vejde pár řádků a bouřka nesmí skončit pod
 * oznámením o rozpravě.
 *
 * <b>Nic nebliká a nic nenajíždí.</b> Televize dopočítává mezisnímky
 * a pohyb zdvojuje — to už jsme spravovali u karty dojezdu i u panelů
 * karuselu.
 */
/**
 * Kolik zpráv se na tabuli vejde naráz. Víc řádků by ukrojilo plochu
 * startovní listině a z dálky by se stejně slily.
 */
const NARAZ = 4;

/** Jak dlouho jedna stránka zpráv vydrží, než se posune. */
const STRIDANI_MS = 9000;

export function Infopanel({ zpravy, ted }: { zpravy: ZpravaRegaty[]; ted: number }) {
  /**
   * <b>Výstrahy stojí, ostatní se střídají</b> (návrh pro osm zpráv,
   * Filip 26. 10. 2026). Bouřka nesmí odrotovat pryč, kdežto tři
   * oznámení o programu se vystřídat můžou — a divák má vědět, že jich
   * je víc, proto tečky.
   */
  const vystrahy = zpravy.filter((z) => z.druh === "Vystraha");
  const ostatni = zpravy.filter((z) => z.druh !== "Vystraha");
  const mist = Math.max(1, NARAZ - vystrahy.length);
  const stranek = Math.max(1, Math.ceil(ostatni.length / mist));

  const [strana, setStranu] = useState(0);
  useEffect(() => {
    if (stranek <= 1) return;
    const tik = setInterval(() => setStranu((s) => (s + 1) % stranek), STRIDANI_MS);
    return () => clearInterval(tik);
  }, [stranek]);
  useEffect(() => setStranu(0), [stranek]);

  if (zpravy.length === 0) return null;

  const videt = [
    ...vystrahy.slice(0, NARAZ),
    ...ostatni.slice(strana * mist, strana * mist + mist),
  ];

  return (
    <section className="tabule-info" aria-label="Zprávy k regatě">
      <h2>
        Vydáno k regatě
        {stranek > 1 && (
          <span className="tabule-info-tecky" aria-hidden="true">
            {Array.from({ length: stranek }, (_, i) => (
              <i key={i} className={i === strana ? "ted" : undefined} />
            ))}
          </span>
        )}
      </h2>
      <ul>
        {videt.map((z) => (
          <li key={z.id} className={`zprava zprava-${z.druh.toLowerCase()}`}>
            <span className="zprava-text">{z.text}</span>
            <span className="zprava-kdy">{predChvili(z.vydanoV, ted)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Jak dávno to bylo. <b>Relativně, ne hodinou</b>: na tabuli jde o to,
 * jestli je zpráva čerstvá, a „před 5 min" se přečte rychleji než „10:42“.
 * Od hodiny výš se to láme na hodiny — přesnost na minutu tam už nikoho
 * nezajímá.
 */
function predChvili(kdy: string, ted: number): string {
  const vteriny = Math.max(0, Math.round((ted - Date.parse(kdy)) / 1000));
  if (vteriny < 90) return "právě teď";
  const minut = Math.round(vteriny / 60);
  if (minut < 60) return `před ${minut} min`;
  const hodin = Math.round(minut / 60);
  return `před ${hodin} ${hodin === 1 ? "hodinou" : hodin < 5 ? "hodinami" : "hodinami"}`;
}
