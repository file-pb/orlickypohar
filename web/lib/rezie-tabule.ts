import type { Lod, Znacka } from "@/app/nacrt/mapa/plavba";
import { vzdalenostM } from "./geo.ts";
import { seradNaVode } from "./poradi-na-vode.ts";

/**
 * Co má tabule v kterou chvíli ukázat — pravidla zvlášť od kreslení.
 *
 * Je to tentýž důvod jako u `poradi-na-vode.ts`: kolik času stráví
 * režie na souboji, u bóje a v kolotoči je rozhodnutí, ne vykreslení, a
 * chce to umět změřit bez prohlížeče (`web/testy/rezie.test.ts`). Okem
 * se to z běžící tabule nespočítá — záběr se mění po minutách.
 */

/**
 * Do kolikáté pozice je prohození pro tabuli událost.
 *
 * <b>Změřeno na náčrtu:</b> bez tohohle filtru vyšlo za jednu rozjížďku
 * 33 prohození a tabule hořela 93 % času — tedy pořád, takže nic. Filip
 * to ostatně pojmenoval sám: *swapping for the **lead***. Souboj
 * o devatenácté místo není souboj o nic.
 *
 * Od 26. 10. 2026 jsou to tři pozice, ne šest: s šesti zabíral souboj
 * 69 % času a na tlačenici u bóje ani na srovnávání sousedů skoro
 * nedošlo (změřeno na ukázkové plavbě, 97 prohození).
 */
export const SOUBOJ_DO_POZICE = 3;
/**
 * Jak dlouho pak drží záběr na té dvojici.
 *
 * <b>Souboj nesmí vyplnit celou rozjížďku.</b> Změřeno 26. 10. 2026:
 * při devadesáti vteřinách a šesti pozicích zabral 69 % času, při
 * třech pozicích a čtyřiceti vteřinách vychází 43 % souboj, 28 % bóje
 * a 29 % kolotoč — a souboj o stupně vítězů zůstává to první, co režie
 * ukáže.
 */
export const FOCUS_SOUBOJE_S = 40;
/** Jak dlouho dostane každá dvojice v kolotoči. */
export const KOLOTOC_S = 60;
/**
 * <b>Dav u bóje</b> (Filip, 25. 10. 2026: *„diváka zajímá, jak jsou tady
 * před bójkou a jakou trasu volili"*). Kolik lodí musí být u téže značky
 * a jak blízko, aby to byla tlačenice a ne náhoda.
 *
 * Šedesát metrů je zóna, uvnitř které už se na sebe berou ohledy; tři
 * lodě proto, že dvě jsou souboj a ten má vlastní pravidlo.
 */
export const DAV_M = 60;
export const DAV_LODI = 3;
/**
 * Kolik lodí z davu se nakonec ukáže.
 *
 * <b>Tlačenice u bóje bývá půl pole</b> — změřeno na nasazené tabuli:
 * u návětrné se rozsvítilo deset řádků z třiadvaceti, a to je
 * k nerozeznání od rozsvíceného ranku. Záběr proto vezme jen špičku,
 * ty nejdál na trati; na mapě je tím i těsnější.
 */
export const DAV_NEJVIC = 4;
/**
 * Jakmile dav vznikne, drží se, dokud u značky nezbydou míň než dvě lodě
 * ve <b>větším</b> okruhu. Bez téhle hystereze by loď kmitající kolem
 * hranice přepínala záběr sem a tam.
 */
export const DAV_DRZI_M = 110;

export type Duvod = "souboj" | "kolotoc" | "boje";
export type Zaber = { lode: number[]; duvod: Duvod };
export type Prohozeni = { cas: number; nahoru: number; dolu: number; pozice: number };
export type Dojezd = { index: number; cas: number; postup: number } | null;

/** Po kolika vteřinách mlčení se loď bere jako nedostupná. */
export const NEDOSTUPNA_PO_S = 300;

/**
 * Plán záběrů pro celou rozjížďku, po deseti vteřinách.
 *
 * <b>Počítá se dopředu</b>, ne krok po kroku — jednak je to
 * deterministické (týž čas dá týž záběr), jednak kolotoč musí umět
 * navázat tam, kde ho souboj přerušil. K tomu se počítá čas strávený
 * mimo souboje, ne čas od startu.
 */
