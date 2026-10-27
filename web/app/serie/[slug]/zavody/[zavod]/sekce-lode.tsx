import Link from "next/link";
import type { UcastLodi } from "@/lib/api";
import { NadpisTridy, TabyTrid, vyberTridu } from "@/app/tridy";

/**
 * Seznam lodí místo výsledků. Regata, která se teprve pojede, jinak nemá
 * co ukázat — a kdo se chystá jet, je to jediné, co je o ní v tu chvíli známo.
 *
 * <b>Startovní listina je ten, kdo startuje</b> (nález R10 oponentury
 * rozhodčího, 28. 10. 2026). Sekce se jmenovala `Lodě` a Filip ji
 * 27. 10. 2026 pojmenoval podle rozhodčího: *„To bude startovní listina"*.
 * Jenže vypisovala i lodě *„čeká na potvrzení"* a *„vyloučená ze závodu"*,
 * takže nadpis <i>Startovní listina</i> nad takovým seznamem by byl ten
 * *„slib naprázdno"*, proti kterému stojí hlavička `lib/co-smim.ts`.
 *
 * <b>Proto jedna sekce a dva seznamy</b>, ne jen jiný nadpis: listina
 * z potvrzených lodí, a pod ní přihlášky, které se teprve potvrzují.
 * Zahodit je nešlo — kapitán, který přihlášku podal, na ní pozná, že
 * dorazila. Miloš je přitom vyjmenoval jako **dvě** položky stránky
 * (*přihlášky* a *startovní listina*), takže rozdělit je i na dva taby
 * zůstává otevřené; to je ale rozhodnutí o návrhu stránky, ne o názvu,
 * a patří Filipovi.
 */
export function PrihlaseneLode({
  lode,
  trida,
  adresa,
  prihlaska,
}: {
  lode: UcastLodi[];
  trida?: string;
  adresa: (trida: string) => string;
  /** Odkaz na veřejnou přihlášku, když se na regatu přihlašuje. */
  prihlaska?: string;
}) {
  // Vypsaná regata bez jediné lodi má aspoň pozvat k přihlášce.
  if (lode.length === 0)
    return prihlaska ? (
      <p className="poznamka">
        <Link href={prihlaska}>Přihlásit loď →</Link>
      </p>
    ) : null;

  // Na listině stojí, kdo startuje. Vyloučená loď ne (rozhodčí ji ze
  // závodu vyndal) a nepotvrzená taky ne — ta je zatím jen přihláška.
  // Starší API pole `potvrzena` nemá; tam loď platí, jako dřív.
  const startuje = (l: UcastLodi) => !l.vyloucena && l.potvrzena !== false;
  const listina = lode.filter(startuje);
  const prihlasky = lode.filter((l) => !startuje(l));

  // Třídy v taby jako u výsledků (Filip, 15. 9. 2026) — seznam lodí na
  // regatě, která se teprve pojede, je jinak stejně dlouhý svitek.
  // Počítají se z listiny: tab třídy, ve které nikdo nestartuje, by
  // ukazoval prázdnou tabulku a loď by zůstala jen v přihláškách pod ní.
  const kategorie = [...new Set(listina.map((l) => l.kategorie))];
  const aktivni = vyberTridu(kategorie, trida);

  return (
    <>
      <h2>Startovní listina</h2>
      <p className="podtitulek tesne">
        {listina.length === 0
          ? "Zatím žádná potvrzená loď"
          : `${listina.length} ${pocitadlo(listina.length)}`}
        {prihlaska && (
          <>
            {" · "}
            <Link href={prihlaska}>Přihlásit loď →</Link>
          </>
        )}
      </p>
      {listina.length > 0 && (
        <>
          <TabyTrid kategorie={kategorie} aktivni={aktivni} adresa={adresa} />
          <NadpisTridy kategorie={kategorie} aktivni={aktivni} />
          <div className="tabulka-sekce">
            <div className="tabulka-obal">
              <table>
                <thead>
                  <tr>
                    <th className="lod">Loď</th>
                    <th className="vlevo">Kormidelník</th>
                  </tr>
                </thead>
                <tbody>
                  {listina
                    .filter((l) => l.kategorie === aktivni)
                    .map((l) => (
                      <tr key={l.lod}>
                        <td className="lod">{l.lod}</td>
                        <td className="vlevo">{l.kormidelnik ?? "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Přihlášky, které na listinu ještě nepatří. Vlastní nadpis, ne
          štítek v řádku listiny: na listině by taková loď lhala o tom,
          že startuje (nález R10, 28. 10. 2026). */}
      {prihlasky.length > 0 && (
        <>
          <h3>Přihlášené, ještě ne na listině</h3>
          <div className="tabulka-sekce">
            <div className="tabulka-obal">
              <table>
                <thead>
                  <tr>
                    <th className="lod">Loď</th>
                    <th className="vlevo">Třída</th>
                  </tr>
                </thead>
                <tbody>
                  {prihlasky.map((l) => (
                    <tr key={l.lod}>
                      <td className="lod">
                        {l.lod}
                        <div className="majitel">
                          {l.vyloucena ? "vyloučená ze závodu" : "čeká na potvrzení"}
                        </div>
                      </td>
                      <td className="vlevo">{l.kategorie}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/** Lodí, nebo lodě — podle počtu, jak se to v češtině skloňuje. */
function pocitadlo(pocet: number) {
  return pocet === 1 ? "loď" : pocet < 5 ? "lodě" : "lodí";
}
