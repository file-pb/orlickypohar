import type { Boje } from "@/lib/boje";
import {
  NAZVY_DRUHU_STARTU,
  NAZVY_SMERU,
  NAZVY_STRAN,
  POZNAMKA_NEJVIC,
  SMERY,
  nazevStrany,
  nazevTypu,
  stranaPatri,
  type DruhStartu,
  type Prvek,
  type StranaPrvku,
} from "@/lib/trat";
import { IkonaPrvku } from "@/app/ikona-prvku";
import {
  presunPrvekAkce,
  smazPrvekAkce,
  upravPrvekAkce,
  zopakujPrvekAkce,
} from "./akce";

/**
 * Prvky trati: start, cíl, otočná a průjezdní bóje, brána, odskok
 * a otočná zóna.
 *
 * <b>Tohle je to, co mapce chybělo.</b> Dokud prvek neexistoval, dvě bóje
 * tvořící start žily jen v hlavě pořadatele a v názvu („start levý",
 * „start pravý"), takže mapka kreslila start jako nohu trati.
 *
 * <b>Seznam, ne formulář</b> (Filip, 11. 10. 2026: *„čekal bych, že zde
 * bude list umístěných prvků, které třeba budu moci posouvat jako prvky
 * trasy v navigaci… ten list by mohl být kompaktní a vpravo by mohla být
 * možnost rozbalit detail a upravit"*). Řádek je jedna věta: tvar, číslo,
 * co to je a kterou značkou. Všechno ostatní — úprava předpisu, posun,
 * opakovaný průjezd, smazání — je až v detailu, který se rozklepne.
 *
 * <b>Ikonka je tentýž tvar, jaký je na mapě</b> (Filip, 9. 10. 2026:
 * *„ať je to veselejší a přehlednější"*), a odkaz „na mapě" skočí na
 * tutéž značku dole v mapce a obkrouží ji. Seznam a mapa tím mluví
 * stejně.
 *
 * <b>Prvek se tu nezakládá.</b> Od #208 to dělá průvodce „Postavit
 * prvek" výš na stránce; starý formulář pod seznamem tu zůstal a Filip
 * dvakrát hlásil, že neví, co edituje. Dvě cesty k témuž nejsou výběr,
 * jen nejistota.
 */
export function PrvkyTrati({
  serie,
  zavod,
  prvky,
  boje,
  zamceno,
  otevrit,
}: {
  serie: string;
  zavod: string;
  prvky: Prvek[];
  boje: Boje[];
  zamceno: boolean;
  /** Který detail má být po návratu z akce rozbalený. */
  otevrit?: number;
}) {
  return (
    <section className="prvky-trati" aria-labelledby="prvky-nadpis">
      <h2 id="prvky-nadpis">Prvky trati</h2>

      {prvky.length === 0 ? (
        <p className="prazdno">
          Zatím žádné. Bóje samy netvoří trať — teprve prvek řekne, která se
          objíždí, kterou se projíždí a která dvojice tvoří start, bránu
          nebo cíl. Postav ho průvodcem výš.
        </p>
      ) : (
        <ul className="seznam-prvku">
          {prvky.map((p, i) => (
            <li key={p.id}>
              <details className="prvek" open={otevrit === p.id}>
                <summary>
                  <IkonaPrvku typ={p.typ} strana={p.strana} />
                  <span className="poradi-prvku">{p.poradi}.</span>
                  <b>{nazevTypu(p.typ)}</b>
                  <span className="znacky">
                    {p.a.nazev}
                    {p.b && ` – ${p.b.nazev}`}
                  </span>
                  {p.strana && <span className="stitek">{nazevStrany(p.strana)}</span>}
                  {p.poznamka && <span className="jak-to-jet">{p.poznamka}</span>}
                </summary>

                <DetailPrvku
                  serie={serie}
                  zavod={zavod}
                  prvek={p}
                  zamceno={zamceno}
                  prvni={i === 0}
                  posledni={i === prvky.length - 1}
                />
              </details>

              {/* Mimo `summary`: odkaz uvnitř něj by zároveň rozklepl detail.
                  A „v mapce", ne „na mapě" — tak se o kus níž jmenuje odkaz
                  do OpenStreetMap a byly by to dvě různé věci stejně. */}
              <a className="na-mape" href={`#prvek-${p.id}`}>
                v mapce
              </a>
            </li>
          ))}
        </ul>
      )}

      <BojeMimoPrvky prvky={prvky} boje={boje} zamceno={zamceno} />

      {zamceno && (
        <p className="poznamka">
          Trať je přijatá a zamčená, takže se prvky nemění. Prvek je rozhodnutí
          o trati — platí na něj tentýž zámek jako na pípnutí.
        </p>
      )}
    </section>
  );
}

