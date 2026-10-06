/**
 * Neodeslaný zápis z cíle, jak leží v úložišti prohlížeče.
 *
 * <b>Proč je to vlastní modul.</b> Tenhle koncept je u zápisu z vody často
 * jediná kopie klepnutí, která neprošla na server — a sahají na něj tři
 * obrazovky: cíl (vyrábí ho), porovnání (musí ho ukázat, jinak z něj člověk
 * sestaví neúplný výsledek) a formulář zápisu (tam se opravuje a tam se musí
 * vyřešit). Tři kopie klíče a tvaru by se rozešly a rozdíl by se poznal až
 * ztraceným dojezdem.
 *
 * Úložiště prohlížeče může být zakázané (soukromé okno, zablokovaná data)
 * a zápis do něj umí vyhodit výjimku. Všechno je proto v `try` a obrazovky
 * musí fungovat i bez něj — je to pojistka navíc, ne podmínka.
 */

export type DojezdKonceptu = { id: number; v: string | null };

/**
 * Neodeslaný stav obrazovky. `otisk` je podoba zápisu na serveru v době,
 * kdy koncept vznikl: když se liší, uložil mezitím někdo jiný a koncept
 * se nesmí použít sám od sebe.
 */
export type Koncept = {
  otisk: string;
  kdy: number;
  dojeti: DojezdKonceptu[];
  kody: Record<number, string>;
};

export const klicKonceptu = (serie: string, zavod: string, cislo: number) =>
  `cil:${serie}:${zavod}:${cislo}`;

export function zapamatuj(klic: string, koncept: Koncept) {
  try {
    window.localStorage.setItem(klic, JSON.stringify(koncept));
  } catch {
    // Bez zálohy se zapisuje dál, jen bez pojistky.
  }
}

export function precti(klic: string): Koncept | null {
  try {
    const ulozene = window.localStorage.getItem(klic);
    if (!ulozene) return null;

    const koncept = JSON.parse(ulozene) as Koncept;
    return Array.isArray(koncept?.dojeti) ? koncept : null;
  } catch {
    return null;
  }
}

export function zahod(klic: string) {
  try {
    window.localStorage.removeItem(klic);
  } catch {
    // Nevadí: co se nedá smazat, se stejně použije jen při shodném otisku.
  }
}

/** Pořadí a kódy z konceptu jako plochý seznam — tak, jak se porovnává. */
export function radkyKonceptu(koncept: Koncept): { id: number; poradi: number | null; kod: string | null }[] {
  return [
    ...koncept.dojeti.map((d, i) => ({ id: d.id, poradi: i + 1, kod: null })),
    ...Object.entries(koncept.kody ?? {}).map(([id, kod]) => ({
      id: Number(id),
      poradi: null,
      kod,
    })),
  ];
}

/** Co má koncept jinak než uložený zápis. Prázdné znamená „uložené ho pokrývá". */
export function rozdily(
  koncept: Koncept,
  ulozene: { id: number; poradi: number | null; kod: string | null }[],
): { id: number; poradi: number | null; kod: string | null; proc: "chybi" | "jinak" }[] {
  const podleId = new Map(ulozene.map((u) => [u.id, u]));

  return radkyKonceptu(koncept)
    .map((r) => {
      const u = podleId.get(r.id);
      if (!u || (u.poradi == null && u.kod == null)) return { ...r, proc: "chybi" as const };
      if (u.poradi !== r.poradi || (u.kod ?? null) !== (r.kod ?? null))
        return { ...r, proc: "jinak" as const };
      return null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
}
