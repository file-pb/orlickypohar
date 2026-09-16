import {
  BAZEN_M3,
  minuty,
  nactiOrlik,
  odtokZaDen,
  zaDen,
  zmenaCm,
  ZDROJ_VODOCTU,
  type Mereni,
} from "@/lib/pvl";

/**
 * Vodočet Orlíku do boku (Filip, 16. 9. 2026): velké číslo hladiny se
 * šipkou, jestli stoupá, nebo klesá, jednoduchý graf hladiny za posledních
 * zhruba 30 hodin a dvě menší čísla s přítokem a odtokem.
 *
 * <b>Přítok a odtok i za den</b> (Filip, 16. 9. 2026), aby si člověk
 * představil rozdíl a objem. Přítok je řeka a mění se pomalu, takže den je
 * jeho okamžitá hodnota krát 24 h. Odtok se sčítá z hodinové řady —
 * elektrárna pouští vodu nárazově a okamžitá nula by lhala. Rozdíl obou
 * je vedle objemu nádrže a v bazénech, protože „milion kubíků" si nikdo
 * nepředstaví.
 *
 * Data jsou z Povodí Vltavy, graf je SVG přímo ve stránce — bez knihovny
 * a bez javascriptu. Když se data nepodaří načíst, widget chybí.
 */

const HODIN_ZMENY = 6;

const f = (n: number, mist: number) =>
  n.toLocaleString("cs-CZ", { minimumFractionDigits: mist, maximumFractionDigits: mist });

/** Objem v m³ čitelně: pod milion v tisících, nad ním v milionech. */
const objemem = (m3: number) =>
  Math.abs(m3) >= 1_000_000 ? `${f(m3 / 1_000_000, 2)} mil. m³` : `${f(m3 / 1000, 0)} tis. m³`;

const bazenu = (m3: number) => {
  const n = Math.round(Math.abs(m3) / BAZEN_M3);
  const slovo = n === 1 ? "olympijský bazén" : n >= 2 && n <= 4 ? "olympijské bazény" : "olympijských bazénů";
  return `${n.toLocaleString("cs-CZ")} ${slovo}`;
};

export async function BokVodocet() {
  const stav = await nactiOrlik();
  if (!stav) return null;

  const zmena = zmenaCm(stav.historie, HODIN_ZMENY);
  const pritokDen = stav.pritok == null ? null : zaDen(stav.pritok);
  const odtokDen = odtokZaDen(stav.historie);
  const rozdil = pritokDen !== null && odtokDen !== null ? pritokDen - odtokDen : null;
  const smer = zmena > 0 ? "stoupa" : zmena < 0 ? "klesa" : "stoji";
  const veta =
    zmena === 0
      ? `Hladina se za ${HODIN_ZMENY} h nezměnila`
      : `Hladina ${zmena > 0 ? "stoupá" : "klesá"} o ${Math.abs(zmena)} cm za ${HODIN_ZMENY} h`;

  return (
    <section className="vodocet">
      <h2 className="bok-nadpis">Orlík · vodočet</h2>
      <div className="vodocet-hlava">
        <span className={`vodocet-sipka ${smer}`} aria-hidden="true">
          {zmena > 0 ? "↑" : zmena < 0 ? "↓" : "→"}
        </span>
        <b className="vodocet-hladina">{f(stav.hladina, 2)}</b>
        <span className="vodocet-jednotka">m n. m.</span>
      </div>
      <p className="vodocet-zmena">{veta}</p>

      <Graf historie={stav.historie} />

      <dl className="vodocet-toky">
        <div>
          <dt>Přítok</dt>
          <dd>{stav.pritok === null ? "—" : `${f(stav.pritok, 1)} m³/s`}</dd>
          {pritokDen !== null && <dd className="vodocet-den">≈ {objemem(pritokDen)} za den</dd>}
        </div>
        <div>
          <dt>Odtok</dt>
          <dd>{stav.odtok === null ? "—" : `${f(stav.odtok, 1)} m³/s`}</dd>
          {odtokDen !== null && <dd className="vodocet-den">{objemem(odtokDen)} za 24 h</dd>}
        </div>
      </dl>

      {rozdil !== null && (
        <p className="vodocet-bilance">
          Za den {rozdil >= 0 ? "přiteče" : "odteče"}{" "}
          <b>o {objemem(Math.abs(rozdil))} víc</b>, než {rozdil >= 0 ? "odteče" : "přiteče"} —
          zhruba {bazenu(rozdil)}.
          {stav.objem != null && (
            <>
              {" "}
              V nádrži je {f(stav.objem, 0)} mil. m³, tedy{" "}
              {f((Math.abs(rozdil) / 1_000_000 / stav.objem) * 100, 1)} % objemu.
            </>
          )}
          <span className="vodocet-pozn">
            {" "}
            Elektrárna pouští vodu nárazově, odtok je proto sečtený za 24 h.
          </span>
        </p>
      )}

      <p className="bok-dal">
        <a href={ZDROJ_VODOCTU} target="_blank" rel="noopener noreferrer">
          Povodí Vltavy{stav.cas && ` · ${stav.cas}`}
        </a>
      </p>
    </section>
  );
}

/**
 * Průběh hladiny. Osa se roztahuje na rozsah dat, ale nejméně na 5 cm —
 * jinak by centimetrové kolísání vypadalo jako povodeň.
 */
function Graf({ historie }: { historie: Mereni[] }) {
  if (historie.length < 2) return null;

  const W = 240;
  const H = 56;
  const hodnoty = historie.map((m) => m.hladina);
  const stred = (Math.max(...hodnoty) + Math.min(...hodnoty)) / 2;
  const rozsah = Math.max(Math.max(...hodnoty) - Math.min(...hodnoty), 0.05);
  const spodek = stred - rozsah / 2;

  // Osa podle času měření, ne podle pořadí: nejnovější bod bývá 10 minut
  // za předchozím, ne hodinu.
  const t0 = minuty(historie[0].cas);
  const t1 = minuty(historie[historie.length - 1].cas);
  const body = hodnoty.map((h, i) => {
    const x = ((minuty(historie[i].cas) - t0) / Math.max(t1 - t0, 1)) * W;
    const y = H - 4 - ((h - spodek) / rozsah) * (H - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const od = historie[0];
  const doCas = historie[historie.length - 1];

  return (
    <svg
      className="vodocet-graf"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Hladina od ${od.cas} (${f(od.hladina, 2)} m) do ${doCas.cas} (${f(doCas.hladina, 2)} m)`}
    >
      <polygon className="plocha" points={`0,${H} ${body.join(" ")} ${W},${H}`} />
      <polyline className="cara" points={body.join(" ")} />
    </svg>
  );
}
