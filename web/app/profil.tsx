import type { Ja } from "@/lib/ja";
import { polozkyWebu, prava } from "@/lib/co-smim";
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

  // Oprávnění vyhodnocuje `lib/co-smim`, opsané z `Prava` na serveru. Nabídka
  // si je dřív počítala sama a **jen z rolí na ročník**: kdo měl roli na celý
  // web a žádnou v ročníku, neviděl ročníkové položky, ačkoliv na ty obrazovky
  // smí (audit, 6. 10. 2026).
  const udelena = prava(ja);

  // Ročníky, kde má člověk roli přímo. Role na celý web se tu nedopočítává —
  // seznam ročníků hlavička nezná a kvůli nabídce se pro něj nebude volat API.
  // Právě proto je první položkou Správa: rozcestník ročníky zná.
  const mojeRocniky = [
    ...new Set(
      (ja?.opravneni ?? []).filter((o) => o.role !== "Ctenar").map((o) => o.serie),
    ),
  ];

  const web = polozkyWebu(udelena);
  // Má vůbec co spravovat? Stačí jedna role kdekoliv, i na celý web.
  const maSpravu = mojeRocniky.length > 0 || web.length > 0;

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
        {/* Moje lodě má každý přihlášený, i bez jediného oprávnění: vazba
            k lodi vzniká e-mailem nebo kódem, ne rolí ve správě
            (Filip, 4. 10. 2026). */}
        {/* Správa je první a jediná cesta dovnitř. Dřív tu stál seznam deseti
            odkazů pojmenovaných slugem ročníku („Kalendář 2026-nanecisto") a kdo
            přišel zapsat dojezdy, musel vědět, že se na to jde přes Výsledky.
            Rozpis i navedení na rozdělanou práci patří na rozcestník, kde je na
            to místo — nabídka má dovést k němu (Filip, 6. 10. 2026). */}
        {maSpravu && (
          <OdkazJinam obycejny href="/sprava">
            <b>Správa</b>
          </OdkazJinam>
        )}
        {/* Zkratka pro toho, kdo má roli ve víc ročnících: jinak by musel
            na rozcestník jen proto, aby si vybral ten svůj. */}
        {mojeRocniky.length > 1 &&
          mojeRocniky.map((serie) => (
            <OdkazJinam obycejny key={serie} href={`/sprava/${serie}`}>
              Ročník {serie}
            </OdkazJinam>
          ))}
        <OdkazJinam obycejny href="/moje-lode">
          Moje lodě
        </OdkazJinam>
        {/* Věci mimo ročníky. Zůstávají v nabídce, protože rozcestník ročníku
            je o ročníku a tyhle do něj nepatří. Jmenuje je `co-smim`, ať se
            nabídka a rozcestník nemůžou rozejít. */}
        {web.map((p) => (
          <OdkazJinam obycejny key={p.kam} href={p.kam}>
            {p.nazev}
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
