"use client";

import { useEffect, useState } from "react";
import { klicKonceptu, precti, radkyKonceptu, rozdily, type Koncept } from "./koncept";

/**
 * Neodeslaný zápis z telefonu na stránce porovnání.
 *
 * <b>Proč tu je.</b> Porovnání staví vedle sebe snímky ze serveru, jenže
 * klepnutí, které kvůli konfliktu neprošlo, žádný snímek nemá — leží jen
 * v telefonu. Kdo sestavoval společný výsledek podle porovnání, o ně přišel
 * a nic ho na to neupozornilo (vlastní průchod C7, 6. 10. 2026).
 *
 * Klientské kvůli jedinému údaji: úložiště prohlížeče. Server o něm neví
 * a vědět nemůže — a právě proto je to místo, kde se ztrácí práce.
 */
export function KonceptVPorovnani({
  serie,
  zavod,
  cislo,
  jmena,
  ulozene,
  zapisAdresa,
}: {
  serie: string;
  zavod: string;
  cislo: number;
  /** Jména lodí podle čísla přihlášky — koncept si drží jen čísla. */
  jmena: Record<number, string>;
  /** Co je teď uložené na serveru, pro vypsání rozdílů. */
  ulozene: { id: number; poradi: number | null; kod: string | null }[];
  zapisAdresa: string;
}) {
  const [koncept, setKoncept] = useState<Koncept | null>(null);

  useEffect(() => {
    setKoncept(precti(klicKonceptu(serie, zavod, cislo)));
  }, [serie, zavod, cislo]);

  if (!koncept) return null;

  const jmeno = (id: number) => jmena[id] ?? `loď ${id}`;
  const chybejici = rozdily(koncept, ulozene);
  const poradi = radkyKonceptu(koncept).filter((r) => r.poradi != null);

  return (
    <div className="hlaska" role="status">
      <p>
        <b>V tomhle telefonu leží neodeslaný zápis.</b> Ve snímcích výš není —
        ty jsou ze serveru, tenhle se tam nedostal.
      </p>

      {chybejici.length === 0 ? (
        <p>Uložený zápis ho obsahuje celý, takže o nic přijít nejde.</p>
      ) : (
        <>
          <p>Proti uloženému zápisu má navíc tohle:</p>
          <ul>
            {chybejici.map((r) => (
              <li key={r.id}>
                {jmeno(r.id)} —{" "}
                {r.kod
                  ? `kód ${r.kod.toUpperCase()}`
                  : `${r.poradi}. místo`}
                {r.proc === "jinak" && " (uložené má jiné)"}
              </li>
            ))}
          </ul>
          <p>
            Když sepisuješ společné pořadí, počítej i s nimi —{" "}
            <a href={zapisAdresa}>ve formuláři zápisu</a> je jde doplnit jedním
            klepnutím.
          </p>
        </>
      )}

      <details>
        <summary>Celé pořadí z telefonu ({poradi.length} dojetých)</summary>
        <ol>
          {poradi.map((r) => (
            <li key={r.id}>{jmeno(r.id)}</li>
          ))}
        </ol>
      </details>
    </div>
  );
}
