import type { Metadata } from "next";
import { cestaProMereni, mrizkaVody, spojniceTrati, type Poloha, type UzelTrati } from "@/lib/voda";
import { Z_NEJMENE, Z_NEJVIC } from "@/lib/mapa";
import { pole } from "./plavba";
import { MapaTrackeru } from "@/app/mapa-trackeru";

/**
 * O kolik se měřicí trasa drží dál od břehu.
 *
 * <b>Odhad, ne měření.</b> Batymetrii Orlíku nemáme; tahle hodnota říká
 * jen „ne u samého kraje". Po první sezóně se dá opravit podle skutečných
 * stop — kudy za celou regatu neplula ani jedna ze čtyřiceti lodí, tam se
 * jet nedá.
 */
const ODSTUP_M = 60;

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

  // <b>Trasa se počítá tady, na serveru</b> — mřížka vody má desítky tisíc
  // buněk a obrys nádrže nemá co dělat v prohlížeči. Na ostro to bude
  // stejně: pořadí počítá server při příjmu dávky.
  const uzly: Poloha[] = znacky.map((m) => ({ sirka: m.sirka, delka: m.delka }));
  const mrizka = mrizkaVody(uzly);
  const trasa: Poloha[] = [];
  for (let i = 0; i < uzly.length - 1; i++) {
    const noha = cestaProMereni(mrizka, uzly[i], uzly[i + 1], ODSTUP_M);
    if (noha) trasa.push(...(i === 0 ? noha : noha.slice(1)));
  }

  // Kolik si trasa zajede proti přímce — doklad, že opravdu vede po vodě.
  const metry = (a: Poloha, b: Poloha) => {
    const kosinus = Math.cos((a.sirka * Math.PI) / 180);
    return Math.hypot(
      (b.delka - a.delka) * 111_320 * kosinus,
      (b.sirka - a.sirka) * 111_320,
    );
  };
  const delkaTrasy = trasa.reduce((s, b, i) => (i ? s + metry(trasa[i - 1], b) : 0), 0);
  const delkaPrimo = uzly.reduce((s, b, i) => (i ? s + metry(uzly[i - 1], b) : 0), 0);

  /**
   * Spojnice trati, jak ji kreslí návrhář — <b>ta vyladěná</b>, s obloučky
   * obeplutí a rozestupem noh (Filip, 24. 10. 2026: *„trasa, co už
   * v návrháři, a prvky na vodě to máme vyladěné, to tam může být
   * optionally k zobrazení"*). Není to měřicí trasa: tahle se ukazuje,
   * tamta ne.
   *
   * <b>Počítá se pro každé přiblížení zvlášť</b>, protože `spojniceTrati`
   * bere metry na pixel a podle nich zvětšuje obloučky. Na ostro to je
   * server-side render mapky, tady se pošle rovnou všech šest variant —
   * dohromady pár set bodů.
   */
  const stredSirka = uzly.reduce((s, u) => s + u.sirka, 0) / uzly.length;
  const naPixelPriZ0 = 156_543.03 * Math.cos((stredSirka * Math.PI) / 180);
  const uzlyTrati: UzelTrati[] = znacky.map((m) => ({
    poloha: { sirka: m.sirka, delka: m.delka },
    bok: m.typ === "OtocnaBoje" ? "PoLeve" : null,
    otaci: m.typ === "OtocnaBoje",
  }));
  const spojnice: Record<number, Poloha[][]> = {};
  for (let z = Z_NEJMENE + 2; z <= Z_NEJVIC; z++) {
    spojnice[z] = spojniceTrati(uzlyTrati, naPixelPriZ0 / 2 ** z);
  }

  return (
    <main className="nacrt-stranka">
      <h1>Náčrt živé mapy</h1>
      <p className="nacrt-varovani">
        <strong>Falešná data.</strong> Rozjížďka je vymyšlená a lodě neexistují.
        Slouží k rozhodnutí o vzhledu, ne k sledování závodu.
      </p>
      <p className="nacrt-vysvetlivka">
        Pořadí se počítá po trase, která se nikde nekreslí: {trasa.length} bodů
        po vodě, {Math.round(delkaTrasy)} m proti {Math.round(delkaPrimo)} m
        přímo mezi značkami.
      </p>
      <MapaTrackeru znacky={znacky} lode={lode} trasa={trasa} spojnice={spojnice} />
    </main>
  );
}
