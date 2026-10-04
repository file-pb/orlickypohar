import Link from "next/link";
import { Boky } from "@/app/boky";
import { Drobecky } from "@/app/drobecky";
import { pripojAkce } from "./akce";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Připojení k lodi" };

type Parametry = {
  searchParams: Promise<{ kod?: string; chyba?: string }>;
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
  const { kod, chyba } = await searchParams;

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
      <p className="poznamka">
        První, kdo se k lodi připojí, je její kapitán. Další jsou posádka
        a kapitán jim může roli změnit.
      </p>
    </Boky>
  );
}
