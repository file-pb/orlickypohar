import Link from "next/link";
import { Boky } from "@/app/boky";
import { ucetUPoskytovatele } from "@/lib/oidc";
import { POLOZKY } from "@/lib/ucet";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Účet je smazaný",
  // Účtenka patří jednomu člověku a vyhledávačům nemá co říct.
  robots: { index: false, follow: false },
};

type Parametry = {
  searchParams: Promise<Record<string, string | undefined>>;
};

/**
 * Účtenka o smazání účtu.
 *
 * <b>Proč stránka a ne hláška na předchozí.</b> Předchozí stránka nabízí
 * tlačítko přihlášenému, a v okamžiku, kdy je tahle na obrazovce, přihlášený
 * už nikdo není — stejná stránka by tedy ukázala „přihlas se", jako kdyby se
 * nic nestalo.
 *
 * <b>Čísla přicházejí adresou.</b> Jinudy to nejde: sezení, do kterého by se
 * daly uložit, v tu chvíli přestalo existovat. Je to tentýž tvar jako u kódu
 * na `/moje-lode` — stav stojí v adrese, ne v paměti serveru.
 */
export default async function Hotovo({ searchParams }: Parametry) {
  const parametry = await searchParams;

  const radky = POLOZKY.map(({ klic, nazev }) => ({
    nazev,
    kolik: Number(parametry[klic] ?? 0),
  })).filter((r) => r.kolik > 0);

  const poskytovatelZrusen = parametry.poskytovatel === "ano";
  const duvod = parametry.duvod;

  return (
    <Boky>
      <h1>Účet je smazaný</h1>
      <p className="podtitulek">
        Je to hotové a nedá se to vzít zpátky. Odhlásili jsme tě i tady.
      </p>

      <h2>Co ubylo</h2>
      {radky.length > 0 ? (
        <ul>
          {radky.map((r) => (
            <li key={r.nazev}>
              <b>{r.kolik}×</b> {r.nazev}
            </li>
          ))}
        </ul>
      ) : (
        <p>
          U nás nebylo co mazat — účet nikdy nedostal oprávnění ani vazbu
          k lodi. Přihlášení je zrušené, a to je celé.
        </p>
      )}

      <h2>Přihlášení u poskytovatele identity</h2>
      {poskytovatelZrusen ? (
        <p>
          <b>Zrušené.</b> Účet na <code>ucty.klihovka.cz</code> je smazaný,
          sezení i vydané tokeny padly a přihlásit se jím už nejde. Nemusíš
          nikam dál.
        </p>
      ) : (
        <>
          <p>
            <b>Zůstalo.</b> {duvod ?? "Zrušení se nepovedlo."} Naše strana je
            přitom smazaná — přihlásit se tím účtem sice půjde, ale nebude tu
            k čemu: vznikl by nový, prázdný účet bez jediného oprávnění.
          </p>
          {ucetUPoskytovatele && (
            <p>
              Zrušit samo přihlášení můžeš u poskytovatele:{" "}
              <a href={ucetUPoskytovatele} target="_blank" rel="noopener noreferrer">
                účet a heslo ↗
              </a>
            </p>
          )}
        </>
      )}

      <h2>Co zůstalo zveřejněné</h2>
      <p>
        Sportovní výsledky, zaznamenané trasy lodi a fotky od pořadatele —
        a v závodní historii bezejmenný záznam bez jména a e-mailu. Proč,
        stojí v{" "}
        <Link href="/osobni-udaje/smazani-uctu">zásadách ke smazání účtu</Link>.
      </p>

      <p className="poznamka">
        <Link href="/">Zpátky na úvodní stránku</Link>
      </p>
    </Boky>
  );
}
