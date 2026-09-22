import type { Ja } from "@/lib/ja";
import { ucetUPoskytovatele } from "@/lib/oidc";
import { ZavriMimo } from "@/app/zavri-mimo";
import { OdkazJinam } from "@/app/odkaz-jinam";

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

  const opravneni = ja?.opravneni ?? [];

  // Ročníky, kde smí udělovat role: správce všechny, rozhodčí pořadatele
  // a editora regaty. Nabízet odkaz na obrazovku, ze které se vrátí
  // „nemáš práva", je slib naprázdno.
  const spravuje = [
    ...new Set(
      opravneni
        .filter((o) => o.role === "Spravce" || o.role === "Rozhodci")
        .map((o) => o.serie),
    ),
  ];

  // Ročníky, kde smí psát. Editor píše na blog, organizátor a správce
  // obsahují editora — tohle pořadí je v `Prava` a tady se jen opisuje pro
  // rozhodnutí, jestli odkaz vůbec nabídnout.
  const pise = [
    ...new Set(
      opravneni
        .filter((o) => o.role === "Editor" || o.role === "Organizator" || o.role === "Spravce")
        .map((o) => o.serie),
    ),
  ];

  // Ročníky, kde smí do kalendáře a k výsledkům. Rozhodčí zakládá
  // regaty a hýbe termíny, organizátor svůj závod vypisuje, uzavírá
  // a zapisuje výsledky — odkaz má smysl pro oba. Editor ne: ten jen píše.
  const kalendar = [
    ...new Set(
      opravneni
        .filter((o) => o.role === "Rozhodci" || o.role === "Organizator" || o.role === "Spravce")
        .map((o) => o.serie),
    ),
  ];

  // Role na celém webu (od 22. 9. 2026). Starší API pole nevydává.
  const web = ja?.web ?? [];
  const piseNaWeb = web.includes("Editor") || web.includes("Spravce");
  const spravujeWeb = web.includes("Spravce");

  return (
    <details className="profil">
      {/* Zavírání při klepnutí jinam a na Escape. Zbytek nabídky je
          serverový a rozbalování obstará prohlížeč sám. */}
      <ZavriMimo />
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
        {/* Obyčejný odkaz, ne <Link>: klientský přechod si stránku drží
            v paměti routeru a administrace pak ukáže starší podobu, dokud
            se stránka nenačte znovu. Hlavička se při něm navíc nepřekresluje
            vůbec, takže vedle sebe skončí jméno z jednoho vykreslení
            a obsah z jiného. Sem se chodí zřídka a celé načtení nic nestojí. */}
        {piseNaWeb && (
          <OdkazJinam obycejny href="/sprava/web/clanky">
            Obecné články
          </OdkazJinam>
        )}
        {spravujeWeb && (
          <OdkazJinam obycejny href="/sprava/opravneni-webu">
            Oprávnění na celý web
          </OdkazJinam>
        )}
        {pise.map((serie) => (
          <OdkazJinam obycejny key={`clanky-${serie}`} href={`/sprava/${serie}/clanky`}>
            Novinky {serie}
          </OdkazJinam>
        ))}
        {kalendar.map((serie) => (
          <OdkazJinam obycejny key={`kalendar-${serie}`} href={`/sprava/${serie}/kalendar`}>
            Kalendář {serie}
          </OdkazJinam>
        ))}
        {kalendar.map((serie) => (
          <OdkazJinam obycejny key={`vysledky-${serie}`} href={`/sprava/${serie}/vysledky`}>
            Výsledky {serie}
          </OdkazJinam>
        ))}
        {spravuje.map((serie) => (
          <OdkazJinam obycejny key={serie} href={`/sprava/${serie}/opravneni`}>
            Oprávnění {serie}
          </OdkazJinam>
        ))}
        {/* Účet spravuje poskytovatel, ne my: heslo naší aplikací neprojde
            a změna e-mailu se ověřuje poštou. Odsud se tam jen odchází —
            do nové karty, aby člověk nepřišel o rozdělanou stránku. */}
        {ucetUPoskytovatele && (
          <a href={ucetUPoskytovatele} target="_blank" rel="noopener noreferrer">
            Účet a heslo ↗
          </a>
        )}
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
