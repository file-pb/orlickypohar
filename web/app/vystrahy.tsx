import { nactiVystrahy, STRANKA_VYSTRAH, type Stupen, type Vystraha } from "@/lib/chmi";
import {
  BOURKA_DBZ,
  DEST_DBZ,
  nactiRadar,
  POLOMER_KM,
  SILNY_DBZ,
  STRANKA_RADARU,
  type Krok,
  type Radar,
} from "@/lib/radar";

/**
 * Výstrahy ČHMÚ pro Milevsko a Písek, tedy pro Radavu a Velký vír
 * (Filip, 16. 9. 2026). Třetí widget s cizími daty vedle počasí z Windy
 * a vodočtu.
 *
 * Bez výstrahy je to jedna klidná věta se zelenou tečkou — widget nemá
 * strašit, když se nic neděje. S výstrahou nese barvu stupně, jev, popis
 * a platnost.
 *
 * <b>Když se výstrahy nepodaří načíst, řekne to nahlas</b> (oponentura,
 * 5. 10. 2026). U výstrahy je ticho samo o sobě tvrzení: do té doby widget
 * při výpadku ČHMÚ zmizel a čtenář si z jeho nepřítomnosti odvodil, že nic
 * neplatí. „Žádná výstraha" a „zdroj se nepodařilo ověřit" se musí poznat
 * od sebe — u ostatních widgetů (teplota, vodočet) chybějící blok nic
 * netvrdí a mizet proto smějí.
 *
 * Pod výstrahami radar na příští hodinu (Filip, 18. 9. 2026): jedna věta,
 * jestli nad Orlíkem prší nebo kdy začne, a pás sedmi políček po deseti
 * minutách v barvách radarové stupnice ČHMÚ. Když radar nepřijde, blok
 * chybí a výstrahy zůstanou.
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
  const [stav, radar] = await Promise.all([nactiVystrahy(), nactiRadar()]);

  return (
    <section className="vystrahy">
      <h2 className="bok-nadpis">Výstrahy ČHMÚ</h2>

      {!stav ? (
        // Nezmlčet. Prázdné místo po widgetu čte člověk jako „nic neplatí",
        // a to je tvrzení, které v tuhle chvíli nikdo neověřil.
        <p className="vystrahy-klid">
          <span className="vystrahy-tecka nezname" aria-hidden="true" />
          Výstrahy se teď nedaří načíst z ČHMÚ. Neznamená to, že žádná
          neplatí — podívej se přímo k nim.
        </p>
      ) : stav.vystrahy.length === 0 ? (
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

      {/* Odkaz platí vždycky, a při výpadku dvojnásob: je to jediná cesta,
          jak se k výstrahám dostat, když je sem nedokážeme dotáhnout. */}
      <p className="bok-dal">
        <a href={STRANKA_VYSTRAH} target="_blank" rel="noopener noreferrer">
          ČHMÚ · Milevsko a Písek
        </a>
      </p>

      {radar && <RadarHodina radar={radar} />}
    </section>
  );
}

const casPraha = (iso: string) =>
  new Date(iso).toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit", timeZone: "Europe/Prague" });

function druh(dbz: number) {
  if (dbz >= BOURKA_DBZ) return { slovo: "přívalový déšť, nejspíš bouřka", trida: "radar-bourka" };
  if (dbz >= SILNY_DBZ) return { slovo: "silný déšť", trida: "radar-silny" };
  return { slovo: "déšť", trida: "radar-dest" };
}

/** Věta nahoře: prší teď, začne v nějakém kroku, nebo nic. */
function zprava(kroky: Krok[]) {
  const nejvic = Math.max(...kroky.map((k) => k.dbz ?? 0));
  const ted = kroky[0];
  if (ted.dbz !== null && ted.dbz >= DEST_DBZ) {
    const d = druh(nejvic);
    return { text: `Nad Orlíkem teď prší. Do hodiny ${d.slovo}.`, trida: d.trida };
  }
  const prvni = kroky.find((k) => k.dbz !== null && k.dbz >= DEST_DBZ);
  if (!prvni) return { text: "Do hodiny nad Orlíkem bez srážek.", trida: "radar-klid" };
  const d = druh(nejvic);
  const slovo = d.slovo[0].toUpperCase() + d.slovo.slice(1);
  return { text: `${slovo} kolem ${casPraha(prvni.cas)}, asi za ${prvni.minut} minut.`, trida: d.trida };
}

/** Barva políčka podle stupnice ČHMÚ (scl-dbz-mmh.png), po 4 dBZ od 4. */
const BARVY = [
  "#380070", "#3000a8", "#0000fc", "#006cc0", "#00a000", "#00bc00", "#34d800", "#9cdc00",
  "#e0dc00", "#fcb000", "#fc8400", "#fc5800", "#fc0000", "#a00000", "#fcfcfc",
];
const barva = (dbz: number) => BARVY[Math.min(BARVY.length - 1, Math.max(0, Math.floor((dbz - 4) / 4)))];

function RadarHodina({ radar }: { radar: Radar }) {
  const z = zprava(radar.kroky);
  return (
    <div className="radar">
      <h3 className="radar-nadpis">Radar · příští hodina</h3>
      <p className={`radar-zprava ${z.trida}`}>{z.text}</p>
      <ol className="radar-pas" aria-label={`Nejsilnější srážka do ${POLOMER_KM} km od Radavy po deseti minutách`}>
        {radar.kroky.map((k) => (
          <li key={k.minut} title={k.dbz === null ? "bez srážek" : `${k.dbz} dBZ`}>
            <span
              className={`radar-policko${k.dbz !== null && k.dbz >= DEST_DBZ ? " prsi" : ""}`}
              style={k.dbz !== null ? { background: barva(k.dbz) } : undefined}
            />
            <span className="radar-cas">{k.minut === 0 ? "teď" : `+${k.minut}`}</span>
          </li>
        ))}
      </ol>
      <p className="radar-pozn">
        Do {POLOMER_KM} km od Radavy. Radar posouvá srážky, které už padají; bouřku, která teprve vznikne,
        nepředpoví.
      </p>
      <p className="bok-dal">
        <a href={STRANKA_RADARU} target="_blank" rel="noopener noreferrer">
          ČHMÚ · radar {casPraha(radar.kroky[0].cas)}
        </a>
      </p>
    </div>
  );
}
