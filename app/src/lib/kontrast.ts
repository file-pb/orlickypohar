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

/** WCAG 2.2 AA: běžný text. */
export const MEZ_TEXT = 4.5;

/** WCAG 2.2 AA: grafický prvek a velké písmo. */
export const MEZ_GRAFIKA = 3;

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

/**
 * Grafický prvek na výplni: zamýšlená barva, dokud na té ploše drží mez,
 * jinak ustoupí písmu panelu.
 *
 * <b>Proč to nejde vyřešit jinou pevnou barvou.</b> Proužky fází na panelu
 * odpočtu nesou barvy znamení (bílá vlajka, žlutý přípravný) a panel má
 * dvě výplně — modrou `procedura` a jantarovou `vystraha` v poslední
 * minutě. Změřeno 6. 11. 2026: <b>v tmavé sadě neexistuje barva, která by
 * držela 3:1 proti oběma</b>. Jantar (jas 0,332) chce protějšek s jasem
 * nejvýš 0,077; modrá (jas 0,057) chce buď nejméně 0,271, nebo zápornou
 * hodnotu, která neexistuje. Ty dva rozsahy se neprotínají, takže barva
 * proužku <b>musí</b> záviset na ploše pod ním.
 *
 * Co z toho plyne na obrazovce: na modrém panelu zůstávají barvy znamení,
 * jak byly (9,81 a 5,84 v tmavé sadě), a ustoupí jen tam, kde by zmizely
 * — v poslední minutě na jantaru. Tam jsou ostatně úseky výzvy a přípravy
 * dávno plné a jediný, který se ještě hýbe, je ten minutový, takže se
 * rozlišením barev nic neztrácí.
 */
export function barvaNaVyplni(t: Barvy, vypln: string, zamyslena: string): string {
  return pomerKontrastu(zamyslena, vypln) >= MEZ_GRAFIKA
    ? zamyslena
    : pismoNaVyplni(t, vypln);
}

/**
 * Táž barva průhledně — pro žlábek, ve kterém proužek roste.
 *
 * Poměr kontrastu nad průhlednou vrstvou spočítat nejde (záleží na tom,
 * co je pod ní), takže žlábek žádnou mez nehlídá; drží jen to, že je ze
 * stejné barvy jako proužek, a tedy viditelný na téže ploše.
 */
export function sPruhlednosti(barva: string, podil: number): string {
  const alfa = Math.round(Math.min(Math.max(podil, 0), 1) * 255)
    .toString(16)
    .padStart(2, '0');
  return barva + alfa;
}
