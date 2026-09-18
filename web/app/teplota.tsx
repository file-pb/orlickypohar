import { nactiKoupani, STRANKA_KOUPANI, STUPNE } from "@/lib/koupani";
import {
  centra,
  GRAF_DNI,
  nactiTeplotuHladiny,
  rada,
  type Bod,
  type Centrum,
  type TeplotaHladiny,
} from "@/lib/satelit";

/**
 * Teplota vody v nádrži ze satelitu (`lib/satelit.ts`) a pod ní kvalita ke
 * koupání. Přítoky z ČHMÚ tu byly do 18. 9. 2026; Filip je vypnul, řeka
 * o šest stupňů studenější než nádrž jachtaři nic neřekne.
 *
 * SVG přímo ve stránce, bez knihovny a bez javascriptu. Když se data
 * nepodaří načíst, widget chybí.
 */

const f = (n: number) => n.toLocaleString("cs-CZ", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const datumKratce = (iso: string) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", timeZone: "Europe/Prague" });

const pred = (iso: string, ted: Date) => {
  const dni = Math.round((ted.getTime() - Date.parse(iso)) / 86_400_000);
  return dni <= 0 ? "dnes" : dni === 1 ? "včera" : `před ${dni} dny`;
};

export async function BokTeplotaVody() {
  const [koupani, hladina] = await Promise.all([nactiKoupani(), nactiTeplotuHladiny()]);
  const ted = new Date();
  const nadrz = hladina ? centra(hladina.snimky, ted) : [];
  if (nadrz.length === 0 && koupani.length === 0) return null;

  return (
    <section className="teplota-vody">
      <h2 className="bok-nadpis">Teplota vody</h2>
      {nadrz.length > 0 && hladina && <Nadrz centra={nadrz} hladina={hladina} ted={ted} />}
      <Koupani koupani={koupani} />
    </section>
  );
}

/**
 * Nádrž ze satelitu: velká Radava, pod ní menší Trhovky a Žďákov. U každého
 * změna proti předchozímu snímku v okně 14 dní. Dokud nejsou ruční měření,
 * je to odhad — a tak to taky stojí pod čísly.
 */
function Nadrz({ centra, hladina, ted }: { centra: Centrum[]; hladina: TeplotaHladiny; ted: Date }) {
  const [hlavni, ...dalsi] = centra;
  const snimek = centra.map((c) => c.cas).sort().at(-1)!;

  return (
    <div className="nadrz">
      <div className="nadrz-hlavni">
        <span className="teplota-reka">
          Orlík<span className="teplota-misto"> · {hlavni.nazev}</span>
        </span>
        <b className="nadrz-hodnota">{f(hlavni.teplota)} °C</b>
      </div>
      <Zmena c={hlavni} />
      {dalsi.length > 0 && (
        <ul className="nadrz-dalsi">
          {dalsi.map((c) => (
            <li key={c.klic}>
              <span className="teplota-reka">{c.nazev}</span>
              <Zmena c={c} kratce />
              <b className="teplota-hodnota">{f(c.teplota)} °C</b>
            </li>
          ))}
        </ul>
      )}
      <Graf radava={rada(hladina.snimky, "radava")} trhovky={rada(hladina.snimky, "trhovky")} ted={ted} />
      <p className="vodocet-pozn nadrz-pozn">
        Odhad ze satelitu Landsat: horní vrstva vody v poledne, zatím neověřeno teploměrem. Snímek{" "}
        {datumIso(snimek)}, {pred(snimek, ted)}.
      </p>
      <p className="bok-dal">
        <a href={hladina.zdroj} target="_blank" rel="noopener noreferrer">
          Landsat · Planetary Computer
        </a>
      </p>
    </div>
  );
}

function Zmena({ c, kratce }: { c: Centrum; kratce?: boolean }) {
  if (c.zmena === null || c.predchozi === null) return kratce ? <span className="teplota-zmena" /> : null;
  const smer = c.zmena > 0 ? "stoupa" : c.zmena < 0 ? "klesa" : "";
  const text =
    c.zmena === 0 ? "beze změny" : `${c.zmena > 0 ? "↑" : "↓"} ${f(Math.abs(c.zmena))} °C`;
  return (
    <span className={`teplota-zmena ${smer}`} title={`Proti snímku ${datumIso(c.predchozi)}`}>
      {kratce ? text : `${text} proti ${datumIso(c.predchozi)}`}
    </span>
  );
}

const datumIso = (iso: string) =>
  new Date(iso).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", timeZone: "Europe/Prague" });

function Koupani({ koupani }: { koupani: Awaited<ReturnType<typeof nactiKoupani>> }) {
  return (
    <>
      {/* Kvalita ke koupání od hygieniků (Filip, 18. 9. 2026): jen v sezóně,
          jinak se schová. Nejhorší místo první — to je to, co má zajímat. */}
      {koupani.length > 0 && (
        <div className="koupani">
          <h3 className="koupani-nadpis">Kvalita ke koupání</h3>
          <ul>
            {koupani.map((k) => (
              <li key={k.misto} title={`Odběr ${datumKratce(k.datum)}`}>
                <span className={`koupani-tecka stupen-${k.stupen}`} aria-hidden="true" />
                <span className="koupani-misto">{k.misto}</span>
                <span className="koupani-stupen">{STUPNE[k.stupen]}</span>
              </li>
            ))}
          </ul>
          <p className="bok-dal">
            <a href={STRANKA_KOUPANI} target="_blank" rel="noopener noreferrer">
              Hygiena · odběr {datumKratce(koupani.map((k) => k.datum).sort().at(-1)!)}
            </a>
          </p>
        </div>
      )}
    </>
  );
}

/**
 * Radava a Trhovky za posledních 60 dní. Tečka je snímek, mezi snímky jen
 * spojnice — teplota mezi přelety nikdo nezměřil. Osa nejméně 4 °C, ať se
 * rozdíl o pár desetin netváří jako skok. viewBox v poměru boku, takže se
 * tečky při škálování nedeformují.
 */
function Graf({ radava, trhovky, ted }: { radava: Bod[]; trhovky: Bod[]; ted: Date }) {
  const W = 256;
  const H = 90;
  const OKRAJ = { vlevo: 22, vpravo: 4, nahore: 6, dole: 14 };
  const t1 = ted.getTime();
  const t0 = t1 - GRAF_DNI * 86_400_000;
  const vGrafu = (r: Bod[]) => r.filter((b) => Date.parse(b.cas) >= t0);
  const r = vGrafu(radava);
  const t = vGrafu(trhovky);
  if (r.length < 2) return null;

  const vse = [...r, ...t].map((b) => b.t);
  const stred = (Math.max(...vse) + Math.min(...vse)) / 2;
  const rozsah = Math.max(Math.max(...vse) - Math.min(...vse), 4) + 1;
  const spodek = stred - rozsah / 2;

  const x = (cas: string) => OKRAJ.vlevo + ((Date.parse(cas) - t0) / (t1 - t0)) * (W - OKRAJ.vlevo - OKRAJ.vpravo);
  const y = (v: number) => OKRAJ.nahore + (1 - (v - spodek) / rozsah) * (H - OKRAJ.nahore - OKRAJ.dole);
  const cara = (body: Bod[]) => body.map((b) => `${x(b.cas).toFixed(1)},${y(b.t).toFixed(1)}`).join(" ");

  // Popisky osy: celé stupně na okrajích rozsahu a data na začátku a konci.
  const dole = Math.ceil(spodek);
  const nahore = Math.floor(spodek + rozsah);
  const datum = (ms: number) =>
    new Date(ms).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", timeZone: "Europe/Prague" });

  return (
    <figure className="nadrz-graf">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Radava za ${GRAF_DNI} dní: ${r.length} snímků, od ${f(Math.min(...r.map((b) => b.t)))} do ${f(Math.max(...r.map((b) => b.t)))} °C`}
      >
        {[dole, nahore].map((v) => (
          <g key={v}>
            <line className="mrizka" x1={OKRAJ.vlevo} x2={W - OKRAJ.vpravo} y1={y(v)} y2={y(v)} />
            <text className="osa" x={OKRAJ.vlevo - 3} y={y(v) + 3} textAnchor="end">
              {v}°
            </text>
          </g>
        ))}
        <text className="osa" x={OKRAJ.vlevo} y={H - 2}>
          {datum(t0)}
        </text>
        <text className="osa" x={W - OKRAJ.vpravo} y={H - 2} textAnchor="end">
          {datum(t1)}
        </text>
        {t.length >= 2 && <polyline className="cara-druha" points={cara(t)} />}
        <polyline className="cara" points={cara(r)} />
        {r.map((b) => (
          <circle key={b.cas} className="tecka" cx={x(b.cas)} cy={y(b.t)} r={2.6}>
            <title>{`${datum(Date.parse(b.cas))}: ${f(b.t)} °C`}</title>
          </circle>
        ))}
      </svg>
      <figcaption className="nadrz-legenda">
        <span className="znacka radava" /> Radava <span className="znacka trhovky" /> Trhovky · {GRAF_DNI} dní
      </figcaption>
    </figure>
  );
}
