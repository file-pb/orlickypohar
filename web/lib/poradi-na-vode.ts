/**
 * Pomyslné pořadí na vodě — jediné místo, kde se rozhoduje, kdo je kolikátý.
 *
 * <b>Dojetá loď se v pořadí nehýbe</b> (Filip, 25. 10. 2026: *„po jetí do
 * cíle se stále swapují lodě v ranku, to už by nemělo"*). Postup po trase
 * se počítá z průmětu polohy na trať a **může klesnout** — loď po dojezdu
 * stáčí k přístavu, průmět jí sjede zpátky a v živém pořadí by propadla.
 * Od okamžiku, kdy protne cíl, proto o jejím místě rozhoduje **čas
 * dojezdu**, ne postup.
 *
 * Opravit tohle pořadí smí teprve **skutečný výsledek** — z vody nebo ze
 * zápisu rozhodčího. Ten sem nepatří a tahle funkce ho nezná.
 *
 * Je to čistá funkce schválně: pořadí je pravidlo, ne vykreslování, a chce
 * to umět ověřit bez prohlížeče (`web/testy/poradi.test.ts`).
 */
export type VPoradi = {
  /** Postup po trati. U dojeté lodi zmrazený na hodnotě z cíle. */
  postup: number;
  /** Kdy loď protla cíl, nebo `null`, dokud nedojela. */
  dojelaV: number | null;
  /** Loď, o které nevíme — propadá nakonec, pokud nedojela. */
  nedostupna: boolean;
};

export function seradNaVode<T extends VPoradi>(lode: readonly T[]): T[] {
  return [...lode].sort((a, b) => {
    // Kdo dojel, stojí nad těmi, co jedou — i kdyby jeho průmět mezitím
    // sjel kamkoli. Mezi dojetými rozhoduje, kdo byl v cíli dřív.
    if (a.dojelaV !== null && b.dojelaV !== null) return a.dojelaV - b.dojelaV;
    if (a.dojelaV !== null) return -1;
    if (b.dojelaV !== null) return 1;

    // Loď, která nehlásí, si pozici nedrží donekonečna: propadne nakonec,
    // ale až za ty, o kterých něco víme.
    if (a.nedostupna !== b.nedostupna) return a.nedostupna ? 1 : -1;
    return b.postup - a.postup;
  });
}
