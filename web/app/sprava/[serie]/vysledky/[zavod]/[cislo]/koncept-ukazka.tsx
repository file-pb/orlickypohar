"use client";

import { useEffect, useState } from "react";
import {
  klicKonceptu,
  podleRizika,
  precti,
  radkyKonceptu,
  rozdily,
  type Koncept,
  type Rozdil,
} from "./koncept";

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
 *
 * <b>Dva seznamy, ne jeden.</b> Dřív tu stálo „má navíc tohle" a pod tím
 * obojí dohromady, s radou počítat i s nimi. Jenže řádek, u kterého má
 * uložený zápis jinou hodnotu, nic navíc nenese — může to být čerstvá
 * oprava druhého zapisovatele, a ta rada vedla k jejímu vrácení
 * (reprodukce C12, 8. 10. 2026).
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
  const { chybi, jinak } = podleRizika(rozdily(koncept, ulozene));
  const poradi = radkyKonceptu(koncept).filter((r) => r.poradi != null);

  const vypis = (r: Rozdil) =>
    `${jmeno(r.id)} — ${r.kod ? `kód ${r.kod.toUpperCase()}` : `${r.poradi}. místo`}`;

  return (
    <div className="hlaska" role="status">
      <p>
        <b>V tomhle telefonu leží neodeslaný zápis.</b> Ve snímcích výš není —
        ty jsou ze serveru, tenhle se tam nedostal.
      </p>

      {chybi.length === 0 && jinak.length === 0 && (
        <p>Uložený zápis ho obsahuje celý, takže o nic přijít nejde.</p>
      )}

      {chybi.length > 0 && (
        <>
          <p>
            <b>Tohle uložený zápis vůbec nemá</b> — bez doplnění se to ztratí:
          </p>
          <ul>
            {chybi.map((r) => (
              <li key={r.id}>{vypis(r)}</li>
            ))}
          </ul>
          <p>
            Když sepisuješ společné pořadí, počítej i s nimi —{" "}
            <a href={zapisAdresa}>ve formuláři zápisu</a> je jde doplnit jedním
            klepnutím.
          </p>
        </>
      )}

      {jinak.length > 0 && (
        <>
          <p>
            <b>Tady má uložený zápis něco jiného.</b> Neztrácí se tím nic —
            obě čísla existují a jde o to, které platí:
          </p>
          <ul>
            {jinak.map((r) => (
              <li key={r.id}>
                {vypis(r)} — uložené má jiné
              </li>
            ))}
          </ul>
          <p>
            <b>Mohl to být druhý zapisovatel</b>, který tvůj zápis opravil.
            Přepsat ho čísly z telefonu má smysl jen tehdy, když víš, že platí
            tvoje — jinak tím tu opravu vrátíš zpátky.
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
