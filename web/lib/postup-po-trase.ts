/**
 * Kde je loď na trati — pravidlo zvlášť od kreslení.
 *
 * <b>Trať je posetá skrytými brankami</b> (Filip, 26. 10. 2026: *„možná
 * by sis měl udělat nějaké vlastní skryté body na trati, abys podle nich
 * viděl, kolik která loď reálně ujela"*). Postup není kolmice na celou
 * trať, ale **počet branek, které má loď za sebou** — a branka se počítá
 * za projetou, když ji loď překročí, ne když se k ní přiblíží. To je
 * rozdíl, na kterém všechno stojí: loď křižuje a od samotné čáry trati
 * bývá stovky metrů daleko, ale přes příčku v daném místě projede vždy.
 *
 * <b>Proč ne prostá kolmice na trať</b> (což tu bylo do 26. 10. 2026):
 * cesta po vodě se sama k sobě vrací — u Orlíku dokonce tak, že cíl leží
 * na startu (změřeno 0 m mezi nimi) a noha nahoru vede skoro souběžně
 * s nohou zpátky. Kolmice pak sjíždí na špatný kus trati a tabule hlásí
 * nesmysly: MERKUR byl 14 m od cíle a měl postup 19 m z 3104, TRAMP
 * minul všechny čtyři značky a postup mu mezitím klesl z 1350 na 231.
 * Měkký trest za couvání na to nestačil, protože průmět na souběžnou
 * nohu couvání není.
 *
 * Branky jsou po {@link KROK_M} metrech, takže postup je jemný dost na
 * pořadí, a mezi dvěma se dopočítá průmětem.
 */

/** Jak hustě se trať proklepává brankami. */
export const KROK_M = 25;

export type Branka = {
  /** Kde branka stojí, v pixelech plátna. */
  x: number;
  y: number;
  /** Jednotkový směr trati v tom místě — příčka na něj je kolmá. */
  tx: number;
  ty: number;
  /** Kolik metrů trati je za ní. */
  postup: number;
};

/**
 * Rozestaví branky po celé trati.
 *
 * `uzly` jsou v pixelech plátna, `delkyNoh` v metrech — proto se každý
 * úsek přepočítává svým vlastním poměrem, ne jedním pro celou trať.
 */
export function brankyTrati(
  uzly: { x: number; y: number }[],
  delkyNoh: number[],
): Branka[] {
  const ven: Branka[] = [];
  let zaSebou = 0;
  for (let i = 0; i < uzly.length - 1; i++) {
    const a = uzly[i];
    const b = uzly[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const vPx = Math.hypot(dx, dy) || 1;
    const vM = delkyNoh[i] ?? 0;
    const kolik = Math.max(1, Math.round(vM / KROK_M));
    for (let k = 0; k < kolik; k++) {
      const t = k / kolik;
      ven.push({
        x: a.x + t * dx,
        y: a.y + t * dy,
        tx: dx / vPx,
        ty: dy / vPx,
        postup: zaSebou + t * vM,
      });
    }
    zaSebou += vM;
  }
  const posledni = uzly[uzly.length - 1];
  const predposledni = uzly[uzly.length - 2] ?? posledni;
  const dx = posledni.x - predposledni.x;
  const dy = posledni.y - predposledni.y;
  const v = Math.hypot(dx, dy) || 1;
  ven.push({ x: posledni.x, y: posledni.y, tx: dx / v, ty: dy / v, postup: zaSebou });
  return ven;
}

/**
 * Ke kterému průjezdnímu bodu padne kolmice z lodi.
 *
 * <b>Hledá se jen dopředu od toho posledního</b>, a jen tak daleko, kam
 * loď od minulého hlášení mohla doplout (`maxVpred` bodů). V tom je celý
 * rozdíl proti kolmici na celou trať, kterou to počítalo do 26. 10.
 * 2026: ta se hledala všude naráz, a protože noha nahoru vede skoro
 * souběžně s nohou zpátky, padala lodi na tu nesprávnou. Takhle se
 * pořadí nemůže vrátit a nemůže přeskočit — a kolmice zůstala kolmicí.
 */
export function minuteBranky(
  branky: Branka[],
  bod: { x: number; y: number },
  dosud: number,
  maxVpred = Infinity,
): number {
  let idx = dosud;
  let nej = Infinity;
  const strop = Math.min(branky.length - 1, dosud + (Number.isFinite(maxVpred) ? maxVpred : branky.length));
  for (let i = dosud; i <= strop; i++) {
    const g = branky[i];
    const d = Math.hypot(bod.x - g.x, bod.y - g.y);
    if (d < nej) {
      nej = d;
      idx = i;
    }
  }
  return idx;
}

/**
 * Postup v metrech: branky, které má loď za sebou, a kousek navíc podle
 * toho, jak daleko je mezi tou poslední a další.
 *
 * Bez dopočtu by se pořadí lodí uvnitř jedné branky slilo a žebříček by
 * poskakoval po {@link KROK_M} metrech.
 */
export function postupVMetrech(
  branky: Branka[],
  bod: { x: number; y: number },
  idx: number,
): number {
  const g = branky[idx];
  const dalsi = branky[idx + 1];
  if (!dalsi) return g.postup;
  const dx = dalsi.x - g.x;
  const dy = dalsi.y - g.y;
  const delka2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((bod.x - g.x) * dx + (bod.y - g.y) * dy) / delka2));
  return g.postup + t * (dalsi.postup - g.postup);
}
