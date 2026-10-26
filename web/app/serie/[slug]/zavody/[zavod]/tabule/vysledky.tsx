"use client";

import Link from "next/link";
import { Znak } from "@/app/logo";
import { NazevZavodu } from "@/app/tabule-nazev";
import { ZnakTridy } from "@/app/tridy";
import { Infopanel } from "./infopanel";
import type { Snimek } from "@/lib/tabule";

/**
 * Jak daleko je zápis. <b>Pořadí řady je pořadí jistoty</b>
 * (`Workflow.Rada` v API), takže stačí vzít ten nejméně hotový stav
 * a ten platí pro celou regatu.
 */
const RADA = ["Navrzeno", "Overeno", "Schvaleno", "Potvrzeno"] as const;

const JAK_JISTE: Record<string, string> = {
  Navrzeno: "zapisuje se",
  Overeno: "ověřeno",
  Schvaleno: "schváleno",
  Potvrzeno: "potvrzeno",
  KRevizi: "v revizi",
  Eliminovano: "eliminováno",
};

/**
 * Co tabule ukazuje mezi rozjížďkami a po dojetí regaty.
 *
 * <b>Po dojezdu je nejhorší chvíle, ne nejlepší</b> (Filip, 26. 10.
 * 2026): *„když všichni dojedou, tak chtějí vidět, jak dopadli, ale
 * v tu chvíli organizace maká naplno a upravují se dojezdy, schvalují
 * a uzavírají a počítají se výsledky."* Tabule proto říká **obojí
 * naráz** — kdo vyhrál a jak moc je to jisté. Nehotové pořadí
 * s poctivou cedulkou je lepší než prázdná obrazovka i než hotově
 * vypadající čísla, která se za deset minut změní.
 */
export function Vysledky({
  snimek,
  ted,
  konec,
}: {
  snimek: Snimek;
  ted: number;
  /** Po dojetí regaty, nebo mezi rozjížďkami. Liší se tím, co se čeká. */
  konec: boolean;
}) {
  const odjete = snimek.rozjizdky.filter((r) => r.stav === "Dokoncena");
  const hotovo = odjete.filter((r) => r.stavVysledku === "Potvrzeno").length;

  /**
   * Nejméně hotový stav ze všech odjetých rozjížděk. <b>Platí ten
   * nejslabší</b>: dokud se jedna dopisuje, není potvrzené celé pořadí,
   * i když tři ostatní jsou.
   */
  const nejmene = odjete.reduce<string | null>((nej, r) => {
    const s = r.stavVysledku;
    if (!s) return nej;
    if (!nej) return s;
    const i = RADA.indexOf(s as (typeof RADA)[number]);
    const j = RADA.indexOf(nej as (typeof RADA)[number]);
    if (i === -1) return s;
    return j === -1 || i < j ? s : nej;
  }, null);

  return (
    <section className="tabule-vysledky">
      {/* <b>Stejný vršek jako na startovní listině</b>: vývěska vlevo,
          vpravo blok se značkou a nadpisem (Filip, 26. 10. 2026). Tabule
          se mezi podobami dne přepíná sama a divák u ní nesedí od rána —
          když se vršek pokaždé přeskládá, musí ji každou chvíli číst
          znovu. */}
      <div className="tabule-vysledky-vrch">
        <Infopanel zpravy={snimek.zpravy} ted={ted} />

        <header>
          {/* Značka je i tady cesta zpátky na web — rohový pruh s odkazem
              je v téhle podobě skrytý. */}
          <Link href="/" className="tabule-vysledky-znak" aria-label="Zpět na Orlický pohár">
            <Znak />
          </Link>
          <div className="tabule-vysledky-popis">
        {/* <b>V nadpisu stojí jméno regaty</b> (Filip, 26. 10. 2026:
            *„to má mít název regaty"*). Tabule visí celý den a divák, co
            přijde v půlce, musí poznat, čí pořadí čte — „Průběžné pořadí"
            samo o sobě neříká, jestli je to Izolepa, nebo jarní vítr.
            Stejně to má startovní listina, takže se vršek mezi podobami
            dne nepřeskládá. */}
        <h1>
          <NazevZavodu text={snimek.nazev} zarovnani="vlevo" />
        </h1>
        <p className="tabule-vysledky-stav">
          {konec ? "Konečné pořadí" : "Průběžné pořadí"}
          {" · "}
          {snimek.vysledkySkryte ? (
            <>pořadí se počítá, rozhodčí ho zatím nezveřejnil</>
          ) : (
            <>
              odjeto {odjete.length}{" "}
              {odjete.length === 1 ? "rozjížďka" : odjete.length < 5 ? "rozjížďky" : "rozjížděk"}
              {nejmene && <> · {JAK_JISTE[nejmene] ?? nejmene}</>}
              {hotovo < odjete.length && (
                <> · {hotovo} z {odjete.length} potvrzeno</>
              )}
            </>
          )}
        </p>
        {/* <b>Dokud se zapisuje, musí to být vidět nahlas.</b> Předběžné
            pořadí, které vypadá jako hotové, je horší než žádné. */}
        {!snimek.vysledkySkryte && nejmene !== "Potvrzeno" && (
          <p className="tabule-vysledky-varovani">
            {konec
              ? "Pořadí ještě není potvrzené — dojezdy se dopisují a schvalují."
              : "Předběžné pořadí; čísla se ještě mohou změnit."}
          </p>
        )}
          </div>
        </header>
      </div>

      {snimek.vysledkySkryte || snimek.tabule.length === 0 ? (
        <p className="prazdno">
          {snimek.vysledkySkryte ? "Až to rozhodčí pustí ven, objeví se to tady." : "Zatím se nejelo."}
        </p>
      ) : (
        <div className="tabule-vysledky-tridy">
          {snimek.tabule.map((t) => (
            <div key={t.kategorie} className="tabule-vysledky-trida">
              <h2>
                <ZnakTridy nazev={t.kategorie} />
                {t.kategorie === "Celkem" ? "Celkem" : t.kategorie}
              </h2>
              <ol>
                {t.lode.map((l) => (
                  <li key={l.lod}>
                    <b>{l.misto}.</b>
                    <span className="lod">{l.lod}</span>
                    <span className="body">{l.body}</span>
                  </li>
                ))}
                {/* Zbytek pole patří pod poslední loď, ne na konec
                    sloupce — jako `<p>` za seznamem ho `1fr` odsunulo
                    dolů a text visel sám uprostřed prázdna. */}
                {t.dalsich > 0 && <li className="dalsi">a další {t.dalsich}</li>}
              </ol>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
