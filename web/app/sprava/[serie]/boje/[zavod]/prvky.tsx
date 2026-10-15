import type { Boje } from "@/lib/boje";
import {
  NAZVY_DRUHU_STARTU,
  NAZVY_SMERU,
  NAZVY_STRAN,
  POZNAMKA_NEJVIC,
  SMERY,
  dvaBody,
  nazevStrany,
  nazevTypu,
  stranaPatri,
  type DruhStartu,
  type Prvek,
  type StranaPrvku,
} from "@/lib/trat";
import { IkonaPrvku } from "@/app/ikona-prvku";
import { ZnakVRadku } from "@/app/znak-boje";
import { StitekBoku } from "@/app/stitek-boku";
import { ZavriMimo } from "@/app/zavri-mimo";
import { ZnackaNaTrati } from "./znacka-na-trati";
import {
  odeberPrvekAkce,
  presunPrvekAkce,
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
              {/* <b>Řádek sám je výběr na mapce</b> (Filip, 12. 10. 2026:
                  *„Vybraný řádek Prvků trati se vyznačí na mapce — využije
                  se funkce v mapce a není potřeba tam mít na to tlačítko"*).
                  Je to odkaz na kotvu prvku: `:target` z ní v mapce udělá
                  obroučku a prohlížeč k ní odroluje. Žádný javascript,
                  a dá se poslat odkazem. Dřív tu vedle řádku visel ještě
                  odkaz „v mapce" — tlačítko navíc za něco, co umí řádek. */}
              {/* <b>Celý řádek je `summary`</b> (Filip, 15. 10. 2026:
                  *„klepnutím na řádek… se detail zavře"* a *„doprava
                  v řádku bude to tlačítko náhled fotky, když bude,
                  a detail"*). Dřív byl řádek odkaz na mapku a rozklápěcí
                  tlačítko viselo pod ním; odkaz na mapku se přestěhoval do
                  detailu, protože dvě různé reakce na klepnutí do téhož
                  řádku se neuhodnou.

                  Akordeon dělá `name` na `details` sám, bez javascriptu.
                  `ZavriMimo` k tomu přidává zavření klepnutím jinam
                  a Escapem. */}
              <details className="prvek" name="prvek-trati" open={otevrit === p.id}>
                <ZavriMimo />
                <summary className="shrnuti-prvku">
                  <IkonaPrvku typ={p.typ} strana={p.strana} />
                  {/* Značka vedle tvaru (Filip, 15. 10. 2026): tvar říká,
                      co to je za prvek, značka jak to vypadá na vodě. */}
                  <ZnackyPrvku prvek={p} boje={boje} />
                  <span className="poradi-prvku">{p.poradi}</span>
                  <b>{nazevTypu(p.typ)}</b>
                  <span className="znacky">
                    {p.a.nazev}
                    {p.b && ` – ${p.b.nazev}`}
                  </span>
                  <StitekBoku typ={p.typ} strana={p.strana} />
                  {p.poznamka && <span className="jak-to-jet">{p.poznamka}</span>}
                  <span className="vpravo">
                    <NahledFotky prvek={p} boje={boje} />
                    <span className="rozbalit" aria-hidden="true">
                      {zamceno ? "Detail" : "Upravit"}
                    </span>
                  </span>
                </summary>

                <DetailPrvku
                  serie={serie}
                  zavod={zavod}
                  prvek={p}
                  prvky={prvky}
                  boje={boje}
                  zamceno={zamceno}
                  prvni={i === 0}
                  posledni={i === prvky.length - 1}
                />
              </details>
            </li>
          ))}
        </ul>
      )}

      <BojeMimoPrvky
        serie={serie}
        zavod={zavod}
        prvky={prvky}
        boje={boje}
        zamceno={zamceno}
      />

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
  prvky,
  boje,
  zamceno,
  prvni,
  posledni,
}: {
  serie: string;
  zavod: string;
  prvek: Prvek;
  prvky: Prvek[];
  boje: Boje[];
  zamceno: boolean;
  prvni: boolean;
  posledni: boolean;
}) {
  const znacky = (
    <Znacky serie={serie} zavod={zavod} prvek={prvek} prvky={prvky} boje={boje} zamceno={zamceno} />
  );

  if (zamceno) {
    return (
      <div className="detail-prvku">
        <p className="poznamka">
          Trať je přijatá, takže se prvek nemění. Na změnu je přestavba.
        </p>
        {znacky}
      </div>
    );
  }

  const skryte = (
    <>
      <input type="hidden" name="serie" value={serie} />
      <input type="hidden" name="zavod" value={zavod} />
      <input type="hidden" name="prvek" value={prvek.id} />
    </>
  );

  // Kolikrát se týmiž značkami projíždí. Rozhoduje to o tom, co udělá
  // „Odebrat": u jediného průjezdu se značky seberou i z vody, u druhého
  // zmizí jen ten průjezd.
  // Kolikrát se týmiž značkami projíždí. Rozhoduje to o tom, co udělá
  // „Odebrat": u jediného průjezdu se značky seberou i z vody, u druhého
  // zmizí jen ten průjezd.
  const prujezdu = prvky.filter(
    (p) => p.a.id === prvek.a.id && (p.b?.id ?? null) === (prvek.b?.id ?? null),
  ).length;

  return (
    <div className="detail-prvku">
      {/* <b>Akce navrch</b> (Filip, 15. 10. 2026: *„ty tlačítka projet
          jinak, nahoru, dolu a smazat dej hned navrch detailu"*). Dřív
          visely pod formulářem, takže se k nim muselo projít přes pole,
          která člověk měnit nechtěl. */}
      {/* Odkaz na mapku se sem přestěhoval z řádku: ten je teď `summary`
          a klepnutí do něj patří rozbalení. `:target` v mapce prvek
          obkrouží a prohlížeč k němu odroluje — žádný javascript. */}
      <p className="poznamka">
        <a href={`#prvek-${prvek.id}`}>Ukázat v mapce ↓</a>
      </p>

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

        {/* <b>Jedno tlačítko místo dvojice</b> (Filip tamtéž: *„Sebrat
            z vody a smazat prvek je stejné pro uživatele"*). Co udělá, se
            řekne rovnou na něm — rozdíl mezi „zmizí i z vody" a „zůstane,
            protože se tudy jede dvakrát" se nedá uhodnout z ničeho na
            obrazovce. */}
        <form action={odeberPrvekAkce}>
          {skryte}
          <button type="submit" className="nebezpecne">
            {prujezdu > 1 ? "Odebrat tenhle průjezd" : "Odebrat z trati i z vody"}
          </button>
        </form>
      </div>

      {/* <b>Dva taby místo jednoho dlouhého sloupce</b> (Filip, 15. 10.
          2026: *„aby toho nebylo na stránce moc najednou"*). Dělí se to
          podle toho, co se mění: kde ta věc stojí (Umístění), a jak se
          kolem ní jede (Typ prvku).

          Bez javascriptu, dvěma přepínači a CSS. `details` by z toho
          udělalo akordeon, kde jdou otevřít oba naráz — a to je zase ten
          dlouhý sloupec, kvůli kterému se taby dělaly. Přepínače musí
          v značce stát před panely, aby na ně šlo dosáhnout `~`. */}
      <div className="prvek-taby">
        <input
          type="radio"
          name={`tab-prvku-${prvek.id}`}
          id={`tab-${prvek.id}-umisteni`}
          defaultChecked
        />
        <input type="radio" name={`tab-prvku-${prvek.id}`} id={`tab-${prvek.id}-typ`} />

        <div className="zalozky">
          <label htmlFor={`tab-${prvek.id}-umisteni`}>Umístění</label>
          <label htmlFor={`tab-${prvek.id}-typ`}>Typ prvku</label>
        </div>

        <section className="panel">{znacky}</section>

        <section className="panel">
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
                Vidí to pořadatel i závodník. Na delší vysvětlení je plachetní
                směrnice.
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

            {/* <b>Směr má start i cíl</b>, protože obojí je linie a mapka
                u obou kreslí šipku. Pole tu navíc být musí: `upravPrvekAkce`
                čte `smer` z formuláře vždycky, takže bez něj by uložení
                poznámky u cíle šipku nenápadně smazalo. */}
            {(prvek.typ === "Start" || prvek.typ === "Cil") && (
              <label>
                {prvek.typ === "Start" ? "Startuje se" : "Proplouvá se"}
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
            )}

            {/* Druh vytyčení je jen startu: cíl se neotevírá za startovací lodí. */}
            {prvek.typ === "Start" && (
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
            )}

            <div className="tlacitka">
              <button type="submit">Uložit</button>
            </div>
          </form>

          <p className="poznamka">
            <b>Projet to znovu jinak</b> přidá na konec trati další průjezd
            týchž značek. Fyzika prvku je už daná, takže se u nového dopisuje
            jen to, jak se jede.
          </p>
        </section>
      </div>
    </div>
  );
}

