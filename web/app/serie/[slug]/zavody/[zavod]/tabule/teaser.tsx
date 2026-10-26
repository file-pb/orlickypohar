"use client";

import { NazevZavodu } from "@/app/tabule-nazev";
import { ZnakTridy } from "@/app/tridy";
import { casomira } from "@/lib/rozjizdky-tabule";
import type { Snimek } from "@/lib/tabule";

/**
 * Co tabule ukazuje, dokud není co kreslit na mapu.
 *
 * <b>Komponenta má být vidět od začátku</b> (Filip, 26. 10. 2026:
 * *„tracker jsem chtěl zobrazovat ihned, ale pokud nemá být vidět mapa,
 * tak alespoň teaser se seznamem přihlášených lodí"*). Mapa bez trati
 * a bez poloh neukazuje nic; prázdná plocha na televizi vypadá jako
 * porucha.
 *
 * <b>Žádná vymyšlená data.</b> Do 26. 10. tu místo toho jezdily ukázkové
 * plavby, aby bylo co promítat. Byl to zástup s cedulkou, ale pořád
 * zástup — a seznam lodí, které se opravdu přihlásily, řekne divákovi
 * v hospodě víc než simulace cizí regaty.
 */
/**
 * Kolik lodí se vejde do sloupce třídy.
 *
 * Tabule je plocha na dálku, takže seznam má strop — ale divák musí
 * vědět, že pokračuje, jinak pole patnácti lodí vypadá jako pole dvanácti
 * (totéž poučení jako u karuselu pořadí, 15. 10. 2026).
 */
const NEJVIC_V_TRIDE = 12;

export function Teaser({ snimek, ted }: { snimek: Snimek; ted: number }) {
  const hodiny = casomira(snimek, ted);
  const trid = [...new Set(snimek.lode.map((l) => l.kategorie))];
  const jede = snimek.rozjizdky.some((r) => r.stav === "Probiha");
  const odjeto = snimek.rozjizdky.filter((r) => r.stav === "Dokoncena").length;

  return (
    <section className="tabule-teaser">
      <header>
        <h1>
          <NazevZavodu text={snimek.nazev} />
        </h1>
        <p className="tabule-teaser-stav">
          {jede
            ? "Rozjížďka běží — na mapu se lodě objeví, jakmile začnou hlásit polohu."
            : hodiny
              ? hodiny.text
              : odjeto > 0
                ? `Odjeto ${odjeto} ${odjeto === 1 ? "rozjížďka" : odjeto < 5 ? "rozjížďky" : "rozjížděk"}`
                : "Čeká se na rozpravu"}
        </p>
      </header>

      {snimek.lode.length === 0 ? (
        <p className="prazdno">Na tuhle regatu se zatím nikdo nepřihlásil.</p>
      ) : (
        <>
          <p className="tabule-teaser-pocet">
            {snimek.lode.length}{" "}
            {snimek.lode.length === 1 ? "přihlášená loď" : snimek.lode.length < 5 ? "přihlášené lodě" : "přihlášených lodí"}
          </p>
          <div className="tabule-teaser-tridy">
            {trid.map((t) => {
              const lode = snimek.lode.filter((l) => l.kategorie === t);
              const vejde = lode.slice(0, NEJVIC_V_TRIDE);
              const dalsich = lode.length - vejde.length;
              return (
                <div key={t} className="tabule-teaser-trida">
                  <h2>
                    <ZnakTridy nazev={t} />
                    {t}
                    <span className="detail">{lode.length}</span>
                  </h2>
                  <ul>
                    {vejde.map((l) => (
                      <li key={l.lod} className={l.potvrzena ? undefined : "nepotvrzena"}>
                        <b>{l.lod}</b>
                        {l.kormidelnik && <span className="detail">{l.kormidelnik}</span>}
                        {/* <b>Kolik telefonů loď sleduje</b> (Filip, 26. 10.
                            2026: *„chtěl jsem, aby bylo vidět, jestli tu loď
                            dobře trackujeme"*). Nula je to důležité číslo —
                            říká, že z téhle lodi nepřijde nic —, a proto je
                            vidět, kdežto jedničku nemá cenu hlásit: tak to má
                            být. Dvojka a víc znamená zálohu na palubě. */}
                        {l.telefonu === 0 ? (
                          <span className="bez-telefonu" title="nesleduje se">
                            bez telefonu
                          </span>
                        ) : l.telefonu > 1 ? (
                          <span className="telefonu" title="spárované telefony">
                            {l.telefonu}×
                          </span>
                        ) : null}
                      </li>
                    ))}
                    {dalsich > 0 && (
                      <li className="dalsich">a další {dalsich}</li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
