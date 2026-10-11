import Link from "next/link";
import type { ZavodDetail } from "@/lib/api";

// `Record` nad celým výčtem schválně, stejně jako u stavů v `app/stav.tsx`:
// nové vyhodnocení v modelu tak shodí překlad webu, ne až prázdné místo
// v tabulce pravidel.
const VYHODNOCENI: Record<ZavodDetail["vyhodnoceni"], string> = {
  CelePole: "celé pole dohromady",
  Oboje: "celé pole i kategorie",
  PoKategoriich: "po kategoriích",
};

/**
 * Pravidla se vydávají kvůli tomu, aby šlo výsledky zkontrolovat. Bez
 * výsledků nemají co doprovázet — a „Do poháru" by muselo buď prozradit
 * počet rozjížděk, nebo tvrdit, že se žádná nejela.
 */
export function SekcePravidla({ zavod, serie }: { zavod: ZavodDetail; serie: string }) {
  const doSerie = zavod.rozjizdky.filter((r) => r.doSerie).length;

  return (
    <>
      <h2>Pravidla závodu</h2>
      <dl className="pravidla">
        <dt>Vyhodnocení</dt>
        <dd>{VYHODNOCENI[zavod.vyhodnoceni]}</dd>
        <dt>Škrty</dt>
        <dd>{zavod.pocetSkrtu === 0 ? "žádné" : `nejhorších ${zavod.pocetSkrtu}`}</dd>
        <dt>Do poháru</dt>
        <dd>
          {zavod.rozjizdky.length === 0
            ? "zatím se nejela žádná rozjížďka"
            : `${doSerie} z ${zavod.rozjizdky.length} rozjížděk`}
          {zavod.koeficientDoSerie !== 1 && `, koeficient ${zavod.koeficientDoSerie}`}
        </dd>
      </dl>
      <p className="poznamka">
        Vítěz závodu má jeden bod. Do průběžného pořadí seriálu jde pořadí v kategorii,
        ne tenhle součet —{" "}
        <Link href={`/serie/${serie}/poradi`}>průběžné pořadí je vedle</Link>.
      </p>
    </>
  );
}
