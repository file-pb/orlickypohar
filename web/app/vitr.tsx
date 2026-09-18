import {
  nactiVitr,
  stoceni,
  STOCENI_MINUT,
  STRANKA_VETRU,
  type Mereni,
  type VitrStanice,
} from "@/lib/vitr";

/**
 * Vítr ze stanic ČHMÚ (Filip, 18. 9. 2026). Nahoře nejbližší stanice Vráž:
 * rukáv, kam fouká a jak silně, rychlost, nárazy v barvě podle síly a průběh za 24 h.
 * Pod ní ostatní stanice na jeden řádek, aby bylo vidět, jestli fouká
 * v celém kraji. Upozornění, když se vítr za půl hodiny stočil o víc než
 * 90° — to na lodi poznáš.
 *
 * Rychlost v m/s jako ČHMÚ, uzly menším písmem pro jachtaře. Když se data
 * nepodaří načíst, widget chybí.
 */

const f = (n: number) => n.toLocaleString("cs-CZ", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const uzly = (ms: number) => Math.round(ms * 1.943844);

const casPraha = (iso: string) =>
  new Date(iso).toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit", timeZone: "Europe/Prague" });

const STRANY = ["S", "SV", "V", "JV", "J", "JZ", "Z", "SZ"];
const strana = (smer: number) => STRANY[Math.round(smer / 45) % 8];

/** Síla nárazů: do 5 m/s klid, do 8 čerstvý, do 11 silný, nad to prudký. */
function sila(ms: number | null) {
  if (ms === null) return "klid";
  if (ms < 5) return "klid";
  if (ms < 8) return "cerstvy";
  if (ms < 11) return "silny";
  return "prudky";
}

export async function BokVitr() {
  const stanice = await nactiVitr();
  const hlavni = stanice[0];
  if (!hlavni) return null;

  const ted = hlavni.historie.at(-1)!;
  const otoceni = stoceni(hlavni.historie);

  return (
    <section className="vitr">
      <h2 className="bok-nadpis">Vítr · {hlavni.nazev}</h2>

      <div className="vitr-hlava">
        <Rukav smer={ted.smer} rychlost={ted.rychlost} velky />
        <span className="vitr-rychlost">{f(ted.rychlost)}</span>
        <span className="vitr-jednotka">
          m/s · {uzly(ted.rychlost)} kt
          {ted.smer !== null && <> · z {strana(ted.smer)}</>}
        </span>
      </div>
      {ted.naraz !== null && (
        <p className={`vitr-naraz sila-${sila(ted.naraz)}`}>
          Nárazy {f(ted.naraz)} m/s · {uzly(ted.naraz)} kt
        </p>
      )}

      {otoceni !== null && (
        <p className="vitr-stoceni">
          Stočil se o {Math.round(otoceni)}° za posledních {STOCENI_MINUT} minut.
        </p>
      )}

      <Graf historie={hlavni.historie} />

      {stanice.length > 1 && (
        <ul className="vitr-stanice">
          {stanice.slice(1).map((s) => (
            <Radek key={s.wsi} s={s} />
          ))}
        </ul>
      )}

      <p className="bok-dal">
        <a href={STRANKA_VETRU} target="_blank" rel="noopener noreferrer">
          ČHMÚ · měřeno {casPraha(ted.cas)}
        </a>
      </p>
    </section>
  );
}

function Radek({ s }: { s: VitrStanice }) {
  const m = s.historie.at(-1)!;
  return (
    <li>
      <Rukav smer={m.smer} rychlost={m.rychlost} />
      <span className="vitr-stanice-nazev">
        {s.nazev} <span className="vitr-km">{s.km} km</span>
      </span>
      {m.smer !== null && <span className="vitr-strana">z {strana(m.smer)}</span>}
      <span className="vitr-stanice-hodnota">
        {f(m.rychlost)}
        {m.naraz !== null && <span className={`sila-${sila(m.naraz)}`}> / {f(m.naraz)}</span>}
      </span>
    </li>
  );
}

/**
 * Rukáv jako na letišti, při pohledu shora (Filip, 18. 9. 2026). Ukazuje,
 * kam vítr fouká; ČHMÚ hlásí, odkud fouká, proto otočení o 180°.
 * Pět pruhů, každý jako u skutečného rukávu za 3 uzly: při 15 kt je
 * nafouknutý celý, při bezvětří visí prázdný.
 */
function Rukav({ smer, rychlost, velky }: { smer: number | null; rychlost: number; velky?: boolean }) {
  const trida = velky ? "vitr-rukav velky" : "vitr-rukav";
  if (smer === null) return <span className={trida} />;

  const kt = rychlost * 1.943844;
  const plnych = Math.min(5, Math.max(kt >= 1 ? 1 : 0, Math.round(kt / 3)));
  // Rukáv se od stožáru zužuje: 9 → 4 jednotky na délce 12, uvnitř kompasu.
  const pruhy = Array.from({ length: 5 }, (_, i) => {
    const x0 = 17.5 + i * 2.4;
    const x1 = x0 + 2.4;
    const v0 = 4.5 - i * 0.5;
    const v1 = v0 - 0.5;
    return { body: `${x0},${16 - v0} ${x1},${16 - v1} ${x1},${16 + v1} ${x0},${16 + v0}`, plny: i < plnych, lichy: i % 2 === 0 };
  });

  return (
    <svg
      className={trida}
      viewBox="0 0 32 32"
      role="img"
      aria-label={`fouká od ${strana(smer)} (${Math.round(smer)}°), ${Math.round(kt)} kt`}
    >
      {/* Kompas: kroužek, rysky světových stran a sever nahoře, aby bylo
          vidět, kam rukáv míří (Filip, 18. 9. 2026). */}
      <circle className="kompas" cx="16" cy="16" r="15" />
      {[0, 90, 180, 270].map((u) => (
        <line key={u} className="ryska" x1="16" y1="1" x2="16" y2={u === 0 ? 4.5 : 3.2} transform={`rotate(${u} 16 16)`} />
      ))}
      {velky && (
        <text className="sever" x="16" y="7.6" textAnchor="middle">
          S
        </text>
      )}
      <g transform={`rotate(${(smer + 180 - 90 + 360) % 360} 16 16)`}>
        {pruhy.map((p, i) => (
          <polygon
            key={i}
            points={p.body}
            className={p.plny ? (p.lichy ? "pruh oranzovy" : "pruh bily") : "pruh prazdny"}
          />
        ))}
      </g>
      <circle className="stozar" cx="16" cy="16" r="1.8" />
    </svg>
  );
}

/**
 * Průběh za 24 h: plocha nárazů a čára průměrné rychlosti. Osa od nuly,
 * nejméně do 8 m/s — slabý vítr nemá vypadat jako vichřice.
 */
function Graf({ historie }: { historie: Mereni[] }) {
  if (historie.length < 2) return null;

  const W = 240;
  const H = 56;
  const strop = Math.max(8, ...historie.map((m) => m.naraz ?? m.rychlost));
  const t0 = Date.parse(historie[0].cas);
  const t1 = Date.parse(historie[historie.length - 1].cas);
  const x = (m: Mereni) => (((Date.parse(m.cas) - t0) / Math.max(t1 - t0, 1)) * W).toFixed(1);
  const y = (v: number) => (H - 2 - (v / strop) * (H - 6)).toFixed(1);

  const cara = historie.map((m) => `${x(m)},${y(m.rychlost)}`).join(" ");
  const narazy = historie.map((m) => `${x(m)},${y(m.naraz ?? m.rychlost)}`).join(" ");
  const nejvic = Math.max(...historie.map((m) => m.naraz ?? m.rychlost));

  return (
    <figure className="vitr-graf-obal">
      <svg
        className="vitr-graf"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Vítr za 24 hodin, nejsilnější náraz ${f(nejvic)} m/s`}
      >
        <polygon className="narazy" points={`0,${H} ${narazy} ${W},${H}`} />
        <polyline className="cara" points={cara} />
      </svg>
      <figcaption>
        24 h · nárazy až {f(nejvic)} m/s
      </figcaption>
    </figure>
  );
}
