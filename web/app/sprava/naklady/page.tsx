import { Fragment } from "react";
import Link from "next/link";
import { Drobecky } from "@/app/drobecky";
import { Vypadek } from "@/app/vypadek";
import { nactiNaklady, type NakladovaPolozka } from "@/lib/naklady";
import { GrafDnu } from "./graf";

export const dynamic = "force-dynamic";
export const metadata = { title: "Co web stojí — správa" };

const koruny = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 });
const drobne = new Intl.NumberFormat("cs-CZ", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * Koruny. Drobné položky s jedním desetinným místem schválně: zaokrouhlené
 * „31 Kč" krát dvanáct není „369 Kč" a tabulka pak vypadá jako chyba —
 * přitom chybné je jen to zaokrouhlení. U tisíců už desetina nic neříká.
 */
const kc = (x: number) =>
  x === 0 ? "0 Kč" : `${(Math.abs(x) < 100 ? drobne : koruny).format(x)} Kč`;
const hodiny = (x: number) => `${koruny.format(x)} h`;

/**
 * Co stojí provozovat a servisovat tenhle web. Jen pro správce celého webu.
 *
 * <b>Proč to je na poháru, a ne jen v přehledu platformy.</b> Přehled je
 * za basicAuth a ví o celé hračkárně; tahle otázka ale patří tomu, kdo
 * odpovídá za pohár, a odpověď má být tam, kde se na ni ptá.
 *
 * Serverová a bez javascriptu jako zbytek správy. Čísla jdou z API, které
 * je čte z přehledu platformy — pohár si nic nepočítá sám.
 */
export default async function Naklady() {
  const { stav, naklady, duvod } = await nactiNaklady();

  const hlava = (
    <>
      <Drobecky cesta={[{ text: "Domů", kam: "/" }, { text: "Co web stojí" }]} />
      <h1>Co web stojí</h1>
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
  if (stav === "nesmi")
    return (
      <>
        {hlava}
        <p className="prazdno">Náklady vidí jen správce celého webu.</p>
      </>
    );
  if (stav !== "ok" || !naklady)
    return (
      <>
        {hlava}
        {/* Důvod z API. Bez něj by se muselo hledat v logu serveru — a to
            u obrazovky, kam člověk chodí jednou za měsíc, nikdo neudělá. */}
        <p className="prazdno">{duvod ?? "Čísla se nepodařilo získat."}</p>
      </>
    );

  const spocitano = new Date(naklady.kdy);
  const hodin = (Date.now() - spocitano.getTime()) / 3_600_000;

  return (
    <>
      {hlava}
      <p className="podtitulek">
        <b>Provoz</b> je to, co stojí běh webu; <b>servis</b> to, co je potřeba platit, aby se na
        něm dalo dělat. Položky jsou o {koruny.format(naklady.prirazkaProcent)} % výš než v přehledu
        platformy — alokace serveru je spodní odhad, tohle je rezerva na to, co v ní není.
      </p>

      <div className="naklady-souhrn">
        <div>
          <span className="popis">Celkem za měsíc</span>
          <b>{kc(naklady.celkemKcMesicne)}</b>
        </div>
        <div>
          <span className="popis">Celkem za rok</span>
          <b>{kc(naklady.celkemKcRocne)}</b>
        </div>
      </div>

      <Tabulka
        nadpis="Provoz"
        polozky={naklady.provoz}
        mesicne={naklady.provozKcMesicne}
        rocne={naklady.provozKcRocne}
        prazdno="Provoz nic nestojí — to je podezřelé, koukni do přehledu platformy."
      />
      <Tabulka
        nadpis="Servis"
        polozky={naklady.servis}
        mesicne={naklady.servisKcMesicne}
        rocne={naklady.servisKcRocne}
        prazdno="Výrobní náklady nejsou spočítané. Počítá je scripts/servis.sh v platformě."
      />

      {/* Závěrečný součet. Dlaždice nahoře jsou rychlá odpověď, tohle je
          ta samá suma na konci čtení — a se zdrojovými řádky nad sebou,
          takže je vidět, z čeho se skládá. */}
      <section className="skupina-opravneni">
        <h2>Celkem</h2>
        <div className="tabulka-obal">
          <table>
            <thead>
              <tr>
                <th className="vlevo">Co</th>
                <th>Měsíčně</th>
                <th>Ročně</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="vlevo">Provoz</td>
                <td>{kc(naklady.provozKcMesicne)}</td>
                <td>{kc(naklady.provozKcRocne)}</td>
              </tr>
              <tr>
                <td className="vlevo">Servis</td>
                <td>{kc(naklady.servisKcMesicne)}</td>
                <td>{kc(naklady.servisKcRocne)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="celkem">
                <td className="vlevo">Provoz a servis dohromady</td>
                <td>{kc(naklady.celkemKcMesicne)}</td>
                <td>{kc(naklady.celkemKcRocne)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="skupina-opravneni">
        <h2>Jak se provoz hýbe</h2>
        <p className="poznamka bez-odsazeni">
          Kolik by stál měsíc, kdyby celý vypadal jako ten den. Jen provoz — servis je
          předplatné, které se dnem nemění, a historii ho platforma nevede.
        </p>
        <GrafDnu dny={naklady.historie} />
      </section>

      {naklady.prace && (
        <section className="skupina-opravneni">
          <h2>Kolik práce v tom je</h2>
          <div className="tabulka-obal">
            <table>
              <tbody>
                <tr>
                  <td className="vlevo">
                    Stavba
                    <span className="poznamka-radku">
                      celkem od začátku, včetně poměrné části práce na platformě
                    </span>
                  </td>
                  <td>{hodiny(naklady.prace.stavbaH)}</td>
                </tr>
                <tr>
                  <td className="vlevo">
                    Údržba za 30 dní
                    <span className="poznamka-radku">odhad z gitu: uplynulý čas seancí</span>
                  </td>
                  <td>{hodiny(naklady.prace.udrzba30H)}</td>
                </tr>
                <tr>
                  <td className="vlevo">
                    Minuty CI
                    <span className="poznamka-radku">za 30 dní, proti 2 000 zdarma měsíčně</span>
                  </td>
                  <td>{koruny.format(naklady.prace.ciMinut)} min</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="poznamka">
            V penězích to tu není schválně: hodinová sazba nikde zadaná není a vymyslet si ji
            by z odhadu udělalo fakturu.
          </p>
        </section>
      )}

      <p className="poznamka">
        Čísla spočítal přehled stavu platformy{" "}
        {spocitano.toLocaleString("cs-CZ", { dateStyle: "long", timeStyle: "short" })}
        {hodin > 6 && (
          // Cron přepisuje soubor po pěti minutách. Půl dne staré číslo
          // neznamená, že se nic nezměnilo, ale že se přestalo počítat.
          <b> — starší než šest hodin, přehled nejspíš neběží</b>
        )}
        . Rok je dvanáctinásobek měsíce; roční slevy tu žádné nejsou.
      </p>
    </>
  );
}

function Tabulka({
  nadpis,
  polozky,
  mesicne,
  rocne,
  prazdno,
}: {
  nadpis: string;
  polozky: NakladovaPolozka[];
  mesicne: number;
  rocne: number;
  prazdno: string;
}) {
  return (
    <section className="skupina-opravneni">
      <h2>{nadpis}</h2>
      {polozky.length === 0 ? (
        <p className="prazdno">{prazdno}</p>
      ) : (
        <div className="tabulka-obal">
          <table>
            <thead>
              <tr>
                <th className="vlevo">Položka</th>
                <th>Měsíčně</th>
                <th>Ročně</th>
              </tr>
            </thead>
            <tbody>
              {polozky.map((p) => (
                <Fragment key={p.polozka}>
                  <tr>
                    <td className="vlevo">
                      {p.polozka}
                      {/* Čím je částka podložená. Bez toho je to číslo, které
                          si nikdo neověří a nikdo mu nevěří. */}
                      {p.poznamka && <span className="poznamka-radku">{p.poznamka}</span>}
                    </td>
                    <td>{kc(p.kcMesicne)}</td>
                    <td>{kc(p.kcRocne)}</td>
                  </tr>
                  {/* Rozbor jedné platby, ne další položky — proto odsazené,
                      tlumené a bez ročního sloupce. Do součtu se nepřičítají;
                      sčítají se do řádku nad sebou. */}
                  {p.slozky?.map((s) => (
                    <tr key={`${p.polozka}-${s.polozka}`} className="slozka">
                      <td className="vlevo">
                        z toho {s.polozka.toLocaleLowerCase("cs-CZ")}
                        {s.poznamka && <span className="poznamka-radku">{s.poznamka}</span>}
                      </td>
                      <td>{kc(s.kcMesicne)}</td>
                      <td />
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="vlevo">{nadpis} celkem</td>
                <td>{kc(mesicne)}</td>
                <td>{kc(rocne)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
