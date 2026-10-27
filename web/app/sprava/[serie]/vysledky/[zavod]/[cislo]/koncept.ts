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

/**
 * <b>Neodeslaný start</b> (nález R19 oponentury rozhodčího, 28. 10. 2026).
 * Filip, 27. 10. 2026: *„Stalo se nám, že při startu z webovými hodinami
 * došlo k přerušení spojení a to pokazilo start a renomé."* Do té doby
 * cílová obrazovka klepnutí na start při selhání odeslání <b>zahodila</b>
 * a řekla *„zkus to znovu"* — u startu rada, kterou nejde splnit, protože
 * ten okamžik už uplynul a druhé klepnutí zapíše pozdější čas. Dojezdy
 * přitom výpadek přežívaly od 23. 9. 2026, a start z toho vypadl, ačkoliv
 * je to jediné klepnutí dne, které se nedá zopakovat.
 *
 * <b>Proč vlastní záznam, a ne pole v {@link Koncept}.</b> Koncept je
 * <b>rozdíl proti serverovému zápisu</b> a drží si k tomu `otisk`: když se
 * otisk neshoduje, sada se nesmí použít sama od sebe, protože mezitím
 * uložil druhý telefon. Start je ale jedno pole, ne sada — a kdyby jel
 * v konceptu, zahodilo by ho buď smazání konceptu po úspěšném uložení
 * sady, nebo neshoda otisku, do kterého `startV` samo vstupuje
 * (`cil/page.tsx`, funkce `otisk`). Oddělený záznam přežije obojí.
 */
export type CekajiciStart = { v: string; kdy: number };

export const klicStartu = (serie: string, zavod: string, cislo: number) =>
  `cil-start:${serie}:${zavod}:${cislo}`;

export function zapamatujStart(klic: string, start: CekajiciStart) {
  try {
    window.localStorage.setItem(klic, JSON.stringify(start));
  } catch {
    // Bez zálohy se startuje dál, jen bez pojistky.
  }
}

export function prectiStart(klic: string): CekajiciStart | null {
  try {
    const ulozene = window.localStorage.getItem(klic);
    if (!ulozene) return null;

    const start = JSON.parse(ulozene) as CekajiciStart;
    return typeof start?.v === "string" && Number.isFinite(Date.parse(start.v)) ? start : null;
  } catch {
    return null;
  }
}

export function zahodStart(klic: string) {
  try {
    window.localStorage.removeItem(klic);
  } catch {
    // Nevadí: odeslaný start se pozná podle času v zápisu ze serveru.
  }
}

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

export type Rozdil = {
  id: number;
  poradi: number | null;
  kod: string | null;
  /** `chybi` = uložené o lodi neví; `jinak` = uložené má u ní něco jiného. */
  proc: "chybi" | "jinak";
};

/**
 * Rozdíly rozdělené podle toho, čím hrozí. <b>Smíchat je dohromady je past</b>
 * (reprodukce scénáře C12, 8. 10. 2026): `chybi` je práce, která se bez
 * doplnění ztratí, kdežto `jinak` je střet dvou hodnot — a ta uložená může
 * být čerstvá oprava druhého zapisovatele. Obrazovka, která obojí vypsala
 * pod „má navíc, počítej i s nimi", radila vrátit cizí opravu zpátky.
 */
export function podleRizika(rozdil: Rozdil[]): { chybi: Rozdil[]; jinak: Rozdil[] } {
  return {
    chybi: rozdil.filter((r) => r.proc === "chybi"),
    jinak: rozdil.filter((r) => r.proc === "jinak"),
  };
}

/** Co má koncept jinak než uložený zápis. Prázdné znamená „uložené ho pokrývá". */
export function rozdily(
  koncept: Koncept,
  ulozene: { id: number; poradi: number | null; kod: string | null }[],
): Rozdil[] {
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
