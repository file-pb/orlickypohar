import Link from "@/app/sprava/odkaz";
import { Drobecky, drobeckySpravy } from "@/app/drobecky";
import { NadpisWebu, PruhWebu } from "@/app/sprava/pruh-webu";
import { Vypadek } from "@/app/vypadek";
import { ROLE_WEBU, nactiPrehledWebu, type Radek } from "@/lib/sprava";
import { odeberZWebuAkce, udelNaWebuAkce } from "./akce";

export const dynamic = "force-dynamic";
export const metadata = { title: "Oprávnění na celý web — správa" };

type Parametry = {
  searchParams: Promise<{ chyba?: string; stav?: string; email?: string; kdo?: string }>;
};

const nazev = (role: string) => ROLE_WEBU.find((r) => r.role === role)?.nazev ?? role;

/**
 * Oprávnění po lidech, ne po záznamech. API vydává řádek za každou udělenou
 * roli, takže kdo má editora i správce, stál v tabulce dvakrát — jednou se
 * jménem a jednou s týmž jménem, a nic neříkalo, že je to jeden člověk.
 *
 * Pořadí je to, ve kterém řádky přišly z API; první výskyt člověka určuje,
 * kde v tabulce stojí.
 */
function poLidech(radky: Radek[]) {
  const lide = new Map<string, { zobrazovane: string; email: string | null; role: Radek[] }>();
  for (const r of radky) {
    const clovek = lide.get(r.uzivatelId);
    if (clovek) clovek.role.push(r);
    else lide.set(r.uzivatelId, { zobrazovane: r.zobrazovane, email: r.email, role: [r] });
  }
  return [...lide.entries()];
}

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
      <Drobecky cesta={drobeckySpravy(null)} />
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
      <Drobecky cesta={drobeckySpravy(null)} />
      <PruhWebu aktivni="opravneni-webu" />
      <NadpisWebu tab="opravneni-webu" />
      <p className="poznamka">
        Editor webu píše obecné články mimo ročník. Správce webu smí všechno ve všech
        ročnících. Role v jednom ročníku se udělují v tom ročníku.
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
        <button type="submit">Udělit roli</button>
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
              </tr>
            </thead>
            <tbody>
              {poLidech(prehled.opravneni).map(([uzivatelId, clovek]) => (
                <tr key={uzivatelId}>
                  <td className="lod">
                    {clovek.zobrazovane}
                    {clovek.email && <div className="majitel">{clovek.email}</div>}
                  </td>
                  {/* <b>Odebírá se klepnutím na roli</b> (konzilium, bod 15).
                      Sloupec s tlačítkem „Odebrat" zmizel: u člověka se
                      dvěma rolemi nešlo z řádku poznat, kterou z nich to
                      tlačítko sundá — a sundalo by obě, protože každá měla
                      vlastní řádek.

                      Štítek je `button`, ne odkaz: odebrání je zápis a
                      vlastní formulář kolem každého z nich drží tu stránku
                      bez javascriptu. Jméno pro odečítač nese celou větu,
                      protože samotné „Správce webu ×" neřekne, co se stane
                      ani komu. */}
                  <td>
                    <div className="role-stitky">
                      {clovek.role.map((o) => (
                        <form key={o.id} action={odeberZWebuAkce}>
                          <input type="hidden" name="id" value={o.id} />
                          <input type="hidden" name="kdo" value={clovek.zobrazovane} />
                          <button
                            type="submit"
                            className="stitek stitek-role"
                            aria-label={`Odebrat roli ${nazev(o.role)} — ${clovek.zobrazovane}`}
                          >
                            {nazev(o.role)} <span aria-hidden="true">×</span>
                          </button>
                        </form>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {prehled.opravneni.length > 0 && (
        /* Znění od 4-jazyk. Stojí pod tabulkou, protože štítek s křížkem je
           sice obvyklý vzor, ale tady je za ním nevratný zápis — a tahle
           obrazovka se otevírá párkrát do roka. */
        <p className="poznamka">Klepnutím na roli ji odebereš.</p>
      )}
    </>
  );
}
