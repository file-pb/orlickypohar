/**
 * Který z možných kroků je ten, na který se čeká.
 *
 * <b>Proč to vzniklo.</b> Karta rozjížďky nabízela všechny své úkony jako
 * stejně vypadající tlačítka — na obrazovce se čtyřmi rozjížďkami jich
 * bylo třiadvacet a nic neříkalo, které z nich je to, co posouvá zápis
 * dál. Přitom na každé kartě je právě jeden takový: podepsat, potvrdit,
 * otevřít k opravě. Zbytek — pohár, publikace, revize, zrušení — jsou
 * výjimečné úkony, které se za sezónu použijí párkrát.
 *
 * <b>Vlastní soubor, ne `vysledky.ts`.</b> Tamten si tahá `tokenZeSezeni`
 * z `@/lib/oidc`, a testy webu běží na holém nodu, kde se běhový import
 * přes `@/` nerozřeší. Čistá funkce s testy proto bydlí stranou od volání
 * API — stejně jako `presun.ts`.
 */
import type { StavVysledku } from "./vysledky";

/**
 * Stavy tak, jak jdou po sobě. Opsané z `Workflow.Rada` na serveru —
 * <b>tři stupně, ne čtyři</b>, protože `Overeno` zrušil nález K3.
 */
const RADA: StavVysledku[] = ["Navrzeno", "Schvaleno", "Potvrzeno"];

/**
 * Krok, který zápis posune dál — nebo <c>null</c>, když žádný takový není.
 *
 * <b>Z revize a ze zrušení vede jediná cesta</b>, a to na návrh. Není to
 * couvnutí, i když tak zní: je to to jediné, co se dá udělat, aby se
 * s rozjížďkou pohnulo (viz `krokZe`, které u toho mění i text tlačítka).
 *
 * <b>Správcův přeskok se za krok vpřed nepovažuje.</b> API mu nabídne
 * i `Potvrzeno` rovnou z návrhu, protože ve svém rozsahu smí všechno —
 * jenže zvýraznit přeskok znamená nabízet ho jako obvyklou cestu. Obvyklá
 * je řada po jednom stupni; přeskok zůstává mezi ostatními úkony.
 */
export function krokVpred(
  ze: StavVysledku,
  mozne: StavVysledku[],
): StavVysledku | null {
  if (ze === "KRevizi" || ze === "Eliminovano")
    return mozne.includes("Navrzeno") ? "Navrzeno" : null;

  const dalsi = RADA[RADA.indexOf(ze) + 1];
  return dalsi && mozne.includes(dalsi) ? dalsi : null;
}