export function planRezie({
  lode,
  postupy,
  prohozeni,
  znacky,
  konec,
  dojezdy,
  doPozice = SOUBOJ_DO_POZICE,
  focusSouboje = FOCUS_SOUBOJE_S,
}: {
  lode: Lod[];
  postupy: number[][];
  prohozeni: Prohozeni[];
  znacky: Znacka[];
  konec: number;
  /** Kdy která loď dojela — bez toho by režie řadila pole jinak než tabule. */
  dojezdy?: Dojezd[];
  /** Ladicí vstupy; výchozí hodnoty jsou ty, se kterými tabule běží. */
  doPozice?: number;
  focusSouboje?: number;
}): Map<number, Zaber> {

    const plan = new Map<number, { lode: number[]; duvod: "souboj" | "kolotoc" | "boje" }>();
    let mimoSouboje = 0;

    const indexV = (i: number, t: number) => {
      const lod = lode[i];
      let idx = -1;
      for (let j = 0; j < lod.body.length; j++) {
        if (lod.body[j].cas > t) break;
        idx = j;
      }
      return Math.min(idx, lod.dosloDo - 1);
    };
    const postupV = (i: number, t: number) => {
      const vid = indexV(i, t);
      return vid >= 0 ? postupy[i][vid] : null;
    };

    /**
     * Pole seřazené tak, jak ho v daném čase ukáže tabule — <b>týmž
     * pravidlem</b>, ne jen podle postupu: dojeté patří nahoru podle času
     * v cíli a mlčící dolů. Dokud si režie řadila pole po svém, ukazovala
     * jako dvojici lodě, které v ranku stály daleko od sebe (změřeno
     * 26. 10. 2026 na nasazené tabuli: osmá s jedenáctou, první se šestou).
     */
    const poradiVCase = (t: number) =>
      seradNaVode(
        lode
          .map((l, i) => {
            const vid = indexV(i, t);
            if (vid < 0) return null;
            const dojezd = dojezdy?.[i] ?? null;
            const dojela = dojezd !== null && vid >= dojezd.index;
            return {
              id: l.id,
              postup: dojela ? dojezd!.postup : postupy[i][vid],
              dojelaV: dojela ? dojezd!.cas : null,
              nedostupna: t - l.body[vid].cas > NEDOSTUPNA_PO_S,
            };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null),
      );

    const polohaV = (i: number, t: number) => {
      const lod = lode[i];
      let idx = -1;
      for (let j = 0; j < lod.body.length; j++) {
        if (lod.body[j].cas > t) break;
        idx = j;
      }
      const vid = Math.min(idx, lod.dosloDo - 1);
      return vid >= 0 ? lod.body[vid] : null;
    };

    /**
     * Start ani cíl se za tlačenici nepočítají: tam stojí celé pole
     * z definice a záběr by na nich visel půl rozjížďky. Dav má smysl
     * u obratových značek, kde se trasy rozcházejí.
     */
    const obratove = [...znacky]
      .sort((a, b) => a.poradi - b.poradi)
      .slice(1, -1);

    /** U které značky dav zrovna drží (index do `obratove`). */
    let davU: number | null = null;

    for (let t = 0; t <= konec; t += 10) {
      const souboj = [...prohozeni]
        .reverse()
        .find(
          (p) => p.pozice <= doPozice && t - p.cas >= 0 && t - p.cas < focusSouboje,
        );
      if (souboj) {
        plan.set(t, {
          lode: [lode[souboj.nahoru].id, lode[souboj.dolu].id],
          duvod: "souboj",
        });
        davU = null;
        continue;
      }

      // Dav u bóje. Drží-li už u jedné, zkouší se napřed ta — jinak by
      // záběr skákal mezi dvěma značkami, u kterých je lodí stejně.
      const uZnacky = (k: number, dosah: number) => {
        const ven: number[] = [];
        for (let i = 0; i < lode.length; i++) {
          const p = polohaV(i, t);
          if (p && vzdalenostM(p, obratove[k]) <= dosah) ven.push(lode[i].id);
        }
        return ven;
      };
      let dav: number[] | null = null;
      if (davU !== null) {
        const drzi = uZnacky(davU, DAV_DRZI_M);
        if (drzi.length >= 2) dav = drzi;
        else davU = null;
      }
      if (!dav) {
        for (let k = 0; k < obratove.length; k++) {
          const u = uZnacky(k, DAV_M);
          if (u.length >= DAV_LODI && (!dav || u.length > dav.length)) {
            dav = u;
            davU = k;
          }
        }
      }
      if (dav) {
        const spicka = poradiVCase(t)
          .filter((x) => dav!.includes(x.id))
          .slice(0, DAV_NEJVIC)
          .map((x) => x.id);
        plan.set(t, { lode: spicka.length ? spicka : dav.slice(0, DAV_NEJVIC), duvod: "boje" });
        continue;
      }

      /**
       * Kolotoč jde pořadím shora, ale bere <b>dvojici</b>, ne jednu loď
       * (Filip, 25. 10. 2026: *„pro jachtaře je hezké srovnávat lodě,
       * které jsou u sebe blízko na ranku"*). Samotná loď na vodě nic
       * neřekne — teprve soused dá odstupu měřítko.
       */
      const vPoradi = poradiVCase(t);
      if (vPoradi.length === 0) continue;
      const kolikata = Math.floor(mimoSouboje / KOLOTOC_S) % vPoradi.length;
      // U poslední lodi se dvojice bere směrem nahoru, ať nezůstane sama.
      const od = Math.min(kolikata, Math.max(0, vPoradi.length - 2));
      plan.set(t, {
        lode: vPoradi.slice(od, od + 2).map((x) => x.id),
        duvod: "kolotoc",
      });
      mimoSouboje += 10;
    }
    return plan;
}
