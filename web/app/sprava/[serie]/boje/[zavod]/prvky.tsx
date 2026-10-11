import type { Boje } from "@/lib/boje";
import { nazevStrany, nazevTypu, type Prvek } from "@/lib/trat";
import { IkonaPrvku } from "@/app/ikona-prvku";
import { smazPrvekAkce } from "./akce";
import { NovyPrvek } from "./novy-prvek";

/**
 * Prvky trati: start, cíl, otočná a průjezdní bóje, brána, odskok
 * a otočná zóna.
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
          Zatím žádné. Bóje samy netvoří trať — teprve prvek řekne, která se
          objíždí, kterou se projíždí a která dvojice tvoří start, bránu
          nebo cíl.
        </p>
      ) : (
        <ul className="seznam-prvku">
          {prvky.map((p) => (
            <li key={p.id}>
              <IkonaPrvku typ={p.typ} strana={p.strana} />
              <span className="poradi-prvku">{p.poradi}.</span>{" "}
              <b>{nazevTypu(p.typ)}</b>{" "}
              <span>
                {p.a.nazev}
                {p.b && ` – ${p.b.nazev}`}
              </span>
              {p.strana && <span className="stitek">{nazevStrany(p.strana)}</span>}
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

      <BojeMimoPrvky prvky={prvky} boje={boje} zamceno={zamceno} />

      {zamceno ? (
        <p className="poznamka">
          Trať je přijatá a zamčená, takže se prvky nemění. Prvek je rozhodnutí
          o trati — platí na něj tentýž zámek jako na pípnutí.
        </p>
      ) : boje.length === 0 ? (
        <p className="poznamka">Nejdřív pípni aspoň jednu bóji, pak z ní bude co složit.</p>
      ) : (
        <NovyPrvek
          serie={serie}
          zavod={zavod}
          boje={boje}
          dalsiPoradi={prvky.length + 1}
        />
      )}
    </section>
  );
}

/**
 * Bóje, která na vodě stojí, ale žádný prvek ji nepoužívá.
 *
 * <b>Ticho je tady past.</b> Pípnutá bóje se pořadateli ukazuje v seznamu
 * „Co stojí na trati", takže vypadá hotově — ale mapka a veřejná stránka
 * kreslí podle prvků, takže se venku neobjeví. Rozdíl mezi „stojí na vodě"
 * a „je součástí trati" nikde jinde vidět není.
 *
 * <para>
 * Neříká se tomu chyba: zbylá bóje po přestavbě nebo bóje k něčemu jinému
 * je legitimní. Jen ať je vidět, že se o ní venku neví.
 * </para>
 */
function BojeMimoPrvky({
  prvky,
  boje,
  zamceno,
}: {
  prvky: Prvek[];
  boje: Boje[];
  zamceno: boolean;
}) {
  // Při prázdném seznamu to už říká prázdný stav výš; dvě hlášky o tomtéž
  // jen zabírají obrazovku.
  if (prvky.length === 0) return null;

  const vPrvcich = new Set(prvky.flatMap((p) => [p.a.id, ...(p.b ? [p.b.id] : [])]));
  const mimo = boje.filter((b) => !vPrvcich.has(b.id));
  if (mimo.length === 0) return null;

  return (
    <p className="hlaska" role="status">
      <b>
        {mimo.length === 1 ? "Jedna bóje stojí mimo trať" : `${mimo.length} bóje stojí mimo trať`}:
      </b>{" "}
      {mimo.map((b) => b.nazev).join(", ")}. Na vodě {mimo.length === 1 ? "je" : "jsou"}, ale
      žádný prvek {mimo.length === 1 ? "ji" : "je"} nepoužívá — na mapce trati a na veřejné
      stránce proto {mimo.length === 1 ? "nebude" : "nebudou"}.{" "}
      {zamceno
        ? "Trať je přijatá, takže se to teď nespraví; pokud to tak být nemá, je to přestavba."
        : mimo.length === 1
          ? "Udělej z ní prvek, nebo ji seber."
          : "Udělej z nich prvky, nebo je seber."}
    </p>
  );
}
