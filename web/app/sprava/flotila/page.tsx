import Link from "@/app/sprava/odkaz";
import { Drobecky, drobeckySpravy } from "@/app/drobecky";
import { NadpisWebu, PruhWebu } from "@/app/sprava/pruh-webu";
import { Vypadek } from "@/app/vypadek";
import {
  DRUHY,
  SPUSTENI,
  STAVY,
  nactiFlotilu,
  nactiPublikace,
  type DruhIdentity,
  type Publikace,
  type RadekFlotily,
  type SouhrnFlotily,
} from "@/lib/flotila";

export const dynamic = "force-dynamic";
export const metadata = { title: "Flotila — správa" };

const PLATFORMY: Record<string, string> = { android: "Android", ios: "iOS" };

/**
 * Okamžik nakrátko — „27. 11. 10:31". Tabulka má sloupců dost a rok je
 * u telemetrie z posledních dní jen šum. Pražské pásmo ze stejného důvodu
 * jako u článků: API vydává UTC a kontejner webu v UTC běží taky.
 */
const kratce = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("cs-CZ", {
        day: "numeric",
        month: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Prague",
      })
    : "—";

/** Identifikátor aktualizace nakrátko; celý je v `title`. Prvních osm znaků stačí na rozlišení. */
const kratkeId = (id: string) => id.slice(0, 8);

/**
 * Na čem jede flotila. Jen pro správce celého webu.
 *
 * <b>Proč to existuje</b> (Filip, listopad 2026): *„appka musí fungovat
 * nezávisle a musí se aktualizovat sama a to 100% spolehlivě. Až to bude
 * používat celá flotila, musí to být naprostá samozřejmost."* Ztracená
 * aktualizace se do té doby dala poznat jen dotazem na manifest Expa.
 *
 * Serverová a bez javascriptu jako zbytek správy. Stav počítá API — tady se
 * jen čte; web si nic nedopočítává, aby přehled a profil neříkaly o jednom
 * telefonu dvě různé věci.
 */
