import { NAZVY_STAVU, type TratNaVyber } from "@/lib/trat";
import { dalsiTratAkce } from "./akce";
import Link from "@/app/sprava/odkaz";
import { StejnaTrat } from "@/app/sprava/stejna-trat";
import { Vypadek } from "@/app/vypadek";

/**
 * Komu trať patří a jak se vezme ta z minula.
 *
 * <b>Zadání od Filipa (9. 10. 2026):</b> *„Trať by měla být asociovaná
 * s rozjížďkou. Jakmile založím novou rozjížďku, můžu si vybrat již
 * postavenou trať a ta se mi naklonuje z té, co se odjela."*
 *
 * <para>
 * <b>Přiřadit a naklonovat jsou dvě různé věci</b> a obrazovka je nesmí
 * slít do jednoho tlačítka. Volná trať se <b>přiřadí</b> — vyrábět kopii
 * hned po přijetí by znamenalo přijímat dvakrát totéž. Trať, která už
 * rozjížďce patří, se <b>naklonuje</b>, protože odebrat ji té rozjížďce
 * by přepsalo, podle čeho se jelo. Co z toho platí, říká `jdePriradit`
 * ze serveru, ne odhad obrazovky.
 * </para>
 *
 * <para>
 * <b>Rozjížďka se zadává číslem</b>, ne nabídkou. Pořadatel ho zná
 * a nabídka by znamenala další načítání a riziko, že ukazuje stav, který
 * už neplatí. Neexistující i obsazené číslo odmítne server s vlastní
 * hláškou.
 * </para>
 */
