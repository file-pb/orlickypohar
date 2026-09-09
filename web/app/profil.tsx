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
export function Profil({ ja, duvod }: { ja: Ja | null; duvod: string | null }) {
  // `null` znamená, že cookie existuje, ale API token odmítlo. Nabídka
  // v tu chvíli musí nabídnout odhlášení — jinak se z toho stavu nedá odejít.
  const jmeno = ja?.zobrazovane;

  // Ročníky, kde je správcem. Jen ty: udělovat role smí správce a nabízet
  // odkaz na obrazovku, ze které se vrátí „nemáš práva", je slib naprázdno.
  const spravuje = [
    ...new Set(
      (ja?.opravneni ?? []).filter((o) => o.role === "Spravce").map((o) => o.serie),
    ),
  ];

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
              {/* Důvod z hlavičky API. Bez něj je karta jen konstatování,
                  po kterém se stejně musí hledat v logu. */}
              <span>{duvod ?? "API token odmítlo. Odhlas se a zkus to znovu."}</span>
            </>
          )}
        </div>

        {/* Co člověk podle svých oprávnění spravuje. Proto je to nabídka
            a ne rovnou odkaz na odhlášení. */}
        {spravuje.map((serie) => (
          <Link key={serie} href={`/sprava/${serie}/opravneni`}>
            Oprávnění {serie}
          </Link>
        ))}
        {/* Formulář, ne odkaz. Odhlášení něco mění, takže se nesmí dát
            vyvolat pouhou návštěvou adresy — přednačtením, náhledem odkazu
            nebo firemní kontrolou, která si stránky prochází sama. */}
        <form action="/odhlaseni" method="post">
          <button type="submit">Odhlásit se</button>
        </form>
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
