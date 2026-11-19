/**
 * Přečtení papírového zápisu, jak ho nasype člověk s modelem.
 *
 * <b>Odkud to je.</b> Papír z cíle se stejně fotí a fotka v aplikaci leží,
 * jenže nikdo s ní nic nedělá. Oponentura rozhodčího pro to našla tvar,
 * který nic nového nestaví: rozpoznaná čísla jsou snímek zápisu jako
 * kterýkoliv jiný, třetí zapisovatel vedle dvou lidských. Rozpoznává
 * člověk s modelem, ne server (Filip, 27. 10. 2026: *„prostě to někdo
 * načmárá na papír, a vyfotí na mobil. Pak ti to nasype až se probereš."*).
 *
 * <b>Proč řádky a ne JSON</b> (Filip, 18. 11. 2026). Text se dá přečíst
 * očima, takže je vidět, co se vkládá, ještě než to aplikace přijme —
 * a chyba v JSONu není vidět, dokud ji něco neodmítne.
 *
 * <b>Co se nespáruje, se nezahazuje.</b> Nečitelný řádek je zpráva: na
 * papíře bylo víc, než co dorazilo do tabulky. Mlčet o něm by znamenalo
 * tvrdit, že se přečetlo všechno — a tomu by rozhodčí uvěřil.
 */
// Přípona schválně: testy běží na holém nodu, který bez ní modul
// nenajde, a Next i tak rozumí.
import { KODY, type KodVysledku } from "./kody.ts";

/** Loď, ke které se dá řádek přiřadit. */
export type LodKParovani = { prihlaskaId: number; lod: string; cisloPlachty?: string | null };

/** Jeden přečtený řádek. Pořadí, nebo kód — ne obojí, stejně jako v zápisu. */
export type Precteno = {
  prihlaskaId: number;
  poradiVCili: number | null;
  kod: KodVysledku | null;
};

export type Vysledek = {
  radky: Precteno[];
  /** Řádky, které se nepodařilo přiřadit; v pořadí, v jakém přišly. */
  neprecteno: string[];
};

/**
 * Klíč pro porovnání jmen. <b>Bez diakritiky a velikosti písmen</b>, protože
 * na papíře stojí „LUNA" i „Luna" a kdo čte fotku, háčky nedoplní spolehlivě.
 * Nealfanumerické znaky jdou pryč celé: „FAR  STAR III" a „far-star-iii"
 * je táž loď.
 */
function klic(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Kódy podle zkratky — `DNF`, `dnf` i `Dnf` míří na totéž. */
const PODLE_ZKRATKY = new Map<string, KodVysledku>(
  (Object.keys(KODY) as KodVysledku[]).map((k) => [k.toLowerCase(), k]),
);

/**
 * Přečte vložený text proti seznamu lodí rozjížďky.
 *
 * Řádek je „jméno lodi a za ním pořadí nebo kód": `LUNA 1`, `JOY DNF`,
 * `FAR STAR III 11`. Oddělovač je cokoliv nealfanumerického, takže projde
 * i `LUNA — 1` nebo `LUNA: 1`.
 *
 * <b>Loď se hledá od konce řádku</b>, ne od začátku: poslední kus je číslo
 * nebo kód a všechno před ním je jméno. Hledat jméno zepředu by selhalo
 * u lodí, jejichž název končí číslicí (`M1`, `Charlotte III`).
 */
export function prectiPapir(text: string, lode: LodKParovani[]): Vysledek {
  const podleJmena = new Map<string, number>();
  for (const l of lode) {
    podleJmena.set(klic(l.lod), l.prihlaskaId);
    // Číslo plachty je na papíře z cíle často jediné, co je čitelné.
    if (l.cisloPlachty) podleJmena.set(klic(l.cisloPlachty), l.prihlaskaId);
  }

  const radky: Precteno[] = [];
  const neprecteno: string[] = [];
  // Jedna loď jeden řádek: druhý zápis téže lodi je rozpor, ne oprava.
  const uz = new Set<number>();

  for (const puvodni of text.split("\n")) {
    const radek = puvodni.trim();
    if (radek === "") continue;

    const kusy = radek.split(/[^0-9A-Za-zÀ-ž]+/).filter(Boolean);
    if (kusy.length < 2) {
      neprecteno.push(radek);
      continue;
    }

    const posledni = kusy[kusy.length - 1];
    const jmeno = klic(kusy.slice(0, -1).join(""));
    const prihlaskaId = podleJmena.get(jmeno);

    const kod = PODLE_ZKRATKY.get(posledni.toLowerCase()) ?? null;
    const poradi = /^\d+$/.test(posledni) ? Number(posledni) : null;

    if (prihlaskaId === undefined || (kod === null && poradi === null) || uz.has(prihlaskaId)) {
      neprecteno.push(radek);
      continue;
    }

    uz.add(prihlaskaId);
    radky.push({ prihlaskaId, poradiVCili: poradi, kod });
  }

  return { radky, neprecteno };
}
