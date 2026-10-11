import Link from "next/link";
import type { UcastLodi } from "@/lib/api";
import { NadpisTridy, TabyTrid, vyberTridu } from "@/app/tridy";

/**
 * Seznam lodí místo výsledků. Regata, která se teprve pojede, jinak nemá
 * co ukázat — a kdo se chystá jet, je to jediné, co je o ní v tu chvíli známo.
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

  // Třídy v taby jako u výsledků (Filip, 15. 9. 2026) — seznam lodí na
  // regatě, která se teprve pojede, je jinak stejně dlouhý svitek.
  const kategorie = [...new Set(lode.map((l) => l.kategorie))];
  const aktivni = vyberTridu(kategorie, trida);

  return (
    <>
      <h2>Přihlášené lodě</h2>
      <p className="podtitulek tesne">
        {lode.length} {lode.length === 1 ? "loď" : lode.length < 5 ? "lodě" : "lodí"}
        {prihlaska && (
          <>
            {" · "}
            <Link href={prihlaska}>Přihlásit loď →</Link>
          </>
        )}
      </p>
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
              {lode
                .filter((l) => l.kategorie === aktivni)
                .map((l) => (
                  <tr key={l.lod}>
                    <td className="lod">
                      {l.lod}
                      {/* Přihlášená, ale nepotvrzená: pořadatel o ní ví,
                          jistá ještě není. Starší API pole nemá — pak platí. */}
                      {l.vyloucena ? (
                        <div className="majitel">vyloučená ze závodu</div>
                      ) : (
                        l.potvrzena === false && <div className="majitel">čeká na potvrzení</div>
                      )}
                    </td>
                    <td className="vlevo">{l.kormidelnik ?? "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
