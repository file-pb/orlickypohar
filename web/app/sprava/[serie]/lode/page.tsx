import Link from "next/link";
import { notFound } from "next/navigation";
import { Drobecky, drobeckySpravy } from "@/app/drobecky";
import { Vypadek } from "@/app/vypadek";
import { okamzik } from "@/app/datum";
import { NAZEV_ROLE } from "@/lib/pripojeni";
import {
  PUVOD,
  nactiLod,
  nactiLode,
  type LodDetail,
  type LodSpravy,
  type RoleKLodi,
  type VazbaSpravy,
  type ZmenaRole,
} from "@/lib/lode-sprava";
import { nactiPrehled, type Ucet } from "@/lib/sprava";
import { odeberVazbuAkce, potvrdRoliAkce, urciKapitanaAkce, zmenRoliAkce } from "./akce";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Lodě ročníku" };

/** Role, které jde vazbě nastavit. Majitele určuje vlastnictví lodi, ne tahle obrazovka. */
const ROLE_K_NASTAVENI: RoleKLodi[] = ["Kapitan", "Posadka", "Fanousek"];

type Parametry = {
  params: Promise<{ serie: string }>;
  searchParams: Promise<{ lod?: string; chyba?: string; stav?: string }>;
};

const HOTOVO: Record<string, string> = {
  kapitan: "Kapitán je určený.",
  potvrzeno: "Role je potvrzená. Párování podle e-mailu do ní už nesáhne.",
  role: "Role je změněná.",
  odebrano: "Vazba je odebraná. Párování podle e-mailu ji nevrátí.",
};

/**
 * Kdo patří ke kterým lodím ročníku a kdo je jejich kapitán.
 *
 * <b>Kapitána určuje správce, ne připojovací kód.</b> Do 5. 10. 2026 ho
 * dostal první, kdo kód zadal — posádka má přitom jeden papír, takže
 * kapitánem se stal ten, kdo byl nejrychlejší na telefonu, a opravit to
 * nešlo ničím mimo databázi. Tahle obrazovka je ta oprava.
 *
 * Serverová a bez javascriptu jako zbytek administrace: formulář odešle
 * prohlížeč, odpověď je nová stránka.
 */
export default async function LodeRocniku({ params, searchParams }: Parametry) {
  const { serie } = await params;
  const { lod: vybranaId, chyba, stav: hotovo } = await searchParams;

  const { stav, data: lode } = await nactiLode(serie);

  const hlava = (
    <>
      <Drobecky cesta={drobeckySpravy(serie, [{ text: "Lodě" }])} />
      <h1>Lodě ročníku</h1>
    </>
  );

  // Výpadek nesmí spolknout výsledek zápisu: když se nepovede načíst
  // seznam, ale akce něco vzkázala, musí to být vidět nad výpadkem.
  if (stav === "vypadek") {
    return (
      <>
        {hlava}
        {chyba && (
          <p className="hlaska chyba" role="alert">
            {chyba}
          </p>
        )}
        <Vypadek />
      </>
    );
  }

  if (stav === "neni") notFound();

  if (stav === "neprihlasen") {
    return (
      <>
        {hlava}
        <p className="prazdno">
          Na lodě ročníku se musíš <Link href="/prihlaseni">přihlásit</Link>.
        </p>
      </>
    );
  }

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

  if (stav === "nesmi" || !lode) {
    return (
      <>
        {hlava}
        <p className="prazdno">
          Kapitány lodí určuje správce ročníku. Vazba k lodi platí celý rok
          a napříč zastávkami, takže pověření k jedné regatě na ni nedosáhne.
          Co která role smí, je v{" "}
          <Link href="/napoveda#role">nápovědě</Link>.
        </p>
      </>
    );
  }

  const vybrana = vybranaId ? lode.find((l) => String(l.lodId) === vybranaId) : undefined;

  // Detail a seznam účtů jen u vybrané lodi — na seznam lodí by to byly dva
  // zbytečné dotazy. Účty vydává přehled oprávnění, protože je chrání
  // tatáž role správce ročníku a vlastní endpoint pro ně není.
  const detail: LodDetail | undefined = vybrana
    ? (await nactiLod(serie, vybrana.lodId)).data
    : undefined;
  const ucty: Ucet[] = vybrana ? ((await nactiPrehled(serie)).prehled?.ucty ?? []) : [];

  const ceka = lode.filter((l) => !l.maKapitana || l.keKontrole);

  return (
    <>
      {hlava}

      {chyba && (
        <p className="hlaska chyba" role="alert">
          {chyba}
        </p>
      )}
      {hotovo && HOTOVO[hotovo] && (
        <p className="hlaska" role="status">
          {HOTOVO[hotovo]}
        </p>
      )}

      {lode.length === 0 ? (
        <p className="prazdno">
          V ročníku není přihlášená žádná loď. Vazby se zakládají k lodím
          z přihlášek, takže nejdřív musí být koho přihlásit: lodě se
          přihlašují u regaty v <Link href={`/sprava/${serie}/kalendar`}>kalendáři</Link>,
          nebo se přihlásí samy z webu. Jak to jde po sobě, je v{" "}
          <Link href="/napoveda#po-sobe">nápovědě</Link>.
        </p>
      ) : (
        <>
          <p className="poznamka">
            Kapitána lodi určuje správce ročníku. Připojovací kód přidává
            posádku a loď bez kapitána je normální stav — čeká na určení.
            {ceka.length > 0 && (
              <>
                {" "}
                Čeká {ceka.length === 1 ? "jedna loď" : `${ceka.length} lodí`}.
              </>
            )}
          </p>

          <ul className="seznam">
            {lode.map((l) => (
              <Radek key={l.lodId} lod={l} serie={serie} vybrana={l.lodId === vybrana?.lodId} />
            ))}
          </ul>
        </>
      )}

      {vybrana && detail && (
        <Detail serie={serie} lod={vybrana} detail={detail} ucty={ucty} />
      )}
    </>
  );
}

