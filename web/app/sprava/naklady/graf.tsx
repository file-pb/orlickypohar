import type { DenNakladu } from "@/lib/naklady";

/**
 * Vývoj provozu po dnech.
 *
 * <b>Čára, ne sloupce.</b> Otázka je „hýbe se to?", tedy změna v čase —
 * a rozptyl je pár korun na třiceti. Sloupce od nuly (jinak se kreslit
 * nesmějí) z toho udělají jeden plný obdélník, ve kterém není vidět nic.
 * Čára smí mít osu zúženou na rozsah dat, pokud je ten rozsah napsaný —
 * proto je pod grafem.
 *
 * <b>Bez javascriptu</b>, jako zbytek správy. Čára je inline SVG roztažené
 * na šířku obalu (`vector-effect` drží stálou tloušťku), vodítko průměru
 * a popisky jsou HTML, aby se neroztáhly s ním. Čísla jsou pod grafem
 * v rozbalovací tabulce — i pro předčítátko a pro tisk.
 */
export function GrafDnu({ dny }: { dny: DenNakladu[] }) {
  // Jeden bod není vývoj. Přehled sbírá po pěti minutách, takže druhý den
  // přibude sám — do té doby je poctivější to říct než nakreslit čáru.
  if (dny.length < 2)
    return (
      <p className="prazdno">
        Vývoj se teprve sbírá — přehled platformy má zatím{" "}
        {dny.length === 1 ? "jeden den" : "prázdno"}. Další den přibude po půlnoci.
      </p>
    );

  const hodnoty = dny.map((d) => d.provozKcMesicne);
  const max = Math.max(...hodnoty);
  const min = Math.min(...hodnoty);
  const prumer = hodnoty.reduce((s, x) => s + x, 0) / hodnoty.length;
  const posledni = dny[dny.length - 1];

  // Desetina rozsahu nahoře i dole, aby se čára nelepila na okraj. U plochého
  // průběhu (samé stejné číslo) by rozsah byl nula — pak stačí libovolné okno.
  const rozpeti = max - min || Math.max(max, 1) * 0.1;
  const dno = min - rozpeti * 0.1;
  const strop = max + rozpeti * 0.1;
  const S = 100;
  const V = 40;
  const y = (x: number) => V - ((x - dno) / (strop - dno)) * V;
  const body = dny.map((d, i) => `${(i / (dny.length - 1)) * S},${y(d.provozKcMesicne).toFixed(2)}`);

  return (
    <>
      <div
        className="graf-dnu"
        role="img"
        aria-label={`Provoz po dnech, ${popisDne(dny[0].den)} až ${popisDne(posledni.den)}. Nejmíň ${kc(min)}, nejvíc ${kc(max)}, průměr ${kc(prumer)}, naposledy ${kc(posledni.provozKcMesicne)}.`}
      >
        {/* Vodítko průměru. Tlumené a přerušované, aby s čarou nesoupeřilo. */}
        <div
          className="prumer"
          style={{ bottom: `${((prumer - dno) / (strop - dno)) * 100}%` }}
        >
          <span>průměr {kc(prumer)}</span>
        </div>
        <svg viewBox={`0 0 ${S} ${V}`} preserveAspectRatio="none" aria-hidden="true">
          {/* Plocha pod čarou jen jako náznak objemu — proto průhledná. */}
          <polygon className="plocha" points={`0,${V} ${body.join(" ")} ${S},${V}`} />
          <polyline className="cara" points={body.join(" ")} />
        </svg>
        {/* Poslední den je ten, na který se člověk dívá. Tečka je HTML, aby
            ji roztažený viewBox nezdeformoval na elipsu. */}
        <i
          className="posledni-bod"
          style={{
            bottom: `${((posledni.provozKcMesicne - dno) / (strop - dno)) * 100}%`,
          }}
        />
      </div>

      <div className="graf-popisky">
        <span>{popisDne(dny[0].den)}</span>
        <span className="vrchol">
          svislá osa {kc(min)} – {kc(max)}
        </span>
        <span>
          {popisDne(posledni.den)} — <b>{kc(posledni.provozKcMesicne)}</b>
        </span>
      </div>

      <details className="graf-cisla">
        <summary>Čísla po dnech</summary>
        <div className="tabulka-obal">
          <table>
            <thead>
              <tr>
                <th className="vlevo">Den</th>
                <th>Provoz za měsíc</th>
              </tr>
            </thead>
            <tbody>
              {[...dny].reverse().map((d) => (
                <tr key={d.den}>
                  <td className="vlevo">{popisDne(d.den, true)}</td>
                  <td>{kc(d.provozKcMesicne)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}

const koruny = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 1 });
const kc = (x: number) => `${koruny.format(x)} Kč`;

/** „2026-09-23" → „23. 9.", s rokem jen v tabulce. */
function popisDne(iso: string, sRokem = false) {
  const [rok, mesic, den] = iso.split("-").map(Number);
  return sRokem ? `${den}. ${mesic}. ${rok}` : `${den}. ${mesic}.`;
}
