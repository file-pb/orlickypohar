"use client";

import { Znak } from "@/app/logo";
import { NazevZavodu } from "@/app/tabule-nazev";
import { ZnakTridy } from "@/app/tridy";
import { Infopanel } from "./infopanel";
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

/**
 * Telefony lodi jako <b>kostičky</b>, ne číslo (Filip, 26. 10. 2026:
 * *„místo textu 2× bych zobrazil kostičky, s indikací stavu baterie"*).
 * Jedna kostička na telefon se přes místnost přečte rychleji než číslovka
 * — a je to místo, kam se vejde baterie, jakmile ji appka začne posílat:
 * kostička se bude plnit odspodu.
 *
 * <b>Žádná kostička nestačí.</b> Loď bez telefonu musí říct nahlas, že
 * z ní nepřijde nic, jinak by vypadala stejně jako ta, u které se údaj
 * nenačetl.
 */
function Telefony({ pocet, baterie }: { pocet: number; baterie: (number | null)[] }) {
  if (pocet <= 0)
    return (
      <span className="bez-telefonu" title="nesleduje se">
        bez telefonu
      </span>
    );

  return (
    <span
      className="telefonu"
      title={[
        `${pocet} ${pocet === 1 ? "telefon" : pocet < 5 ? "telefony" : "telefonů"} na palubě`,
        baterie.some((b) => b !== null)
          ? `baterie ${baterie.map((b) => (b === null ? "?" : `${b} %`)).join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join(" — ")}
    >
      {Array.from({ length: Math.min(pocet, 4) }, (_, i) => {
        const stav = baterie[i] ?? null;
        return (
          <i
            key={i}
            className={`telefon-kosticka${stav === null ? " bez-stavu" : stav <= 15 ? " doslo" : stav <= 40 ? " dochazi" : ""}`}
            style={stav === null ? undefined : ({ "--baterie": `${stav}%` } as React.CSSProperties)}
            aria-hidden="true"
          />
        );
      })}
      {pocet > 4 && <span className="detail">+{pocet - 4}</span>}
    </span>
  );
}

export function Teaser({ snimek, ted }: { snimek: Snimek; ted: number }) {
  const hodiny = casomira(snimek, ted);
  const trid = [...new Set(snimek.lode.map((l) => l.kategorie))];
  const jede = snimek.rozjizdky.some((r) => r.stav === "Probiha");
  const odjeto = snimek.rozjizdky.filter((r) => r.stav === "Dokoncena").length;

  return (
    <section className="tabule-teaser">
      {/* <b>Vývěska vlevo odshora, hlavička se značkou vpravo</b> (Filip,
          26. 10. 2026: *„nadpis doprava, trochu ho zmenšit a pod něj
          status, logo pošli k tomu — tím by se uvolnil hořejšek pro
          Vydáno k regatě už odshora a netlačil by na seznam
          přihlášených lodí"*). Jméno regaty je na tabuli to nejméně
          překvapivé: kdo se dívá, ví, kde je. */}
      <div className="tabule-teaser-vrch">
        <Infopanel zpravy={snimek.zpravy} ted={ted} />

        {/* <b>Značka patří k nadpisu, ne do rohu</b> (Filip, 26. 10.
            2026: *„ber to jako blok a zleva k tomu dej to logo a vystřeď
            to"*). Je proto uvnitř hlavičky — v rohu by se s ní musel
            název srovnávat přes absolutní souřadnice a při každé změně
            velikosti znovu. */}
        <header>
          <span className="tabule-teaser-znak" aria-hidden="true">
            <Znak />
          </span>
          <div className="tabule-teaser-popis">
          <h1>
            <NazevZavodu text={snimek.nazev} zarovnani="vlevo" />
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
          </div>
        </header>
      </div>

      {snimek.lode.length === 0 ? (
        <p className="prazdno">Na tuhle regatu se zatím nikdo nepřihlásil.</p>
      ) : (
        <section className="tabule-teaser-listina">
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
                        <Telefony pocet={l.telefonu} baterie={l.baterie} />
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
        </section>
      )}
    </section>
  );
}
