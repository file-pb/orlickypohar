import { DNI, nactiTeplotyVody, STRANKA_HYDRO, type Bod } from "@/lib/teplota";
import { nactiKoupani, STRANKA_KOUPANI, STUPNE } from "@/lib/koupani";

/**
 * Teplota vody na přítocích Orlíku za posledních sedm dní (Filip,
 * 18. 9. 2026). Z otevřených dat ČHMÚ, viz `lib/teplota.ts`.
 *
 * U každé řeky aktuální teplota, změna za den a malý graf týdne. Grafy mají
 * <b>společnou osu</b>, aby šlo řeky porovnat pohledem — Skalice o dva
 * stupně studenější než Lužnice má vypadat níž, ne stejně.
 *
 * SVG přímo ve stránce, bez knihovny a bez javascriptu. Když se data
 * nepodaří načíst, widget chybí.
 */

const f = (n: number) => n.toLocaleString("cs-CZ", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const kratce = (iso: string) =>
  new Date(iso).toLocaleString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Europe/Prague",
  });

const datumKratce = (iso: string) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", timeZone: "Europe/Prague" });

export async function BokTeplotaVody() {
  const [stanice, koupani] = await Promise.all([nactiTeplotyVody(), nactiKoupani()]);
  if (!stanice) return null;

  // Společná osa pro všechny grafy, nejméně 2 °C, ať se denní kolísání
  // o pár desetin netváří jako skok.
  const vse = stanice.flatMap((s) => s.rada.map((b) => b.hodnota));
  const stred = (Math.max(...vse) + Math.min(...vse)) / 2;
  const rozsah = Math.max(Math.max(...vse) - Math.min(...vse), 2);
  const osa = { spodek: stred - rozsah / 2, rozsah };

  const posledni = stanice.map((s) => s.aktualni.cas).sort().at(-1);

  return (
    <section className="teplota-vody">
      <h2 className="bok-nadpis">Teplota vody · přítoky</h2>
      <ul>
        {stanice.map((s) => (
          <li key={s.tok}>
            <div className="teplota-hlava">
              <span className="teplota-reka">
                {s.tok}
                <span className="teplota-misto"> · {s.misto}</span>
              </span>
              <b className="teplota-hodnota">{f(s.aktualni.hodnota)} °C</b>
            </div>
            <Graf rada={s.rada} osa={osa} popis={`${s.tok}, ${s.misto}`} />
            {s.zaDen !== null && (
              <span className={`teplota-zmena ${s.zaDen > 0 ? "stoupa" : s.zaDen < 0 ? "klesa" : ""}`}>
                {s.zaDen === 0
                  ? "za den beze změny"
                  : `${s.zaDen > 0 ? "↑" : "↓"} ${f(Math.abs(s.zaDen))} °C za den`}
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="vodocet-pozn" style={{ margin: "0.4rem 0 0" }}>
        Graf za {DNI} dní. Měří se v řekách; nádrž bývá v létě teplejší, na podzim chladnější.
      </p>
      <p className="bok-dal">
        <a href={STRANKA_HYDRO} target="_blank" rel="noopener noreferrer">
          ČHMÚ{posledni && ` · ${kratce(posledni)}`}
        </a>
      </p>

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
    </section>
  );
}

function Graf({ rada, osa, popis }: { rada: Bod[]; osa: { spodek: number; rozsah: number }; popis: string }) {
  if (rada.length < 2) return null;

  const W = 240;
  const H = 30;
  const t0 = Date.parse(rada[0].cas);
  const t1 = Date.parse(rada[rada.length - 1].cas);
  const body = rada.map((b) => {
    const x = ((Date.parse(b.cas) - t0) / Math.max(t1 - t0, 1)) * W;
    const y = H - 3 - ((b.hodnota - osa.spodek) / osa.rozsah) * (H - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const min = Math.min(...rada.map((b) => b.hodnota));
  const max = Math.max(...rada.map((b) => b.hodnota));

  return (
    <svg
      className="teplota-graf"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`${popis}: za ${DNI} dní od ${f(min)} do ${f(max)} °C`}
    >
      <polyline className="cara" points={body.join(" ")} />
    </svg>
  );
}
