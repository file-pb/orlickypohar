import Link from "next/link";
import QRCode from "qrcode";
import { Boky } from "@/app/boky";

// Stránky stojí na databázi, ne na obsahu známém v době buildu.
export const dynamic = "force-dynamic";

export const metadata = { title: "Appka" };

/**
 * Adresa souboru ke stažení. Z prostředí schválně: **každý build appky má
 * jinou adresu**, takže napsaná v kódu by znamenala nasazení webu po každém
 * buildu. Takhle se mění jeden řádek v compose.
 */
const APK = process.env.APK_URL;

/**
 * Co ta adresa rozdává: číslo buildu a den vydání. Z prostředí z téhož
 * důvodu jako adresa — a <b>ne z `app/vydane-apk.json`</b>, ačkoliv je
 * tam taky: obraz webu se staví jen z `web/`, takže ten soubor v něm
 * není. Rozchod obou míst hlásí CI.
 */
const VERZE = process.env.APK_VERZE;
const VYDANO = process.env.APK_VYDANO;

/** Den vydání česky. Nesmyslné datum se neukazuje, než aby lhalo. */
function den(iso: string | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" });
}

export default async function Appka() {
  // QR se kreslí na serveru z té adresy, ať se nemůže rozejít s odkazem
  // vedle. Na počítači je to jediný pohodlný způsob, jak appku dostat
  // do telefonu.
  const qr = APK
    ? await QRCode.toString(APK, { type: "svg", margin: 0 })
    : null;

  return (
    <Boky>
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
            {/* <b>Která verze se rozdává.</b> Bez toho vypadá druhé
                stahování jako první a nejde poznat, že je venku novější
                build než ten v telefonu — appka svou verzi v Účtu ukazuje
                od buildu 5, web o ní dosud mlčel. */}
            {VERZE && (
              <p className="poznamka" style={{ marginTop: "0.75rem" }}>
                Ke stažení je <strong>build {VERZE}</strong>
                {den(VYDANO) ? ` z ${den(VYDANO)}` : ""}. Svou verzi najdeš
                v appce v <em>Účtu</em>; je-li nižší, tahle je novější.
              </p>
            )}
            <p className="poznamka" style={{ marginTop: VERZE ? undefined : "0.75rem" }}>
              Na počítači načti QR kód telefonem. Android se při první instalaci
              mimo obchod zeptá, jestli tomuhle zdroji věříš.
            </p>
            <p className="poznamka">
              <strong>Na Samsungu se nezeptá, rovnou to zakáže.</strong> Hlásí
              „Neznámá aplikace je blokována" a instalace neproběhne, dokud se v{" "}
              <em>Nastavení → Zabezpečení a soukromí → Automatické blokování</em>{" "}
              tahle ochrana nevypne. Po instalaci se dá zapnout zpátky.
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
    </Boky>
  );
}