export function VyberTrati({
  serie,
  zavod,
  trate,
  rozjizdky,
  vybrana,
}: {
  serie: string;
  zavod: string;
  /** <c>null</c> je výpadek čtení, ne „žádné tratě" — viz `nactiTrate`. */
  trate: TratNaVyber[] | null;
  /** Čísla rozjížděk regaty. Plus z nich nabízí ty, které trať nemají. */
  rozjizdky: number[];
  /** Trať, kterou obrazovka právě ukazuje. */
  vybrana?: number;
}) {
  // Výpadek se musí poznat. Mizející sekce vypadá jako „nic tu není",
  // jenže přiřazení trati rozjížďce a klonování je jediná cesta, jak
  // rozjet další rozjížďku — a stavitel by marně hledal, kam zmizela.
  if (trate === null)
    return (
      <section className="vyber-trati" aria-labelledby="vyber-trati-nadpis">
        <h2 id="vyber-trati-nadpis">Tratě regaty</h2>
        <Vypadek co="Tratě regaty" />
      </section>
    );

  if (trate.length === 0 && rozjizdky.length === 0) return null;

  // Rozjížďky bez trati. Nabídnout tu, která už trať má, by znamenalo
  // slíbit druhou — a server by to stejně odmítl.
  const obsazene = new Set(trate.map((t) => t.cisloRozjizdky));
  const volne = rozjizdky.filter((c) => !obsazene.has(c));

  // Trať, kterou obrazovka ukazuje — bez výběru ta, na kterou spadla.
  const vybranaTrat = trate.find((t) => t.id === vybrana) ?? trate[0];

  // Čísla tratí podle pořadí, v jakém vznikly. Seznam chodí od nejnovější,
  // takže se počítá odzadu — „Trať 1" je ta první postavená.
  const poradi = new Map([...trate].reverse().map((t, i) => [t.id, i + 1]));

  return (
    <section className="vyber-trati" aria-labelledby="vyber-trati-nadpis">
      <h2 id="vyber-trati-nadpis">Tratě regaty</h2>

      {/* <b>Záložka za každou trať</b> (Filip, 15. 10. 2026: *„každá
          rozjížďka vlastní tab… na konci třeba plusko a možnost zadat
          další trať"*). Seznam pod sebou byl zavádějící: vypadal jako
          přehled, ale obrazovka přitom pořád ukazovala jen tu nejnovější.

          Popisek nese číslo rozjížďky, když ho trať má. Nemusí ho mít —
          pořadí je volné: dá se postavit trať a pak jí přiřadit rozjížďku,
          nebo vyhlásit rozjížďku a stavět, zatímco lodě čekají na vodě.

          Odkazy, ne javascript: výběr je v adrese, takže se dá poslat
          a po akci zůstane. */}
      <nav className="zalozky-trati" aria-label="Tratě regaty">
        {trate.map((t) => {
          const jeTato = t.id === vybrana;
          return (
            <Link
              key={t.id}
              href={`/sprava/${serie}/boje/${zavod}?trat=${t.id}`}
              className={jeTato ? "vybrany" : undefined}
              aria-current={jeTato ? "page" : undefined}
            >
              {/* <b>Záložka nese trať, ne rozjížďku</b> (Filip, 15. 10.
                  2026: *„chtěl bych, aby tady byl tab trať 1, trať 2"*).
                  Tratě jsou samostatné a rozjížďku mít nemusí — pojmenovat
                  je podle ní znamenalo u nepřiřazené napsat „bez
                  rozjížďky", což není jméno, ale nedostatek. Číslo je
                  pořadí v regatě, ne id: id je vnitřní věc. */}
              Trať {poradi.get(t.id)}
              <span className="stav">
                {t.cisloRozjizdky ? `${t.cisloRozjizdky}. rozjížďka · ` : ""}
                {NAZVY_STAVU[t.stav]}
              </span>
            </Link>
          );
        })}

        {/* <b>Plus se zeptá, pro kterou rozjížďku</b> (Filip, 15. 10. 2026:
            *„stačí jen seznam nad tím, ke které rozjížďce je trať připnuta
            a v jakém je to stavu; plusko jen nabídne výběr z rozjížděk"*).
            Dřív zakládalo trať bez vazby a přiřazovalo se jinde — dvě
            místa pro jednu věc, a ta druhá byla zmatečná.

            Rozbalovací, ne javascript: zabalené je to pořád jen plus. */}
        <details className="pridat-trat">
          <summary title="Další trať regaty" aria-label="Založit další trať">
            +
          </summary>
          {volne.length === 0 ? (
            <p className="poznamka">
              Každá rozjížďka už trať má. Další rozjížďku založíš u výsledků.
            </p>
          ) : (
            <form action={dalsiTratAkce} className="formular radkove">
              <input type="hidden" name="serie" value={serie} />
              <input type="hidden" name="zavod" value={zavod} />
              <label>
                Trať pro rozjížďku
                <select name="rozjizdka" defaultValue={String(volne[0])}>
                  {volne.map((c) => (
                    <option key={c} value={c}>
                      {c}. rozjížďka
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit">Založit</button>
            </form>
          )}
        </details>
      </nav>

      {/* <b>Jen informace, žádné přiřazování</b> (Filip, 15. 10. 2026:
          *„trať má maximálně někde mít přes ten klíč info, ke kterým
          rozjížďkám je přiřazena, ale rozjížďka se má založit pod
          výsledky a pak má být možné přiřadit rozjížďce trať"*).

          Tratě jsou samostatné a vazba na rozjížďku je obyčejná 1:1 —
          patří tam, kde rozjížďka vzniká, tedy k výsledkům. Tady by
          z toho byla druhá cesta k témuž a obrazovka stavby by se starala
          o něco, co se staví jinde. */}
      {/* Vede počtem, ne výčtem: kolik rozjížděk ji jede, je tu
          <b>minoritní informace</b> (Filip, 15. 10. 2026). Čísla
          a odkazy na ně jsou až v rozbalovací poznámce. Odkaz vede na
          výsledky rozjížďky — tam se startuje a tam jsou dojezdy
          (Filip, 15. 10. 2026: *„dá se do nich prokliknout a tam ji
          třeba odstartovat, nebo kouknout na výsledky"*). */}
      {vybranaTrat && (
        <p className="detail">
          {vybranaTrat.cisloRozjizdky ? (
            <>
              {"Jede ji "}
              <Link href={`/sprava/${serie}/vysledky/${zavod}/${vybranaTrat.cisloRozjizdky}`}>
                {vybranaTrat.cisloRozjizdky}. rozjížďka
              </Link>
              {"."}
            </>
          ) : (
            "Zatím ji nejede žádná rozjížďka."
          )}
          <StejnaTrat
            serie={serie}
            zavod={zavod}
            cisla={shodneSTrati(vybranaTrat, trate)}
          />
        </p>
      )}
    </section>
  );
}

/**
 * Čísla rozjížděk, které jedou totéž co tahle trať.
 *
 * <b>Trať bez prvků se nepáruje</b>: otisk je u ní `null`, protože prázdno
 * není předpis — dvě prázdné tratě spolu nemají nic společného.
 */
function shodneSTrati(trat: TratNaVyber, trate: TratNaVyber[]): number[] {
  if (!trat.otisk) return [];

  return trate
    .filter((t) => t.id !== trat.id && t.otisk === trat.otisk && t.cisloRozjizdky !== null)
    .map((t) => t.cisloRozjizdky!)
    .sort((a, b) => a - b);
}

