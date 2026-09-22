import { LOGO } from "@/app/znacka-loga";

/**
 * <b>Původní logo Orlického poháru, dnes nepoužité.</b> Od 22. 9. 2026 je
 * v hlavičce logo Orlik Yacht Series od rozhodčího (`app/logo.tsx`). Tohle
 * zůstává, protože se ještě může hodit (Filip): vrátit ho znamená v layoutu
 * importovat `LogoPuvodni` a `ZnakPozadiPuvodni` místo `Logo` a `ZnakPozadi`.
 * Styly `.logo-*` v `globals.css` k němu zůstaly taky. Soubory ke stažení
 * jsou ve `public/logo/puvodni/`.
 *
 * Logo v hlavičce, ve dvou verzích (Filip, 15. 9. 2026).
 *
 * <b>Monitor:</b> nápis Orlický pohár vychází zpod plachet. Na papíře je
 * plný, přes plachty prosvítá světle. <b>Mobil:</b> čtvercová značka
 * s nápisem ve dvou řádcích jako slabým vodoznakem, stejně jako u znaků
 * tříd. Kterou verzi uvidíš, rozhoduje CSS. Vykreslí se obě, protože
 * serverová stránka šířku okna nezná.
 *
 * Tvary kreslí `app/scripts/ikona.py` ze stejných bodů jako ikonu appky.
 * Web je kreslí přímo do stránky, ne přes `<img>`, aby barvy šly z CSS
 * a logo drželo i v tmavém režimu.
 */

type Verze = "monitor" | "mobil";

// Ořez vodoznaku potřebuje id unikátní na stránce. Komponenta běží jen na
// serveru, stejně jako znak třídy.
let citac = 0;

function Kresba({ verze }: { verze: Verze }) {
  const v = LOGO[verze];
  const cislo = ++citac;
  const orez = `logo-${verze}-${cislo}`;
  const pruhy = `logo-pruhy-${cislo}`;
  // Nápis je v křivkách z Interu, ne text: nezávisí na písmu čtenáře.
  const napis = (trida: string, clipPath?: string, fill?: string) => (
    <path className={trida} d={v.napis} clipPath={clipPath} fill={fill} />
  );

  return (
    <svg className={`logo logo-${verze}`} viewBox={v.viewBox} aria-hidden="true" focusable="false">
      <defs>
        {/* Nápis na monitoru je z vodorovných proužků jako námořnické
            tričko (Filip, 16. 9. 2026). Barvu proužků dává CSS podle
            vzhledu. */}
        {verze === "monitor" && (
          <pattern
            id={pruhy}
            patternUnits="userSpaceOnUse"
            width={LOGO.pruhy.perioda}
            height={LOGO.pruhy.perioda}
          >
            <rect className="logo-pruhy" width={LOGO.pruhy.perioda} height={LOGO.pruhy.tloustka} />
          </pattern>
        )}
        <clipPath id={orez}>
          {LOGO.plachty.map((p) => (
            <polygon key={p.trida} points={p.body} />
          ))}
          <polygon points={LOGO.oblouk} />
        </clipPath>
      </defs>
      {/* Na monitoru je nápis plný a čte se, na mobilu je jen vodoznak. */}
      {verze === "monitor" ? napis("logo-napis", undefined, `url(#${pruhy})`) : napis("logo-vodoznak")}
      {LOGO.plachty.map((p) => (
        <polygon key={p.trida} className={`logo-${p.trida}`} points={p.body} />
      ))}
      <polygon className="logo-oblouk" points={LOGO.oblouk} />
      {napis("logo-vodoznak-na-plachte", `url(#${orez})`)}
    </svg>
  );
}

/**
 * Znak bez nápisu jako slabý vodoznak na pozadí stránek (Filip, 15. 9. 2026).
 * Jen plachty a oblouk ve čtverci loga pro mobil; průhlednost a rozostření
 * mu dává CSS.
 */
export function ZnakPozadiPuvodni() {
  return (
    <svg className="logo pozadi-znak" viewBox={LOGO.mobil.viewBox} aria-hidden="true" focusable="false">
      {LOGO.plachty.map((p) => (
        <polygon key={p.trida} className={`logo-${p.trida}`} points={p.body} />
      ))}
      <polygon className="logo-oblouk" points={LOGO.oblouk} />
    </svg>
  );
}

/**
 * Značka původního loga v velikosti znaku třídy. Používá ji celkové pořadí
 * regaty napříč kategoriemi (Filip, 22. 9. 2026): je to pořadí celého
 * pole Orlického poháru, ne jedné třídy, takže má starý znak poháru.
 */
export function ZnackaPuvodni() {
  return (
    <svg
      className="znak-tridy znak-celkem logo"
      viewBox={LOGO.mobil.viewBox}
      aria-hidden="true"
      focusable="false"
    >
      {LOGO.plachty.map((p) => (
        <polygon key={p.trida} className={`logo-${p.trida}`} points={p.body} />
      ))}
      <polygon className="logo-oblouk" points={LOGO.oblouk} />
    </svg>
  );
}

export function LogoPuvodni() {
  return (
    <>
      <Kresba verze="monitor" />
      <Kresba verze="mobil" />
    </>
  );
}
