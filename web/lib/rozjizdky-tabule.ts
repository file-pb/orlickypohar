import type { Snimek } from "@/lib/tabule";

/**
 * Co tabule říká o rozjížďkách — pravidla zvlášť od vykreslování.
 *
 * Je to tentýž důvod jako u `poradi-na-vode.ts`: kdy se ukáže startovní
 * procedura a co napíše panýlek je pravidlo, ne kreslení, a chce to umět
 * ověřit bez prohlížeče (`web/testy/rozjizdky.test.ts`). V mocku se to
 * nedá zahlédnout, protože tam žádná rozjížďka nečeká na start.
 */

export type Rozjizdka = Snimek["rozjizdky"][number];

/** Kolik vteřin uplynulo od startu; záporné číslo znamená „do startu". */
export function odStartu(startV: string | null, ted: number): number | null {
  if (!startV) return null;
  const t = Date.parse(startV);
  return Number.isFinite(t) ? Math.round((ted - t) / 1000) : null;
}

export function mmss(vterin: number): string {
  const s = Math.abs(Math.round(vterin));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Co panýlek řekne. <b>Prázdné znamená „jen číslo"</b> — dokud se na
 * rozjížďce nic neděje, nemá co dodat.
 *
 * Odpočet před startem tu schválně není: ten nese štítek vlevo od
 * panýlků (Filip, 25. 10. 2026), a dvakrát totéž na jednom pásu by se
 * přebíjelo.
 */
export function popis(r: Rozjizdka, ted: number): string | null {
  const od = odStartu(r.startV, ted);
  if (r.stav === "Probiha") return od !== null && od >= 0 ? `jede se ${mmss(od)}` : "jede se";
  if (r.stav === "Zrusena") return "zrušena";
  return null;
}

/**
 * Jak dlouho před startem běží startovní procedura.
 *
 * Pět minut je obvyklý začátek (návěst třídy), takže tolik tabule hlídá.
 * Přesné vlajky a jejich časy si řídí rozhodčí; tabule říká jen, že
 * procedura běží a kolik zbývá.
 */
export const PROCEDURA_S = 5 * 60;

/**
 * Běží startovní procedura? Vrací, kolik vteřin do startu zbývá — nebo
 * `null`, když se zrovna nestartuje.
 */
export function procedura(snimek: Pick<Snimek, "rozjizdky">, ted: number): number | null {
  for (const r of snimek.rozjizdky) {
    if (r.stav !== "Planovana") continue;
    const od = odStartu(r.startV, ted);
    if (od !== null && od < 0 && od >= -PROCEDURA_S) return -od;
  }
  return null;
}
