/**
 * Převod mezi souřadnicemi a pixely mapy — pro výběr bodu z mapy ve
 * staviteli trati.
 *
 * <b>Kopie `web/lib/mapa.ts`, schválně.</b> Matematika se nesmí rozejít
 * — bod vybraný v appce musí ležet tam, kde by ho vybral web — ale
 * knihovnu repo zakládá až na třetí kopii (AGENTS.md, Sdílený kód).
 * Test `testy/mapa.test.ts` proto hlídá i hodnoty, které vydá web.
 *
 * <b>Web Mercator (EPSG:3857)</b>, tatáž projekce, ve které jsou dlaždice
 * z `/dlazdice/{z}/{x}/{y}` (OpenStreetMap a satelit Esri přes náš server).
 * Čistý modul bez Reactu, jde testovat na Node.
 */
import { vzdalenostM } from './geo';
import { vCesku } from './hranice';

/** Hrana dlaždice v pixelech, jak je vydává OSM. */
export const DLAZDICE = 256;
/** Rozsah přiblížení, který pouští i obslužná cesta dlaždic na webu. */
export const Z_NEJMENE = 10;
export const Z_NEJVIC = 17;

export type Bod = { sirka: number; delka: number };

/**
 * Kde mapa začne, když nic lepšího není: voda u Radavy, odkud vyjíždí
 * i simulace záznamu (`tracker/simulace.ts`).
 */
export const ORLIK: Bod = { sirka: 49.5201, delka: 14.1702 };

/** Souřadnice → pixely světa při daném přiblížení (slippy map). */
export function doPixelu(sirka: number, delka: number, z: number) {
  const n = DLAZDICE * 2 ** z;
  const x = ((delka + 180) / 360) * n;
  const radiany = (sirka * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(radiany) + 1 / Math.cos(radiany)) / Math.PI) / 2) * n;
  return { x, y };
}

/** Pixely světa → souřadnice. Opak `doPixelu`, pro čtení z mapy. */
export function zPixelu(x: number, y: number, z: number): Bod {
  const n = DLAZDICE * 2 ** z;
  const delka = (x / n) * 360 - 180;
  const radiany = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  return { sirka: (radiany * 180) / Math.PI, delka };
}

/** Kolik metrů připadá na pixel v dané šířce a přiblížení. */
export function metruNaPixel(sirka: number, z: number) {
  return (156_543.03 * Math.cos((sirka * Math.PI) / 180)) / 2 ** z;
}

/** Jedna dlaždice na ploše: kterou stáhnout a kam ji položit. */
export type DlazdiceMapy = { klic: string; z: number; tx: number; ty: number; x: number; y: number };

/**
 * Dlaždice, které je vidět na ploše daného rozměru se středem `stred`.
 * Totéž, co web počítá přímo v komponentě — tady zvlášť, ať jde otestovat,
 * že u kraje nezbude prázdný pruh ani se netahá, co vidět není.
 */
export function mrizkaDlazdic(stred: Bod, z: number, sirka: number, vyska: number): DlazdiceMapy[] {
  const s = doPixelu(stred.sirka, stred.delka, z);
  const levo = s.x - sirka / 2;
  const nahore = s.y - vyska / 2;
  const naSvete = 2 ** z;
  const vys: DlazdiceMapy[] = [];
  for (let tx = Math.floor(levo / DLAZDICE); tx <= Math.floor((levo + sirka) / DLAZDICE); tx++)
    for (let ty = Math.floor(nahore / DLAZDICE); ty <= Math.floor((nahore + vyska) / DLAZDICE); ty++) {
      if (tx < 0 || ty < 0 || tx >= naSvete || ty >= naSvete) continue;
      vys.push({ klic: `${z}-${tx}-${ty}`, z, tx, ty, x: tx * DLAZDICE - levo, y: ty * DLAZDICE - nahore });
    }
  return vys;
}

