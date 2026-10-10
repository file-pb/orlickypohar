"use client";

import { useEffect, useState } from "react";
import type { Snimek } from "@/lib/tabule";

/**
 * Tabule, která se obnovuje sama a přežije výpadek.
 *
 * <b>Drží poslední dobrý snímek</b> (plán, *Tabule do hospody*): visí na
 * telce, kterou nikdo neobsluhuje, takže „nedaří se načíst" by znamenalo
 * prázdnou obrazovku až do rána. Když obnovení selže, zůstane to, co
 * bylo, a jen se u toho napíše, jak je to staré.
 *
 * <b>Stáří počítá prohlížeč</b>, ne server. Mikrocache před webem drží
 * odpověď deset vteřin, takže serverem vypsané „před 8 s" by v ní zmrzlo
 * a lhalo o deset vteřin plus dobu vykreslení.
 */
const OBNOVA_MS = 20_000;

export function Obrazovka({
  serie,
  zavod,
  prvni,
}: {
  serie: string;
  zavod: string;
  prvni: Snimek;
}) {
  const [snimek, setSnimek] = useState(prvni);
  const [ted, setTed] = useState(() => Date.now());

  useEffect(() => {
    const adresa = `/serie/${encodeURIComponent(serie)}/zavody/${encodeURIComponent(zavod)}/tabule/data`;

    const nacti = async () => {
      try {
        const odpoved = await fetch(adresa, { cache: "no-store" });
        if (odpoved.ok) setSnimek((await odpoved.json()) as Snimek);
        // Neúspěch se schválně nikam nepíše: tabule drží, co má.
      } catch {
        // Totéž u spadlé sítě.
      }
    };

    const obnova = setInterval(nacti, OBNOVA_MS);
    // Vteřinový tik jen kvůli stáří; data se tahají dvacetkrát méně často.
    const tik = setInterval(() => setTed(Date.now()), 1000);
    return () => {
      clearInterval(obnova);
      clearInterval(tik);
    };
  }, [serie, zavod]);

  const stari = Math.max(0, Math.round((ted - Date.parse(snimek.kdy)) / 1000));

  return (
    <div className="tabule">
      <header>
        <h1>{snimek.nazev}</h1>
        <p className={`stitek stav-${snimek.stav.toLowerCase()}`}>{STAVY[snimek.stav]}</p>
        <p className={stari > 120 ? "stari zastarale" : "stari"}>
          {stari < 60 ? `data před ${stari} s` : `data stará ${Math.round(stari / 60)} min`}
        </p>
      </header>

      {snimek.vysledkySkryte && (
        <p className="hlaska">
          Ročník má výsledky zatím skryté, takže tady čísla nejsou. Tabule
          ukazuje jen to, co je venku — není to cesta okolo.
        </p>
      )}

      <div className="sloupce">
        <section>
          <h2>Rozjížďky</h2>
          {snimek.rozjizdky.length === 0 ? (
            <p className="prazdno">Zatím žádná.</p>
          ) : (
            <ul className="seznam">
              {snimek.rozjizdky.map((r) => (
                <li key={r.cislo}>
                  <b>{r.cislo}.</b>{" "}
                  <span className="stitek">{STAVY_ROZJIZDEK[r.stav]}</span>
                  {!r.doSerie && <span className="stitek">mimo pohár</span>}
                  {r.poradi.length > 0 && (
                    <ol className="dojezd">
                      {r.poradi.map((v, i) => (
                        <li key={i}>
                          <b>{v.misto ?? v.kod ?? "—"}</b> {v.lod}
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2>Průběžné pořadí</h2>
          {snimek.poradi.length === 0 ? (
            <p className="prazdno">Zatím se nejelo.</p>
          ) : (
            <ol className="poradi">
              {snimek.poradi.map((p) => (
                <li key={`${p.lod}-${p.misto}`}>
                  <b>{p.misto}.</b> {p.lod}{" "}
                  <span className="detail">{p.kategorie}</span>
                  <span className="body">{p.body}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section>
          <h2>Na startu ({snimek.lode.length})</h2>
          <ul className="lode">
            {snimek.lode.map((l) => (
              <li key={l.lod}>
                {l.lod} <span className="detail">{l.kormidelnik ?? l.kategorie}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/**
 * Jména stavů. <b>Opsaná z výčtu, ne z hlavy</b> — napsal jsem nejdřív
 * „Dojeta" a na tabuli se vypsalo syrové „Dokoncena", protože takhle se
 * ta hodnota doopravdy jmenuje.
 */
const STAVY: Record<Snimek["stav"], string> = {
  Planovany: "plánováno",
  Vypsany: "vypsáno",
  Odjety: "odjeto",
  Potvrzeny: "potvrzeno",
  Zruseny: "zrušeno",
};

const STAVY_ROZJIZDEK: Record<Snimek["rozjizdky"][number]["stav"], string> = {
  Planovana: "čeká",
  Probiha: "jede se",
  Dokoncena: "dojeto",
  Zrusena: "zrušena",
};
