import type { StranaPrvku, TypPrvku } from "@/lib/trat";

/**
 * Pravidla průvodce stavbou prvku.
 *
 * <b>Zadání (Filip, 10. 10. 2026):</b> *„Stavitel bude potřebovat
 * kliknout na typ prvku, dostat se do obrazovky pro daný typ a tam to jen
 * pípnout, zvolit atributy, popojet, pípnout atd."* Jednotkou práce na
 * vodě je **prvek, ne bóje** — stavitel nemyslí „pokládám bóji 1 a bóji
 * 2", ale „pokládám start".
 *
 * <para>
 * <b>Čistý modul bez Reactu a DOM, a to schválně</b> (Filip tamtéž:
 * *„tohle bude muset být vyladěný průvodce i do appky"*). Appka je
 * React Native, takže z webové obrazovky se tam nepřenese nic — ale
 * tohle ano. Co sem patří: kolik bodů který typ potřebuje, jak se
 * pojmenují a jaké atributy dávají smysl. Co sem nepatří: cokoliv, co ví
 * o tlačítku nebo o `navigator`.
 * </para>
 *
 * <para>
 * Až appka začne zapisovat, přestěhuje se tenhle soubor do balíčku
 * sdíleného oběma klienty, jako dnes `schema.d.ts`. Do té doby je tady
 * a **nesmí se do něj dostat nic webového**, jinak ta cesta zmizí.
 * </para>
 */

/** Jeden bod, který se u daného typu pípá. */
export type Bod = {
  /** Co se na obrazovce řekne staviteli. */
  vyzva: string;
  /** Jméno, pod kterým bóje vznikne. Stavitel nic nepíše. */
  jmeno: (poradi: number) => string;
};

/**
 * Body daného typu, v pořadí, ve kterém se pípají.
 *
 * <b>Pořadí je levobok, pak pravobok</b>, protože tak se čára vytyčuje
 * a tak ji pak čte mapka i soupis prvků.
 */
export function body(typ: TypPrvku): Bod[] {
  switch (typ) {
    case "Start":
      return [
        { vyzva: "Pípni levobok startu", jmeno: () => "start levobok" },
        { vyzva: "Popojeď a pípni pravobok startu", jmeno: () => "start pravobok" },
      ];
    case "Cil":
      return [
        { vyzva: "Pípni levou bóji cíle", jmeno: () => "cíl levá" },
        { vyzva: "Popojeď a pípni pravou bóji cíle", jmeno: () => "cíl pravá" },
      ];
    case "Brana":
      return [
        { vyzva: "Pípni levou bóji brány", jmeno: (i) => `brána ${i} vlevo` },
        { vyzva: "Popojeď a pípni pravou bóji brány", jmeno: (i) => `brána ${i} vpravo` },
      ];
    case "Odskok":
      return [
        { vyzva: "Pípni otočnou bóji", jmeno: (i) => `otočná ${i}` },
        { vyzva: "Popojeď a pípni odskokovou bóji", jmeno: (i) => `odskok ${i}` },
      ];
    case "OtocnaZona":
      return [
        { vyzva: "Pípni první konec zóny", jmeno: (i) => `zóna ${i} od` },
        { vyzva: "Popojeď a pípni druhý konec zóny", jmeno: (i) => `zóna ${i} do` },
      ];
    case "PrujezdniBoje":
      return [{ vyzva: "Pípni průjezdní bóji", jmeno: (i) => `průjezdní ${i}` }];
    case "OtocnaBoje":
    default:
      return [{ vyzva: "Pípni otočnou bóji", jmeno: (i) => `otočná ${i}` }];
  }
}

/**
 * Uvádí se u typu strana? Stejné pravidlo jako na serveru
 * (`Prvky.StranaPatri`) — u brány si ji volí loď, u čar rozhoduje směr.
 */
export function patriStrana(typ: TypPrvku): boolean {
  return typ === "OtocnaBoje" || typ === "PrujezdniBoje" || typ === "Odskok";
}

/** Směr a druh se uvádějí jen u startu. */
export function patriSmer(typ: TypPrvku): boolean {
  return typ === "Start";
}

/**
 * Výchozí strana. <b>Žádná</b>: stavitel ji má zvolit vědomě, a když ji
 * nezvolí, je lepší prázdno než vymyšlený levobok.
 */
export const VYCHOZI_STRANA: StranaPrvku = null;
