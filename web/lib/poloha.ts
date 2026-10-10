/**
 * Poloha zapsaná jedním řádkem.
 *
 * <b>Filip, 10. 10. 2026:</b> *„Souřadnice by i u koupacího mola na
 * pravoboku měla jít zadat v jednom řádku, nevím proč je na dva."* Měl
 * pravdu a moje obhajoba dvou polí byla špatná: bránil jsem se záměně
 * desetinné čárky za oddělovač a zaplatil to tím, že se formulář nedal
 * přečíst. Ta záměna je skutečná, ale patří do parseru, ne do rozhraní.
 *
 * <b>Jak se pozná oddělovač od desetinné čárky:</b> nejdřív se zkusí
 * středník, pak mezera. Teprve když tam ani jedno není, rozhoduje počet
 * čárek — dvě čísla s tečkami dají dva kusy, dvě čísla s čárkami čtyři.
 * Tři čárky jsou nejednoznačné a radši se odmítnou, než aby se hádalo.
 */
export type Poloha = { sirka: number; delka: number };

export const PRIKLAD = "49.5163 14.1651";

export function polohaZRadku(text: string): Poloha | string {
  const vstup = text.trim();
  if (!vstup) return "Zadej polohu.";

  const kusy = rozdel(vstup);
  if (typeof kusy === "string") return kusy;

  const [a, b] = kusy.map(cislo);
  if (!Number.isFinite(a) || !Number.isFinite(b))
    return `Tohle nejsou dvě čísla. Zkus to jako „${PRIKLAD}".`;

  // Orlík leží kolem 49,5 severní šířky a 14,2 východní délky. Prohozené
  // pořadí je na vodě pravděpodobnější překlep než loď u rovníku, takže
  // se odmítne místo toho, aby se mlčky nakreslila bóje do Afriky.
  if (a < -90 || a > 90) return "Zeměpisná šířka je mimo rozsah −90 až 90. Nemáš prohozené pořadí?";
  if (b < -180 || b > 180) return "Zeměpisná délka je mimo rozsah −180 až 180.";

  return { sirka: a, delka: b };
}

/**
 * Jeden kus na číslo. <b>Oddělovač na kraji se odřízne dřív</b>, než se
 * čárka vyloží jako desetinná — „49.5163," po rozdělení mezerou jinak
 * skončí jako „49.5163." a je z toho NaN. Právě tenhle zápis (čárka
 * a mezera) lidi píšou nejčastěji.
 */
function cislo(kus: string): number {
  return Number(kus.trim().replace(/^[,;]+|[,;]+$/g, "").replace(",", "."));
}

function rozdel(vstup: string): string[] | string {
  for (const oddelovac of [";", /\s+/]) {
    const kusy = vstup.split(oddelovac).filter((k) => k.trim() !== "");
    if (kusy.length === 2) return kusy;
    if (kusy.length > 2) return `Čekám dvě čísla, přišlo ${kusy.length}. Zkus „${PRIKLAD}".`;
  }

  const carky = vstup.split(",").filter((k) => k.trim() !== "");
  if (carky.length === 2) return carky; // „49.5163,14.1651"
  if (carky.length === 4) return [`${carky[0]},${carky[1]}`, `${carky[2]},${carky[3]}`];

  return `Nepoznám, kde končí první číslo. Napiš to s mezerou: „${PRIKLAD}".`;
}