/** Jedna loď v seznamu. Stav kapitánství je to první, co má být vidět. */
function Radek({
  lod,
  serie,
  vybrana,
}: {
  lod: LodSpravy;
  serie: string;
  vybrana: boolean;
}) {
  const kapitan = lod.vazby.find((v) => v.role === "Kapitan" || v.role === "Majitel");

  return (
    <li>
      <b>{lod.nazev}</b>
      {lod.cisloPlachty && <span className="detail"> {lod.cisloPlachty}</span>}{" "}
      <span className="stitek">{lod.kategorie}</span>{" "}
      {!lod.maKapitana ? (
        <span className="stitek">bez kapitána</span>
      ) : lod.keKontrole ? (
        <span className="stitek">kapitán od kódu, ke kontrole</span>
      ) : (
        <span className="detail">
          {NAZEV_ROLE[kapitan!.role]} {kapitan!.kdo}
        </span>
      )}
      {!vybrana && (
        <>
          {" · "}
          <Link href={`/sprava/${serie}/lode?lod=${lod.lodId}`}>posádka a kapitán →</Link>
        </>
      )}
    </li>
  );
}

/** Vazby jedné lodi, úkony nad nimi a historie změn. */
function Detail({
  serie,
  lod,
  detail,
  ucty,
}: {
  serie: string;
  lod: LodSpravy;
  detail: LodDetail;
  ucty: Ucet[];
}) {
  // Účty, které k lodi ještě nepatří. Kapitánem jde určit i někoho, kdo se
  // nepřipojil kódem — to je ta nouzová páka pro loď bez jediné vazby.
  const uLodi = new Set(detail.lod.vazby.map((v) => v.uzivatelId));
  const ostatni = ucty.filter((u) => !uLodi.has(u.id));

  return (
    <>
      <h2>{lod.nazev}: kdo k lodi patří</h2>

      {detail.lod.vazby.length === 0 ? (
        <p className="prazdno">
          K lodi nepatří nikdo. Urči kapitána níž, nebo nech posádku připojit
          se kódem, který vystavíš u lodi v{" "}
          <Link href={`/sprava/${serie}/kalendar`}>přihláškách zastávky</Link>.
          Přihlášky jsou u každé regaty v kalendáři — vlastní adresu nemají.
          Jak se posádka připojuje, je v{" "}
          <Link href="/napoveda#posadka">nápovědě</Link>.
        </p>
      ) : (
        <ul className="seznam">
          {detail.lod.vazby.map((v) => (
            <Vazba key={v.id} vazba={v} serie={serie} lodId={lod.lodId} />
          ))}
        </ul>
      )}

      <h2>Určit kapitána</h2>
      {ostatni.length === 0 ? (
        <p className="prazdno">
          Všechny přihlášené účty už k lodi patří. Kapitána urči u konkrétního
          člověka výš.
        </p>
      ) : (
        <form action={urciKapitanaAkce} className="formular">
          <input type="hidden" name="serie" value={serie} />
          <input type="hidden" name="lod" value={lod.lodId} />
          <label>
            Účet, který k lodi ještě nepatří
            <select name="uzivatel" defaultValue="">
              <option value="">Vyber účet…</option>
              {ostatni.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.zobrazovane}
                  {u.email ? ` · ${u.email}` : ""}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Určit kapitánem</button>
          <p className="poznamka">
            Vazba vznikne jako určená správcem. Dosavadní kapitán spadne na
            posádku, majitel zůstane majitelem.
          </p>
        </form>
      )}

      {detail.zmeny.length > 0 && (
        <>
          <h2>Historie rolí</h2>
          <ul className="seznam">
            {detail.zmeny.map((z, i) => (
              <li key={i}>
                <Zmena zmena={z} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

/** Jeden člověk u lodi i s tím, odkud se tam vzal a co s ním jde dělat. */
function Vazba({
  vazba,
  serie,
  lodId,
}: {
  vazba: VazbaSpravy;
  serie: string;
  lodId: number;
}) {
  const skryte = (
    <>
      <input type="hidden" name="serie" value={serie} />
      <input type="hidden" name="lod" value={lodId} />
      <input type="hidden" name="vazba" value={vazba.id} />
    </>
  );

  const odpovedny = vazba.role === "Kapitan" || vazba.role === "Majitel";

  return (
    <>
      <li>
        <b>{vazba.kdo}</b>
        {vazba.email && <span className="detail"> {vazba.email}</span>}{" "}
        <span className="stitek">{NAZEV_ROLE[vazba.role]}</span>
        {vazba.keKontrole && <span className="stitek">ke kontrole</span>}
        <span className="detail">
          {" "}
          {PUVOD[vazba.puvod]}, {okamzik(vazba.vzniklaV)}
          {vazba.roleUrcenaRucne && vazba.roleUrcenaV && (
            <>
              {" · roli určil "}
              {vazba.roleUrcil ?? "správce"} {okamzik(vazba.roleUrcenaV)}
            </>
          )}
        </span>

        <span className="radkove">
          {/* Potvrzení kapitána, kterého kdysi udělal kód: role se nemění,
              mění se to, že za ni od teď stojí správce. */}
          {vazba.keKontrole && (
            <form action={potvrdRoliAkce} className="radkove">
              {skryte}
              <input type="hidden" name="role" value={vazba.role} />
              <button type="submit">Potvrdit {NAZEV_ROLE[vazba.role]}</button>
            </form>
          )}

          {!odpovedny && (
            <form action={urciKapitanaAkce} className="radkove">
              <input type="hidden" name="serie" value={serie} />
              <input type="hidden" name="lod" value={lodId} />
              <input type="hidden" name="uzivatel" value={vazba.uzivatelId} />
              <button type="submit">Určit kapitánem</button>
            </form>
          )}

          <form action={zmenRoliAkce} className="radkove">
            {skryte}
            <label>
              <span className="skryte">Role {vazba.kdo}</span>
              <select name="role" defaultValue={vazba.role}>
                {ROLE_K_NASTAVENI.map((r) => (
                  <option key={r} value={r}>
                    {NAZEV_ROLE[r]}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit">Změnit roli</button>
          </form>

          <form action={odeberVazbuAkce} className="radkove">
            {skryte}
            <button type="submit">Odebrat</button>
          </form>
        </span>
      </li>
    </>
  );
}

/** Jedna změna v historii. Prázdná role znamená vznik nebo odebrání vazby. */
function Zmena({ zmena }: { zmena: ZmenaRole }) {
  const odkud = zmena.predchozi ? NAZEV_ROLE[zmena.predchozi] : null;
  const kam = zmena.nova ? NAZEV_ROLE[zmena.nova] : null;

  return (
    <>
      <b>{zmena.kdo}</b>{" "}
      <span className="stitek">
        {odkud && kam ? `${odkud} → ${kam}` : kam ? `nově ${kam}` : "vazba odebraná"}
      </span>
      <span className="detail">
        {" "}
        {zmena.zmenil ?? "neznámý účet"}, {okamzik(zmena.zmenenoV)}
      </span>
    </>
  );
}
