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

/**
 * Kdy začne startovní procedura, v místním čase.
 *
 * Zóna je napevno pražská, ne prohlížečova: tabule visí v hospodě na
 * Orlíku a má říkat tamní čas i tehdy, když ji někdo otevře z jiné
 * zóny — a test pak dává stejný výsledek kdekoli.
 */
function vHodin(kdy: number): string {
  return new Intl.DateTimeFormat("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Prague",
  }).format(new Date(kdy));
}

export type Casomira = { druh: "ceka" | "procedura"; text: string };

/**
 * <b>Malá časomíra k nejbližšímu startu</b> (Filip, 25. 10. 2026:
 * *„přemýšlím, zda by nebyla vhodná nějaká forma malé časomíry
 * (startovní procedura začne v, pak startovní procedura x do startu,
 * rozjížďka probíhá). Ostatní máme."*).
 *
 * Má dvě fáze, protože dvě různé otázky:
 * <ul>
 *   <li><b>čeká</b> — „kdy se zase pojede?" Odpovědí je hodina, ne
 *       odpočet: do odpoledního startu by odpočet běžel hodinu a nikdo
 *       by ho nesledoval.</li>
 *   <li><b>procedura</b> — „za jak dlouho?" Tady už odpočet smysl dává,
 *       protože pět minut se dá odsedět.</li>
 * </ul>
 *
 * Třetí fázi („jede se") nese panýlek té rozjížďky, viz {@link popis} —
 * je to vlastnost jedné rozjížďky, kdežto časomíra mluví o dni.
 *
 * Bere <b>nejbližší</b> plánovanou rozjížďku se startovním časem. Když
 * žádná taková není, vrací `null` a na tabuli po ní nezbyde ani stopa.
 */
export function casomira(snimek: Pick<Snimek, "rozjizdky">, ted: number): Casomira | null {
  let nejblizsi: { do: number; start: number } | null = null;
  for (const r of snimek.rozjizdky) {
    if (r.stav !== "Planovana" || !r.startV) continue;
    const od = odStartu(r.startV, ted);
    if (od === null || od >= 0) continue;
    if (!nejblizsi || -od < nejblizsi.do) nejblizsi = { do: -od, start: Date.parse(r.startV) };
  }
  if (!nejblizsi) return null;
  if (nejblizsi.do <= PROCEDURA_S) {
    return { druh: "procedura", text: `startovní procedura ${mmss(nejblizsi.do)}` };
  }
  return { druh: "ceka", text: `procedura ve ${vHodin(nejblizsi.start - PROCEDURA_S * 1000)}` };
}
