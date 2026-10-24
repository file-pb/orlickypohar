import type { Metadata } from "next";
import { cestaProMereni, mrizkaVody, spojniceTrati, type Poloha, type UzelTrati } from "@/lib/voda";
import { Z_NEJMENE, Z_NEJVIC } from "@/lib/mapa";
import { pole } from "../mapa/plavba";
import { NacrtMapy } from "../mapa/mapa";

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
 * Týž náčrt v rozložení pro televizi v hospodě.
 *
 * <b>Co se mění proti `/nacrt/mapa`</b> (Filip, 24. 10. 2026): mizí celé
 * ovládání, protože na tabuli není kam klepnout — zaškrtávátka, karta po
 * kliknutí, taby tříd, posuvník času. Čas běží sám, třídy se střídají
 * samy a mapa dostane většinu plochy.
 *
 * <b>Proč stálá plocha, a ne panel v karuselu:</b> tabule střídá panely
 * po devíti vteřinách (`tabule/karusel.tsx`), kdežto režie mapy pracuje
 * v taktech desítek vteřin — kolotoč drží loď minutu, souboj půldruhé.
 * Do devítisekundového okna by se nevešel jediný celý záběr a divák by
 * viděl samé začátky.
 */
export const metadata: Metadata = {
  title: "Náčrt tabule",
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
    <main className="nacrt-stranka nacrt-stranka-tv">
      {/*
        Nadpis a varovný rámeček z náčrtu by tu ukrojily pruh obrazovky,
        kterou chceme celou pro mapu (Filip, 24. 10. 2026). Zbývá proužek
        dole, kde stejně nic není.
      */}
      <p className="nacrt-pasek-tv">
        náhled tabule · falešná data · čas běží 2× rychleji než na ostro
      </p>
      <NacrtMapy znacky={znacky} lode={lode} trasa={trasa} spojnice={spojnice} tabule />
    </main>
  );
}
