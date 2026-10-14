import Link from "@/app/sprava/odkaz";
import { Drobecky, drobeckySpravy } from "@/app/drobecky";
import { Vypadek } from "@/app/vypadek";
import { ROLE_WEBU, nactiPrehledWebu } from "@/lib/sprava";
import { odeberZWebuAkce, udelNaWebuAkce } from "./akce";

export const dynamic = "force-dynamic";
export const metadata = { title: "Oprávnění na celý web — správa" };

type Parametry = {
  searchParams: Promise<{ chyba?: string; stav?: string; email?: string; kdo?: string }>;
};

const nazev = (role: string) => ROLE_WEBU.find((r) => r.role === role)?.nazev ?? role;

/**
 * Role na celém webu (od 22. 9. 2026). Menší bratr obrazovky oprávnění
 * ročníku: bez regat a jen dvě role, editor a správce webu. Serverová
 * a bez javascriptu jako zbytek správy.
 */
export default async function OpravneniWebu({ searchParams }: Parametry) {
  const zpravy = await searchParams;
  const { stav, prehled } = await nactiPrehledWebu();

  const hlava = (
    <>
      <Drobecky cesta={drobeckySpravy(null, [{ text: "Oprávnění na celý web" }])} />
      <h1>Oprávnění na celý web</h1>
    </>
  );

  if (stav === "vypadek") return <Vypadek />;
  if (stav === "neprihlasen" || stav === "odmitnut")
    return (
      <>
        {hlava}
        <p className="prazdno">
          Musíš se <Link href="/prihlaseni">přihlásit</Link>.
        </p>
      </>
    );
  if (stav !== "ok" || !prehled)
    return (
      <>
        {hlava}
        <p className="prazdno">Role na celém webu uděluje jen správce webu.</p>
      </>
    );

  return (
    <>
      {hlava}
      <p className="podtitulek">
        Editor webu píše obecné články mimo ročník. Správce webu smí všechno ve všech ročnících.
      </p>

      {zpravy.chyba && (
        <p className="hlaska chyba" role="alert">
          {zpravy.chyba}
        </p>
      )}
      {zpravy.stav === "udeleno" && (
        <p className="hlaska hotovo" role="status">
          Role udělena ({zpravy.email}).
        </p>
      )}
      {zpravy.stav === "odebrano" && (
        <p className="hlaska hotovo" role="status">
          Role odebrána{zpravy.kdo ? ` (${zpravy.kdo})` : ""}.
        </p>
      )}

      <h2>Udělit roli</h2>
      <form action={udelNaWebuAkce} className="formular">
        <label>
          E-mail
          <input name="email" type="email" required list="ucty-webu" />
          <datalist id="ucty-webu">
            {prehled.ucty.map((u) => u.email && <option key={u.id} value={u.email} label={u.zobrazovane} />)}
          </datalist>
          <span className="poznamka">Účet vzniká až prvním přihlášením, rolí se pozvat nedá.</span>
        </label>
        <label>
          Role
          <select name="role" defaultValue="Editor">
            {ROLE_WEBU.map((r) => (
              <option key={r.role} value={r.role} title={r.popis}>
                {r.nazev}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Udělit</button>
      </form>

      <h2>Kdo má roli na celém webu</h2>
      {prehled.opravneni.length === 0 ? (
        <p className="prazdno">Zatím nikdo.</p>
      ) : (
        <div className="tabulka-obal">
          <table>
            <thead>
              <tr>
                <th className="lod">Kdo</th>
                <th style={{ textAlign: "left" }}>Role</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {prehled.opravneni.map((r) => (
                <tr key={r.id}>
                  <td className="lod">
                    {r.zobrazovane}
                    {r.email && <div className="majitel">{r.email}</div>}
                  </td>
                  <td>{nazev(r.role)}</td>
                  <td>
                    <form action={odeberZWebuAkce}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="kdo" value={r.zobrazovane} />
                      <button type="submit">Odebrat</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
