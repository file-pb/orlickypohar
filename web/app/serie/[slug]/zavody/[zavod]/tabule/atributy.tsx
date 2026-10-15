import type { Snimek } from "@/lib/tabule";

/**
 * Pás s atributy závodu a rozjížďky (Filip, 15. 10. 2026: *„nějakou
 * hezkou grafiku s atributy závodu rozjížďky"*).
 *
 * <b>Čísla velká, popisky malé.</b> Čte se to přes místnost, takže
 * nese hodnotu, ne větu. Co se nedá říct číslem nebo jedním slovem,
 * sem nepatří.
 *
 * <b>Časy rozjížďky tu nejsou</b> — stopky, odpočet a „čeká se na"
 * patří semaforu vedle; dvě místa s týmž údajem by se při obnově
 * rozcházela o vteřiny.
 *
 * <b>Co se nedá zjistit, se vynechá</b> — nepíše se „neuvedeno" ani
 * nula místo chybějící hodnoty. Prázdná dlaždice je lež o tom, že
 * údaj existuje a je nulový.
 */

function Dlazdice({ popis, hodnota, pod }: { popis: string; hodnota: string; pod?: string }) {
  return (
    <div className="dlazdice">
      <b>{hodnota}</b>
      <span>{popis}</span>
      {pod && <i>{pod}</i>}
    </div>
  );
}

const DEN = new Intl.DateTimeFormat("cs", { day: "numeric", month: "numeric" });

export function Atributy({ snimek }: { snimek: Snimek }) {
  const z = snimek.zavod;
  const odjete = snimek.rozjizdky.filter((r) => r.stav === "Dokoncena").length;
  const dny =
    z.datumKonce && z.datumKonce !== z.datum
      ? `${DEN.format(new Date(z.datum))} – ${DEN.format(new Date(z.datumKonce))}`
      : DEN.format(new Date(z.datum));

  return (
    <div className="atributy">
      <Dlazdice popis="termín" hodnota={dny} pod={z.poradatel ?? undefined} />
      {z.typ && <Dlazdice popis="typ závodu" hodnota={z.typ} />}
      <Dlazdice
        popis={snimek.rozjizdky.length === 1 ? "rozjížďka" : "rozjížďky"}
        hodnota={`${odjete}/${snimek.rozjizdky.length}`}
        pod={odjete === snimek.rozjizdky.length ? undefined : "odjeto"}
      />
      <Dlazdice popis="lodí na startu" hodnota={String(snimek.lode.length)} />
      {z.pocetSkrtu > 0 && <Dlazdice popis="škrty" hodnota={String(z.pocetSkrtu)} />}
      {z.koeficientDoSerie !== 1 && (
        <Dlazdice popis="koeficient do poháru" hodnota={`×${z.koeficientDoSerie}`} />
      )}
      {z.prvkyTrati !== null && (
        <Dlazdice
          popis={z.prvkyTrati === 1 ? "prvek trati" : "prvky trati"}
          hodnota={String(z.prvkyTrati)}
          pod={snimek.trat?.cisloRozjizdky ? `pro ${snimek.trat.cisloRozjizdky}. rozjížďku` : undefined}
        />
      )}
    </div>
  );
}