export default async function Flotila() {
  const [{ stav, flotila, duvod }, { publikace }] = await Promise.all([nactiFlotilu(), nactiPublikace()]);

  const hlava = (
    <>
      <Drobecky cesta={drobeckySpravy(null)} />
      <h1>Flotila</h1>
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
  if (stav !== "ok" || !flotila)
    return (
      <>
        {hlava}
        <p className="prazdno">{duvod ?? "Flotilu vidí jen správce celého webu."}</p>
      </>
    );

  const druhy: DruhIdentity[] = ["ucet", "lod", "zarizeni"];

  return (
    <>
      <Drobecky cesta={drobeckySpravy(null)} />
      <PruhWebu aktivni="flotila" />
      <NadpisWebu tab="flotila" />
      <p className="podtitulek">
        Na čem jede který telefon. Měří se proti <b>poslednímu balíčku v obchodě</b> a{" "}
        <b>poslední aktualizaci</b>, kterou CI publikovalo pro jeho kanál.
      </p>

      {/* Měřítko. Bez něj by „starý balíček" nebylo proti čemu — a platforma,
          pro kterou v obchodě nic neleží, se podle balíčku neposuzuje vůbec. */}
      <p className="poznamka">
        {flotila.balicky.length === 0 ? (
          <>V obchodě zatím není zapsaný žádný balíček, takže se balíčky neposuzují.</>
        ) : (
          <>
            Poslední balíček:{" "}
            {flotila.balicky.map((b, i) => (
              <span key={b.platforma}>
                {i > 0 && ", "}
                {PLATFORMY[b.platforma] ?? b.platforma} <b>{b.cisloBalicku}</b>{" "}
                <code title={b.otisk}>{b.otisk.slice(0, 8)}</code> z {kratce(b.vydanoV)}
              </span>
            ))}
            .
          </>
        )}
      </p>

      {/* Souhrn po druzích. Nesčítá se: jeden telefon může mít klíč k účtu,
          klíč k lodi i zápis k upozorněním a součet by ho počítal třikrát. */}
      <div className="naklady-souhrn flotila-souhrn">
        {druhy.map((druh) => (
          <Souhrn key={druh} souhrn={flotila.souhrn.find((s) => s.druh === druh)} druh={druh} />
        ))}
      </div>

      {druhy.map((druh) => (
        <Tabulka key={druh} druh={druh} radky={flotila.radky.filter((r) => r.druh === druh)} />
      ))}

      <SeznamPublikaci publikace={publikace} />
    </>
  );
}

function Souhrn({ souhrn, druh }: { souhrn?: SouhrnFlotily; druh: DruhIdentity }) {
  const s = souhrn ?? {
    druh,
    celkem: 0,
    aktualni: 0,
    staryBalicek: 0,
    staraAktualizace: 0,
    nouzove: 0,
    bezHlaseni: 0,
  };
  const zbytek = [
    s.nouzove && `${s.nouzove}× nouzově`,
    s.staryBalicek && `${s.staryBalicek}× starý balíček`,
    s.staraAktualizace && `${s.staraAktualizace}× stará aktualizace`,
    s.bezHlaseni && `${s.bezHlaseni}× bez hlášení`,
  ].filter(Boolean);

  return (
    <div>
      <span className="popis">{DRUHY[druh].nazev}</span>
      <b>
        {s.aktualni} z {s.celkem}
      </b>
      <span className="popis">{["aktuálních", ...zbytek].join(" · ")}</span>
    </div>
  );
}

function Tabulka({ druh, radky }: { druh: DruhIdentity; radky: RadekFlotily[] }) {
  return (
    <section className="skupina-opravneni">
      <h2>{DRUHY[druh].nazev}</h2>
      {radky.length === 0 ? (
        <p className="prazdno">{DRUHY[druh].prazdno}</p>
      ) : (
        <div className="tabulka-obal">
          <table className="tabulka-flotily">
            <thead>
              <tr>
                <th className="vlevo">Kdo</th>
                <th className="vlevo">Stav</th>
                <th className="vlevo">Balíček</th>
                <th className="vlevo">Kanál</th>
                <th className="vlevo">Spuštění</th>
                <th className="vlevo">Aktualizace</th>
                <th className="vlevo">Běží od</th>
                <th className="vlevo">Naposledy</th>
              </tr>
            </thead>
            <tbody>
              {radky.map((r) => (
                <Radek key={r.id} r={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Radek({ r }: { r: RadekFlotily }) {
  const hlasil = r.hlasenoV !== null;
  // Stažená, ale ještě nespuštěná poslední aktualizace: spraví se sama
  // při příštím startu, a to je jiná zpráva než „visí na staré".
  const cekaNaRestart = r.ceka !== null && r.ceka === r.posledniAktualizace;

  return (
    <tr>
      <td className="vlevo">{r.popis}</td>
      <td className="vlevo">
        <span className={`stitek stav stav-verze-${r.stav}`}>{STAVY[r.stav]}</span>
      </td>
      <td className="vlevo">
        {hlasil ? (
          <>
            {r.platforma ? (PLATFORMY[r.platforma] ?? r.platforma) : ""}{" "}
            {r.cisloBalicku ?? <span title={r.otisk ?? undefined}>neznámý</span>}
            {r.posledniCisloBalicku !== null && r.cisloBalicku !== r.posledniCisloBalicku && (
              <span className="poznamka-radku">poslední {r.posledniCisloBalicku}</span>
            )}
          </>
        ) : (
          "—"
        )}
      </td>
      <td className="vlevo">{r.kanal === null ? "—" : r.kanal || "bez kanálu"}</td>
      <td className="vlevo">{r.spusteni ? SPUSTENI[r.spusteni] : "—"}</td>
      <td className="vlevo">
        {r.aktualizace ? <code title={r.aktualizace}>{kratkeId(r.aktualizace)}</code> : "—"}
        {cekaNaRestart ? (
          <span className="poznamka-radku">poslední stažená, čeká na restart</span>
        ) : (
          r.ceka && (
            <span className="poznamka-radku">
              čeká <code title={r.ceka}>{kratkeId(r.ceka)}</code>
            </span>
          )
        )}
      </td>
      <td className="vlevo">{kratce(r.odV)}</td>
      <td className="vlevo">
        {hlasil ? (
          kratce(r.hlasenoV)
        ) : (
          // Bez hlášení rozhoduje, jestli se identita ozývá: aktivní telefon
          // bez hlavičky jede na appce, která ji ještě neumí, neaktivní je
          // nejspíš mrtvý.
          <span className="poznamka-radku">
            {r.aktivniV ? `ozval se ${kratce(r.aktivniV)}` : "nikdy se neozval"}
          </span>
        )}
      </td>
    </tr>
  );
}

function SeznamPublikaci({ publikace }: { publikace?: Publikace[] }) {
  return (
    <section className="skupina-opravneni">
      <h2>Poslední publikace</h2>
      <p className="poznamka bez-odsazeni">
        Aktualizace, které CI poslalo do kanálů a zapsalo sem. Chybí-li tu commit, který appku
        měnil, publikace se ztratila po cestě.
      </p>
      {publikace === undefined ? (
        <p className="prazdno">Publikace se nepodařilo načíst.</p>
      ) : publikace.length === 0 ? (
        <p className="prazdno">CI zatím žádnou publikaci nezapsalo.</p>
      ) : (
        <div className="tabulka-obal">
          <table className="tabulka-flotily">
            <thead>
              <tr>
                <th className="vlevo">Kdy</th>
                <th className="vlevo">Platforma</th>
                <th className="vlevo">Kanál</th>
                <th className="vlevo">Balíček</th>
                <th className="vlevo">Aktualizace</th>
                <th className="vlevo">Commit</th>
              </tr>
            </thead>
            <tbody>
              {publikace.map((p) => (
                <tr key={`${p.platforma}-${p.kanal}-${p.aktualizace}`}>
                  <td className="vlevo">{kratce(p.publikovanoV)}</td>
                  <td className="vlevo">{PLATFORMY[p.platforma] ?? p.platforma}</td>
                  <td className="vlevo">{p.kanal}</td>
                  <td className="vlevo">
                    {p.cisloBalicku ?? <code title={p.otisk}>{p.otisk.slice(0, 8)}</code>}
                  </td>
                  <td className="vlevo">
                    <code title={p.aktualizace}>{kratkeId(p.aktualizace)}</code>
                  </td>
                  <td className="vlevo">
                    {p.commit ? (
                      <a
                        href={`https://github.com/file-pb/orlickypohar/commit/${p.commit}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <code>{p.commit.slice(0, 8)}</code>
                      </a>
                    ) : (
                      "—"
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
