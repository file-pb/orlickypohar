import type { ZavodDetail } from "@/lib/api";
import { datumClanku } from "@/app/datum";

type Smernice = NonNullable<ZavodDetail["smernice"]>[number];

/** Jeden řádek vývěsky: na co odkazuje, v jaké verzi a odkdy visí. */
function Radek({ s }: { s: Smernice }) {
  return (
    <>
      <a href={s.adresa} target="_blank" rel="noopener noreferrer">
        {s.nazev}
      </a>{" "}
      <span className="stitek">verze {s.verze}</span>
      <span className="detail">
        {datumClanku(s.vyveseneV)}
        {s.poznamka && ` · ${s.poznamka}`}
      </span>
    </>
  );
}

/**
 * Plachetní směrnice: dokument, podle kterého se jede, a appka i web jsou
 * oficiální vývěska (plán, oddíl *Appka je oficiální vývěska*). Starší verze
 * zůstávají k nahlédnutí — co bylo vyvěšené, musí jít doložit.
 */
export function SekceSmernice({ smernice }: { smernice?: ZavodDetail["smernice"] }) {
  if (!smernice || smernice.length === 0) return null;

  const [platna, ...starsi] = smernice;

  return (
    <section className="smernice">
      <h2>Plachetní směrnice</h2>
      <p>
        <a href={platna.adresa} target="_blank" rel="noopener noreferrer">
          {platna.nazev}
        </a>{" "}
        <span className="stitek">verze {platna.verze}</span>
        <span className="detail">
          {" vyvěšeno "}
          {datumClanku(platna.vyveseneV)}
          {platna.poznamka && ` · ${platna.poznamka}`}
        </span>
      </p>
      {starsi.length > 0 && (
        <details>
          <summary>Starší verze ({starsi.length})</summary>
          <ul className="seznam">
            {starsi.map((s) => (
              <li key={s.verze}>
                <Radek s={s} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
