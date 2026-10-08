import Link from "next/link";
import { Boky } from "@/app/boky";
import { Drobecky } from "@/app/drobecky";
import { nactiSerie } from "@/lib/api";
import { lodeKVyberu } from "@/lib/pripojeni";
import { pozadejAkce, pripojAkce } from "./akce";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Připojení k lodi" };

type Parametry = {
  searchParams: Promise<{ kod?: string; chyba?: string; zadost?: string }>;
};

/**
 * Připojení k lodi kódem — cíl QR z papíru od pořadatele.
 *
 * <b>Stránka funguje i bez appky.</b> Kdo načte QR foťákem telefonu, skončí
 * tady v prohlížeči; kdo kód dostal na papíře, opíše ho do políčka. Appka
 * dělá totéž přes vlastní čtečku.
 *
 * Kód z adresy se předvyplní, ale nic se neodesílá samo: připojení k lodi
 * je krok, který má člověk potvrdit, ne něco, co se stane otevřením odkazu.
 */
export default async function Pripojeni({ searchParams }: Parametry) {
  const { kod, chyba, zadost } = await searchParams;

  // Lodě pro ty, kdo kód nemají. Výpadek API tenhle blok jen schová —
  // opsání kódu na něm nezávisí.
  const rocniky = (await nactiSerie().catch(() => null)) ?? [];
  const { lode } = await lodeKVyberu(rocniky);

  return (
    <Boky>
      <Drobecky cesta={[{ text: "Domů", kam: "/" }, { text: "Připojení k lodi" }]} />
      <h1>Připojení k lodi</h1>
      <p className="podtitulek">
        Kód dostaneš od pořadatele při registraci, nebo od kapitána lodi.
      </p>

      {chyba && (
        <p className="hlaska chyba" role="alert">
          {chyba}
        </p>
      )}
      {zadost === "podana" && (
        <p className="hlaska" role="status">
          Žádost je podaná. Teď ji musí potvrdit kapitán lodi — do té doby
          k lodi nepatříš.
        </p>
      )}

      <form action={pripojAkce} className="formular">
        <label>
          Kód
          <input
            type="text"
            name="kod"
            defaultValue={kod ?? ""}
            maxLength={16}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="např. K7MPX3"
            required
          />
        </label>
        <button type="submit">Připojit se k lodi</button>
      </form>

      <p className="poznamka">
        Kód platí čtvrt hodiny. Když vyprší, nech si vystavit nový — kapitán ho
        najde v <Link href="/moje-lode">mých lodích</Link>.
      </p>
      {/* Dřív tu stálo, že první připojený je kapitán a že kapitán mění
          role. Obojí je proti kódu: `Kody.RoleProNoveho` je natvrdo
          `Posadka` a role u lodi mění jen správce ročníku
          (`KapitanstviEndpoints.SpravceAsync`). Oprava 9. 10. 2026. */}
      <p className="poznamka">
        Kdo zadá kód, je <b>posádka</b> — kapitána lodi určuje správce
        ročníku. Jak se to celé má k sobě, je v{" "}
        <Link href="/napoveda#moje-lod">nápovědě</Link>.
      </p>

      {/* Třetí cesta: kdo kód nemá, požádá a kapitán potvrdí. Nestojí to
          nic předem — pořadatel nemusí nic rozdávat (plán, *Jak se
          z přihlášení stane kormidelník*). */}
      {lode.length > 0 && (
        <>
          <h2>Kód nemáš?</h2>
          <p>
            Vyber loď, se kterou jedeš. Žádost uvidí její kapitán a potvrdí ji;
            do té doby k lodi nepatříš.
          </p>
          <form action={pozadejAkce} className="formular">
            <label>
              Loď
              <select name="lod" required defaultValue="">
                <option value="" disabled>
                  Vyber loď
                </option>
                {lode.map((l) => (
                  <option key={l.lodId} value={l.lodId}>
                    {[l.nazev, l.cisloPlachty, l.kategorie].filter(Boolean).join(" · ")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Co o sobě říct kapitánovi <span>(nepovinné)</span>
              <input
                type="text"
                name="poznamka"
                maxLength={200}
                placeholder="Např. jedu s vámi jako posádka"
              />
            </label>
            <button type="submit">Požádat o připojení</button>
          </form>
          <p className="poznamka">
            Když kapitán žádost zamítne, znovu o tuhle loď požádat nejde —
            domluv se s ním napřímo.
          </p>
        </>
      )}
    </Boky>
  );
}
