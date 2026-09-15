import { minuty, nactiOrlik, zmenaCm, ZDROJ_VODOCTU, type Mereni } from "@/lib/pvl";

/**
 * Vodočet Orlíku do boku (Filip, 16. 9. 2026): velké číslo hladiny se
 * šipkou, jestli stoupá, nebo klesá, jednoduchý graf hladiny za posledních
 * zhruba 30 hodin a dvě menší čísla s přítokem a odtokem.
 *
 * Data jsou z Povodí Vltavy, graf je SVG přímo ve stránce — bez knihovny
 * a bez javascriptu. Když se data nepodaří načíst, widget chybí.
 */

const HODIN_ZMENY = 6;

const f = (n: number, mist: number) =>
  n.toLocaleString("cs-CZ", { minimumFractionDigits: mist, maximumFractionDigits: mist });

export async function BokVodocet() {
  const stav = await nactiOrlik();
  if (!stav) return null;

  const zmena = zmenaCm(stav.historie, HODIN_ZMENY);
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
        </div>
        <div>
          <dt>Odtok</dt>
          <dd>{stav.odtok === null ? "—" : `${f(stav.odtok, 1)} m³/s`}</dd>
        </div>
      </dl>

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
