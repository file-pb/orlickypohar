import Link from "next/link";
import { NAZVY_ZDROJU, type Boje } from "@/lib/boje";
import { okamzik } from "@/app/datum";
import { ZnakVRadku } from "@/app/znak-boje";
import { nahrajFotkuAkce, odeberFotkuAkce, seberAkce } from "./akce";

/** Pět desetinných míst je na metr — víc by jen dělalo řádek delší. */
const souradnice = (b: Boje) => `${b.sirka.toFixed(5)}, ${b.delka.toFixed(5)}`;

/**
 * Jedna značka na trati: čím je, odkud je její poloha, fotky a co se s ní
 * dá udělat — vyfotit, sebrat z vody, přenastavit.
 *
 * <b>Vlastní soubor, protože se kreslí na dvou místech</b>: v seznamu
 * „Co stojí na trati" pod mapkou a od 11. 10. 2026 i v detailu prvku
 * (Filip: *„až v detailu dej možnost takové editace, přidat fotku,
 * sebrat z vody nebo přenastavit"*). Je to tatáž komponenta, ne dvě
 * podobné — kdyby se rozešly, dělalo by totéž tlačítko na dvou místech
 * něco jiného.
 *
 * <b>Proč zůstává i pod mapkou:</b> bóje, kterou žádný prvek nepoužívá,
 * žádný detail prvku nemá. A právě na ni upozorňuje hláška „stojí mimo
 * trať" — byla by to rada bez místa, kde ji splnit.
 */
export function ZnackaNaTrati({
  boje,
  serie,
  zavod,
  zamceno,
}: {
  boje: Boje;
  serie: string;
  zavod: string;
  zamceno: boolean;
}) {
  return (
    <>
      <span className="stitek">{boje.poradi}.</span>{" "}
      {/* Značka u jména: na vodě se bóje hledá podle toho, jak vypadá,
          ne podle pořadí v seznamu. */}
      <ZnakVRadku barva={boje.barva} tvar={boje.tvar} znaceni={boje.znaceni} />
      <span>{boje.nazev}</span>{" "}
      <Puvod boje={boje} />

      <p className="poznamka">
        {/* Přenastavení u zamčené trati mizí taky: vede na formulář
            pípnutí, který tam v tu chvíli není. */}
        {!zamceno && (
          <>
            <Link href={`/sprava/${serie}/boje/${zavod}?prenastav=${boje.id}`}>
              Přenastavit
            </Link>{" "}
            ·{" "}
          </>
        )}
        {/* Kde přesně ta jedna bóje leží. Mapu web nevkládá, odkazuje na ni —
            stejné pravidlo jako u medailonku pořadatele. */}
        <a
          href={`https://www.openstreetmap.org/?mlat=${boje.sirka}&mlon=${boje.delka}#map=17/${boje.sirka}/${boje.delka}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Ukázat na mapě
        </a>
      </p>

      {boje.fotky.length > 0 && (
        <p className="fotky-boje">
          {boje.fotky.map((f) => (
            <span key={f.id} className="fotka">
              <a href={f.velky} target="_blank" rel="noopener noreferrer">
                <img src={f.nahled} alt={f.popis ?? `Bóje ${boje.nazev}`} width={120} height={90} />
              </a>
              <form action={odeberFotkuAkce}>
                <input type="hidden" name="serie" value={serie} />
                <input type="hidden" name="zavod" value={zavod} />
                <input type="hidden" name="boje" value={boje.id} />
                <input type="hidden" name="fotka" value={f.id} />
                <button type="submit" className="maly">Odebrat</button>
              </form>
            </span>
          ))}
        </p>
      )}

      {/* Fotek může být víc: jedna zblízka neukáže, co je za bójí na
          břehu. Obyčejný formulář — fotit umí `capture` sám a u stolu se
          stejně vybírá ze souborů. */}
      <form action={nahrajFotkuAkce} className="formular radkove">
        <input type="hidden" name="serie" value={serie} />
        <input type="hidden" name="zavod" value={zavod} />
        <input type="hidden" name="boje" value={boje.id} />
        <label>
          {boje.fotky.length === 0 ? "Vyfotit bóji" : "Přidat další fotku"}
          <input type="file" name="soubor" accept="image/*" capture="environment" required />
        </label>
        <button type="submit">Nahrát fotku</button>
      </form>

      {/* Sebrání nepotřebuje polohu, takže ani javascript. U zamčené trati
          mizí ze stejného důvodu jako pípnutí: API by ho odmítlo a člověk by
          se to dozvěděl až z chyby. Fotka zůstává — je to doklad k poloze,
          ne změna trati. */}
      {!zamceno && (
        <form action={seberAkce} className="formular">
          <input type="hidden" name="serie" value={serie} />
          <input type="hidden" name="zavod" value={zavod} />
          <input type="hidden" name="boje" value={boje.id} />
          <button type="submit">Sebrat z vody</button>
        </form>
      )}
    </>
  );
}

/**
 * Odkud ta poloha je. <b>Přesnost hlásí jen telefon</b>, takže u bodu
 * z mapy se místo čísla řekne, že se odečetl — prázdné místo by vypadalo
 * jako telefon, který přesnost neumí.
 */
export function Puvod({ boje }: { boje: Boje }) {
  const zdroj = boje.zdroj ?? "Telefon";

  return (
    <span className="detail">
      {souradnice(boje)}
      {zdroj === "Telefon"
        ? boje.presnostM !== null
          ? ` · přesnost ${Math.round(boje.presnostM)} m`
          : " · přesnost telefon nehlásil"
        : ` · ${NAZVY_ZDROJU[zdroj]}, neměřeno`}
      {` · ${okamzik(boje.postavenaV)}`}
      {boje.postavil && ` · zapsal ${boje.postavil}`}
    </span>
  );
}
