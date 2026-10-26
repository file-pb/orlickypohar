"use client";

import { useEffect, useMemo, useState } from "react";
import { MapaTrackeru } from "@/app/mapa-trackeru";
import type { Znacka } from "@/app/nacrt/mapa/plavba";
import type { Poloha } from "@/lib/voda";
import type { PolohaLodi, SnimekPoloh } from "@/lib/polohy";
import { trida, useStopy } from "@/lib/stopy";
import type { ZaznamRozjizdky } from "@/lib/zaznam";
import { azimut, nejblizsiStrana, vzdalenostM } from "@/lib/stavba-prvku";
import { NAZVY_SMERU } from "@/lib/trat";

/**
 * Jak často si obrazovka říká o nový snímek.
 *
 * <b>Pět vteřin, i když telefony posílají po minutě.</b> Dávky z různých
 * lodí nechodí naráz, takže mezi dvěma minutami pořád něco přibývá —
 * a cache na straně API drží odpověď stejně pět vteřin pro všechny, takže
 * víc dotazů do databáze to neudělá.
 */
const OBNOVA_MS = 5_000;

/** Lidsky „před 8 s" / „před 4 min". */
function predJakDlouho(ms: number | null): string {
  if (ms === null) return "zatím nic";
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `před ${s} s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `před ${m} min` : `před ${Math.floor(m / 60)} h ${m % 60} min`;
}

/**
 * Kde loď je, slovy: <b>„1,2 km na jihozápad od startu"</b>.
 *
 * Plán to žádá výslovně (*Tracker běží celý blok na vodě*): odpověď na
 * *„čekáme, nebo startujeme?"* musí být vidět hned, ne až po kliknutí do
 * mapy. Na mapu se pak dá podívat, když je potřeba vědět víc.
 */
function kdeJe(
  lod: { sirka: number | null; delka: number | null },
  start: { sirka: number; delka: number } | null,
): string | null {
  if (lod.sirka === null || lod.delka === null || !start) return null;

  const m = vzdalenostM(start, { sirka: lod.sirka, delka: lod.delka });
  // Do padesáti metrů je rozdíl pod přesností GPS a směr by si vymýšlel
  // stranu podle šumu.
  if (m < 50) return "u startu";

  const kam = NAZVY_SMERU[nejblizsiStrana(azimut(start, { sirka: lod.sirka, delka: lod.delka }))];
  const kolik = m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
  return `${kolik} ${kam}`;
}

const NAZVY_STAVU = {
  Cerstva: "hlásí se",
  Starne: "stárne",
  Nedostupna: "nehlásí se",
} as const;

/**
 * Živá mapa regaty pro pořadatele a rozhodčího.
 *
 * <b>Drží poslední dobrý snímek.</b> Když se obnovení nepovede, zůstane
 * na obrazovce to, co bylo, a jen se u toho napíše, jak je to staré —
 * visí na tom rozhodnutí o odkladu startu a prázdná obrazovka by lhala
 * víc než stará data.
 *
 * <b>Dráhy vznikají skládáním snímků.</b> Server posílá poslední polohu
 * každé lodi; obrazovka si z nich staví stopu sama, takže se nepřenáší
 * nic navíc a mapa přesto kreslí, kudy loď jela.
 */
export function ZiveLode({
  serie,
  zavod,
  znacky,
  trasa,
  spojnice,
  prvni,
  rozjizdky,
}: {
  serie: string;
  zavod: string;
  znacky: Znacka[];
  trasa: Poloha[];
  spojnice: Record<number, Poloha[][]>;
  prvni: SnimekPoloh | null;
  /** Rozjížďky regaty — ze kterých jde vybrat záznam. */
  rozjizdky: { cislo: number; stav: string; startV: string | null }[];
}) {
  const [snimek, setSnimek] = useState<SnimekPoloh | null>(prvni);
  const [chyba, setChyba] = useState(false);
  const [od, setOd] = useState<number | null>(
    prvni ? Date.parse(prvni.oknoOd ?? prvni.ted) : null,
  );
  const lode = useStopy(snimek?.lode ?? null, od);
  // Vzdálenost se měří od startu: „čekáme, nebo startujeme?" je otázka
  // o něm. Bez startovního prvku se sloupec nevypisuje, místo aby se
  // měřilo od náhodné bóje.
  const start = znacky.find((z) => z.typ === "Start") ?? null;

  useEffect(() => {
    let zivy = true;
    async function obnov() {
      try {
        const odpoved = await fetch(`/sprava/${serie}/tracker/${zavod}/snimek`, {
          cache: "no-store",
        });
        if (!odpoved.ok) throw new Error(String(odpoved.status));
        const novy = (await odpoved.json()) as SnimekPoloh;
        if (!zivy) return;
        setSnimek(novy);
        setChyba(false);
        setOd((o) => o ?? Date.parse(novy.oknoOd ?? novy.ted));
      } catch {
        // Výpadek nesmí smazat obrazovku: poslední dobrý snímek zůstává.
        if (zivy) setChyba(true);
      }
    }

    const tik = setInterval(() => void obnov(), OBNOVA_MS);
    void obnov();
    return () => {
      zivy = false;
      clearInterval(tik);
    };
  }, [serie, zavod]);

  const ted = snimek ? Date.parse(snimek.ted) : Date.now();

  /**
   * <b>Živě, nebo záznam</b> (Filip, 26. 10. 2026). Na vodě se rozhoduje
   * podle toho, kde kdo <i>je</i>; nad protestem podle toho, kudy kdo
   * <i>jel</i>. Jsou to dvě otázky a mapa na ně odpovídá jedna, takže se
   * jen přepne čas a zdroj stop — a se záznamem přibude posuvník, kterým
   * se dá vrátit k okamžiku, o kterém se vede spor.
   */
  const [cislo, setCislo] = useState<number | null>(null);
  const [zaznam, setZaznam] = useState<ZaznamRozjizdky | null>(null);
  const [nacitam, setNacitam] = useState(false);

  useEffect(() => {
    if (cislo === null) return;
    let platne = true;
    setNacitam(true);
    setZaznam(null);
    fetch(`/sprava/${serie}/tracker/${zavod}/zaznam/${cislo}`, { cache: "no-store" })
      .then((o) => (o.ok ? (o.json() as Promise<ZaznamRozjizdky>) : null))
      .then((z) => {
        if (platne) setZaznam(z);
      })
      .catch(() => {})
      .finally(() => {
        if (platne) setNacitam(false);
      });
    return () => {
      platne = false;
    };
  }, [serie, zavod, cislo]);

  /**
   * Záznam přepočtený na plavby, jak je kreslí mapa — týž tvar jako živé
   * stopy, takže mapa o záznamu nemusí vědět nic. Čas běží v sekundách od
   * začátku okna záznamu, tedy od startovní procedury.
   */
  const stopyZaznamu = useMemo(() => {
    if (!zaznam?.vydava || !zaznam.od) return [];
    const od = Date.parse(zaznam.od);
    if (!Number.isFinite(od)) return [];
    return zaznam.lode.map((l, i) => ({
      id: l.lodId || -(i + 1),
      nazev: l.nazev,
      kategorie: trida(l.kategorie),
      body: l.body.map((b) => ({
        sirka: b.sirka,
        delka: b.delka,
        cas: Math.max(0, (Date.parse(b.cas) - od) / 1000),
      })),
      dosloDo: l.body.length,
    }));
  }, [zaznam]);

  /** Rozjížďky, u kterých má smysl se ptát na záznam: mají zapsaný start. */
  const kZaznamu = rozjizdky.filter((r) => r.startV);

  return (
    <>
      <p className="tracker-stav">
        {!snimek ? (
          "Polohy se zatím nenačetly."
        ) : !snimek.oknoBezi ? (
          <>
            <strong>Okno regaty neběží.</strong> Tracker smí zaznamenávat od
            rozpravy do uzavření závodního dne — co je na mapě, je poslední,
            co došlo.
          </>
        ) : (
          <>
            Okno běží{chyba ? " · obnovení se nedaří, data jsou starší" : ""}.
          </>
        )}
      </p>

      {kZaznamu.length > 0 && (
        /* <b>Přepínač nad mapou, ne v ní.</b> Mapa je od toho, aby kreslila;
           co se na ní ukazuje, je rozhodnutí stránky. */
        <p className="tracker-rezim">
          <label>
            mapa
            <select
              value={cislo === null ? "zive" : String(cislo)}
              onChange={(e) =>
                setCislo(e.target.value === "zive" ? null : Number(e.target.value))
              }
            >
              <option value="zive">živě</option>
              {kZaznamu.map((r) => (
                <option key={r.cislo} value={r.cislo}>
                  záznam {r.cislo}. rozjížďky
                  {r.stav === "Probiha" ? " (běží)" : ""}
                </option>
              ))}
            </select>
          </label>
          {cislo !== null && (
            <span className="tracker-rezim-popis">
              Posuvníkem se dá vrátit k okamžiku, o kterém se vede spor.
            </span>
          )}
        </p>
      )}

      {cislo !== null ? (
        nacitam ? (
          <p className="tracker-prazdno">Záznam se načítá…</p>
        ) : stopyZaznamu.length > 0 ? (
          <MapaTrackeru
            znacky={znacky}
            lode={stopyZaznamu}
            trasa={trasa}
            spojnice={spojnice}
          />
        ) : (
          <p className="tracker-prazdno">
            Z téhle rozjížďky nepřišla žádná stopa — buď se nikdo nehlásil, nebo
            se záznam nedaří načíst.
          </p>
        )
      ) : lode.length > 0 ? (
        <MapaTrackeru znacky={znacky} lode={lode} trasa={trasa} spojnice={spojnice} zive />
      ) : (
        <p className="tracker-prazdno">
          {snimek?.lode.some((l) => l.sirka !== null)
            ? "Stopa se teprve skládá — mapa naskočí s další dávkou poloh."
            : "Zatím se neozvala žádná loď. Mapa se objeví, jakmile přijde první poloha."}
        </p>
      )}

      <h2>Lodě</h2>
      {/* <b>Posouvá se tabulka, ne stránka.</b> Pět sloupců se na telefon
          nevejde — změřeno 574 px v 375 px — a bez obalu se vodorovně
          posouvala celá obrazovka. Pod výsledky je to horší než tady,
          protože tam se u cíle zapisuje právě na telefonu. */}
      <div className="tabulka-obal">
        <table className="tracker-lode">
          <thead>
            <tr>
              <th>Loď</th>
              <th>Třída</th>
              <th>Kde</th>
              <th>Poslední poloha</th>
              <th>Stav</th>
            </tr>
          </thead>
          <tbody>
            {(snimek?.lode ?? []).map((l) => (
              <Radek key={l.lodId} lod={l} ted={ted} start={start} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/**
 * Jeden řádek přehledu. <b>Odpovídá na „trackuje nám celé pole?"</b>, takže
 * loď, která mlčí, tu musí být vidět — ne chybět.
 */
function Radek({
  lod,
  ted,
  start,
}: {
  lod: PolohaLodi;
  ted: number;
  start: { sirka: number; delka: number } | null;
}) {
  const stari = lod.casGps === null ? null : ted - Date.parse(lod.casGps);
  return (
    <tr className={`tracker-${lod.stav.toLowerCase()}`}>
      <td>
        {lod.lod}
        {lod.cisloPlachty ? <span className="stitek"> {lod.cisloPlachty}</span> : null}
      </td>
      <td>{lod.kategorie ?? "—"}</td>
      <td>{kdeJe(lod, start) ?? "—"}</td>
      <td>{predJakDlouho(stari)}</td>
      <td>{NAZVY_STAVU[lod.stav]}</td>
    </tr>
  );
}
