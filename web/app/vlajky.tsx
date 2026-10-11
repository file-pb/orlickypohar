/**
 * Signální vlajky u tabů regaty (Filip, 11. 10. 2026: *„dej těm tabům nějaké
 * ikonky třeba z vlajkové abecedy… ať je to živější"*).
 *
 * <b>Vlajka se vybírá podle toho, co doopravdy znamená</b> v Závodních
 * signálech Pravidel jachtingu, ne podle toho, jak vypadá. Závodník je zná
 * z vody a čte je jako slova; vlajka pověšená u nesprávné sekce by nebyla
 * dekorace, ale nepravda.
 *
 * | Sekce | Vlajka | Co znamená na vodě |
 * |---|---|---|
 * | Směrnice | **L** (Lima) | na břehu: *byla vyvěšena zpráva pro závodníky* |
 * | Trať | **M** (Mike) | *předmět nesoucí tento signál nahrazuje chybějící značku* |
 * | Lodě | **P** (Papa) | přípravný signál — lodě se chystají na start |
 * | Výsledky | modrá | loď rozhodčích: *jsem na stanovišti cíle* |
 *
 * <b>Úvod vlajku nedostal.</b> Žádný signál neznamená „tady je řeč o celé
 * regatě" a vymyslet si jeden by právě tu znalost rozbilo. Nese proto značku
 * poháru — stejně jako ji v tabech tříd nese pořadí celého pole, které taky
 * není třída.
 *
 * <b>Barvy jsou dané</b> mezinárodním kódem, ne motivem webu: žlutá a černá
 * Lima vypadá stejně ve světlém i tmavém režimu, protože na vodě taky
 * vypadá pořád stejně. Z CSS jde jen rámeček, aby bílá vlajka neutekla do
 * bílého pozadí.
 */

export type Vlajka = "L" | "M" | "P" | "modra";

const MODRA = "#10499a";
const ZLUTA = "#f2c200";
const CERNA = "#1c1c1c";
const BILA = "#ffffff";

/** Co vlajka znamená — do `title`, ať se to dá zjistit bez hledání v pravidlech. */
const VYZNAM: Record<Vlajka, string> = {
  L: "vlajka L (Lima): na břehu znamená, že je vyvěšena zpráva pro závodníky",
  M: "vlajka M (Mike): předmět s tímto signálem nahrazuje chybějící značku",
  P: "vlajka P (Papa): přípravný signál před startem",
  modra: "modrá vlajka: loď rozhodčích je na stanovišti cíle",
};

function Kresba({ vlajka }: { vlajka: Vlajka }) {
  switch (vlajka) {
    case "L":
      // Šachovnice 2×2, žlutá vlevo nahoře.
      return (
        <>
          <rect x="0" y="0" width="9" height="6" fill={ZLUTA} />
          <rect x="9" y="0" width="9" height="6" fill={CERNA} />
          <rect x="0" y="6" width="9" height="6" fill={CERNA} />
          <rect x="9" y="6" width="9" height="6" fill={ZLUTA} />
        </>
      );
    case "M":
      // Modrá s bílým ondřejským křížem od rohu k rohu.
      return (
        <>
          <rect x="0" y="0" width="18" height="12" fill={MODRA} />
          <path
            d="M0 0 L18 12 M18 0 L0 12"
            stroke={BILA}
            strokeWidth="3.2"
            fill="none"
          />
        </>
      );
    case "P":
      // Modrá s bílým obdélníkem uprostřed.
      return (
        <>
          <rect x="0" y="0" width="18" height="12" fill={MODRA} />
          <rect x="6" y="4" width="6" height="4" fill={BILA} />
        </>
      );
    case "modra":
      return <rect x="0" y="0" width="18" height="12" fill={MODRA} />;
  }
}

/**
 * Vlajka jako ikona.
 *
 * Skrytá před čtečkou obrazovky (`aria-hidden`), protože název sekce stojí
 * hned vedle a „vlajka P: přípravný signál, Lodě" by byl jen hluk. `title`
 * zůstává: tooltip kreslí prohlížeč z DOM, ne z toho, co vidí čtečka, takže
 * myší se význam zjistit dá.
 */
export function VlajkaIkona({ vlajka }: { vlajka: Vlajka }) {
  return (
    <svg
      className="vlajka"
      viewBox="0 0 18 12"
      aria-hidden="true"
      focusable="false"
    >
      <title>{VYZNAM[vlajka]}</title>
      <Kresba vlajka={vlajka} />
    </svg>
  );
}
