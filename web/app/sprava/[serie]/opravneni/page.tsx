import Link from "next/link";
import { notFound } from "next/navigation";
import { Drobecky } from "@/app/drobecky";
import { Vypadek } from "@/app/vypadek";
import { ROLE, nactiPrehled, nazevRole, type Prehled, type Radek, type Role } from "@/lib/sprava";
import { udelAkce, odeberAkce } from "./akce";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Oprávnění" };

type Parametry = {
  params: Promise<{ serie: string }>;
  searchParams: Promise<{
    chyba?: string;
    stav?: string;
    email?: string;
    role?: Role;
    zavod?: string;
    kdo?: string;
  }>;
};

/**
 * Kdo co smí v ročníku — a v kterém jeho místě.
 *
 * <b>Rozsah je celý ročník, nebo jedna zastávka.</b> Proto se oprávnění
 * nevypisují jedním seznamem: pořadatel Radavské regaty a správce celého
 * poháru jsou dvě různé věci a v jednom sloupci by splynuly.
 *
 * Celé je to serverové a bez javascriptu — formulář odešle prohlížeč,
 * odpověď je nová stránka. Administrace se používá zřídka a z telefonu na
 * břehu; hydratovat kvůli dvěma polím celou obrazovku nemá co vrátit.
 */
