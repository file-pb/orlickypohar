"use client";

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
export function Infopanel({ zpravy, ted }: { zpravy: ZpravaRegaty[]; ted: number }) {
  if (zpravy.length === 0) return null;

  return (
    <section className="tabule-info" aria-label="Zprávy k regatě">
      <h2>Vydáno k regatě</h2>
      <ul>
        {zpravy.slice(0, 4).map((z) => (
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
