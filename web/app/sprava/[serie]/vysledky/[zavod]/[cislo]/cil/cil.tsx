"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
// Jen typy: hodnoty z lib/vysledky by do prohlížeče zatáhly i čtení tokenu.
import type { KodVysledku, ZapisLod, ZapisRadek, ZapisRozjizdky } from "@/lib/vysledky";
import { odstartujAkce, ulozCilAkce } from "./akce";

/**
 * Klepací část cílové obrazovky.
 *
 * <b>Pořadí dojezdu je pořadí v seznamu</b>, přes všechny kategorie, tak
 * jak lodě projíždějí cílem. Body se počítají po kategoriích z relativního
 * pořadí, takže se číslovat po kategoriích nemusí.
 *
 * <b>Čas patří místu v pořadí, ne lodi.</b> Klepnutí zachytí okamžik, kdy
 * něco projelo cílem. Když se dvě lodě prohodí, prohodí se jména, ale časy
 * zůstanou u míst — tak to bylo na vodě.
 *
 * <b>Ukládá se po každé změně celá sada</b>, stejně jako ve formuláři:
 * co v zápisu není, výsledek nemá. Klepnutí během ukládání se nezahodí —
 * po doběhnutí se pošle nejnovější stav.
 */

/** Kódy, které se dávají po dojezdu (PLAN.md). DNC a RDG patří k papíru. */
const KODY_PO_DOJEZDU: KodVysledku[] = ["Dnf", "Ret", "Dns", "Ocs", "Dsq"];

type Dojezd = { id: number; v: string | null };
type Ukladani = "ulozeno" | "ukladam" | "chyba";

