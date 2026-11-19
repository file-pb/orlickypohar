/**
 * Kódy závodních pravidel.
 *
 * <b>Vlastní soubor, ne `vysledky.ts`.</b> Tamten si tahá `tokenZeSezeni`
 * z `@/lib/oidc`, a testy webu běží na holém nodu, kde se běhový import
 * přes `@/` nerozřeší. Čtení papírového zápisu ty kódy potřebuje a chce
 * mít testy, takže bydlí stranou od volání API — stejně jako `presun.ts`
 * a `workflow.ts`. `vysledky.ts` je re-exportuje, aby obrazovky nemusely
 * vědět, kde přesně leží.
 */
import type { components } from "./schema";

/** Kód bez `null` — `null` znamená „žádný kód“, ne kód jménem null. */
export type KodVysledku = NonNullable<components["schemas"]["KodVysledku"]>;

/**
 * Kódy závodních pravidel tak, jak je čte pořadatel. Zkratka se nepřekládá
 * — stojí tak na papíře z cíle — ale co znamená, se hodí mít vedle.
 *
 * Pořadí je podle toho, jak často se na vodě stávají, ne podle závažnosti:
 * v rozbalovátku se hledá `DNF`, ne `RDG`.
 */
export const KODY: Record<KodVysledku, string> = {
  Dnf: "nedokončila",
  Dns: "nestartovala",
  Ret: "odstoupila",
  Ocs: "předčasný start",
  Dsq: "diskvalifikace",
  Dnc: "nezúčastnila se",
  Rdg: "náprava",
  // Čtyři kódy z 28. 10. 2026 (nálezy K1 a R14). Popisek říká, co kód
  // znamená pro loď — ne číslo pravidla: ten, kdo zapisuje, hledá „co se
  // té lodi stalo", a ZPJ si přečte ve vypsání. Pozor: startovní tresty
  // jsou na poháru dohoda z rozpravy, ne ZPJ 30 (nález R16).
  Zfp: "bodový trest 20 %",
  Ufd: "diskvalifikace od startu",
  Bfd: "diskvalifikace černou vlajkou",
  Dne: "diskvalifikace, nelze vyškrtnout",
};
