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

/**
 * Skloňování lodí podle počtu. Tabule visí v hospodě a „2 lodí na startu"
 * je první věc, které si tam někdo všimne (24. 10. 2026).
 */
function lodi(kolik: number): string {
  if (kolik === 1) return "loď";
  return kolik >= 2 && kolik <= 4 ? "lodě" : "lodí";
}

export function Atributy({ snimek }: { snimek: Snimek }) {
  const z = snimek.zavod;
  const odjete = snimek.rozjizdky.filter((r) => r.stav === "Dokoncena").length;
  return (
    <div className="atributy">
      {/* <b>Termín ani typ závodu na tabuli nepatří</b> (Filip, 24. 10.
          2026). Kdo stojí před televizí v hospodě, ví, jaké je datum
          a na jaký závod se dívá — jméno má přímo vedle. Místo patří
          číslům, která se během dne mění. */}
      <Dlazdice
        popis={snimek.rozjizdky.length === 1 ? "rozjížďka" : "rozjížďky"}
        hodnota={`${odjete}/${snimek.rozjizdky.length}`}
        pod={odjete === snimek.rozjizdky.length ? undefined : "odjeto"}
      />
      <Dlazdice popis={`${lodi(snimek.lode.length)} na startu`} hodnota={String(snimek.lode.length)} />
      {/* Počet prvků trati, škrty ani koeficient na televizi nepatří
          (Filip, 24. 10. 2026): jsou to pravidla závodu, ne jeho dění.
          Trať je navíc vidět celá na mapě pod tím. Zbývají dvě čísla,
          která se během dne mění. */}
    </div>
  );
}
