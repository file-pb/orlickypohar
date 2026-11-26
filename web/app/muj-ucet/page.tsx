import Link from "next/link";
import QRCode from "qrcode";
import { Boky } from "@/app/boky";
import { Drobecky } from "@/app/drobecky";
import { datumClanku, okamzik } from "@/app/datum";
import { adresaNapojeni, mojeKlice } from "@/lib/klice-uctu";
import { vystavKodAkce, odeberKlicAkce } from "./akce";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Můj účet" };

type Parametry = {
  searchParams: Promise<{ kod?: string; doKdy?: string; chyba?: string; stav?: string }>;
};

/**
 * Můj účet — a hlavně <b>Moje identifikace</b>: QR, kterým se na účet
 * napojí telefon.
 *
 * <b>Proč to vzniklo</b> (Filip, 26. 11. 2026): *„na zitadel uživatele
 * tahat nechci… když se člověk dostane do uživatelského profilu v rámci
 * webu, tak tam může být informace moje identifikace s QR kódem, což si
 * člověk naskenuje nebo na to namíří mobil s apkou. WhatsApp v podstatě
 * takhle funguje taky."*
 *
 * <b>QR vidí jen majitel účtu</b>, po přihlášení, na svém profilu. Tím
 * odpadá otázka „komu kód vydat" i obrazovka pro správce — a je to tvar,
 * který lidé znají.
 *
 * <b>Kreslí se na serveru do SVG</b>, stejně jako u kódu k lodi: žádný
 * javascript, žádný další požadavek na obrázek, a funguje to i v tmavém
 * režimu.
 */
export default async function MujUcet({ searchParams }: Parametry) {
  const { kod, doKdy, chyba, stav } = await searchParams;
  const { stav: nacteno, data: klice } = await mojeKlice();

  if (nacteno === "neprihlasen" || nacteno === "odmitnut")
    return (
      <Boky>
        <Drobecky cesta={[{ text: "Domů", kam: "/" }, { text: "Můj účet" }]} />
        <h1>Můj účet</h1>
        <p>
          Tahle stránka je pro přihlášené. <Link href="/prihlaseni">Přihlas se</Link>.
        </p>
      </Boky>
    );

  const qr = kod ? await QRCode.toString(adresaNapojeni(kod), { type: "svg", margin: 1 }) : null;

  return (
    <Boky>
      <Drobecky cesta={[{ text: "Domů", kam: "/" }, { text: "Můj účet" }]} />
      <h1>Můj účet</h1>

      {chyba && (
        <p className="hlaska chyba" role="alert">
          {chyba}
        </p>
      )}
      {stav === "odebrano" && <p className="hlaska">Telefon odebrán.</p>}

      <h2>Moje identifikace</h2>
      <p className="podtitulek">
        Appka se nepřihlašuje heslem. Napojí se na tenhle účet kódem odsud a pak
        umí všechno, co ty.
      </p>

      {qr && kod ? (
        <>
          <p>Namiř na to appku, nebo kód opiš.</p>
          <p className="kod-velky">{kod}</p>
          {/* SVG z knihovny, ne obrázek z internetu — vykresluje se na
              serveru a nikam se neposílá. */}
          <div className="qr" dangerouslySetInnerHTML={{ __html: qr }} />
          <p className="poznamka">
            {doKdy && <>Platí do {okamzik(doKdy)}. </>}
            Uplatnit ho jde <b>jednou</b>. Je to krátce schválně: kód svítí na
            obrazovce a kdokoliv kolem si ho může vyfotit.
          </p>
        </>
      ) : (
        <form action={vystavKodAkce} className="formular">
          <button type="submit">Vystavit kód pro appku</button>
        </form>
      )}

      <h2>Napojené telefony</h2>
      {(klice ?? []).length === 0 ? (
        <p className="poznamka">Zatím žádný. Vystav kód výš a namiř na něj appku.</p>
      ) : (
        <ul className="seznam">
          {(klice ?? []).map((k) => (
            <li key={k.id}>
              <div>
                <b>{k.zarizeni ?? "Telefon"}</b>
                <span className="detail">
                  {" "}
                  napojen {datumClanku(k.vydanV)}
                  {k.ozvalSeV
                    ? `, naposledy se ozval ${datumClanku(k.ozvalSeV)}`
                    : ", zatím se neozval"}
                </span>
              </div>
              {/* <b>Odebrat je celá cesta ven po ztrátě telefonu</b>, takže
                  je u každého řádku, ne schované pod nastavením. */}
              <form action={odeberKlicAkce} className="radkove">
                <input type="hidden" name="klic" value={k.id} />
                <button type="submit">Odebrat</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </Boky>
  );
}