/**
 * Detail prvku: <b>co se tu dá měnit, je jen předpis</b>. Jak to jet,
 * kterým bokem, kterým směrem se startuje — tedy to, co se rozhoduje až
 * na vodě. Které značky prvek tvoří a jakého je typu, se nemění: to je
 * jeho fyzika a stavěla se průvodcem.
 */
function DetailPrvku({
  serie,
  zavod,
  prvek,
  zamceno,
  prvni,
  posledni,
}: {
  serie: string;
  zavod: string;
  prvek: Prvek;
  zamceno: boolean;
  prvni: boolean;
  posledni: boolean;
}) {
  if (zamceno) {
    return (
      <p className="poznamka">
        Trať je přijatá, takže se prvek nemění. Na změnu je přestavba.
      </p>
    );
  }

  const skryte = (
    <>
      <input type="hidden" name="serie" value={serie} />
      <input type="hidden" name="zavod" value={zavod} />
      <input type="hidden" name="prvek" value={prvek.id} />
    </>
  );

  return (
    <div className="detail-prvku">
      <form action={upravPrvekAkce} className="formular">
        {skryte}

        <label>
          Jak to jet
          <input
            name="poznamka"
            defaultValue={prvek.poznamka ?? ""}
            maxLength={POZNAMKA_NEJVIC}
            placeholder="po proudu, pozor na mělčinu"
          />
          <span className="poznamka">
            Vidí to pořadatel i závodník. Na delší vysvětlení je plachetní směrnice.
          </span>
        </label>

        {stranaPatri(prvek.typ) && (
          <label>
            Kterým bokem se ponechává
            <select name="strana" defaultValue={prvek.strana ?? ""}>
              <option value="">neuvedeno</option>
              {(Object.keys(NAZVY_STRAN) as NonNullable<StranaPrvku>[]).map((s) => (
                <option key={s} value={s}>
                  {NAZVY_STRAN[s]}
                </option>
              ))}
            </select>
          </label>
        )}

        {prvek.typ === "Start" && (
          <>
            <label>
              Startuje se
              <select name="smer" defaultValue={prvek.smer ?? ""}>
                <option value="">neuvedeno</option>
                {SMERY.map((s) => (
                  <option key={s} value={s}>
                    {NAZVY_SMERU[s]}
                  </option>
                ))}
              </select>
              <span className="poznamka">
                Podle toho mapka nakreslí šipku průjezdu. Bez směru ji kreslit
                nemůže — vymyslela by si ho.
              </span>
            </label>

            <label>
              Čím je start vytyčený
              <select name="druhStartu" defaultValue={prvek.druhStartu ?? "PevnaLinie"}>
                {(Object.keys(NAZVY_DRUHU_STARTU) as NonNullable<DruhStartu>[]).map((d) => (
                  <option key={d} value={d}>
                    {NAZVY_DRUHU_STARTU[d]}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        <div className="tlacitka">
          <button type="submit">Uložit</button>
        </div>
      </form>

      <div className="akce-prvku">
        <form action={zopakujPrvekAkce}>
          {skryte}
          <button type="submit">Projet to znovu jinak</button>
        </form>

        <form action={presunPrvekAkce}>
          {skryte}
          <input type="hidden" name="smer" value="nahoru" />
          <button type="submit" disabled={prvni}>
            Posunout nahoru
          </button>
        </form>

        <form action={presunPrvekAkce}>
          {skryte}
          <input type="hidden" name="smer" value="dolu" />
          <button type="submit" disabled={posledni}>
            Posunout dolů
          </button>
        </form>

        <form action={smazPrvekAkce}>
          {skryte}
          <button type="submit" className="nebezpecne">
            Smazat prvek
          </button>
        </form>
      </div>

      <p className="poznamka">
        <b>Projet to znovu jinak</b> přidá na konec trati další průjezd týchž
        značek. Fyzika prvku je už daná, takže se u nového dopisuje jen to,
        jak se jede.
      </p>
    </div>
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
