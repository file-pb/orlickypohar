import type { Metadata } from "next";
import { pole } from "./plavba";
import { NacrtMapy } from "./mapa";

/**
 * Náčrt živé mapy s falešnou rozjížďkou.
 *
 * <b>Není to funkce webu</b>, je to podklad k rozhodnutí: rozprava
 * 24. 10. 2026 (PLAN.md, *Jak se trackování zobrazuje*) rozhodla o vzhledu
 * stop a o pomyslném pořadí a tohle je nejlevnější způsob, jak se na ně
 * podívat dřív, než vznikne první skutečná trasa. Stránka proto nikde
 * neodkazuje a z vyhledávačů je vyřazená.
 */
export const metadata: Metadata = {
  title: "Náčrt živé mapy",
  robots: { index: false, follow: false },
};

export default function Stranka() {
  const { znacky, lode } = pole();

  return (
    <main className="nacrt-stranka">
      <h1>Náčrt živé mapy</h1>
      <p className="nacrt-varovani">
        <strong>Falešná data.</strong> Rozjížďka je vymyšlená a lodě neexistují.
        Slouží k rozhodnutí o vzhledu, ne k sledování závodu.
      </p>
      <NacrtMapy znacky={znacky} lode={lode} />
    </main>
  );
}
