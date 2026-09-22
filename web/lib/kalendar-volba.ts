import { cookies } from "next/headers";

/**
 * Co kalendář ukazuje (Filip, 22. 9. 2026): jen kola poháru, všechno, nebo
 * jen akce mimo pohár — „malý přepínač, který si nastavuji".
 *
 * Volba se pamatuje v cookie stejně jako vzhled (`lib/rezim.ts`): web
 * renderuje na serveru, takže ji musí znát dřív, než stránku pošle. Parametr
 * `?kalendar=` v adrese ji přebije, aby šlo poslat odkaz na konkrétní pohled.
 */
export const COOKIE_KALENDAR = "op_kalendar";

export type VolbaKalendare = "pohar" | "vse" | "mimo";

/** Bez cookie jako dřív: jen pohár. Akce mimo pohár si čtenář zapne sám. */
export const VYCHOZI_VOLBA: VolbaKalendare = "pohar";

export const VOLBY: { hodnota: VolbaKalendare; popis: string }[] = [
  { hodnota: "pohar", popis: "Pohár" },
  { hodnota: "vse", popis: "Vše" },
  { hodnota: "mimo", popis: "Mimo pohár" },
];

export const jeVolbaKalendare = (hodnota?: string | null): hodnota is VolbaKalendare =>
  hodnota === "pohar" || hodnota === "vse" || hodnota === "mimo";

/**
 * Adresa, pak cookie, pak výchozí. `akce` je parametr starých tabů „Pohár /
 * Komunitní akce" — odkazy na ně už někde leží a mají dál vést na akce.
 */
export function vyberVolbu(parametr?: string | null, ulozena?: string | null): VolbaKalendare {
  const zAdresy = parametr === "akce" ? "mimo" : parametr;
  if (jeVolbaKalendare(zAdresy)) return zAdresy;
  if (jeVolbaKalendare(ulozena)) return ulozena;
  return VYCHOZI_VOLBA;
}

/** Volba pro tenhle požadavek: z adresy, jinak z cookie. Jen na serveru. */
export async function volbaKalendare(parametr?: string | null): Promise<VolbaKalendare> {
  return vyberVolbu(parametr, (await cookies()).get(COOKIE_KALENDAR)?.value);
}

export type SAkci<T> = T & { akce: boolean };

/**
 * Regaty podle volby. Ročník bez akcí ukáže vždycky pohár — přepínač
 * se tam neukazuje a „Mimo pohár" by jinak z cookie nechalo prázdný
 * kalendář, který nejde přepnout zpátky.
 *
 * Pohár i akce drží pořadí z API (kola podle čísla). Jen „Vše" se řadí
 * podle data, protože kola a akce mají každé svoje číslování.
 */
export function zastavkyKalendare<T extends { datum: string }>(
  zavody: T[],
  akce: T[],
  volba: VolbaKalendare,
): SAkci<T>[] {
  const pohar = zavody.map((z) => ({ ...z, akce: false }));
  const mimo = akce.map((z) => ({ ...z, akce: true }));
  switch (akce.length > 0 ? volba : "pohar") {
    case "pohar":
      return pohar;
    case "mimo":
      return mimo;
    case "vse":
      return [...pohar, ...mimo].sort((a, b) => a.datum.localeCompare(b.datum));
  }
}
