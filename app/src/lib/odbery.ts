/**
 * Skládání seznamu odběrů upozornění.
 *
 * <b>Proč to stojí stranou od `upozorneni.ts`.</b> Tenhle soubor nesmí
 * sáhnout na Expo ani na React Native — `upozorneni.ts` při načtení volá
 * `setNotificationHandler`, takže by se bez emulátoru nedal importovat.
 * Takhle jde pravidlo otestovat obyčejným Nodem, stejně jako u sdělení
 * o poloze.
 *
 * <b>Co to opravuje.</b> Do 25. 11. 2026 appka při zapnutí odběru poslala
 * serveru seznam s jediným ročníkem, takže **přepsala ten předchozí**.
 * Tlačítko se přitom tváří jako přepínač u každého ročníku zvlášť: u toho
 * druhého svítilo „Zapnout upozornění", u prvního „Upozornění zapnutá“ —
 * a zapnutí druhého první potichu vyplo. Dokud běžel jediný ročník, nešlo
 * si toho všimnout; s dojezdem 2026 vedle rozjetého 2027 by to znamenalo,
 * že člověk přestane dostávat to, co si zapnul dřív, a nikde se to
 * nedozví. Našlo se to 25. 11. 2026 na skutečném zařízení, které mělo
 * zapsaný odběr ukázkového ročníku místo ostrého.
 */

/**
 * Nový seznam odběrů po klepnutí na přepínač u jednoho ročníku.
 *
 * Zachovává pořadí, do něhož se odběry přidávaly — seznam se posílá
 * serveru a stabilní pořadí znamená, že se zbytečně neposílá podruhé
 * totéž v jiném sledu (`upozorneni.ts` porovnává odeslané tělo).
 */
export function slozOdbery(
  stavajici: readonly string[] | null | undefined,
  odber: string,
  zapnout: boolean,
): string[] {
  const stav = stavajici ?? [];
  if (!zapnout) return stav.filter((o) => o !== odber);
  // Už zapnutý se nepřesouvá na konec: jiné pořadí téhož seznamu by
  // znamenalo jiné tělo požadavku, a tedy zbytečné volání serveru.
  return stav.includes(odber) ? [...stav] : [...stav, odber];
}
