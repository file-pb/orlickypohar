/**
 * Přesun lodi o místo v zápisu rozjížďky.
 *
 * <b>Vlastní modul, ne `vysledky.ts`.</b> Testy webu běží na holém nodu
 * (`node --experimental-strip-types`), kde se `import type` zahodí, ale
 * běhový `import … from "@/lib/…"` se nerozřeší — a `vysledky.ts` si
 * tahá `tokenZeSezeni` z `@/lib/oidc`. Čistá funkce s testy proto bydlí
 * stranou od volání API.
 */
import type { ZapisRadek } from "./vysledky";

/**
 * Prohodí loď se sousedem v pořadí v cíli. <c>null</c>, když to nejde.
 *
 * <b>Řada je napříč kategoriemi</b>, i když se zapisuje po nich: pořadí
 * v cíli je pořadí dojezdu a s kategorií nemá nic společného. Soused
 * nahoře tedy může být loď, která v tabulce stojí o dvě obrazovky výš.
 *
 * <b>Prohození, ne vsunutí.</b> Vsunutí by přečíslovalo všechny mezi,
 * a to je přesně to, čemu se tahle funkce vyhýbá — díry v číslování
 * (1, 3, 7) jsou legitimní, protože loď mezi nimi může mít kód. Mění se
 * právě dvě čísla a obrazovka o tom napíše větu.
 *
 * Shodné pořadí se nerozsuzuje (ZPJ A7, nález K7), takže dvě lodě na
 * témže místě sousedí v řadě a prohození mezi nimi obě hodnoty nechá —
 * výsledek je tentýž zápis, ne chyba.
 */
export function prohodVRade(
  radky: ZapisRadek[],
  id: number,
  smer: "nahoru" | "dolu",
): { radky: ZapisRadek[]; prohozeno: [number, number] } | null {
  const vRade = radky
    .filter((r): r is ZapisRadek & { poradiVCili: number } => Number.isInteger(r.poradiVCili))
    .sort((a, b) => a.poradiVCili - b.poradiVCili);

  const kde = vRade.findIndex((r) => r.prihlaskaId === id);
  if (kde === -1) return null;

  const soused = kde + (smer === "nahoru" ? -1 : 1);
  if (soused < 0 || soused >= vRade.length) return null;

  const a = vRade[kde];
  const b = vRade[soused];

  return {
    radky: radky.map((r) =>
      r.prihlaskaId === a.prihlaskaId
        ? { ...r, poradiVCili: b.poradiVCili }
        : r.prihlaskaId === b.prihlaskaId
        ? { ...r, poradiVCili: a.poradiVCili }
        : r,
    ),
    prohozeno: [a.prihlaskaId, b.prihlaskaId],
  };
}