export function Cil({
  serie,
  zavod,
  zapis,
  popisyKodu,
}: {
  serie: string;
  zavod: string;
  zapis: ZapisRozjizdky;
  /** `KODY` z lib/vysledky; posílá je serverová stránka. */
  popisyKodu: Record<KodVysledku, string>;
}) {
  const lode = new Map(zapis.lode.map((l) => [l.prihlaskaId, l]));

  const [start, setStart] = useState<string | null>(zapis.startV ?? null);
  const [dojeti, setDojeti] = useState<Dojezd[]>(() =>
    zapis.lode
      .filter((l) => l.poradiVCili != null)
      .sort((a, b) => a.poradiVCili! - b.poradiVCili!)
      .map((l) => ({ id: l.prihlaskaId, v: l.dojezdV ?? null })),
  );
  const [kody, setKody] = useState<Record<number, KodVysledku>>(() =>
    Object.fromEntries(zapis.lode.filter((l) => l.kod).map((l) => [l.prihlaskaId, l.kod!])),
  );
  const [ukladani, setUkladani] = useState<Ukladani>("ulozeno");
  const [chyba, setChyba] = useState<string | null>(null);

  // Nejnovější stav pro ukládání. Stav Reactu by ve smyčce níž byl ten
  // z doby, kdy ukládání začalo.
  const posledni = useRef({ dojeti, kody });
  const bezi = useRef(false);
  const znovu = useRef(false);

  const uloz = useCallback(async () => {
    if (bezi.current) {
      znovu.current = true;
      return;
    }
    bezi.current = true;
    setUkladani("ukladam");

    let hlaska: string | null = null;
    do {
      znovu.current = false;
      const { dojeti, kody } = posledni.current;
      try {
        hlaska = (await ulozCilAkce(serie, zavod, zapis.cislo, radky(dojeti, kody))).chyba;
      } catch {
        hlaska = "Spojení se nepodařilo.";
      }
    } while (znovu.current);

    bezi.current = false;
    setChyba(hlaska);
    setUkladani(hlaska ? "chyba" : "ulozeno");
  }, [serie, zavod, zapis.cislo]);

  const zmen = (noveDojeti: Dojezd[], noveKody: Record<number, KodVysledku>) => {
    posledni.current = { dojeti: noveDojeti, kody: noveKody };
    setDojeti(noveDojeti);
    setKody(noveKody);
    void uloz();
  };

  // Neuložené klepnutí nesmí zmizet s omylem zavřenou kartou.
  useEffect(() => {
    if (ukladani === "ulozeno") return;
    const varuj = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", varuj);
    return () => window.removeEventListener("beforeunload", varuj);
  }, [ukladani]);

  // Stav se bere z vlastností jen při připojení. Tlačítko Zpět ale umí
  // stránku obnovit z mezipaměti routeru, se zápisem z doby, kdy se odešlo
  // — a první klepnutí by pak odeslalo celou starou sadu a novější výsledky
  // smazalo. Proto se po připojení načte čerstvý zápis; když se liší,
  // stránka změní `key` a obrazovka začne znovu z něj.
  const router = useRouter();
  useEffect(() => router.refresh(), [router]);

  useDisplejSviti();
  const ted = useTed(start != null);

  const dojela = new Set(dojeti.map((d) => d.id));
  const cekaji = zapis.lode.filter((l) => !dojela.has(l.prihlaskaId) && !kody[l.prihlaskaId]);

  const dojede = (id: number) => {
    // Čas se bere hned, ne až po uložení: rozhoduje okamžik klepnutí.
    const v = new Date().toISOString();
    zmen([...dojeti, { id, v }], kody);
  };

  const presun = (z: number, na: number) => {
    if (na < 0 || na >= dojeti.length) return;
    const jmena = dojeti.map((d) => d.id);
    const [id] = jmena.splice(z, 1);
    jmena.splice(na, 0, id);
    zmen(
      jmena.map((id, i) => ({ id, v: dojeti[i].v })),
      kody,
    );
  };

  const odstartuj = async () => {
    if (start && !window.confirm("Start už je zapsaný. Přepsat ho na teď? Časy dojetých se přepočítají."))
      return;
    const v = new Date().toISOString();
    const puvodni = start;
    setStart(v);
    try {
      const { chyba } = await odstartujAkce(serie, zavod, zapis.cislo, v);
      if (chyba) {
        setStart(puvodni);
        setChyba(chyba);
      }
    } catch {
      setStart(puvodni);
      setChyba("Start se nepodařilo uložit. Zkus to znovu.");
    }
  };

  const kodLodi = (id: number, kod: KodVysledku | null) => {
    const nove = { ...kody };
    if (kod) nove[id] = kod;
    else delete nove[id];
    zmen(dojeti, nove);
  };

  return (
    <div className="cil">
      <div className="cil-lista" role="status" aria-live="polite">
        <div className="cil-start">
          {start ? (
            <>
              <span>
                Start {hodiny(start)} · <b className="cil-cas">{trvani(start, ted)}</b>
              </span>
              <button type="button" className="maly" onClick={odstartuj}>
                Přepsat start
              </button>
            </>
          ) : (
            <button type="button" className="cil-startuj" onClick={odstartuj}>
              Start
            </button>
          )}
        </div>
        <span className={`cil-ulozeno ${ukladani}`}>
          {ukladani === "ukladam" ? "ukládám…" : ukladani === "chyba" ? "neuloženo" : "uloženo"}
        </span>
      </div>

      {chyba && (
        <p className="hlaska chyba" role="alert">
          {chyba}{" "}
          {ukladani === "chyba" && "Klepnutí zůstávají v telefonu. "}
          {ukladani === "chyba" && (
            <button type="button" className="maly" onClick={() => void uloz()}>
              Uložit znovu
            </button>
          )}
        </p>
      )}

      {!start && (
        <p className="poznamka">
          Start platí pro všechny kategorie. Bez něj jde dojezd zapsat taky,
          čas od startu se dopočítá, až se start zapíše.
        </p>
      )}

      <section aria-labelledby="cil-na-vode">
        <h2 id="cil-na-vode">Na vodě</h2>
        {cekaji.length === 0 ? (
          <p className="prazdno">Všechny lodě mají dojezd nebo kód.</p>
        ) : (
          poKategoriich(cekaji).map(([kategorie, lode]) => (
            <div key={kategorie} className="cil-kategorie">
              <h3>{kategorie}</h3>
              <div className="cil-lode">
                {lode.map((l) => (
                  <button
                    type="button"
                    key={l.prihlaskaId}
                    className="cil-lod"
                    onClick={() => dojede(l.prihlaskaId)}
                  >
                    {l.lod}
                    {l.cisloPlachty && <small>{l.cisloPlachty}</small>}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <section aria-labelledby="cil-dojete">
        <div className="cil-nadpis">
          <h2 id="cil-dojete">Dojeté ({dojeti.length})</h2>
          {dojeti.length > 0 && (
            <button type="button" className="maly" onClick={() => zmen(dojeti.slice(0, -1), kody)}>
              Vrátit poslední
            </button>
          )}
        </div>
        {dojeti.length === 0 ? (
          <p className="prazdno">Zatím nikdo.</p>
        ) : (
          <ol className="cil-poradi">
            {dojeti.map((d, i) => {
              const l = lode.get(d.id)!;
              return (
                <li key={d.id}>
                  <span className="cil-misto">{i + 1}.</span>
                  <span className="cil-jmeno">
                    {l.lod}
                    <small>
                      {l.kategorie} {poradiVKategorii(dojeti, lode, i)}.
                    </small>
                  </span>
                  <span className="cil-cas">{d.v && start ? trvani(start, Date.parse(d.v)) : ""}</span>
                  <span className="cil-opravy">
                    <button
                      type="button"
                      aria-label={`${l.lod} o místo výš`}
                      disabled={i === 0}
                      onClick={() => presun(i, i - 1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`${l.lod} o místo níž`}
                      disabled={i === dojeti.length - 1}
                      onClick={() => presun(i, i + 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      aria-label={`${l.lod} zpátky na vodu`}
                      onClick={() => zmen(dojeti.filter((_, j) => j !== i), kody)}
                    >
                      ✕
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Zavřené, dokud se jezdí: kódy přicházejí na řadu až po dojezdu
          a mezi tlačítky lodí by jen překážely. */}
      <details className="cil-kody">
        <summary>Po dojezdu — kódy lodím, které nedojely</summary>
        {cekaji.length === 0 && Object.keys(kody).length === 0 ? (
          <p className="prazdno">Všechny lodě dojely.</p>
        ) : (
          <ul>
            {cekaji.map((l) => (
              <li key={l.prihlaskaId}>
                <span className="cil-jmeno">{l.lod}</span>
                <span className="cil-volby">
                  {KODY_PO_DOJEZDU.map((k) => (
                    <button
                      type="button"
                      key={k}
                      aria-label={`${l.lod}: ${k.toUpperCase()}, ${popisyKodu[k]}`}
                      title={popisyKodu[k]}
                      onClick={() => kodLodi(l.prihlaskaId, k)}
                    >
                      {k.toUpperCase()}
                    </button>
                  ))}
                </span>
              </li>
            ))}
            {zapis.lode
              .filter((l) => kody[l.prihlaskaId])
              .map((l) => (
                <li key={l.prihlaskaId} className="ma-kod">
                  <span className="cil-jmeno">{l.lod}</span>
                  <span className="cil-volby">
                    <b>{kody[l.prihlaskaId].toUpperCase()}</b>
                    <button
                      type="button"
                      aria-label={`Zrušit kód lodi ${l.lod}`}
                      onClick={() => kodLodi(l.prihlaskaId, null)}
                    >
                      zrušit
                    </button>
                  </span>
                </li>
              ))}
          </ul>
        )}
      </details>
    </div>
  );
}

/** Celá sada pro API: dojeté s pořadím a časem, zbylé s kódem. */
function radky(dojeti: Dojezd[], kody: Record<number, KodVysledku>): ZapisRadek[] {
  return [
    ...dojeti.map((d, i) => ({
      prihlaskaId: d.id,
      poradiVCili: i + 1,
      kod: null,
      dojezdV: d.v,
    })),
    ...Object.entries(kody).map(([id, kod]) => ({
      prihlaskaId: Number(id),
      poradiVCili: null,
      kod,
    })),
  ];
}

/** Kolikátá dojela loď na místě `i` ve své kategorii. */
function poradiVKategorii(dojeti: Dojezd[], lode: Map<number, ZapisLod>, i: number) {
  const kategorie = lode.get(dojeti[i].id)!.kategorie;
  return dojeti.slice(0, i + 1).filter((d) => lode.get(d.id)!.kategorie === kategorie).length;
}

/** Lodě po kategoriích v pořadí, v jakém je vydalo API. */
function poKategoriich(lode: ZapisLod[]): [string, ZapisLod[]][] {
  const skupiny = new Map<string, ZapisLod[]>();
  for (const l of lode) skupiny.set(l.kategorie, [...(skupiny.get(l.kategorie) ?? []), l]);
  return [...skupiny];
}

/** Hodiny startu v místním čase Orlíku, ať je telefon nastavený jakkoliv. */
function hodiny(iso: string) {
  return new Date(iso).toLocaleTimeString("cs-CZ", { timeZone: "Europe/Prague" });
}

/** Čas od startu jako h:mm:ss. Záporný (špatný start) se neukazuje. */
function trvani(start: string, konec: number) {
  const sekundy = Math.floor((konec - Date.parse(start)) / 1000);
  if (sekundy < 0) return "";
  const h = Math.floor(sekundy / 3600);
  const m = Math.floor((sekundy % 3600) / 60);
  const s = sekundy % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Aktuální čas po sekundách, jen když je co odpočítávat. */
function useTed(bezi: boolean) {
  const [ted, setTed] = useState(() => Date.now());
  useEffect(() => {
    if (!bezi) return;
    const casovac = window.setInterval(() => setTed(Date.now()), 1000);
    return () => window.clearInterval(casovac);
  }, [bezi]);
  return ted;
}

/**
 * Displej nezhasne, dokud je obrazovka otevřená. Na vodě se na telefon
 * mezi dojezdy nesahá a odemykat ho, když se blíží loď, je pozdě.
 * Prohlížeč bez podpory to tiše přeskočí.
 */
function useDisplejSviti() {
  useEffect(() => {
    let zamek: WakeLockSentinel | null = null;
    const zamkni = async () => {
      try {
        zamek = (await navigator.wakeLock?.request("screen")) ?? null;
      } catch {
        // Úsporný režim nebo zamítnuté oprávnění. Obrazovka funguje i tak.
      }
    };
    // Zámek se po přepnutí aplikace ztratí, po návratu se vezme znovu.
    const priNavratu = () => {
      if (document.visibilityState === "visible") void zamkni();
    };
    void zamkni();
    document.addEventListener("visibilitychange", priNavratu);
    return () => {
      document.removeEventListener("visibilitychange", priNavratu);
      void zamek?.release();
    };
  }, []);
}
