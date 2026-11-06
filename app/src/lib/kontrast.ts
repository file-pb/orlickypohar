/**
 * Které písmo unese barevná výplň.
 *
 * <b>Proč to existuje.</b> Appka kládla na barevné plochy bílou napevno
 * (`s.naBarve` v `odpocet.tsx` a `cil.tsx`). Ve světlém režimu to vycházelo,
 * v tmavém ne: `dark.jede` je `#58c98c` a bílá na něm dává <b>2,07:1</b>,
 * `dark.vystraha` je `#c9922f` a vyjde <b>2,75:1</b> — obojí hluboko pod
 * mezí WCAG 2.2 AA (4,5:1 pro běžný text, 3:1 pro grafiku a velké písmo).
 * A je to zrovna panel „start padl" a poslední minuta odpočtu, tedy to,
 * na co se u startu kouká nejvíc. Změřeno 30. 10. 2026.
 *
 * <b>Kontrola tokenů to nechytila a chytit nemohla.</b>
 * `tools/kontrola-tokenu.py` odvozuje páry z pravidel ve webovém
 * `globals.css`; tenhle pár na webu neexistuje, vzniká až tím, že
 * komponenta položí bílou na token použitý jako <b>výplň</b>.
 *
 * <b>Proč se nevybírá podle režimu, ale podle výplně.</b> „V tmavém režimu
 * tmavé písmo" by bylo na `dark.procedura` (`#16495c`) ještě horší než
 * bílá — tmavé na tmavém. Rozhoduje tedy jas té plochy, ne nastavení
 * telefonu, a počítá se z tokenů, takže to má test bez telefonu
 * (`app/testy/kontrast.test.ts`).
 *
 * <b>Nový token nevznikl schválně.</b> Každý klíč v `theme.ts` musí mít
 * protějšek ve webovém `globals.css` se stejnou hodnotou, jinak kontrola
 * tokenů spadne — a tahle potřeba je jen appky, ne webu. Písmo se proto
 * vybírá z barev, které už v sadě jsou.
 */

import type { Barvy } from '@/constants/theme';

/** Jedna složka barvy na lineární světlo. Vzorec je z WCAG 2.x. */
function slozka(osmibit: number): number {
  const c = osmibit / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Relativní jas barvy `#rrggbb`. */
export function jas(barva: string): number {
  const r = parseInt(barva.slice(1, 3), 16);
  const g = parseInt(barva.slice(3, 5), 16);
  const b = parseInt(barva.slice(5, 7), 16);
  return 0.2126 * slozka(r) + 0.7152 * slozka(g) + 0.0722 * slozka(b);
}

/** Poměr kontrastu dvou barev, 1:1 až 21:1. */
export function pomerKontrastu(a: string, b: string): number {
  const ja = jas(a);
  const jb = jas(b);
  return (Math.max(ja, jb) + 0.05) / (Math.min(ja, jb) + 0.05);
}

/**
 * Písmo na barevnou výplň: ze sady se vezme to, co má na ní nejlepší
 * kontrast.
 *
 * Uchazeči jsou `text`, `papir` a `pozadi` — v obou sadách je mezi nimi
 * jedna skoro bílá a jedna skoro černá, takže je z čeho vybrat bez
 * ohledu na režim.
 */
export function pismoNaVyplni(t: Barvy, vypln: string): string {
  const uchazeci = [t.text, t.papir, t.pozadi];
  return uchazeci.reduce((nej, b) =>
    pomerKontrastu(b, vypln) > pomerKontrastu(nej, vypln) ? b : nej,
  );
}
