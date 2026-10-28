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

/** „jedna rozjížďka", „pět rozjížděk" — do věty o tom, co se odjelo. */
function rozjizdek(kolik: number): string {
  return `${kolik} ${kolik === 1 ? "rozjížďka" : kolik < 5 ? "rozjížďky" : "rozjížděk"}`;
}

/**
 * Jedna věta o tom, kde je závodní den. <b>Pravidlo, ne vykreslování</b>,
 * ze stejného důvodu jako zbytek tohohle souboru.
 *
 * Dvě věci, které to říkalo špatně (změřeno 28. 10. 2026):
 *
 * <ul>
 *   <li><b>„Čeká se na rozpravu" po rozpravě.</b> Věta byla poslední
 *       možnost v řadě, takže platila vždycky, když žádná rozjížďka nemá
 *       čas startu — tedy i hodinu po rozpravě. Že den začal, se pozná
 *       podle okna: to otevírá rozprava.</li>
 *   <li><b>„Čeká se na rozpravu" u odjeté regaty.</b> Ročník se skrytými
 *       výsledky nevydá rozjížďky vůbec (`ZavodEndpoints`, zkratka hned
 *       za načtením závodu), takže tabule nemá co počítat a odjetá regata
 *       vypadala jako regata před startem. Stav zastávky ale ven jde.</li>
 * </ul>
 */
export function stavDne(
  snimek: Pick<Snimek, "rozjizdky" | "stav" | "vysledkySkryte" | "oknoDo">,
  ted: number,
): string {
  if (snimek.rozjizdky.some((r) => r.stav === "Probiha"))
    return "Rozjížďka běží — na mapu se lodě objeví, jakmile začnou hlásit polohu.";

  const hodiny = casomira(snimek, ted);
  if (hodiny) return hodiny.text;

  const odjeto = snimek.rozjizdky.filter((r) => r.stav === "Dokoncena").length;
  if (odjeto > 0) return `Odjeto ${rozjizdek(odjeto)}`;

  // Čísla nejsou venku, ale že se jelo, tabule ví ze stavu zastávky.
  if (snimek.vysledkySkryte && snimek.stav === "Odjety")
    return "Odjeto — výsledky ročník zatím nezveřejnil.";

  // Okno otevírá rozprava, takže už proběhla. Po jeho tvrdém konci se
  // netvrdí nic: mohlo se zavřít dřív a tabule o tom neví.
  //
  // <b>Tenhle předpoklad má datum spotřeby.</b> Nález R3 v
  // `docs/OPONENTURA-ROZHODCI.md` chce brát trasy už od fáze přihlášek,
  // ne od rozpravy — až se to udělá, okno přestane být tím, co o začátku
  // dne rozhoduje, a tahle větev bude tvrdit „po rozpravě" o dni, který
  // rozprava neotevřela. Čím ji nahradit, se pozná teprve tam; do té doby
  // je `oknoDo` jediný údaj o začátku dne, který jde ven.
  const konec = snimek.oknoDo ? Date.parse(snimek.oknoDo) : NaN;
  if (Number.isFinite(konec) && ted < konec) return "Po rozpravě — čeká se na start";

  return "Čeká se na rozpravu";
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
