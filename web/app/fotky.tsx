/**
 * Fotky k článkům.
 *
 * <b>Zatím jen náhradní set</b> — kurátorské fotky, které jsou součástí
 * návrhu, ne obsahu. Proto smějí být zabalené ve webu vedle loga a
 * nepotřebují objektové úložiště; to bude potřeba teprve tehdy, až fotku
 * ke svému článku nahraje pořadatel.
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
export function Nahled({ slug }: { slug: string }) {
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
 * Velká fotka nad článkem. <c>alt</c> je prázdný schválně: obrázek je
 * dekorace, ne informace, a čtečce obrazovky nemá co říct navíc.
 */
export function FotkaClanku({ slug }: { slug: string }) {
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
