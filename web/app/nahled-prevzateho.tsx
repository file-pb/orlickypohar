"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Náhled k přejatému článku, který <b>nikdy nespadne na fotku z Orlíku</b>.
 *
 * Dvě různá prázdna vypadala stejně špatně (Filip, 29. 10. 2026: *„když se
 * z ČSJ nepodaří vůbec žádná fotka, tak prosím o formu vodoznaku jejich
 * loga v módu Dark/White jako fallback, aby tam nebylo prázdno"*):
 *
 * 1. <b>Fotka v datech není.</b> Do dneška nastoupil náhradní set, takže nad
 *    zápisem z jednání výkonného výboru visela závodní plachetnice z Orlické
 *    přehrady. U vlastního článku je to dekorace, u cizího tvrzení — a je to
 *    týž omyl, před kterým varuje komentář v `app/fotky.tsx`.
 * 2. <b>Fotka v datech je, ale nenačte se.</b> Když se soubor do úložiště
 *    nedostal, zůstane v kartě rozbitá ikona. Server o tom neví, takže se to
 *    pozná jedině v prohlížeči — proto je tahle komponenta klientská.
 *
 * <b>Samotné `onError` na to nestačí</b> a změřeno bylo, že nestačí: obrázek
 * ze serverového HTML se začne načítat dřív, než se React připojí, takže
 * chyba proběhne bez posluchače a rozbitá ikona zůstane. Po připojení se
 * proto jednou podíváme, jestli už není hotový a prázdný.
 *
 * Vodoznak je silueta loga zdroje, ne jeho barevná podoba: vybledlá modrá
 * na světlém podkladu je špinavá a na tmavém nečitelná. Silueta se obrací
 * s režimem (`.nahled-vodoznak` v `globals.css`) a drží se zpátky — má říct
 * „článek je odtamtud", ne soutěžit s titulkem.
 */
export function NahledPrevzateho({
  adresa,
  logo,
  velky = false,
  srcSet,
  sizes,
}: {
  /** Fotka u zdroje nebo naše kopie. Nepovinná — a smí i selhat. */
  adresa?: string | null;
  /** Logo zdroje, jak ho vydává API (`zdrojLogo`). */
  logo: string;
  velky?: boolean;
  /** Varianty naší kopie. U fotky ze zdroje chybí — rozměry k ní neznáme. */
  srcSet?: string;
  sizes?: string;
}) {
  const [selhalo, setSelhalo] = useState(false);
  const obraz = useRef<HTMLImageElement>(null);
  const trida = velky ? "nahled nahled-velky" : "nahled";

  useEffect(() => {
    const i = obraz.current;
    // `complete` s nulovou šířkou znamená „dotáhlo se to a nic z toho nebylo".
    if (i?.complete && i.naturalWidth === 0) setSelhalo(true);
  }, [adresa]);

  if (adresa && !selhalo)
    return (
      <picture className={trida}>
        {/* `referrerPolicy` schválně ne: zdroj má právo vidět, že se jeho
            obrázek načítá z našeho webu. */}
        <img
          ref={obraz}
          src={adresa}
          srcSet={srcSet}
          sizes={sizes}
          alt=""
          loading={velky ? undefined : "lazy"}
          decoding="async"
          onError={() => setSelhalo(true)}
        />
      </picture>
    );

  return (
    <picture className={`${trida} nahled-vodoznak`}>
      {/* Prázdný `alt`: vodoznak je výplň místa, ne informace. Odkud článek
          je, stojí vedle titulku textem — a to čtečka obrazovky přečte. */}
      <img src={logo} alt="" loading="lazy" decoding="async" />
    </picture>
  );
}
