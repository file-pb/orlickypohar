"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
 * Kolik lodí se do sloupce třídy vejde, než se změří doopravdy.
 *
 * <b>Číslo neví nic o tom, kolik je na obrazovce místa</b> — a právě to
 * byla vada: dvanáct řádků se při delší vývěsce nevešlo, sloupec přetekl
 * pod běžící pásy tříd a řádek „a další N" se nevypsal, protože z pohledu
 * kódu se vešly všechny. Změřeno 26. 10. 2026 na okně 1280 × 720: poslední
 * loď třídy Nad7m končila na 606 px, pásy začínají na 587, a při čtyřech
 * zprávách na vývěsce zmizely dvě lodě z dvanácti úplně.
 *
 * Zůstává tu jen jako hodnota pro první vykreslení, než se změří skutečná
 * výška řádku; od té chvíle rozhoduje místo, ne číslo.
 */
const NEJVIC_V_TRIDE = 12;

/**
 * Kolik řádků se vejde mezi seznam a pásy tříd.
 *
 * <b>Měří se řádek, ne odhaduje</b>: výška řádku jde z `--tv`, tedy
 * z menšího rozměru obrazovky, a text se na úzkém okně zalomí. `mez` je
 * vrch pásů, které jsou přišpendlené k oknu — tu zná jen `Obrazovka`
 * a posílá ji sem.
 */
function useKolikSeVejde(mez: number, zavisle: unknown) {
  const mrizka = useRef<HTMLDivElement>(null);
  const [kolik, setKolik] = useState<number | null>(null);

  useEffect(() => {
    const mer = () => {
      const seznam = mrizka.current?.querySelector("ul");
      const radek = seznam?.querySelector("li");
      if (!seznam || !radek || mez <= 0) return;

      const vyskaRadku = radek.getBoundingClientRect().height;
      if (vyskaRadku <= 0) return;

      const misto = mez - seznam.getBoundingClientRect().top;
      const vejde = Math.max(1, Math.floor(misto / vyskaRadku));
      setKolik((p) => (p === vejde ? p : vejde));
    };

    mer();
    // Sloupce se nemusí změnit velikostí, ale posunout — vývěska nad nimi
    // roste během dne. Proto se měří i při každé nové podobě snímku.
    const sleduj = new ResizeObserver(mer);
    if (mrizka.current) sleduj.observe(mrizka.current);
    sleduj.observe(document.documentElement);
    return () => sleduj.disconnect();
  }, [mez, zavisle]);

  return { kolik, mrizka };
}

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

export function Teaser({
  snimek,
  ted,
  mez,
}: {
  snimek: Snimek;
  ted: number;
  /**
   * Kde končí plocha pro obsah — vrch běžících pásů tříd. Měří ji
   * `Obrazovka`: pásy jsou přišpendlené k oknu, takže z toho, co je nad
   * nimi, jejich poloha neplyne.
   */
  mez: number;
}) {
  const hodiny = casomira(snimek, ted);
  const trid = [...new Set(snimek.lode.map((l) => l.kategorie))];
  const { kolik, mrizka } = useKolikSeVejde(mez, snimek);
  /**
   * <b>Dokud se neměřilo, platí odhad.</b> První vykreslení žádné
   * rozměry nemá a prázdný sloupec by na vteřinu probliknul.
   */
  const strop = kolik ?? NEJVIC_V_TRIDE;
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
          {/* <b>Značka je cesta zpátky na web</b> (Filip, 15. 10. 2026:
              *„tam stačí jen hlavní logo, na které když se klepne, tak
              jsme na stránkách"*). Když se hlavička přestěhovala sem,
              zůstal odkaz v původním rohovém pruhu, který je skrytý —
              a klepnutí přestalo fungovat (Filip, 26. 10. 2026). */}
          <Link
            href="/"
            className="tabule-teaser-znak"
            aria-label="Zpět na Orlický pohár"
          >
            <Znak />
          </Link>
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
          <div className="tabule-teaser-tridy" ref={mrizka}>
            {trid.map((t) => {
              const lode = snimek.lode.filter((l) => l.kategorie === t);
              // <b>Řádek „a další N" taky zabírá řádek.</b> Když se pole
              // nevejde celé, ubere se jedno místo na něj — jinak by ho
              // vytlačil ven právě ten výpis, který má o přetečení říct.
              const vejde =
                lode.length > strop ? lode.slice(0, Math.max(1, strop - 1)) : lode;
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