/** Posune střed o tah prstem (podklad jede s prstem, střed proti němu). */
export function posunuty(stred: Bod, z: number, dx: number, dy: number): Bod {
  const s = doPixelu(stred.sirka, stred.delka, z);
  return zPixelu(s.x - dx, s.y - dy, z);
}

/**
 * Do jaké vzdálenosti od Orlíku má poloha telefonu smysl jako výchozí
 * střed: plocha, kde se staví — hráz (9,8 km) i Zvíkov (9,2 km) uvnitř
 * s rezervou.
 *
 * <b>Ne celá nádrž</b> (nezávislá kontrola, 28. 11. 2026). S dosahem
 * 50 km by se mapa otevřela nad domem každému z Písku (23,6 km), Příbrami
 * (22,1 km) nebo Milevska (15,7 km) — tedy přesně tomu, kdo staví doma.
 * Obě meze hlídá `testy/mapa.test.ts`.
 */
export const DOSAH_POLOHY_M = 12_000;

const platny = (b: Bod | null | undefined): b is Bod =>
  !!b && Number.isFinite(b.sirka) && Number.isFinite(b.delka);

/**
 * Kde má mapa začít: poslední bod trati, pak poloha telefonu, pak Orlík.
 *
 * <b>Body trati</b> (rozdělaný prvek, fronta, postavené) berou přednost,
 * pokud leží v Česku — stavitel pokračuje tam, kde přestal.
 *
 * <b>Poloha telefonu jen u Orlíku</b> (nezávislá kontrola, 28. 11. 2026).
 * Na vodě se špatným signálem je nejlepším odhadem; doma v Praze by mapa
 * začala nad domem a k nádrži by bylo pětkrát oddálit, přetáhnout
 * a pětkrát přiblížit. V zahraničí (Filip, 28. 11. 2026: *„trať můžu
 * stavět prostě doma"*) totéž, jen dál. Webový průvodce polohu zařízení
 * nebere vůbec.
 */
export function vychoziStred(trat: readonly (Bod | null | undefined)[], poloha?: Bod | null): Bod {
  for (const b of trat) {
    if (platny(b) && vCesku(b.sirka, b.delka)) return { sirka: b.sirka, delka: b.delka };
  }
  if (platny(poloha) && vzdalenostM(poloha, ORLIK) <= DOSAH_POLOHY_M) {
    return { sirka: poloha.sirka, delka: poloha.delka };
  }
  return ORLIK;
}

/** Kde na ploše leží bod, když je `stred` uprostřed plochy `sirka` × `vyska`. */
export function naPlose(bod: Bod, stred: Bod, z: number, sirka: number, vyska: number) {
  const b = doPixelu(bod.sirka, bod.delka, z);
  const s = doPixelu(stred.sirka, stred.delka, z);
  return { x: sirka / 2 + (b.x - s.x), y: vyska / 2 + (b.y - s.y) };
}

/**
 * Adresa dlaždice na našem serveru.
 *
 * <b>`znovu` mění adresu, ne obsah.</b> Když zdroj dlaždici nevydá, web
 * pošle průhledný pixel s `max-age=60`, ať se to za minutu zkusí znovu.
 * Android si ale obrázek drží v paměti Fresca podle adresy a na
 * `Cache-Control` nehledí, takže by ta díra v mapě zůstala natrvalo
 * (nezávislá kontrola, 28. 11. 2026). Jiná adresa ji obejde. Nginx
 * opakování pustí k webu mimo paměť a nic z něj neukládá
 * (`deploy/cache/default.conf`), takže sdílenou paměť to netříští ani
 * nemění.
 */
export function adresaDlazdice(
  web: string,
  d: { z: number; tx: number; ty: number },
  satelit: boolean,
  znovu?: string,
): string {
  const dotaz = [satelit ? 'podklad=satelit' : '', znovu ? `znovu=${encodeURIComponent(znovu)}` : '']
    .filter(Boolean)
    .join('&');
  return `${web}/dlazdice/${d.z}/${d.tx}/${d.ty}${dotaz ? `?${dotaz}` : ''}`;
}
