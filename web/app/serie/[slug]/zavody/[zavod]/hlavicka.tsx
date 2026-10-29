import Link from "next/link";
import type { ZavodDetail } from "@/lib/api";
import { Stav } from "@/app/stav";
import { datum } from "@/app/datum";
import { maObsah } from "@/app/medailonek";
import type { Polozka } from "@/lib/co-smim";

/** Název regaty, stav, termín a pořadatel — to, co platí v každé sekci. */
export function Hlavicka({
  zavod,
  akce,
}: {
  zavod: ZavodDetail;
  /** Komunitní akce: štítky stavu mluví jinak a pohár se jí netýká. */
  akce: boolean;
}) {
  return (
    <>
      <h1>
        <span className={zavod.stav === "Zruseny" ? "skrtnute" : undefined}>{zavod.nazev}</span>{" "}
        <Stav stav={zavod.stav} akce={akce} />
      </h1>
      <p className="podtitulek">
        {akce && "Komunitní akce · "}
        {datum(zavod.datum, zavod.datumKonce)}
        {zavod.poradatel &&
          (maObsah(zavod.medailonek) ? (
            // Jméno vede na medailonek níž na stránce — tam je web i kontakt.
            <>
              {" · pořádá "}
              <a href="#poradatel">{zavod.poradatel}</a>
            </>
          ) : (
            ` · pořádá ${zavod.poradatel}`
          ))}
        {/* Přesun není vlastní stav — přesunutá regata je pořád plánovaná,
            jen jindy. Termín, na který se lidé chystali, ale nemá smysl
            zahodit. */}
        {zavod.puvodniDatum && (
          <span className="presun"> · přesunuto z {datum(zavod.puvodniDatum)}</span>
        )}
      </p>
    </>
  );
}

/**
 * Cesta do správy rovnou z veřejné stránky (Filip, 9. 10. 2026: „klidně ať
 * do správy mohu ze zastávky, když na to mám práva"). Veřejná stránka regaty
 * je místo, kde pořadatel stejně stojí — a dřív z ní do jeho práce nevedlo
 * nic, muselo se přes nabídku účtu a rozcestník.
 *
 * Na cache to nemá vliv: mikrocache před webem pouští požadavek s cookie
 * sezení mimo cache (`deploy/cache/default.conf`, mapa `$sezeni`), takže se
 * tenhle rámeček nemůže uložit a vydat někomu jinému.
 */
export function DoSpravy({
  serie,
  zavod,
  prace,
}: {
  serie: string;
  zavod: string;
  /** Co s touhle regatou smí, podle `lib/co-smim.ts`. Prázdné: jen role v ročníku. */
  prace: Polozka[];
}) {
  // <b>Štítek, ne pruh s výčtem</b> (Filip, 29. 10. 2026: „tohle je po
  // sjednocení designu asi zbytečné, maximálně tag za drobečky"). Do té doby
  // tu stál celý řádek „Tuhle regatu spravuješ: výsledky → přihlášky →
  // směrnice → trať → polohy → vše k regatě" — sedm odkazů, které vznikly
  // proto, že se jinudy do správy regaty nedalo dostat. Od chvíle, kdy mají
  // obě strany webu tytéž dlaždice a stránka regaty ve správě je nese taky,
  // stačí jediná cesta tam a zbytek si pořadatel najde na ní.
  const kam = prace.length > 0 ? `/sprava/${serie}/zavod/${zavod}` : `/sprava/${serie}`;

  return (
    <p className="do-spravy">
      <Link className="stitek" href={kam}>
        {prace.length > 0 ? "Spravuješ tuhle regatu" : "Máš roli v ročníku"} →
      </Link>
    </p>
  );
}
