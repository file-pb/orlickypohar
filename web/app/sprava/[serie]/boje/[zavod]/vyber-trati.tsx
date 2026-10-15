import { NAZVY_STAVU, type TratNaVyber } from "@/lib/trat";
import { klonujTratAkce, priradTratAkce } from "./akce";
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
}: {
  serie: string;
  zavod: string;
  trate: TratNaVyber[];
}) {
  if (trate.length === 0) return null;

  return (
    <section className="vyber-trati" aria-labelledby="vyber-trati-nadpis">
      <h2 id="vyber-trati-nadpis">Tratě regaty</h2>

      <ul className="seznam">
        {trate.map((t) => (
          <li key={t.id}>
            <b>
              {t.cisloRozjizdky ? `${t.cisloRozjizdky}. rozjížďka` : "zatím bez rozjížďky"}
            </b>{" "}
            <span className="stitek">{NAZVY_STAVU[t.stav]}</span>
            {t.odjeta && <span className="stitek">jelo se podle ní</span>}
            <span className="detail">
              {" "}
              {t.pocetPrvku === 0
                ? "bez prvků"
                : t.pocetPrvku === 1
                  ? "1 prvek"
                  : `${t.pocetPrvku} prvků`}
            </span>

            <StejnaTrat serie={serie} zavod={zavod} cisla={shodneSTrati(t, trate)} />

            {t.jdePriradit ? (
              <form action={priradTratAkce} className="formular radkove">
                <input type="hidden" name="serie" value={serie} />
                <input type="hidden" name="zavod" value={zavod} />
                <input type="hidden" name="trat" value={t.id} />
                <label>
                  Přiřadit rozjížďce číslo
                  <input name="rozjizdka" type="number" min={1} required />
                </label>
                <button type="submit">Přiřadit</button>
              </form>
            ) : (
              <form action={klonujTratAkce} className="formular radkove">
                <input type="hidden" name="serie" value={serie} />
                <input type="hidden" name="zavod" value={zavod} />
                <input type="hidden" name="trat" value={t.id} />
                <label>
                  Jede se znovu v rozjížďce číslo
                  <input name="rozjizdka" type="number" min={1} />
                  <span className="poznamka">
                    Prázdné udělá kopii „na stůl" — rozjížďku jí přiřadíš potom.
                  </span>
                </label>
                <label>
                  Klon začne ve stavu
                  <select name="stav" defaultValue="Hotovo">
                    <option value="Rozestaveno">{NAZVY_STAVU.Rozestaveno}</option>
                    <option value="Hotovo">{NAZVY_STAVU.Hotovo}</option>
                    <option value="Prijato">{NAZVY_STAVU.Prijato}</option>
                  </select>
                  <span className="poznamka">
                    Výchozí je hotová: klon je tvrzení stavitele, že stojí to, co
                    minule. Přijmout ji smí jen rozhodčí.
                  </span>
                </label>
                <button type="submit">Naklonovat</button>
              </form>
            )}
          </li>
        ))}
      </ul>

      <p className="poznamka">
        Klon kopíruje prvky na <b>tytéž bóje</b> — žádná nová pípnutí. Vyrobila
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
