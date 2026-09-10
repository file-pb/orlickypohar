"use client";

import { useEffect, useRef } from "react";

/**
 * Zavře nejbližší `<details>`, když se klepne mimo něj nebo zmáčkne Escape.
 *
 * <b>Jediný javascript v hlavičce, a to schválně.</b> Rozbalování zvládne
 * prohlížeč sám, ale „zavři, když klepnu jinam" se v CSS udělat nedá:
 * plocha, která by klepnutí odchytávala, spolehlivě zachytí i odkazy uvnitř
 * nabídky. Zkoušeno a měřeno — proto těchhle pár řádků.
 *
 * Nevykresluje nic. Chová se k rodičovskému `<details>`, takže značka
 * v hlavičce zůstává serverová.
 */
export function ZavriMimo() {
  const kotva = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const detaily = kotva.current?.closest("details");
    if (!detaily) return;

    const mimo = (e: MouseEvent) => {
      if (detaily.open && !detaily.contains(e.target as Node)) detaily.open = false;
    };
    const klavesa = (e: KeyboardEvent) => {
      if (e.key === "Escape" && detaily.open) detaily.open = false;
    };

    document.addEventListener("click", mimo);
    document.addEventListener("keydown", klavesa);
    return () => {
      document.removeEventListener("click", mimo);
      document.removeEventListener("keydown", klavesa);
    };
  }, []);

  return <span ref={kotva} hidden />;
}
