import Link from "next/link";
import { notFound } from "next/navigation";
import { nactiSerii, nactiZavod, ApiNedostupne } from "@/lib/api";
import { najdiLod, napoveda } from "@/lib/verejna-prihlaska";
import { Drobecky } from "@/app/drobecky";
import { Vypadek } from "@/app/vypadek";
import { datum } from "@/app/datum";
import { prihlasAkce } from "./akce";

export const dynamic = "force-dynamic";

type Parametry = {
  params: Promise<{ slug: string; zavod: string }>;
  searchParams: Promise<{ lod?: string; chyba?: string; stav?: string }>;
};

export const metadata = { title: "Přihláška lodi" };

/**
 * Veřejná přihláška lodi na regatu (Filip, 17. 9. 2026).
 *
 * <b>Ve dvou krocích, protože web nemá javascript.</b> Nejdřív se vybere
 * loď z nabídky prohlížeče (`datalist` se všemi loděmi poháru), stránka se
 * znovu načte a formulář je předvyplněný tím, co se o lodi ví z minulých
 * ročníků. Loď, která v seznamu není, se prostě vypíše.
 *
 * <b>Kontakty se nikdy nepředvyplňují</b> — našeptávač je veřejný a jinak
 * by z něj šel vylovit cizí e-mail napsáním jména lodi.
 */
export default async function Prihlaska({ params, searchParams }: Parametry) {
  const { slug, zavod: zavodSlug } = await params;
  const { lod: hledana, chyba, stav } = await searchParams;

  let zavod;
  try {
    zavod = await nactiZavod(slug, zavodSlug);
  } catch (e) {
    if (e instanceof ApiNedostupne) return <Vypadek />;
    throw e;
  }
  if (!zavod) notFound();

  const hlava = (
    <>
      <Drobecky
        cesta={[
          { text: "Domů", kam: "/" },
          { text: "Ročník", kam: `/serie/${slug}` },
          { text: zavod.nazev, kam: `/serie/${slug}/zavody/${zavodSlug}` },
          { text: "Přihláška" },
        ]}
      />
      <h1>Přihláška lodi</h1>
      <p className="podtitulek">
        {zavod.nazev} · {datum(zavod.datum)}
      </p>
    </>
  );

  // Přihlašuje se od vypsání, i po odjetí — kdo dorazil, se ví až večer.
  if (zavod.stav !== "Vypsany" && zavod.stav !== "Odjety")
    return (
      <>
        {hlava}
        <p className="prazdno">
          Regata zatím není vypsaná, takže se na ni nepřihlašuje. Termín je v{" "}
          <Link href={`/serie/${slug}`}>kalendáři ročníku</Link>.
        </p>
      </>
    );

  if (stav === "prijato")
    return (
      <>
        {hlava}
        <p className="hlaska hotovo" role="status">
          Přihláška odeslaná. Pořadatel ji uvidí a ozve se, kdyby něco chybělo.
          {hledana && ` Loď: ${hledana}.`}
        </p>
        <p className="poznamka">
          Ve startovní listině se loď objeví, až ji pořadatel zapíše.{" "}
          <Link href={`/serie/${slug}/zavody/${zavodSlug}`}>Zpátky na regatu →</Link>
        </p>
      </>
    );

  const [vsechny, nalezena, rocnik] = await Promise.all([
    napoveda(slug, { vse: true }),
    hledana ? najdiLod(slug, hledana) : Promise.resolve(null),
    // Kategorie ročníku do výběru. Když se nenačtou, formulář je nenabídne
    // a API vezme první kategorii ročníku.
    nactiSerii(slug).catch(() => null),
  ]);

  const kategorie = rocnik?.kategorie.map((k) => k.nazev) ?? null;

  return (
    <>
      {hlava}

      {chyba && (
        <p className="hlaska chyba" role="alert">
          {chyba}
        </p>
      )}

      <form method="get" className="formular">
        <label>
          Jméno lodi
          <input
            name="lod"
            list="lode-poharu"
            required
            maxLength={120}
            defaultValue={hledana ?? ""}
            placeholder="Začni psát jméno nebo číslo plachty"
          />
          <span className="poznamka">
            Loď, která už v poháru jela, najdeš v nabídce a údaje se předvyplní. Novou prostě napiš.
          </span>
        </label>
        <datalist id="lode-poharu">
          {vsechny.map((l) => (
            <option key={l.lod} value={l.lod}>
              {[l.cisloPlachty, l.typ, l.majitel].filter(Boolean).join(" · ")}
            </option>
          ))}
        </datalist>
        <button type="submit">Vyplnit přihlášku</button>
      </form>

      {hledana && (
        <>
          <h2>{nalezena ? `Loď ${nalezena.lod}` : `Nová loď ${hledana}`}</h2>
          <p className="poznamka" style={{ marginTop: 0 }}>
            {nalezena
              ? nalezena.vRocniku
                // Dřív tu stálo „kategorii nemění formulář, ale správce".
                // Kategorii přihlášky nemění v aplikaci nikdo: `KategorieId`
                // se zapíše při založení (`PrihlaskySprava.cs:456`) a dál ji
                // přepíše jen import. Oprava 9. 10. 2026.
                ? "Loď v tomhle ročníku jede, takže kategorii tenhle formulář nemění — platí ta z přihlášky do ročníku."
                : `Loď jsme našli v poháru${nalezena.posledniRok ? ` (naposledy ${nalezena.posledniRok})` : ""}. Zkontroluj údaje a doplň kontakt.`
              : "Tuhle loď zatím neznáme. Vyplň, co o ní má pořadatel vědět."}
          </p>

          <Formular
            serie={slug}
            zavod={zavodSlug}
            lod={nalezena}
            jmeno={hledana}
            kategorie={kategorie}
          />
        </>
      )}
    </>
  );
}

