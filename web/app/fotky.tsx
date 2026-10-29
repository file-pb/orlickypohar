import { NahledPrevzateho } from "@/app/nahled-prevzateho";

/**
 * Fotky k článkům.
 *
 * <b>Nahraná fotka má přednost.</b> Leží v objektovém úložišti a API ji
 * vydává s adresami. Když žádná není, nastupuje <b>náhradní set</b> —
 * kurátorské fotky, které jsou součástí návrhu, ne obsahu, a proto smějí
 * být zabalené ve webu vedle loga.
 *
 * <b>Výběr je odvozený ze slugu, ne náhodný.</b> Server renderuje stránku
 * při každém požadavku, takže náhoda by znamenala, že se fotka u téhož
 * článku mění po každém obnovení — a čtenář by měl dojem, že se web
 * rozpadá. Z téhož jména vyjde vždycky táž fotka.
 *
 * <b>Není to fotka z toho závodu a nesmí to tak vypadat.</b> Proto se
 * nepopisuje, nemá titulek a nese jen kredit autorovi. Kdyby u článku
 * o Vánoční regatě stálo pod fotkou z Radavy „Vánoční regata", byla by to
 * nepravda, kterou nikdo nezamýšlel.
 */

const NAHRADNI = [
  { soubor: "hero", popis: "Závodní plachetnice v náklonu na Orlické přehradě" },
  { soubor: "hero-2", popis: "Lodě před zámkem Orlík" },
  { soubor: "hero-3", popis: "Loď s červeným spinakrem" },
];

export const AUTOR_FOTEK = "Jiří Tašl";

/** Nahraný obrázek, jak ho vydává API. Když není, nastupuje náhradní set. */
export type Obrazek = { nahled: string; velky: string; autor: string; popis?: string | null };

/**
 * Součet znaků slugu. Stačí to: nejde o rozptyl, ale o to, aby dvě sousední
 * karty nevyšly stejně a aby výsledek byl při každém vykreslení týž.
 */
function index(slug: string) {
  let soucet = 0;
  for (const znak of slug) soucet = (soucet + znak.charCodeAt(0)) % 9973;
  return soucet % NAHRADNI.length;
}

export const fotkaClanku = (slug: string) => NAHRADNI[index(slug)];

/**
 * Náhled do karty. Malý, proto stačí varianta 400 px — na 800 by se
 * stahovalo čtyřikrát víc, než na co se kouká.
 */
export function Nahled({
  slug,
  obrazek,
  adresa,
  logoZdroje,
}: {
  slug: string;
  obrazek?: Obrazek | null;
  /**
   * Hotová adresa obrázku bez rozměrů — fotka, kterou k přejatému článku
   * dal zdroj. Nekopírujeme ji, načítá se z jeho serveru; jsou to náhledy
   * kolem 500 px, takže na kartu stačí.
   */
  adresa?: string;
  /**
   * Logo zdroje u přejatého článku. <b>Mění, co se stane bez fotky</b>:
   * místo náhradního setu nastoupí vodoznak loga, protože plachetnice
   * z Orlíku nad cizím článkem je tvrzení, ne dekorace.
   */
  logoZdroje?: string;
}) {
  if (logoZdroje)
    return <NahledPrevzateho adresa={obrazek?.nahled ?? adresa} logo={logoZdroje} />;

  if (adresa)
    return (
      <picture className="nahled">
        {/* `referrerPolicy` schválně ne: zdroj má právo vidět, že se jeho
            obrázek načítá z našeho webu. Hotlink bez uvedení odkud by byl
            horší, ne lepší. */}
        <img src={adresa} alt="" loading="lazy" decoding="async" />
      </picture>
    );

  if (obrazek)
    return (
      <picture className="nahled">
        <img src={obrazek.nahled} alt="" loading="lazy" decoding="async" />
      </picture>
    );

  const f = fotkaClanku(slug);

  return (
    <picture className="nahled">
      <source type="image/avif" srcSet={`/foto/${f.soubor}-400.avif`} />
      {/* JPEG zůstává pro prohlížeče bez AVIF. Je to táž fotka, jen větší —
          menší variantu v JPEG nemáme a kvůli záloze ji vyrábět nemá smysl. */}
      <img src={`/foto/${f.soubor}.jpg`} alt="" loading="lazy" decoding="async" />
    </picture>
  );
}

/**
 * Velký náhled pro hlavní novinku na úvodu. Šířka karty, ne článku —
 * stačí varianta 800 px, nahraná fotka dává svou velkou.
 */
export function NahledVelky({
  slug,
  obrazek,
  adresa,
  logoZdroje,
}: {
  slug: string;
  obrazek?: Obrazek | null;
  /**
   * Fotka u zdroje, když od něj nemáme vlastní kopii. Bývá to náhled kolem
   * 500 px, takže na velké kartě je měkká — pořád je to ale lepší než naše
   * fotka lodi u cizího článku (Filip, 2. 10. 2026).
   */
  adresa?: string;
  /** Viz `Nahled`. */
  logoZdroje?: string;
}) {
  if (logoZdroje)
    return (
      <NahledPrevzateho
        velky
        logo={logoZdroje}
        adresa={obrazek?.velky ?? adresa}
        srcSet={obrazek ? `${obrazek.nahled} 480w, ${obrazek.velky} 1600w` : undefined}
        sizes={obrazek ? "(min-width: 48rem) 40rem, 100vw" : undefined}
      />
    );

  if (adresa && !obrazek)
    return (
      <picture className="nahled nahled-velky">
        <img src={adresa} alt="" decoding="async" />
      </picture>
    );

  if (obrazek)
    return (
      <picture className="nahled nahled-velky">
        <img
          src={obrazek.velky}
          srcSet={`${obrazek.nahled} 480w, ${obrazek.velky} 1600w`}
          sizes="(min-width: 48rem) 40rem, 100vw"
          alt=""
          decoding="async"
        />
      </picture>
    );

  const f = fotkaClanku(slug);
  return (
    <picture className="nahled nahled-velky">
      <source type="image/avif" srcSet={`/foto/${f.soubor}-800.avif`} />
      <img src={`/foto/${f.soubor}.jpg`} alt="" decoding="async" />
    </picture>
  );
}

/**
 * Velká fotka nad článkem. <c>alt</c> je prázdný schválně: obrázek je
 * dekorace, ne informace, a čtečce obrazovky nemá co říct navíc.
 */
export function FotkaClanku({ slug, obrazek }: { slug: string; obrazek?: Obrazek | null }) {
  // Vlastní fotka k článku popisek mít smí — je opravdu z toho, o čem se píše.
  if (obrazek)
    return (
      <figure className="fotka-clanku">
        <img
          src={obrazek.velky}
          srcSet={`${obrazek.nahled} 480w, ${obrazek.velky} 1600w`}
          sizes="(min-width: 48rem) 46rem, 100vw"
          alt={obrazek.popis ?? ""}
        />
        <figcaption>
          {obrazek.popis && `${obrazek.popis} · `}Foto {obrazek.autor}
        </figcaption>
      </figure>
    );

  const f = fotkaClanku(slug);

  return (
    <figure className="fotka-clanku">
      <picture>
        <source
          type="image/avif"
          sizes="(min-width: 48rem) 46rem, 100vw"
          srcSet={[800, 1200].map((w) => `/foto/${f.soubor}-${w}.avif ${w}w`).join(", ")}
        />
        <img src={`/foto/${f.soubor}.jpg`} alt="" />
      </picture>
      <figcaption>Foto {AUTOR_FOTEK}</figcaption>
    </figure>
  );
}
