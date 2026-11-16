/**
 * Kdy se poloha smí vzít jako pípnutí.
 *
 * <b>Jádro je stáří fixu, ne přesnost.</b> Systém umí vrátit polohu
 * zaměřenou před chvílí, a protože stavitel mezi dvěma body popojede,
 * položila by taková poloha druhou značku tam, kde stála první. Na
 * obrazovce by to vypadalo úplně stejně jako správné pípnutí — proto to
 * musí hlídat pravidlo, ne oko.
 *
 * <para>
 * <b>Meze jsou opsané ze serveru</b> (`Pipnuti` v `Features/Boje/Boje.cs`:
 * `NejhorsiPresnostM`, `SirkaOd`…`DelkaDo`); hranice území přišly do
 * sdíleného modulu `lib/hranice.ts`, protože je potřebuje i web. Opisují
 * se schválně: prvek,
 * který by server odmítl, by se jinak zařadil do fronty a <b>zastavil ji
 * celou</b>, dokud ho někdo ručně nezahodí. Lepší je neuložit ho. Když se
 * čísla jednou rozejdou, rozhoduje server — tyhle jen šetří cestu.
 * </para>
 *
 * Čisté funkce, bez `expo-location` — dají se zkoušet na Node
 * (`app/testy/poloha.test.ts`).
 */
import { vCesku } from '../hranice';

/** Nad tuhle přesnost poloha není z družic a server ji odmítne. */
export const NEJHORSI_PRESNOST_M = 100;

/**
 * Nad tuhle přesnost se pípnout dá, ale řekne se to nahlas.
 * Telefon u vody hlásí běžně 3 až 10 m; třicet metrů je bóje o půl délky
 * startovní linie vedle, a to stavitel má vědět dřív, než klepne.
 */
export const PRESNOST_K_ZAMYSLENI_M = 25;

/**
 * Jak stará smí poloha být. Čtyři vteřiny jsou kompromis: odběr hlásí
 * novou polohu po vteřině, takže čerstvý fix je skoro vždycky po ruce,
 * a motorák mezitím neujede tolik, aby to posunulo značku.
 */
export const NEJSTARSI_FIX_MS = 4000;

export { SIRKA_OD, SIRKA_DO, DELKA_OD, DELKA_DO } from '../hranice';

/** Jedna poloha z telefonu. `kdy` je čas zaměření, ne čas čtení. */
export type Fix = {
  sirka: number;
  delka: number;
  presnostM: number | null;
  kdy: number;
};

export type Posudek =
  /** Pípnout jde. `varovani` je věta, která nebrání, ale má být vidět. */
  | { ok: true; varovani: string | null }
  /** Pípnout nejde a tohle je důvod, kterým se to řekne staviteli. */
  | { ok: false; proc: string };

/**
 * Smí se z téhle polohy udělat pípnutí?
 *
 * <b>Pořadí otázek není libovolné.</b> Nejdřív jestli poloha vůbec je,
 * pak jestli je čerstvá, pak jestli je k něčemu a nakonec jestli je na
 * Orlíku. Opačně by stará poloha z Prahy hlásila „nejsi na Orlíku",
 * což je pravda o špatné věci.
 */
export function posud(fix: Fix | null, ted: number): Posudek {
  if (!fix) return { ok: false, proc: 'Čekám na polohu z družic.' };

  const stari = ted - fix.kdy;
  if (stari > NEJSTARSI_FIX_MS)
    return {
      ok: false,
      proc: `Poloha je ${Math.round(stari / 1000)} s stará. Počkej, až telefon zaměří znovu.`,
    };

  // Záporné stáří znamená, že se hodiny telefonu a čas fixu rozcházejí.
  // Není to důvod nepípnout — čas se stejně posílá zvlášť a server ho
  // zváží sám —, ale tvářit se, že je poloha čerstvá, taky ne.
  if (stari < -NEJSTARSI_FIX_MS)
    return { ok: false, proc: 'Hodiny telefonu nesedí s časem polohy. Zkus to za chvíli.' };

  if (fix.presnostM != null && fix.presnostM > NEJHORSI_PRESNOST_M)
    return {
      ok: false,
      proc:
        `Poloha je přesná jen na ${Math.round(fix.presnostM)} m — to už je ze sítě, ` +
        'ne z družic. Počkej na lepší signál.',
    };

  if (!vCesku(fix.sirka, fix.delka))
    return { ok: false, proc: 'Tahle poloha není v Česku. Zkontroluj signál z družic.' };

  if (fix.presnostM == null)
    return { ok: true, varovani: 'Telefon nehlásí přesnost.' };

  if (fix.presnostM > PRESNOST_K_ZAMYSLENI_M)
    return {
      ok: true,
      varovani: `Přesnost ${Math.round(fix.presnostM)} m. Pípnout jde, ale značka bude nepřesná.`,
    };

  return { ok: true, varovani: null };
}

/** Přesnost na obrazovku. Bez čísla se 5 m a 65 m tváří stejně. */
export function popisPresnosti(fix: Fix | null): string {
  if (!fix) return 'hledám polohu';
  if (fix.presnostM == null) return 'přesnost neznámá';
  return `±${Math.round(fix.presnostM)} m`;
}