/**
 * Vlastní přihláška. Kontakt se nikdy nepředvyplňuje; kapitán se mění
 * a jeho e-mail není veřejný údaj.
 */
function Formular({
  serie,
  zavod,
  lod,
  jmeno,
  kategorie,
}: {
  serie: string;
  zavod: string;
  lod: Awaited<ReturnType<typeof najdiLod>>;
  jmeno: string;
  kategorie: string[] | null;
}) {
  return (
    <form action={prihlasAkce} className="formular">
      <input type="hidden" name="serie" value={serie} />
      <input type="hidden" name="zavod" value={zavod} />
      {/* Kdy se formulář otevřel: robot ho odešle hned, člověk ne. */}
      <input type="hidden" name="zobrazenoV" value={new Date().toISOString()} />
      {/* Past na roboty: pole je skryté a člověk ho nevyplní. */}
      <input
        type="text"
        name="web"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px" }}
      />

      <label>
        Jméno lodi
        <input name="lod" required maxLength={120} defaultValue={lod?.lod ?? jmeno} />
      </label>

      <label>
        Číslo plachty
        <input name="cisloPlachty" maxLength={20} defaultValue={lod?.cisloPlachty ?? ""} />
      </label>

      <label>
        Typ lodi
        <input name="typ" maxLength={80} defaultValue={lod?.typ ?? ""} placeholder="Pirát, Fireball…" />
      </label>

      {kategorie && !lod?.vRocniku && (
        <label>
          Kategorie
          <select name="kategorie" defaultValue={lod?.kategorie ?? ""}>
            {kategorie.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <span className="poznamka">
            Loď jede celý ročník v jedné kategorii — vybírá se jednou a{" "}
            <Link href="/napoveda#co-neumime">zpátky to vzít nejde</Link>.
          </span>
        </label>
      )}

      <h2>Kapitán</h2>
      <p className="poznamka" style={{ marginTop: 0 }}>
        Kdo loď řídí a s kým se pořadatel domluví. Kontakt veřejně nikde není.
        Podle téhle adresy se účet při příštím přihlášení{" "}
        <Link href="/napoveda#moje-lod">sám spáruje s lodí</Link>, takže sem
        patří adresa toho, kdo má loď spravovat — ne sdílená schránka klubu.
      </p>

      <label>
        Jméno
        <input name="jmeno" required maxLength={80} defaultValue={lod?.kormidelnik?.split(" ")[0] ?? ""} />
      </label>

      <label>
        Příjmení
        <input
          name="prijmeni"
          required
          maxLength={80}
          defaultValue={lod?.kormidelnik?.split(" ").slice(1).join(" ") ?? ""}
        />
      </label>

      <label>
        E-mail
        <input name="email" type="email" maxLength={320} placeholder="kapitan@example.cz" />
      </label>

      <label>
        Telefon
        <input name="telefon" type="tel" maxLength={40} pattern="[0-9 \+\(\)\/\-]+" placeholder="+420 777 123 456" />
        <span className="poznamka">Stačí jedno z dvojice, ať se ti pořadatel může ozvat.</span>
      </label>

      <label>
        Číslo člena ČSJ
        <input name="cisloCsj" maxLength={20} />
        <span className="poznamka">Nepovinné, pro Orlický pohár se nevyžaduje.</span>
      </label>

      <label>
        Posádka
        <input name="posadka" maxLength={400} placeholder="Kdo pojede s tebou" />
      </label>

      <label>
        Poznámka pro pořadatele
        <textarea name="poznamka" rows={3} maxLength={1000} placeholder="Přijedeme až v pátek večer…" />
      </label>

      <label style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
        <input name="souhlas" type="checkbox" required style={{ width: "auto", marginTop: "0.2rem" }} />
        <span>
          Loď smí být ve startovní listině a pořadatel se mi může ozvat na uvedený kontakt.
        </span>
      </label>

      <button type="submit">Odeslat přihlášku</button>
      <p className="poznamka">
        Přihlášku uvidí pořadatel regaty. Ve startovní listině bude loď, až ji
        zapíše — <Link href="/napoveda#prihlasit-lod">co se s přihláškou děje</Link>.
      </p>
    </form>
  );
}