export default async function Opravneni({ params, searchParams }: Parametry) {
  const { serie } = await params;
  const zpravy = await searchParams;

  const { stav, prehled } = await nactiPrehled(serie);

  // Výpadek nesmí spolknout výsledek zápisu. Když se nepovede načíst
  // seznam, ale akce něco vzkázala — třeba že účet na ten e-mail
  // neexistuje — musí to být vidět nad výpadkem, ne místo něj.
  if (stav === "vypadek") {
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
  }
  if (stav === "neni") notFound();

  const hlava = (
    <>
      <Drobecky
        cesta={[
          { text: "Domů", kam: "/" },
          { text: "Ročník", kam: `/serie/${serie}` },
          { text: "Oprávnění" },
        ]}
      />
      <h1>Oprávnění</h1>
    </>
  );

  // Nepřihlášenému a tomu, kdo nemá práva, se stránka nesmí ukázat prázdná:
  // z prázdné tabulky se nepozná, jestli tam nic není, nebo se to jen
  // neukazuje.
  if (stav === "neprihlasen") {
    return (
      <>
        {hlava}
        <p className="prazdno">
          Na správu oprávnění se musíš <Link href="/prihlaseni">přihlásit</Link>.
        </p>
      </>
    );
  }

  // Sezení existuje, ale token neprošel. Kdyby se tohle vypisovalo stejně
  // jako „přihlas se", vypadalo by vypršené přihlášení jako žádné.
  if (stav === "odmitnut") {
    return (
      <>
        {hlava}
        <p className="prazdno">
          Přihlášení vypršelo — API tvůj token nepřijalo.{" "}
          <Link href="/prihlaseni">Přihlas se znovu</Link>.
        </p>
      </>
    );
  }

  if (stav === "nesmi" || !prehled) {
    return (
      <>
        {hlava}
        <p className="prazdno">
          Role v tomhle ročníku uděluje jeho správce; pořadatele a editora
          zastávky i rozhodčí. Práva ti může dát současný správce.
        </p>
      </>
    );
  }

  const zprava = hotovo(zpravy, prehled);
  const naRocnik = prehled.opravneni.filter((o) => !o.zavod);
  const naZastavku = (slug: string) => prehled.opravneni.filter((o) => o.zavod === slug);

  // Rozhodčí přiřazuje jen pořadatele a editora jedné zastávce. Nabídka
  // i tlačítka se řídí tím, co API pustí — pravidlo samo žije v `Udeleni`.
  const role = prehled.smiNaRocnik ? ROLE : ROLE.filter((r) => !r.jenRocnik);
  const smiOdebrat = (r: Radek) =>
    prehled.smiNaRocnik || (Boolean(r.zavod) && role.some((x) => x.role === r.role));

  return (
    <>
      {hlava}
      <p className="podtitulek">{prehled.nazev}</p>

      {zpravy.chyba ? (
        <p className="hlaska chyba" role="alert">
          {zpravy.chyba}
        </p>
      ) : (
        zprava && <p className="hlaska hotovo">{zprava}</p>
      )}

      <form className="udeleni" action={udelAkce}>
        <input type="hidden" name="serie" value={prehled.serie} />

        <label>
          <span>E-mail</span>
          {/* Podle e-mailu, ne podle identifikátoru — ten člověk nikde
              nevidí. Účet ale vzniká až prvním přihlášením, o čemž je
              poznámka pod formulářem. */}
          <input type="email" name="email" required placeholder="jan@priklad.cz" />
        </label>

        <label>
          <span>Role</span>
          <select name="role" defaultValue="Organizator">
            {role.map((r) => (
              <option key={r.role} value={r.role}>
                {r.nazev}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Kde</span>
          <select name="zavod" defaultValue="" required={!prehled.smiNaRocnik}>
            {prehled.smiNaRocnik ? (
              <option value="">Celý ročník</option>
            ) : (
              <option value="" disabled>
                Vyber zastávku
              </option>
            )}
            {prehled.zastavky.map((z) => (
              <option key={z.slug} value={z.slug}>
                {z.nazev}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" className="tlacitko">
          Udělit
        </button>
      </form>

      {!prehled.smiNaRocnik && (
        <p className="poznamka">
          Jako rozhodčí přiřazuješ pořadatele a editora jednotlivým zastávkám.
          Role na celý ročník a rozhodčího uděluje správce.
        </p>
      )}

      <dl className="pravidla role-napoveda">
        {ROLE.map((r) => (
          <div key={r.role}>
            <dt>{r.nazev}</dt>
            <dd>
              {r.popis}
              {r.jenRocnik && <span className="poznamka"> Jen na celý ročník.</span>}
            </dd>
          </div>
        ))}
      </dl>

      <p className="poznamka">
        Roli lze dát jen tomu, kdo se už aspoň jednou přihlásil — účet vzniká
        přihlášením, pozvat člověka rolí nejde. Posledního správce ročníku
        odebrat nelze.
      </p>

      <Skupina nadpis="Celý ročník" radky={naRocnik} serie={prehled.serie} smiOdebrat={smiOdebrat} />

      {prehled.zastavky.map((z) => (
        <Skupina
          key={z.slug}
          nadpis={z.nazev}
          radky={naZastavku(z.slug)}
          serie={prehled.serie}
          smiOdebrat={smiOdebrat}
          skryjPrazdnou
        />
      ))}
    </>
  );
}

/**
 * Věta o tom, co se právě povedlo — složená tady, protože jména zastávek
 * a rolí zná stránka, kdežto akce jen jejich slugy.
 */
function hotovo(
  z: { stav?: string; email?: string; role?: Role; zavod?: string; kdo?: string },
  prehled: Prehled,
) {
  if (z.stav === "odebrano") return `Oprávnění ${z.kdo} odebráno.`;
  if (z.stav !== "udeleno" || !z.email || !z.role) return null;

  const kde = z.zavod
    ? prehled.zastavky.find((x) => x.slug === z.zavod)?.nazev ?? z.zavod
    : null;

  return kde
    ? `${z.email} má roli ${nazevRole(z.role)} na zastávce ${kde}.`
    : `${z.email} má roli ${nazevRole(z.role)} na celý ročník.`;
}

/**
 * Jedno místo se svými lidmi. Prázdná zastávka se schová, prázdný ročník ne:
 * ročník bez jediného oprávnění je stav, který se má vidět, kdežto devět
 * prázdných zastávek je jen devět prázdných tabulek.
 */
function Skupina({
  nadpis,
  radky,
  serie,
  smiOdebrat,
  skryjPrazdnou,
}: {
  nadpis: string;
  radky: Radek[];
  serie: string;
  smiOdebrat: (r: Radek) => boolean;
  skryjPrazdnou?: boolean;
}) {
  if (radky.length === 0 && skryjPrazdnou) return null;

  return (
    <section className="skupina-opravneni">
      <h2>{nadpis}</h2>

      {radky.length === 0 ? (
        <p className="prazdno">Zatím tu nemá roli nikdo.</p>
      ) : (
        <div className="tabulka-obal">
          <table>
            <thead>
              <tr>
                <th className="lod">Kdo</th>
                <th className="vlevo">Role</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {radky.map((r) => (
                <tr key={r.id}>
                  <td className="lod">
                    {r.zobrazovane}
                    {r.email && <div className="majitel">{r.email}</div>}
                  </td>
                  <td className="vlevo">{nazevRole(r.role)}</td>
                  <td>
                    {smiOdebrat(r) && (
                      <form action={odeberAkce}>
                        <input type="hidden" name="serie" value={serie} />
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="kdo" value={r.zobrazovane} />
                        <button type="submit" className="odebrat">
                          Odebrat
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
