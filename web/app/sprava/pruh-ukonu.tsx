import { nactiJa } from "@/lib/ja";
import { polozkyZastavky, prava } from "@/lib/co-smim";
import { DlazdiceSekci } from "@/app/prepinac-sekci";
import { VlajkaIkona, type Vlajka } from "@/app/vlajky";
import { ZnackaPuvodni } from "@/app/logo-puvodni";

/**
 * Signální vlajka u úkonu — <b>tatáž, jakou nese veřejná sekce téže věci</b>,
 * aby pořadatel poznal směrnice podle vlajky L stejně na obou stranách.
 *
 * <b>Vymýšlet chybějící se nesmí</b>: vlajka je vybraná podle toho, co
 * doopravdy znamená v Závodních signálech (`app/vlajky.tsx`), a vymyšlená by
 * rozbila přesně tu znalost, kvůli které tu vlajky jsou. Živé polohy proto
 * dostanou značku poháru, stejně jako ji veřejně nesou Úvod a Vypsání —
 * žádný signál neznamená „kdo je zrovna na vodě".
 */
const ZNAKY: Record<string, Vlajka | null> = {
  vysledky: "modra",
  // Přihlášky vyústí ve startovní listinu a tu veřejně značí P. Miloš drží
  // obojí zvlášť (střípek 6), takže se tu P neopakuje nad dvěma věcmi —
  // ve správě je z té dvojice jen jedna.
  prihlasky: "P",
  smernice: "L",
  boje: "M",
  tracker: null,
};

/** Úsek z adresy úkonu: `/sprava/{ročník}/{úsek}/{regata}`. */
export const usekZAdresy = (kam: string) => kam.split("/")[3] ?? "";

/**
 * Dlaždice úkonů jedné regaty — <b>na rozcestníku i nad každou pracovní
 * obrazovkou</b> (Filip, 29. 10. 2026: *„když budou opravdu fungovat podobně
 * jako tab, že se pod nimi přepne ten cíl… budou vždy pod drobečkovou
 * navigací vidět a tím pádem můžeme i rychle přepínat"*).
 *
 * Do teď se z výsledků do přihlášek chodilo přes drobeček regaty, tedy o dvě
 * kliknutí; jediný odkaz napříč úkony byl „přihlášené lodě →" v podtitulku
 * výsledků, ručně dopsaný právě proto, že cesta jinudy nevedla.
 *
 * <b>Seznam je jeden a týž na všech obrazovkách</b>, protože ho vždycky
 * skládá `polozkyZastavky` z udělených práv. Kdyby si ho každá stránka
 * sestavovala sama, rozešly by se názvy, vlajky nebo rozsah — a pořadatel
 * by se na dvou obrazovkách učil dvojí ovládání.
 *
 * `aktivni` je úsek v adrese (`vysledky`, `prihlasky`, `smernice`, `boje`,
 * `tracker`). Na rozcestníku se nevyplňuje — tam se teprve vybírá.
 */
export async function PruhUkonuRegaty({
  serie,
  zavod,
  aktivni,
}: {
  serie: string;
  zavod: string;
  aktivni?: string;
}) {
  // `nactiJa` je cache na požadavek, takže tohle nestojí další volání API —
  // stránka se na přihlášeného stejně ptá kvůli oprávněním.
  const { ja } = await nactiJa();
  if (!ja) return null;

  const ukony = polozkyZastavky(prava(ja), serie, zavod);
  if (ukony.length === 0) return null;

  return (
    <DlazdiceSekci
      aktivni={aktivni}
      polozky={ukony.map((u) => {
        const klic = usekZAdresy(u.kam);
        const znak = ZNAKY[klic];
        return {
          klic,
          nazev: u.nazev,
          nazevKratky: u.uzky,
          kam: u.kam,
          popis: u.popis,
          znacka: znak ? <VlajkaIkona vlajka={znak} /> : <ZnackaPuvodni />,
        };
      })}
    />
  );
}
