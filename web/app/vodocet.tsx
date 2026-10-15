import { casPraha, nactiOrlik, zmenaCm } from "@/lib/vodocet";
import { VodocetGraf } from "@/app/vodocet-graf";

/**
 * Vodočet Orlíku do boku (Filip, 16. 9. 2026): velké číslo hladiny se
 * šipkou, jestli stoupá, nebo klesá, graf hladiny za posledních 24 hodin
 * a přítok a odtok.
 *
 * <b>Přítok a odtok za posledních 24 h</b>, spočítané z naměřených řad,
 * ne okamžitá hodnota krát den (Filip, 16. 9. 2026). Tak je vidět, kolik
 * vody skutečně přiteklo a odteklo. Dokud API nemá nasbíraný celý den,
 * místo čísla stojí, že se sbírá.
 *
 * Graf je SVG přímo ve stránce — bez knihovny a bez javascriptu. Když se
 * data nepodaří načíst, widget chybí.
 */

const HODIN_ZMENY = 6;

const f = (n: number, mist: number) =>
  n.toLocaleString("cs-CZ", { minimumFractionDigits: mist, maximumFractionDigits: mist });

/** Objem v m³ čitelně: pod milion v tisících, nad ním v milionech. */
const objemem = (m3: number) =>
  Math.abs(m3) >= 1_000_000 ? `${f(m3 / 1_000_000, 2)} mil. m³` : `${f(m3 / 1000, 0)} tis. m³`;

export async function BokVodocet() {
  const stav = await nactiOrlik();
  if (!stav) return null;

  const zmena = zmenaCm(stav.historie, HODIN_ZMENY);
  const pritokDen = stav.pritokZaDen ?? null;
  const odtokDen = stav.odtokZaDen ?? null;
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

      <VodocetGraf vychozi={stav.historie} rozsahy={stav.dostupneRozsahy} />

      <dl className="vodocet-toky">
        <div>
          <dt>Přítok</dt>
          <dd>{stav.pritok == null ? "—" : `${f(stav.pritok, 1)} m³/s`}</dd>
          <dd className="vodocet-den">
            {pritokDen !== null ? `${objemem(pritokDen)} za 24 h` : "za 24 h se teprve sbírá"}
          </dd>
        </div>
        <div>
          <dt>Odtok</dt>
          <dd>{stav.odtok == null ? "—" : `${f(stav.odtok, 1)} m³/s`}</dd>
          {odtokDen !== null && <dd className="vodocet-den">{objemem(odtokDen)} za 24 h</dd>}
        </div>
      </dl>

      {rozdil !== null && (
        <p className="vodocet-bilance">
          Za posledních 24 h {rozdil >= 0 ? "přiteklo" : "odteklo"}{" "}
          {/* Barva a piktogram nesou trend na první pohled (Filip, 18. 9. 2026):
              modrá a stoupající čára, když se nádrž plní, červená a klesající,
              když se vypouští. Stejné barvy jako šipka u hladiny. */}
          <b className={`vodocet-rozdil ${rozdil >= 0 ? "stoupa" : "klesa"}`}>
            o {objemem(Math.abs(rozdil))} víc
            <Trend nahoru={rozdil >= 0} />
          </b>
          , než {rozdil >= 0 ? "odteklo" : "přiteklo"}.
          {stav.objem != null && <> V nádrži je {f(stav.objem, 0)} mil. m³.</>}
          <span className="vodocet-pozn">
            {" "}
            Elektrárna pouští vodu nárazově, proto se sčítá celý den, ne okamžitý průtok.
          </span>
        </p>
      )}

      <p className="bok-dal">
        <a href={stav.zdroj} target="_blank" rel="noopener noreferrer">
          Povodí Vltavy · {casPraha(stav.cas)}
        </a>
      </p>
    </section>
  );
}

/**
 * Piktogram trendu: lomená čára se šipkou. Čtečka obrazovky ho přeskočí —
 * směr už říká věta („přiteklo" / „odteklo").
 */
function Trend({ nahoru }: { nahoru: boolean }) {
  return (
    <svg className="vodocet-trend" viewBox="0 0 16 12" aria-hidden="true">
      {nahoru ? (
        <>
          <polyline points="1,10 6,5 9,8 15,2" />
          <polyline points="11,2 15,2 15,6" />
        </>
      ) : (
        <>
          <polyline points="1,2 6,7 9,4 15,10" />
          <polyline points="11,10 15,10 15,6" />
        </>
      )}
    </svg>
  );
}
