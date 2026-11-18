/**
 * Fronta na stahování mapových dlaždic ze zdroje.
 *
 * <b>Proč existuje.</b> Mapa si při otevření řekne o celý výřez — na tabuli
 * přes ultrawide to bylo 68 dlaždic v jedné vlně. Prohlížeč je přes HTTP/2
 * pustí všechny najednou, náš server je všechny přepošle a OSM, jehož
 * pravidla mluví o dvou souběžných stahováních, část odmítne: změřeno
 * 16 z 68 na produkci (24. 10. 2026). Na obrazovce z toho byla mozaika
 * rozbitých obrázků.
 *
 * <b>Proč ve vlastním souboru.</b> Do 18. 11. 2026 to byla lokální
 * proměnná v `app/dlazdice/[z]/[x]/[y]/route.ts`, a protože se stav fronty
 * nedal odnikud přečíst, nešla ani otestovat — chyba v počítadle (níž) se
 * tím pádem poznala až na vodě jako „mapa se občas nevykreslí celá".
 *
 * <b>Invariant, na kterém to celé stojí:</b> `bezi` se vždycky rovná počtu
 * prací, které právě utíkají. Porušit ho jde dvěma způsoby a oba se staly:
 *
 * 1. <b>Slot se uvolnil dvakrát za jeden běh.</b> Kdo se probudil z fronty,
 *    si `bezi` nezvýšil, ale jeho `finally` ho stejně snížilo. Po dvaceti
 *    dlaždicích byl čítač na −18 a od té chvíle byla podmínka
 *    `bezi >= NARAZ` nepravdivá pořád: <b>druhé otevření mapy pustilo
 *    všech dvacet naráz</b> a teprve tam OSM odmítlo. Proto „občas".
 * 2. <b>Slot se ztratil.</b> Kdo čekání vzdal, zůstal ve frontě jako mrtvý
 *    záznam; `pusti()` ho vybral, předal mu slot a ten zmizel ve vzduchu.
 *
 * Oba případy hlídá `web/testy/dlazdice.test.ts`.
 */

/**
 * Kolik dlaždic se smí tahat ze zdroje naráz. Pravidla OSM mluví o dvou
 * souběžných stahováních.
 */
export const NARAZ = 2;

/** Jak dlouho smí dlaždice čekat ve frontě, než se to vzdá. */
export const CEKANI_MS = 8_000;

/** Čekatel ve frontě. Vrací, jestli si slot převzal — mrtvý vrací `false`. */
type Cekatel = () => boolean;

let bezi = 0;
const fronta: Cekatel[] = [];

/**
 * Jak na tom fronta je. <b>Jen pro testy a diagnostiku</b> — kód, který
 * dlaždice stahuje, se ptát nepotřebuje.
 */
export function stavFronty() {
  return { bezi, ceka: fronta.length };
}

/** Vynuluje frontu. Jen pro testy, ať jeden případ neovlivní další. */
export function vynulujFrontu() {
  bezi = 0;
  fronta.length = 0;
}

/**
 * Předá slot dalšímu živému čekateli, a není-li žádný, uvolní ho.
 *
 * <b>Slot se nepouští a nebere znovu</b>, jen se předává: tím se nedá
 * uvolnit dvakrát. Mrtví čekatelé (ti, kdo vypršeli) se cestou vyhazují —
 * předat slot jednomu z nich znamená ztratit ho.
 */
function predej() {
  while (fronta.length > 0) {
    const dalsi = fronta.shift()!;
    if (dalsi()) return;
  }
  bezi -= 1;
}

/**
 * Pustí práci, až bude volno. Čekání má strop — radši prázdná dlaždice než
 * visící požadavek.
 */
export async function vRade<T>(prace: () => Promise<T>): Promise<T | null> {
  if (bezi >= NARAZ) {
    const dockal = await new Promise<boolean>((hotovo) => {
      let rozhodnuto = false;
      const casovac = setTimeout(() => {
        rozhodnuto = true;
        hotovo(false);
      }, CEKANI_MS);

      fronta.push(() => {
        if (rozhodnuto) return false; // už to vzdal, slot si nebere
        rozhodnuto = true;
        clearTimeout(casovac);
        hotovo(true);
        return true;
      });
    });
    // Slot je převzatý od toho, kdo dobíhal — `bezi` se proto nezvyšuje.
    if (!dockal) return null;
  } else {
    bezi += 1;
  }

  try {
    return await prace();
  } finally {
    predej();
  }
}
