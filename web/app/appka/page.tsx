import Link from "next/link";
import QRCode from "qrcode";

// Stránky stojí na databázi, ne na obsahu známém v době buildu.
export const dynamic = "force-dynamic";

export const metadata = { title: "Appka" };

/**
 * Adresa souboru ke stažení. Z prostředí schválně: **každý build appky má
 * jinou adresu**, takže napsaná v kódu by znamenala nasazení webu po každém
 * buildu. Takhle se mění jeden řádek v compose.
 */
const APK = process.env.APK_URL;

export default async function Appka() {
  // QR se kreslí na serveru z té adresy, ať se nemůže rozejít s odkazem
  // vedle. Na počítači je to jediný pohodlný způsob, jak appku dostat
  // do telefonu.
  const qr = APK
    ? await QRCode.toString(APK, { type: "svg", margin: 0 })
    : null;

  return (
    <>
      <h1>Appka</h1>
      <p className="podtitulek">
        Výsledky, kalendář a průběžné pořadí v telefonu. Totéž co na webu, jen
        po ruce na břehu.
      </p>

      {!APK || !qr ? (
        <p className="prazdno">Appka zatím není ke stažení.</p>
      ) : (
        <div className="stahni">
          <div className="qr" dangerouslySetInnerHTML={{ __html: qr }} />
          <div>
            <p>
              <a className="tlacitko" href={APK}>
                Stáhnout pro Android
              </a>
            </p>
            <p className="poznamka" style={{ marginTop: "0.75rem" }}>
              Na počítači načti QR kód telefonem. Android se při první instalaci mimo
              obchod jednou zeptá, jestli tomuhle zdroji věříš — pak už se neptá.
            </p>
          </div>
        </div>
      )}

      <h2>Pro iPhone zatím ne</h2>
      <p>
        Vydání pro iPhone vyžaduje placený účet u Applu za 99 dolarů ročně. Zaplatí
        se, až bude o appku zájem — do té doby je{" "}
        <Link href="/">web</Link> na telefonu plnohodnotná náhrada, protože se
        přizpůsobuje displeji.
      </p>
    </>
  );
}
