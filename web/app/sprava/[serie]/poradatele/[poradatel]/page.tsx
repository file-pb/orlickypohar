import Link from "next/link";
import { notFound } from "next/navigation";
import { Drobecky, drobeckySpravy } from "@/app/drobecky";
import { Vypadek } from "@/app/vypadek";
import { datum } from "@/app/datum";
import { nactiPoradatele, souradniceTextem } from "@/lib/poradatele";
import { SpravaObrazku } from "@/app/sprava/obrazek";
import { ulozAkce } from "./akce";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Pořadatel — správa" };

type Parametry = {
  params: Promise<{ serie: string; poradatel: string }>;
  searchParams: Promise<{ chyba?: string; stav?: string }>;
};

/**
 * Medailonek pořadatele: web, popis, kontakt, souřadnice.
 *
 * <b>Celé serverové a bez javascriptu</b>, jako kalendář. Chodí se sem
 * jednou za sezónu, typicky z kalendáře.
 *
 * <b>Záznam je společný všem regatám klubu</b>, i v jiných ročnících.
 * Stránka to říká nahlas, protože organizátor jedné regaty jinak nemá
 * jak poznat, že přepisuje i cizí.
 */
export default async function SpravaPoradatele({ params, searchParams }: Parametry) {
  const { serie, poradatel: slug } = await params;
  const zpravy = await searchParams;

  const { stav, detail } = await nactiPoradatele(serie, slug);

  if (stav === "vypadek")
    return (
      <>
        {zpravy.chyba && (
          <p className="hlaska chyba" role="alert">
            {zpravy.chyba}
          </p>
        )}
        <Vypadek />
      </>
    );
  if (stav === "neni") notFound();

  const hlava = (
    <>
      <Drobecky
        cesta={drobeckySpravy(serie, [
          // Na medailonek se chodí z kalendáře — rozcestník na pořadatele
          // odkaz nemá, protože medailonek patří klubu, ne regatě.
          { text: "Kalendář", kam: `/sprava/${serie}/kalendar` },
          { text: detail?.poradatel.nazev ?? "Pořadatel" },
        ])}
      />
      <h1>Pořadatel — správa</h1>
    </>
  );

  if (stav === "neprihlasen")
    return (
      <>
        {hlava}
        <p className="prazdno">
          Na správu pořadatele se musíš <Link href="/prihlaseni">přihlásit</Link>.
        </p>
      </>
    );

  if (stav === "odmitnut")
    return (
      <>
        {hlava}
        <p className="prazdno">
          Přihlášení vypršelo. <Link href="/prihlaseni">Přihlas se znovu</Link>.
        </p>
      </>
    );

  if (stav === "nesmi" || !detail)
    return (
      <>
        {hlava}
        <p className="prazdno">
          V tomhle ročníku k pořadatelům přístup nemáš. Medailonek upravuje rozhodčí, nebo
          organizátor regaty, kterou klub pořádá —{" "}
          <Link href="/napoveda#role">co která role smí</Link>.
        </p>
      </>
    );

  const p = detail.poradatel;
  const prvni = detail.zastavky[0];

  return (
    <>
      {hlava}
      <p className="podtitulek">
        {p.nazev} · {detail.serieNazev}
      </p>

      {zpravy.chyba && (
        <p className="hlaska chyba" role="alert">
          {zpravy.chyba}
        </p>
      )}
      {zpravy.stav === "obrazek" && (
        <p className="hlaska hotovo" role="status">
          Fotka nahraná.{" "}
          {prvni && (
            <Link href={`/serie/${serie}/zavody/${prvni.slug}#poradatel`}>Jak vypadá na webu →</Link>
          )}
        </p>
      )}
      {zpravy.stav === "obrazek-odebran" && (
        <p className="hlaska hotovo" role="status">
          Fotka odebraná.
        </p>
      )}
      {zpravy.stav === "ulozeno" && !zpravy.chyba && (
        <p className="hlaska hotovo" role="status">
          Medailonek uložen.{" "}
          {prvni && (
            <Link href={`/serie/${serie}/zavody/${prvni.slug}#poradatel`}>Jak vypadá na webu →</Link>
          )}
        </p>
      )}

      <h2>Kde se medailonek ukáže</h2>
      <ul className="poznamka" style={{ marginTop: 0 }}>
        {detail.zastavky.map((z) => (
          <li key={z.slug}>
            <Link href={`/serie/${serie}/zavody/${z.slug}#poradatel`}>{z.nazev}</Link>
            {" · "}
            {datum(z.datum)}
            {z.druh === "Akce" && " · komunitní akce"}
          </li>
        ))}
      </ul>
      {detail.zastavekJinde > 0 && (
        <p className="poznamka">
          Klub pořádá i {detail.zastavekJinde}{" "}
          {detail.zastavekJinde === 1 ? "regatu" : detail.zastavekJinde < 5 ? "regaty" : "regat"}{" "}
          v jiném ročníku. Změna se projeví i tam.
        </p>
      )}

      {detail.smiUpravit ? (
        <form action={ulozAkce} className="formular">
          <input type="hidden" name="serie" value={serie} />
          <input type="hidden" name="poradatel" value={p.slug} />

          <label>
            Název
            <input name="nazev" required maxLength={120} defaultValue={p.nazev} />
            <span className="poznamka">
              Přejmenování přepíše jméno na všech regatách klubu. Jiného pořadatele regatě
              přiřadíš v kalendáři.
            </span>
          </label>

          <label>
            Web
            <input
              name="web"
              type="text"
              inputMode="url"
              maxLength={300}
              defaultValue={p.web ?? undefined}
              placeholder="https://yachtclubpisek.cz"
            />
            <span className="poznamka">Na webu se otevře v nové kartě.</span>
          </label>

          <label>
            Popis
            <textarea
              name="popis"
              rows={6}
              maxLength={2000}
              defaultValue={p.popis ?? undefined}
              placeholder="Kdo jste, odkud jezdíte, co na vás čeká. Odstavce odděl prázdným řádkem."
            />
          </label>

          <h2>Kontakt</h2>
          {/* Filip, 15. 9. 2026: ven jde všechno, ale jen vyplněné. */}
          <p className="poznamka" style={{ marginTop: 0 }}>
            Na webu se ukáže jen to, co vyplníš. Jméno a telefon jsou osobní údaje — vyplň je, jen
            když s tím ten člověk souhlasí.
          </p>

          <label>
            Kontaktní osoba
            <input name="kontaktniOsoba" maxLength={120} defaultValue={p.kontaktniOsoba ?? undefined} />
          </label>

          <label>
            E-mail
            <input
              name="email"
              type="email"
              maxLength={320}
              defaultValue={p.email ?? undefined}
              placeholder="info@klub.cz"
            />
          </label>

          <label>
            Telefon
            <input
              name="telefon"
              type="tel"
              maxLength={40}
              // Prohlížeč vzor čte s příznakem `v`: závorky, lomítko
              // i pomlčka musí být ve třídě znaků escapované.
              pattern="[0-9 \+\(\)\/\-]+"
              defaultValue={p.telefon ?? undefined}
              placeholder="+420 777 123 456"
            />
          </label>

          <label>
            Adresa
            <input
              name="adresa"
              maxLength={300}
              defaultValue={p.adresa ?? undefined}
              placeholder="Přístav, obec"
            />
          </label>

          <label>
            Souřadnice přístavu
            <input
              name="souradnice"
              defaultValue={souradniceTextem(p)}
              placeholder="49.5086, 14.1735"
            />
            <span className="poznamka">
              Zkopíruj z Mapy.com nebo OpenStreetMap. Web z nich udělá odkaz na mapu, mapu do stránky
              nevkládá.
            </span>
          </label>

          <button type="submit">Uložit medailonek</button>
        </form>
      ) : (
        <p className="prazdno">
          Medailonek tohohle klubu upravuje rozhodčí, nebo organizátor jeho regaty.
        </p>
      )}

      {detail.smiUpravit && (
        <SpravaObrazku
          serie={serie}
          druh="poradatele"
          klic={p.slug}
          obrazek={p.obrazek}
          bezObrazku="Na webu je u medailonku ilustrační fotka z Orlíku."
        />
      )}
    </>
  );
}
