import Link from "next/link";
import type { Ja } from "@/lib/ja";

/**
 * Ikonka přihlášeného člověka s rozbalovací nabídkou.
 *
 * Postavené na `<details>`, ne na javascriptu. Rozbalování je jediná věc,
 * kterou to má umět, a prohlížeč ji zvládá sám — hlavička tak zůstává celá
 * serverová a nic se kvůli jednomu tlačítku nehydratuje. Cena je jediná:
 * nabídka se nezavře klepnutím jinam, jen dalším klepnutím na ikonku.
 *
 * <b>Kruh nese iniciály, ne obrázek.</b> Fotku bychom museli odkud vzít —
 * u poskytovatele nemusí být žádná a tahat ji odtud znamená prozradit mu,
 * kterou stránku si člověk zrovna otevřel.
 */
export function Profil({ ja }: { ja: Ja | null }) {
  // `null` znamená, že cookie existuje, ale API token odmítlo. Nabídka
  // v tu chvíli musí nabídnout odhlášení — jinak se z toho stavu nedá odejít.
  const jmeno = ja?.zobrazovane;

  return (
    <details className="profil">
      <summary aria-label={jmeno ? `Účet ${jmeno}` : "Účet"} title={jmeno ?? "Účet"}>
        <span className="kruh" aria-hidden="true">
          {iniciály(jmeno)}
        </span>
      </summary>

      <div className="nabidka">
        <div className="hlava">
          {/* Tentýž kruh jako v hlavičce, jen větší. Je to potvrzení, na
              koho se člověk kouká — proto nahoře a na střed. */}
          <span className="kruh velky" aria-hidden="true">
            {iniciály(jmeno)}
          </span>
          {jmeno ? (
            <>
              <b>{jmeno}</b>
              {ja?.email && <span>{ja.email}</span>}
            </>
          ) : (
            <>
              <b>Přihlášení nefunguje</b>
              <span>Token odmítlo API. Odhlas se a zkus to znovu.</span>
            </>
          )}
        </div>

        {/* Zatím je tu jediná položka. Až přijde administrace, patří sem
            odkazy na to, co člověk podle svých oprávnění spravuje — proto
            je to nabídka, ne rovnou odkaz na odhlášení. */}
        <Link href="/odhlaseni">Odhlásit se</Link>
      </div>
    </details>
  );
}

/**
 * „Jan Novák" → „JN". Z jednoho slova první dvě písmena, protože jedno
 * písmeno v kruhu vypadá jako chyba.
 */
function iniciály(jmeno?: string) {
  if (!jmeno) return "?";

  const slova = jmeno.trim().split(/\s+/).filter(Boolean);
  if (slova.length === 0) return "?";
  if (slova.length === 1) return slova[0].slice(0, 2).toUpperCase();

  return (slova[0][0] + slova[slova.length - 1][0]).toUpperCase();
}
