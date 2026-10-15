import { NAZVY_STAVU, type TratNaVyber } from "@/lib/trat";
import { dalsiTratAkce, tratRozjizdceAkce } from "./akce";
import Link from "@/app/sprava/odkaz";
import { StejnaTrat } from "@/app/sprava/stejna-trat";

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
  trate: TratNaVyber[];
  /** Rozjížďky regaty. Prázdné, když je regata ještě nemá. */
  rozjizdky: { cislo: number }[];
  /** Trať, kterou obrazovka právě ukazuje. */
  vybrana?: number;
}) {
  // Bez trati i bez rozjížďky není co nabízet; stavba začíná první bójí.
  if (trate.length === 0 && rozjizdky.length === 0) return null;

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
              {t.cisloRozjizdky ? `${t.cisloRozjizdky}. rozjížďka` : "bez rozjížďky"}
              <span className="stav">{NAZVY_STAVU[t.stav]}</span>
            </Link>
          );
        })}

        {/* Plus zakládá prázdnou trať pro další rozjížďku. Klon je od toho,
            když se jede stejně; tohle je, když se pojede jinudy. */}
        <form action={dalsiTratAkce}>
          <input type="hidden" name="serie" value={serie} />
          <input type="hidden" name="zavod" value={zavod} />
          <button type="submit" title="Další trať regaty" aria-label="Založit další trať">
            +
          </button>
        </form>
      </nav>

      {/* <b>Ptá se rozjížďka, ne trať</b> (Filip, 15. 10. 2026: *„to
          přiřazení trati rozjížďkám a opačně je hrozně neintuitivní…
          nikdo nepochopí, jak to přiřadit"*). Dřív tu byl tentýž seznam
          tratí podruhé a u každé políčko na číslo rozjížďky; rozhodčí
          ale přemýšlí opačně — „druhá rozjížďka pojede po týhle trati".
          Jedna nabídka na řádek, žádné psaní čísel a žádné tlačítko,
          které se pod rukama mění. */}
      <h3>Která trať se pojede</h3>
      {rozjizdky.length === 0 ? (
        <p className="prazdno">
          Regata zatím nemá rozjížďku. Trať se dá stavět i tak — přiřadí se,
          až rozjížďka vznikne.
        </p>
      ) : (
        <ul className="prirazeni">
          {rozjizdky.map((r) => {
            const ma = trate.find((t) => t.cisloRozjizdky === r.cislo);
            return (
              <li key={r.cislo}>
                <b>{r.cislo}. rozjížďka</b>
                {ma ? (
                  <span className="detail">
                    {popisTrati(ma)}
                    <StejnaTrat serie={serie} zavod={zavod} cisla={shodneSTrati(ma, trate)} />
                  </span>
                ) : (
                  <span className="detail">zatím bez trati</span>
                )}

                {/* Odjetá trať se nepřepisuje: přepsalo by to, podle čeho
                    se jelo. */}
                {!ma?.odjeta && (
                  <form action={tratRozjizdceAkce} className="formular radkove">
                    <input type="hidden" name="serie" value={serie} />
                    <input type="hidden" name="zavod" value={zavod} />
                    <input type="hidden" name="rozjizdka" value={r.cislo} />
                    <label>
                      <span className="skryte">Trať pro {r.cislo}. rozjížďku</span>
                      <select name="volba" defaultValue="">
                        <option value="" disabled>
                          {ma ? "změnit na…" : "vybrat trať…"}
                        </option>
                        <option value="nova">nová prázdná trať</option>
                        {trate
                          .filter((t) => t.jdePriradit && t.id !== ma?.id)
                          .map((t) => (
                            <option key={`p${t.id}`} value={`prirad:${t.id}`}>
                              postavená trať bez rozjížďky ({popisTrati(t)})
                            </option>
                          ))}
                        {trate
                          .filter((t) => t.cisloRozjizdky !== null && t.cisloRozjizdky !== r.cislo)
                          .map((t) => (
                            <option key={`k${t.id}`} value={`klon:${t.id}`}>
                              stejná jako {t.cisloRozjizdky}. rozjížďka
                            </option>
                          ))}
                      </select>
                    </label>
                    <button type="submit">Použít</button>
                  </form>
                )}
                {ma?.odjeta && <span className="stitek">jelo se podle ní</span>}
              </li>
            );
          })}
        </ul>
      )}

      <p className="poznamka">
        „Stejná jako" kopíruje prvky na <b>tytéž bóje</b> — žádná nová pípnutí. Vyrobila
        by se tím měření, která se nestala, s falešným časem a přesností.
      </p>
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

/** Trať jednou krátkou větou: kolik prvků a v jakém je stavu. */
function popisTrati(t: TratNaVyber) {
  const prvky =
    t.pocetPrvku === 0 ? "bez prvků" : t.pocetPrvku === 1 ? "1 prvek" : `${t.pocetPrvku} prvků`;
  return `${prvky}, ${NAZVY_STAVU[t.stav]}`;
}
