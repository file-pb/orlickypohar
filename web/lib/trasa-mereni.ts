import { cestaProMereni, mrizkaVody, type Poloha } from "./voda";

/**
 * Měřicí trasa trati — <b>po vodě, ne přes kopec</b>.
 *
 * Pořadí na trati se počítá tak, že se z lodi spustí kolmice na trasu
 * a bere se, kam padne (Filipův návrh, 26. 10. 2026). Trasa tím pádem
 * rozhoduje o pořadí, i když ji nikdo nevidí — a dokud ji veřejná tabule
 * neměla, skládala si ji z přímek mezi značkami. Orlík je zatopené údolí,
 * takže přímka mezi dvěma bójemi vede přes kopec častěji, než by člověk
 * řekl (noha 600–1 200 m v 65 % případů, změřeno v `voda.ts`), a kolmice
 * na takovou trasu měří po souši (Filip, 26. 10. 2026: *„i ta neviditelná
 * trasa, podle které se měří kolmice, jela jinudy, než měla"*).
 *
 * Počítá se **touž technikou, jakou už umí návrhář i správa trackeru** —
 * A* přes mřížku nádrže s odstupem od břehu. Filip: *„když už umíme
 * vypočítat trasu podle prvků na vodě a jednou jsme ji nakreslili dobře,
 * tak proč u pomocného neviditelného trasování nepoužijeme stejnou
 * techniku?"*
 *
 * <b>Jen na serveru.</b> Mřížka má desítky tisíc buněk a obrys nádrže
 * nemá co dělat v prohlížeči — tenhle modul se proto nesmí dostat do
 * klientského balíku.
 */

/** Jak daleko od břehu se trasa snaží držet. Totéž jako v návrháři. */
const ODSTUP_M = 60;

/** Spočítaná trasa pro jednu trať. Tratí je za den pár, prohlížečů víc. */
const spocitane = new Map<string, Poloha[]>();

/** Kolik tratí si pamatovat. Víc než den provozu jednoho závodiště. */
const PAMET = 32;

/**
 * Trasa přes značky v pořadí, po vodě. Prázdné pole, když trať nemá
 * aspoň dva prvky — pak si mapa poradí sama a měří po přímkách.
 */
export function trasaMereni(znacky: { poradi: number; sirka: number; delka: number }[]): Poloha[] {
  if (znacky.length < 2) return [];

  const uzly: Poloha[] = [...znacky]
    .sort((a, b) => a.poradi - b.poradi)
    .map((m) => ({ sirka: m.sirka, delka: m.delka }));

  // Klíč je sama trať: dokud se nezmění značky, počítá se jednou.
  const klic = uzly.map((u) => `${u.sirka.toFixed(6)},${u.delka.toFixed(6)}`).join(";");
  const hotova = spocitane.get(klic);
  if (hotova) return hotova;

  const mrizka = mrizkaVody(uzly);
  const trasa: Poloha[] = [];
  for (let i = 0; i < uzly.length - 1; i++) {
    const noha = cestaProMereni(mrizka, uzly[i], uzly[i + 1], ODSTUP_M);
    // Nohu, kterou mřížka nenajde, nahradí přímka — pořadí bez ní
    // přestane růst a loď by na téhle noze zamrzla.
    const kusy = noha ?? [uzly[i], uzly[i + 1]];
    trasa.push(...(i === 0 ? kusy : kusy.slice(1)));
  }

  if (spocitane.size >= PAMET) spocitane.delete(spocitane.keys().next().value!);
  spocitane.set(klic, trasa);
  return trasa;
}