/**
 * Značky, ze kterých je prvek složený — a co se s nimi dá udělat
 * (Filip, 11. 10. 2026: *„až v detailu dej možnost takové editace, přidat
 * fotku, sebrat z vody nebo přenastavit"*). Dřív se za tím muselo scrollovat
 * pod mapku a hledat tutéž bóji podle jména.
 *
 * <b>Je to tatáž komponenta jako v seznamu pod mapkou</b>, ne druhá
 * podobná: fotka nahraná odsud i odtamtud je tatáž fotka u téže bóje.
 *
 * <b>Když značku používá víc prvků, řekne se to.</b> Sebrání je údaj
 * o bóji, ne o prvku — bóje je buď ve vodě, nebo ne. Ze seznamu by to
 * vypadalo, že se seznam týká jen tohohle průjezdu, a to je přesně ta
 * záměna, kvůli které prvky vznikly.
 */
function Znacky({
  serie,
  zavod,
  prvek,
  prvky,
  boje,
  zamceno,
}: {
  serie: string;
  zavod: string;
  prvek: Prvek;
  prvky: Prvek[];
  boje: Boje[];
  zamceno: boolean;
}) {
  const konce = [prvek.a, ...(prvek.b ? [prvek.b] : [])];
  const nalezene = konce
    .map((k) => boje.find((b) => b.id === k.id))
    .filter((b): b is Boje => b !== undefined);
  if (nalezene.length === 0) return null;

  return (
    <div className="znacky-prvku">
      <h3>{nalezene.length === 1 ? "Značka prvku" : "Značky prvku"}</h3>

      {/* <b>U dvou značek se ukazuje jedna</b> (Filip, 15. 10. 2026:
          *„v případě dvojznačkového dej přepínač toho, jestli editujeme
          levou, nebo pravou stranu, aby toho nebylo na stránce moc
          najednou"*). Obě pod sebou znamenaly dvě sady fotek, souřadnic
          a odkazů naráz — a pořadatel mění vždycky jen jednu.

          Přepínač nese <b>jména těch značek</b>, ne „levá" a „pravá":
          v seznamu i na mapě se jmenují „start levobok" a „start
          pravobok", takže jména jsou to jediné, co sedí na obojí. */}
      {nalezene.length === 2 && (
        <div className="volba-znacky">
          {nalezene.map((b, i) => (
            <span key={b.id}>
              <input
                type="radio"
                name={`znacka-prvku-${prvek.id}`}
                id={`znacka-${prvek.id}-${b.id}`}
                defaultChecked={i === 0}
              />
              <label htmlFor={`znacka-${prvek.id}-${b.id}`}>{b.nazev}</label>
            </span>
          ))}
        </div>
      )}

      <ul className={`seznam${nalezene.length === 2 ? " jen-vybrana" : ""}`}>
        {nalezene.map((b) => {
          const jinde = prvky.filter(
            (p) => p.id !== prvek.id && (p.a.id === b.id || p.b?.id === b.id),
          );
          return (
            <li key={b.id}>
              {/* Bez sebrání: to je o kus níž nad celým prvkem. */}
              <ZnackaNaTrati
                boje={b}
                serie={serie}
                zavod={zavod}
                zamceno={zamceno}
                bezSebrani
              />
              {jinde.length > 0 && (
                <p className="poznamka">
                  Tatáž značka je i v prvku{" "}
                  {jinde.map((p) => `${p.poradi}. ${nazevTypu(p.typ)}`).join(", ")}. Sebrání
                  a přenastavení platí pro všechny — bóje je buď ve vodě, nebo ne.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {/* <b>„Sebrat z vody" tady bývalo</b> a od 15. 10. 2026 není
          (Filip: *„Sebrat z vody i s tím panelem odstraň"*). Prvek se
          odebírá jedním tlačítkem nahoře, které bóje sebere samo —
          dvě tlačítka na dvou místech nutila rozmýšlet rozdíl mezi
          zápisem o trati a zápisem o bóji. */}
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
  // Při prázdném seznamu to už říká prázdný stav výš; dvě hlášky o tomtéž
  // jen zabírají obrazovku.
  if (prvky.length === 0) return null;

  const vPrvcich = new Set(prvky.flatMap((p) => [p.a.id, ...(p.b ? [p.b.id] : [])]));
  const mimo = boje.filter((b) => !vPrvcich.has(b.id));
  if (mimo.length === 0) return null;

  return (
    <div className="boje-mimo">
      <p className="hlaska" role="status">
        <b>
          {mimo.length === 1
            ? "Jedna bóje stojí mimo trať"
            : `${mimo.length} bóje stojí mimo trať`}
          :
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

      {/* <b>A tady je to místo, kde se to dá udělat.</b> Dokud byl pod
          mapkou seznam všech bójí, vedla k takové bóji cesta přes něj;
          ten seznam je od 12. 10. 2026 pryč jako zbytečný (Filip:
          *„pod mapkou je stále seznam prvků trati a ten je
          zbytečný/matoucí"*). Bez tohohle by zbyla rada bez místa, kde ji
          splnit — a zrovna bóje mimo prvky žádný detail prvku nemá. */}
      <details className="jine-boje">
        <summary>
          {mimo.length === 1 ? "Ukázat tu bóji" : `Ukázat ty ${mimo.length} bóje`}
        </summary>
        <ul className="seznam">
          {mimo.map((b) => (
            <li key={b.id}>
              <ZnackaNaTrati boje={b} serie={serie} zavod={zavod} zamceno={zamceno} />
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

/**
 * Značky prvku v řádku — jak vypadají na vodě.
 *
 * <b>Barvu a tvar nese bóje, ne konec prvku</b>, takže se dohledávají
 * v seznamu bójí podle id. Rozšiřovat kvůli tomu `KonecBojeDto` by
 * znamenalo vozit tytéž údaje dvakrát.
 */
function ZnackyPrvku({ prvek, boje }: { prvek: Prvek; boje: Boje[] }) {
  const konce = [prvek.a, ...(prvek.b ? [prvek.b] : [])]
    .map((k) => boje.find((b) => b.id === k.id))
    .filter((b): b is Boje => b !== undefined);
  if (konce.length === 0) return null;

  return (
    <span className="znaky-prvku">
      {konce.map((b) => (
        <ZnakVRadku key={b.id} barva={b.barva} tvar={b.tvar} znaceni={b.znaceni} />
      ))}
    </span>
  );
}

/**
 * Náhled fotky vpravo v řádku, <b>když nějaká je</b> (Filip, 15. 10.
 * 2026). Bere první fotku kterékoli značky prvku: v řádku jde o to, že
 * fotka existuje, ne která to je — vybírat se dá v detailu.
 */
function NahledFotky({ prvek, boje }: { prvek: Prvek; boje: Boje[] }) {
  const fotka = [prvek.a, ...(prvek.b ? [prvek.b] : [])]
    .map((k) => boje.find((b) => b.id === k.id))
    .flatMap((b) => b?.fotky ?? [])[0];
  if (!fotka) return null;

  return (
    <img
      className="nahled-fotky"
      src={fotka.nahled}
      alt=""
      width={32}
      height={24}
      loading="lazy"
    />
  );
}
