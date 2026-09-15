import { nactiVystrahy, STRANKA_VYSTRAH, type Stupen, type Vystraha } from "@/lib/chmi";

/**
 * Výstrahy ČHMÚ pro Milevsko a Písek, tedy pro Radavu a Velký vír
 * (Filip, 16. 9. 2026). Třetí widget s cizími daty vedle počasí z Windy
 * a vodočtu.
 *
 * Bez výstrahy je to jedna klidná věta se zelenou tečkou — widget nemá
 * strašit, když se nic neděje. S výstrahou nese barvu stupně, jev, popis
 * a platnost. Když se data nepodaří načíst, widget chybí.
 */

const STUPNE: Record<Stupen, string> = {
  2: "nízký stupeň",
  3: "vysoký stupeň",
  4: "extrémní stupeň",
};

const kratce = (iso: string) =>
  new Date(iso).toLocaleString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Europe/Prague",
  });

function platnost(v: Vystraha) {
  if (v.od && v.do) return `${kratce(v.od)} – ${kratce(v.do)}`;
  if (v.do) return `do ${kratce(v.do)}`;
  if (v.od) return `od ${kratce(v.od)}`;
  return "";
}

export async function BokVystrahy() {
  const stav = await nactiVystrahy();
  if (!stav) return null;

  return (
    <section className="vystrahy">
      <h2 className="bok-nadpis">Výstrahy ČHMÚ</h2>

      {stav.vystrahy.length === 0 ? (
        <p className="vystrahy-klid">
          <span className="vystrahy-tecka" aria-hidden="true" />
          Pro Milevsko a Písek teď neplatí žádná výstraha.
        </p>
      ) : (
        <ul className="vystrahy-seznam">
          {stav.vystrahy.map((v) => (
            <li key={`${v.jev}-${v.od}-${v.do}`} className={`vystraha stupen-${v.stupen}`}>
              <span className="vystraha-hlava">
                <b>{v.jev}</b>
                <span className="vystraha-stupen">{STUPNE[v.stupen]}</span>
              </span>
              {v.popis && <span className="vystraha-popis">{v.popis}</span>}
              <span className="vystraha-cas">
                {platnost(v)}
                {v.obvody.length === 1 && ` · jen ${v.obvody[0]}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="bok-dal">
        <a href={STRANKA_VYSTRAH} target="_blank" rel="noopener noreferrer">
          ČHMÚ · Milevsko a Písek
        </a>
      </p>
    </section>
  );
}
