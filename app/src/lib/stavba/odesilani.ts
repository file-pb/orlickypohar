/**
 * Vyprazdňování fronty prvků.
 *
 * <b>Po jednom a v pořadí.</b> Pořadí prvku na trati počítá server podle
 * toho, v jakém pořadí požadavky dorazí (`DalsiPoradiAsync` pod touž
 * transakcí, která prvek ukládá). Dvě odeslání naráz by tedy trať
 * zamíchala — proto jeden požadavek v letu a fronta striktně od nejstaršího.
 *
 * <para>
 * <b>Odmítnutí není důvod k opakování.</b> Když server řekne „trať je
 * přijatá a zamčená", bušení ji neodemkne; tu větu musí přečíst člověk.
 * Nedoručení je naopak úplně běžné a zkusí se znovu. Ten rozdíl appka už
 * zná z `OdmitnutoServerem` a tady na něm stojí celá smyčka.
 * </para>
 */
import { OdmitnutoServerem, postavPrvek, type PostavPrvek } from '../api';
import { cekajici, hotovo, prvniKOdeslani, zapisPotiz, type CekajiciPrvek } from './fronta';

export type VysledekOdesilani = {
  /** Kolik prvků v tomhle běhu došlo na server. */
  odeslano: number;
  /** Na čem to stojí, nebo `null`, když je fronta prázdná. */
  stoji: CekajiciPrvek | null;
  /** Proč to stojí — věta pro obrazovku. */
  proc: string | null;
};

/**
 * Pošle, co jde. Vrací se i tehdy, když nic neodeslala — volající z toho
 * nemá dělat chybu, protože „zrovna není signál" je na vodě normální stav.
 */
export async function odesliFrontu(
  serie: string,
  zavod: string,
  /**
   * Čím se posílá. Výchozí je skutečné volání API; testy sem dávají
   * svoje, aby se dalo zkusit to, na čem záleží — že se po odmítnutí
   * nepokračuje dál ve frontě (`app/testy/fronta.test.ts`).
   */
  posli: (
    serie: string,
    zavod: string,
    vstup: PostavPrvek,
  ) => Promise<unknown | null> = postavPrvek,
): Promise<VysledekOdesilani> {
  let odeslano = 0;

  // Strop je pojistka proti nekonečné smyčce, kdyby se někdy stalo, že
  // server odpoví úspěchem a prvek ve frontě přesto zůstane. Běžná fronta
  // má jednotky prvků.
  for (let i = 0; i < 100; i++) {
    const prvni = prvniKOdeslani(serie, zavod);
    if (!prvni) break;

    try {
      const prvek = await posli(serie, zavod, prvni.vstup as PostavPrvek);

      // `null` znamená, že nikdo není přihlášený (401). Není to odmítnutí
      // prvku — po přihlášení projde —, ale zkoušet dál nemá smysl.
      if (prvek === null) {
        zapisPotiz(prvni.id, 'Nikdo není přihlášený. Přihlas se a zkus to znovu.', false);
        return { odeslano, stoji: prvni, proc: 'Nikdo není přihlášený.' };
      }

      hotovo(prvni.id);
      odeslano++;
    } catch (e) {
      if (e instanceof OdmitnutoServerem) {
        const duvod = e.duvod ?? 'Server prvek odmítl.';
        zapisPotiz(prvni.id, duvod, true);
        return { odeslano, stoji: prvni, proc: duvod };
      }

      const duvod = 'Zatím se nepodařilo odeslat — není signál.';
      zapisPotiz(prvni.id, duvod, false);
      return { odeslano, stoji: prvni, proc: duvod };
    }
  }

  const zbyva = cekajici(serie, zavod);
  const prvniZbyly = zbyva[0] ?? null;
  return {
    odeslano,
    stoji: prvniZbyly,
    proc: prvniZbyly?.potiz ?? null,
  };
}
