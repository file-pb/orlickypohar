/**
 * Shoda v cíli v klepacím listu (nález K7, ZPJ A7).
 *
 * <b>Vlastní modul, ne `cil.tsx`.</b> Testy webu běží na holém nodu
 * (`node --experimental-strip-types`), kde se komponenta s `react` a
 * `@/lib/…` nerozřeší. Čistá pravidla proto bydlí stranou od obrazovky —
 * stejně jako `presun.ts`.
 *
 * <b>Proč příznak, a ne číslo.</b> Klepací list čísluje místa od jedničky
 * podle pořadí klepnutí, takže číslo je v něm výsledek, ne vstup. Shoda je
 * <b>vztah k předchozímu místu</b> („dojela shodně s tou před sebou"), a
 * tak ji taky nese appka (`app/src/lib/cil.ts`): kdyby se v klepacím listu
 * držela jako číslo, rozpadla by se prvním dalším klepnutím.
 *
 * <b>Co drží čas a co drží místo.</b> Čas i příznak shody patří k místu,
 * ne k lodi — šipky přehazují lodě a čas zůstává tam, kde byl zapsaný
 * (tak se web chová od 14. 11. 2026). Prohození dvou shodných lodí je
 * proto úkon bez následku, ne chyba; totéž dělá `prohodVRade` ve formuláři.
 */

/** Jedno místo v klepacím cílovém listu. */
export type MistoVCili = {
  id: number;
  v: string | null;
  /**
   * Dojela shodně s lodí o místo výš (ZPJ A7). Na prvním místě nemá co
   * znamenat a {@link cislaMist} ho tam ignoruje — zbyl by tam po odebrání
   * lodi, se kterou se shoda vázala.
   */
  shodneSPredchozim?: boolean;
};

/**
 * Čísla míst od jedničky. Shodné lodě mají totéž číslo a <b>další loď se
 * nepřečísluje</b>: dvě lodě třetí a za nimi pátá, protože A7 dělí body za
 * obsazená místa, ne za řádky.
 */
export function cislaMist(mista: readonly MistoVCili[]): number[] {
  const cisla: number[] = [];
  for (let i = 0; i < mista.length; i += 1) {
    cisla.push(mista[i].shodneSPredchozim && i > 0 ? cisla[i - 1] : i + 1);
  }
  return cisla;
}

/**
 * Zapne nebo zruší shodu místa <c>kde</c> s místem nad ním.
 *
 * Na prvním místě nedělá nic — shoda je vztah ke dvojici a první místo
 * nemá s čím.
 */
export function prepniShodu(mista: readonly MistoVCili[], kde: number): MistoVCili[] {
  if (kde <= 0 || kde >= mista.length) return [...mista];
  return mista.map((m, i) =>
    i === kde ? { ...m, shodneSPredchozim: !m.shodneSPredchozim } : m,
  );
}

/**
 * Odebere místo a <b>převede shodu na toho, kdo se na jeho místo posune</b>.
 *
 * Bez toho by skupina shody po odebrání prostřední lodi tiše přilnula
 * k docela jiné lodi: loď, která byla shodná s odebranou, by se stala
 * shodnou s tou nad ní, ačkoliv o ní nikdo nic netvrdil. Následník proto
 * přejímá vztah odebrané lodi — byla-li odebraná sama shodná, zůstává
 * shoda; nebyla-li, končí.
 */
export function odeberMisto(mista: readonly MistoVCili[], kde: number): MistoVCili[] {
  if (kde < 0 || kde >= mista.length) return [...mista];
  const odebrane = mista[kde];
  return mista
    .filter((_, i) => i !== kde)
    .map((m, i) =>
      i === kde && m.shodneSPredchozim
        ? { ...m, shodneSPredchozim: odebrane.shodneSPredchozim ?? false }
        : m,
    );
}

/**
 * Prohodí lodě na dvou místech. <b>Čas a shoda zůstávají u místa</b>, mění
 * se jen to, která loď na něm stojí.
 */
export function prohodMista(mista: readonly MistoVCili[], z: number, na: number): MistoVCili[] {
  if (z < 0 || na < 0 || z >= mista.length || na >= mista.length) return [...mista];
  const id = mista.map((m) => m.id);
  const [vyjmute] = id.splice(z, 1);
  id.splice(na, 0, vyjmute);
  return id.map((x, i) => ({ ...mista[i], id: x }));
}

/**
 * Shody z čísel, jak je vydal server. Příznak server nevydává — vydává
 * pořadí, a dvě stejná čísla za sebou <b>jsou</b> ta shoda.
 */
export function shodyZCisel(poradi: readonly number[]): boolean[] {
  return poradi.map((c, i) => i > 0 && poradi[i - 1] === c);
}

/**
 * Čísla míst <b>v kategorii</b>, taky se shodami.
 *
 * Shoda platí i tady — dvě lodě téže kategorie na témž místě mají v ní
 * totéž číslo a další je o dvě dál, protože A7 dělí body za obsazená
 * místa. Shoda s lodí <b>jiné</b> kategorie se v kategorii neprojeví:
 * mezi sebou se ty dvě lodě nepředjely.
 */
export function cislaVKategoriich(
  mista: readonly MistoVCili[],
  kategorie: (id: number) => string,
): number[] {
  const cisla: number[] = [];
  for (let i = 0; i < mista.length; i += 1) {
    const kat = kategorie(mista[i].id);
    const shodnaTataz =
      i > 0 && mista[i].shodneSPredchozim === true && kategorie(mista[i - 1].id) === kat;
    cisla.push(
      shodnaTataz
        ? cisla[i - 1]
        : mista.slice(0, i).filter((m) => kategorie(m.id) === kat).length + 1,
    );
  }
  return cisla;
}

/**
 * Místa ze zápisu, jak ho vydal server.
 *
 * <b>Shodné lodě se řadí podle času dojezdu</b>, ne podle pořadí, v jakém
 * je vrátila databáze. Číslo místa mají obě stejné, takže jím se rozlišit
 * nedají — a bez druhého klíče se pořadí uvnitř skupiny mění od načtení
 * k načtení. Na bodech to nesejde (A7 je dělí rovným dílem), ale až se
 * shoda zruší, rozhoduje právě tohle, která loď zůstane vepředu; a to
 * nesmí záviset na tom, kdo stránku kdy otevřel. Zjištěno 20. 11. 2026 na
 * produkci: zapnutí a vypnutí shody prohodilo dvě lodě.
 *
 * Loď bez času jde za ty s časem — čas se bere při klepnutí, takže
 * prázdno znamená zápis z papíru.
 */
export function zeZapisu(
  lode: readonly { prihlaskaId: number; poradiVCili?: number | null; dojezdV?: string | null }[],
): MistoVCili[] {
  const vporadi = lode
    .filter((l) => l.poradiVCili != null)
    .sort(
      (a, b) =>
        a.poradiVCili! - b.poradiVCili! ||
        (a.dojezdV ?? "\uffff").localeCompare(b.dojezdV ?? "\uffff") ||
        a.prihlaskaId - b.prihlaskaId,
    );
  const shody = shodyZCisel(vporadi.map((l) => l.poradiVCili!));
  return vporadi.map((l, i) => ({
    id: l.prihlaskaId,
    v: l.dojezdV ?? null,
    shodneSPredchozim: shody[i],
  }));
}
