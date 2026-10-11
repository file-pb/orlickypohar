"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lišta s počasím a vodou u spodku okna (Filip, 11. 10. 2026: *„udělej tím
 * 3 cm rozbalovacím"*).
 *
 * <b>Proč lišta a ne widgety pod obsahem.</b> Na telefonu z nich byla půlka
 * stránky a nikdo k nim nerolal; v boku zase nejsou, protože bok má nést
 * pohár. Lišta je ukáže jedním ťuknutím a při čtení nepřekáží.
 *
 * <b>Stojí na `details`, ne na javascriptu.</b> Rozbalení umí prohlížeč sám,
 * stejně jako u tabů tříd, které jsou schválně jen odkazy. Javascript přidá
 * jen zajíždění a zavření zvenčí — když neběží, zůstane lišta, která se dá
 * otevřít, místo widgetů, ke kterým se nikdo nedostane.
 *
 * <b>Zajíždí při rolování dolů, vyjíždí při rolování nahoru.</b> Tohle lidi
 * znají z aplikací a je to jediný způsob, jak mít lištu po ruce a přitom jí
 * neukousnout kus obrazovky natrvalo.
 *
 * <b>Past, kterou iOS staví:</b> pružný konec stránky hýbe `scrollY` i tam,
 * kde se doopravdy neroluje, takže by lišta poskakovala. Proto se nahoře
 * a na konci stránky vyjíždí vždycky a mezi tím rozhoduje až posun o víc
 * než `PRAH`.
 *
 * <b>Rozbalená zůstává stát.</b> Panel se roluje uvnitř sebe; kdyby lišta
 * přitom zajela, zmizel by člověku pod rukama.
 */

/** O kolik se musí stránka pohnout, aby lišta reagovala. Pod tím je to šum. */
const PRAH = 8;

export function PatickaLista({
  souhrn,
  children,
}: {
  /** Co je vidět na zavřené liště: pár čísel, ne nápis „Počasí". */
  souhrn: React.ReactNode;
  children: React.ReactNode;
}) {
  const [otevreno, setOtevreno] = useState(false);
  const [schovana, setSchovana] = useState(false);
  const [toci, setToci] = useState(false);
  const ramec = useRef<HTMLDetailsElement>(null);
  const okno = useRef<HTMLSpanElement>(null);
  const pas = useRef<HTMLSpanElement>(null);

  // Točí se jen tehdy, když se údaje nevejdou (Filip, 11. 10. 2026: *„když
  // je to širší, tak toč jako carousell"*). Když se vejdou, rozprostřou se
  // po liště a stojí — pohyb bez důvodu jen odvádí oči od stránky.
  //
  // Měří se tady, protože CSS porovnat dvě šířky neumí. Druhá kopie pásu
  // je v HTML vždycky; dokud se netočí, CSS ji schová.
  useEffect(() => {
    const prepocitej = () => {
      const o = okno.current;
      const p = pas.current;
      if (!o || !p) return;
      // Pás nese dvě kopie, takže jedna měří polovinu jeho šířky.
      setToci(p.scrollWidth / 2 > o.clientWidth + 1);
    };

    prepocitej();
    const sleduj = new ResizeObserver(prepocitej);
    if (okno.current) sleduj.observe(okno.current);
    return () => sleduj.disconnect();
  }, [souhrn]);

  useEffect(() => {
    if (otevreno) return;

    let posledni = window.scrollY;
    const prescroll = () => {
      const y = window.scrollY;
      const naKonci = y + window.innerHeight >= document.documentElement.scrollHeight - 2;

      if (y <= 0 || naKonci) setSchovana(false);
      else if (Math.abs(y - posledni) > PRAH) setSchovana(y > posledni);

      posledni = y;
    };

    window.addEventListener("scroll", prescroll, { passive: true });
    return () => window.removeEventListener("scroll", prescroll);
  }, [otevreno]);

  // Zavřít zvenčí: klávesou i ťuknutím mimo panel. Obojí je očekávané
  // a bez nich zůstane panel přes obsah, na který se člověk chtěl vrátit.
  useEffect(() => {
    if (!otevreno) return;

    const zavri = () => {
      if (ramec.current) ramec.current.open = false;
      setOtevreno(false);
    };
    const klavesa = (e: KeyboardEvent) => {
      if (e.key === "Escape") zavri();
    };
    const mimo = (e: PointerEvent) => {
      if (!ramec.current?.contains(e.target as Node)) zavri();
    };

    document.addEventListener("keydown", klavesa);
    // `capture`, aby zavření předběhlo kliknutí na obsah pod panelem.
    document.addEventListener("pointerdown", mimo, true);
    return () => {
      document.removeEventListener("keydown", klavesa);
      document.removeEventListener("pointerdown", mimo, true);
    };
  }, [otevreno]);

  return (
    <details
      ref={ramec}
      className={`paticka-pocasi${schovana && !otevreno ? " schovana" : ""}${
        toci ? " toci" : ""
      }`}
      // Stav drží `details` samo; React se o něm jen dozví, aby věděl,
      // že nemá zajíždět. Řídit `open` z Reactu by při nativním rozbalení
      // dvakrát přepsalo totéž.
      onToggle={(e) => setOtevreno(e.currentTarget.open)}
    >
      <summary className="paticka-lista">
        <span className="paticka-souhrn" ref={okno}>
          <span className="paticka-pas" ref={pas}>
            <span className="paticka-kopie">{souhrn}</span>
            {/* Druhá kopie, aby pás dojel do stejného obrázku a mohl
                začít znovu bez skoku. Pro čtečku je to tentýž text
                podruhé, proto schovaná. */}
            <span className="paticka-kopie paticka-dalsi" aria-hidden="true">
              {souhrn}
            </span>
          </span>
        </span>
        <span className="paticka-sipka" aria-hidden="true" />
        <span className="paticka-popis">{otevreno ? "Zavřít" : "Počasí a voda"}</span>
      </summary>
      <div className="paticka-obsah">{children}</div>
    </details>
  );
}
