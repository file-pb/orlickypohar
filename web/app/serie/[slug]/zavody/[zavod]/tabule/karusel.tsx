"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Panel, který se střídá sám (Filip, 15. 10. 2026: *„rozjeď ty třídy
 * lodí v karuselech"*, *„na startu a rozjížďky se dá udělat karuselem
 * taky… tím se ušetří jedna tabulka"*).
 *
 * <b>Obecný, ne jeden na třídy a druhý na pole.</b> Jsou to dvě různé
 * sady panelů, ale totéž chování: střídat, ukázat tečkami kolik jich
 * je, nenabízet nic k proklikání. Dvě kopie téhož by se rozešly při
 * první změně rychlosti.
 *
 * <b>Žádné šipky ani tečky k proklikání.</b> Na televizi není kam
 * klepnout; tečky jsou tu jen proto, aby divák viděl, že se panel za
 * chvíli změní. Jinak by čekal, že vidí všechno.
 */

/** Jak dlouho jeden panel visí. Dost na přečtení deseti řádků přes místnost. */
const PANEL_MS = 9000;

export type Panel = { klic: string; nadpis: ReactNode; obsah: ReactNode };

export function Karusel({ panely }: { panely: Panel[] }) {
  const [kde, setKde] = useState(0);

  // Panelů může ubýt (třída se odhlásí, vyhlásí se jen celkové pořadí),
  // takže index se musí vejít i po obnovení dat.
  const index = panely.length > 0 ? kde % panely.length : 0;

  useEffect(() => {
    if (panely.length < 2) return;
    const tik = setInterval(() => setKde((k) => k + 1), PANEL_MS);
    return () => clearInterval(tik);
  }, [panely.length]);

  if (panely.length === 0) return null;
  const panel = panely[index];

  return (
    <section className="karusel">
      <h2>
        {panel.nadpis}
        {panely.length > 1 && (
          <span className="tecky" aria-hidden="true">
            {panely.map((p, i) => (
              <i key={p.klic} className={i === index ? "ted" : undefined} />
            ))}
          </span>
        )}
      </h2>
      {/* Klíč na obsahu: při přepnutí React vymění celý podstrom, takže
          animace naběhne znovu. Bez něj by se jen přepsaly řádky. */}
      <div className="panel" key={panel.klic}>
        {panel.obsah}
      </div>
    </section>
  );
}
