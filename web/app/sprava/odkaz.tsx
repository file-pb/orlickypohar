import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * Odkaz ve správě — jako `next/link`, ale <b>bez předběžného načítání</b>.
 *
 * <b>Proč:</b> jedno otevření `/sprava/2027` vystřelilo **66 požadavků
 * `?_rsc=`** a 19 z nich dostalo od mikrocache 429 (změřeno 12. 10. 2026).
 * Každý takový požadavek je plné serverové vykreslení stránky správy
 * i s voláním API, protože Next si dopředu načítá všech devět regat krát
 * čtyři odkazy; člověk si pak otevře jednu. Zvednout `burst` by 429
 * odstranilo, ale těch 66 drahých vykreslení by pustilo dovnitř — fronta
 * by se jen přesunula z nginxu do webu. Filip rozhodl 14. 10. 2026 vypnout
 * předběžné načítání.
 *
 * <b>Proč komponenta a ne `prefetch={false}` na místě:</b> odkazů ve správě
 * je kolem devadesáti v devatenácti souborech. Rozsypaný atribut by znamenal,
 * že první nově přidaný odkaz ho mít nebude a nikdo si toho nevšimne — tady
 * je to na jednom místě a platí i pro odkazy, které teprve přijdou.
 *
 * <b>Co to stojí:</b> stránka se vykreslí teprve po kliknutí. Změřeno
 * 14. 10. 2026: ustáleně 0,42–0,73 s, ale **první požadavek po chvíli
 * nečinnosti 1,2–2,8 s**. Správa není rozcestník, kde se bloudí, takže to
 * snese — ale je to ta cena, ne nula.
 *
 * Předběžné načtení jde pro jednotlivý odkaz vrátit (`prefetch` se dá předat
 * a přebije předvolbu), kdyby se někde ukázalo, že se vyplatí.
 */
export default function Link({ prefetch = false, ...zbytek }: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={prefetch} {...zbytek} />;
}
