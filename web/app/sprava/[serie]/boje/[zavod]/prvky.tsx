import type { Boje } from "@/lib/boje";
import {
  NAZVY_STRAN,
  NAZVY_TYPU,
  POZNAMKA_NEJVIC,
  type Prvek,
  type TypPrvku,
} from "@/lib/trat";
import { prvekAkce, smazPrvekAkce } from "./akce";

/**
 * Prvky trati: čára, brána, odskok a značka.
 *
 * <b>Tohle je to, co mapce chybělo.</b> Dokud prvek neexistoval, dvě bóje
 * tvořící start žily jen v hlavě pořadatele a v názvu („start levý",
 * „start pravý"), takže mapka kreslila start jako nohu trati.
 *
 * <b>Ikonka u každého prvku je tentýž tvar, jaký je na mapě</b> (Filip,
 * 9. 10. 2026: *„ať je to veselejší a přehlednější"*). Seznam a mapa tím
 * mluví stejně — kdo si zvykne na tvar v seznamu, pozná ho na vodě na
 * obrázku.
 */
export function PrvkyTrati({
  serie,
  zavod,
  prvky,
  boje,
  zamceno,
}: {
  serie: string;
  zavod: string;
  prvky: Prvek[];
  boje: Boje[];
  zamceno: boolean;
}) {
  return (
    <section className="prvky-trati" aria-labelledby="prvky-nadpis">
      <h2 id="prvky-nadpis">Prvky trati</h2>

      {prvky.length === 0 ? (
        <p className="prazdno">
          Zatím žádné. Bóje samy netvoří trať — teprve prvek řekne, co je
          značka a co dvojice tvořící start, bránu nebo cíl.
        </p>
      ) : (
        <ul className="seznam-prvku">
          {prvky.map((p) => (
            <li key={p.id}>
              <IkonaPrvku typ={p.typ} strana={p.strana} />
              <span className="poradi-prvku">{p.poradi}.</span>{" "}
              <b>{NAZVY_TYPU[p.typ]}</b>{" "}
              <span>
                {p.a.nazev}
                {p.b && ` – ${p.b.nazev}`}
                {p.bodB && ` – ${p.bodB.popis}`}
              </span>
              {p.strana && <span className="stitek">{NAZVY_STRAN[p.strana]}</span>}
              {p.poznamka && <p className="poznamka">{p.poznamka}</p>}
              {!zamceno && (
                <form action={smazPrvekAkce} className="formular radkove">
                  <input type="hidden" name="serie" value={serie} />
                  <input type="hidden" name="zavod" value={zavod} />
                  <input type="hidden" name="prvek" value={p.id} />
                  <button type="submit">Smazat prvek</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {zamceno ? (
        <p className="poznamka">
          Trať je přijatá a zamčená, takže se prvky nemění. Prvek je rozhodnutí
          o trati — platí na něj tentýž zámek jako na pípnutí.
        </p>
      ) : boje.length === 0 ? (
        <p className="poznamka">Nejdřív pípni aspoň jednu bóji, pak z ní bude co složit.</p>
      ) : (
        <form action={prvekAkce} className="formular">
          <input type="hidden" name="serie" value={serie} />
          <input type="hidden" name="zavod" value={zavod} />

          <label>
            Co to je
            <select name="typ" required defaultValue="Znacka">
              {(Object.keys(NAZVY_TYPU) as TypPrvku[]).map((t) => (
                <option key={t} value={t}>
                  {NAZVY_TYPU[t]}
                </option>
              ))}
            </select>
          </label>

          <label>
            Pořadí v trati
            <input name="poradi" type="number" min={1} defaultValue={prvky.length + 1} required />
            <span className="poznamka">
              Smí se opakovat — trať, která jede tutéž bóji dvakrát, to potřebuje.
            </span>
          </label>

          <label>
            První konec
            <select name="bojeA" required defaultValue="">
              <option value="" disabled>
                Vyber bóji
              </option>
              {boje.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nazev}
                </option>
              ))}
            </select>
          </label>

          <label>
            Druhý konec
            <select name="bojeB" defaultValue="">
              <option value="">žádný (značka), nebo bod níž</option>
              {boje.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nazev}
                </option>
              ))}
            </select>
            <span className="poznamka">
              Konec čáry nemusí být bóje — start se běžně vytyčí mezi bójí
              a plavidlem komise. Pak nech prázdné a vyplň bod.
            </span>
          </label>

          <label>
            Bod místo druhé bóje — čím je
            <input name="bodPopis" maxLength={60} placeholder="plavidlo komise" />
          </label>
          <label>
            Jeho poloha
            <input name="bodSirka" placeholder="49.5163" inputMode="decimal" />
          </label>
          <label>
            {/* Dvě pole schválně: jedno pole „49.5163, 14.1651" vypadá
                pohodlněji, ale rozpadne se na prvním desetinném čárkovém
                zápisu a nikdo nepozná proč. */}
            <span className="skryte">Zeměpisná délka bodu</span>
            <input name="bodDelka" placeholder="14.1651" inputMode="decimal" />
          </label>

          <label>
            Strana
            <select name="strana" defaultValue="">
              <option value="">neuvedeno</option>
              <option value="PoLeve">ponechat po levé</option>
              <option value="PoPrave">ponechat po pravé</option>
            </select>
            <span className="poznamka">
              Jen u značky a odskoku. U brány si stranu volí loď, u čáry
              rozhoduje směr průjezdu.
            </span>
          </label>

          <label>
            Jak to jet
            <input
              name="poznamka"
              maxLength={POZNAMKA_NEJVIC}
              placeholder="projíždí se po proudu"
            />
            <span className="poznamka">
              Vidí to pořadatel i závodník. Na delší vysvětlení je plachetní směrnice.
            </span>
          </label>

          <button type="submit">Přidat prvek</button>
        </form>
      )}
    </section>
  );
}

/**
 * Tvar prvku. Tentýž jazyk jako na mapě: kolečko je konec, plná úsečka
 * mezi dvěma konci je čára nebo brána, obloučky ukazují stranu.
 */
function IkonaPrvku({ typ, strana }: { typ: TypPrvku; strana: Prvek["strana"] }) {
  const vlevo = strana === "PoLeve";

  return (
    <svg
      className="ikona-prvku"
      viewBox="0 0 32 20"
      width="32"
      height="20"
      role="img"
      aria-label={NAZVY_TYPU[typ]}
    >
      {typ !== "Znacka" && (
        <line x1="6" y1="10" x2="26" y2="10" stroke="currentColor" strokeWidth="2" />
      )}
      {typ === "Znacka" ? (
        <>
          <circle cx="16" cy="10" r="4" fill="currentColor" />
          {strana && (
            <path
              d={vlevo ? "M 9 4 A 7 7 0 0 0 9 16" : "M 23 4 A 7 7 0 0 1 23 16"}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
          )}
        </>
      ) : (
        <>
          <circle cx="6" cy="10" r="4" fill="currentColor" />
          <circle cx="26" cy="10" r="4" fill="currentColor" />
          {/* Start a cíl mají navíc písmeno: tytéž dvě polohy můžou být
              ráno start a odpoledne cíl, takže tvar sám je nerozliší. */}
          {(typ === "CaraStart" || typ === "CaraCil") && (
            <text x="16" y="7" textAnchor="middle" fontSize="8" fill="currentColor">
              {typ === "CaraStart" ? "S" : "C"}
            </text>
          )}
          {typ === "Odskok" && strana && (
            <path
              d={vlevo ? "M 2 5 A 5 5 0 0 0 2 15" : "M 30 5 A 5 5 0 0 1 30 15"}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
          )}
        </>
      )}
    </svg>
  );
}
