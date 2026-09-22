"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
// Jen typy: hodnoty z lib/vysledky by do prohlížeče zatáhly i čtení tokenu.
import type { KodVysledku, ZapisLod, ZapisRadek, ZapisRozjizdky } from "@/lib/vysledky";
import { odstartujAkce, pridejLodAkce, ulozCilAkce, znakAkce } from "./akce";

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
 * <b>Tlačítka mají lodě na regatě</b> (krok 2, 22. 9. 2026): přihlášené
 * a potvrzené. Zbytek ročníku je stranou v „Dalších lodích" — pozdní loď
 * se klepnutím zapíše a zápis ji na regatu přihlásí sám. Když na regatu
 * přihlášený není nikdo (pořadatel přihlášky nevede), tlačítka má celý
 * ročník jako dřív.
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
  // Lodě přidané na vodě. Mají přednost před tím, co přišlo ze serveru:
  // loď ročníku, kterou pořadatel přihlásil tady, je už na regatě.
  const [pridane, setPridane] = useState<ZapisLod[]>([]);
  // Chyba formuláře nové lodi stojí u něj: hláška nahoře by byla o dvě
  // obrazovky výš, než kam se zrovna kouká.
  const [chybaLodi, setChybaLodi] = useState<string | null>(null);
  const vsechny = [
    ...zapis.lode.map((l) => pridane.find((p) => p.prihlaskaId === l.prihlaskaId) ?? l),
    ...pridane.filter((p) => !zapis.lode.some((l) => l.prihlaskaId === p.prihlaskaId)),
  ];
  const lode = new Map(vsechny.map((l) => [l.prihlaskaId, l]));
  const nekdoNaRegate = vsechny.some((l) => l.naRegate);
  const naVode = (l: ZapisLod) => !nekdoNaRegate || l.naRegate;

  const [znaky, setZnaky] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      zapis.lode.filter((l) => l.poznavaciZnak).map((l) => [l.prihlaskaId, l.poznavaciZnak!]),
    ),
  );

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
  const zbyvaji = vsechny.filter((l) => !dojela.has(l.prihlaskaId) && !kody[l.prihlaskaId]);
  const cekaji = zbyvaji.filter(naVode);
  const dalsi = zbyvaji.filter((l) => !naVode(l));

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

  const ulozZnak = async (id: number, text: string) => {
    const znak = text.trim();
    if (znak === (znaky[id] ?? "")) return;
    try {
      const { chyba } = await znakAkce(serie, zavod, id, znak);
      if (chyba) return setChyba(chyba);
      setZnaky((z) => {
        const nove = { ...z };
        if (znak) nove[id] = znak;
        else delete nove[id];
        return nove;
      });
    } catch {
      setChyba("Znak se nepodařilo uložit. Zkus to znovu.");
    }
  };

  const pridejLod = async (formular: HTMLFormElement) => {
    const pole = new FormData(formular);
    const text = (klic: string) => String(pole.get(klic) ?? "").trim();
    try {
      const vysledek = await pridejLodAkce(serie, zavod, {
        nazev: text("nazev"),
        kategorie: text("kategorie"),
        majitelJmeno: text("jmeno"),
        majitelPrijmeni: text("prijmeni"),
        cisloPlachty: text("plachta") || null,
      });
      if ("chyba" in vysledek) return setChybaLodi(vysledek.chyba);
      setChybaLodi(null);
      setPridane((p) => [...p.filter((l) => l.prihlaskaId !== vysledek.lod.prihlaskaId), vysledek.lod]);
      formular.reset();
    } catch {
      setChybaLodi("Loď se nepodařilo přidat. Zkus to znovu.");
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
                  <TlacitkoLodi key={l.prihlaskaId} lod={l} znak={znaky[l.prihlaskaId]} onClick={dojede} />
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {dalsi.length > 0 && (
        <details className="cil-dalsi">
          <summary>Další lodě ročníku ({dalsi.length})</summary>
          <p className="poznamka">
            Na regatu nepřihlášené. Klepnutím dostane loď dojezd a zápis ji na
            regatu přihlásí.
          </p>
          <div className="cil-lode">
            {dalsi.map((l) => (
              <TlacitkoLodi key={l.prihlaskaId} lod={l} onClick={dojede} />
            ))}
          </div>
        </details>
      )}

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

      <details className="cil-znaky">
        <summary>Poznávací znaky</summary>
        <p className="poznamka">
          Na čem se u cíle domluvíte — barva spinakru, bez čísla na plachtě.
          Znak stojí na tlačítku lodi a platí pro celou regatu. Ukládá se po
          opuštění pole.
        </p>
        {vsechny.some((l) => l.naRegate) ? (
          <ul>
            {vsechny
              .filter((l) => l.naRegate)
              .map((l) => (
                <li key={l.prihlaskaId}>
                  <label htmlFor={`znak-${l.prihlaskaId}`} className="cil-jmeno">
                    {l.lod}
                    {l.cisloPlachty && <small>{l.cisloPlachty}</small>}
                  </label>
                  <input
                    id={`znak-${l.prihlaskaId}`}
                    type="text"
                    maxLength={60}
                    defaultValue={znaky[l.prihlaskaId] ?? ""}
                    onBlur={(e) => void ulozZnak(l.prihlaskaId, e.currentTarget.value)}
                  />
                </li>
              ))}
          </ul>
        ) : (
          <p className="prazdno">
            Znak jde dát lodím přihlášeným na regatu. Zatím tu žádná není.
          </p>
        )}
      </details>

      <details className="cil-nova">
        <summary>Nová loď</summary>
        <p className="poznamka">
          Loď, která v ročníku ještě není. Přidáním se přihlásí na regatu
          a dostane tlačítko. Majitel je povinný, protože stojí ve výsledcích
          vedle lodi.
        </p>
        <form
          className="formular"
          onSubmit={(e) => {
            e.preventDefault();
            void pridejLod(e.currentTarget);
          }}
        >
          <label>
            Název lodi
            <input name="nazev" required maxLength={120} />
          </label>
          <label>
            Kategorie
            <select name="kategorie" required defaultValue="">
              <option value="" disabled>
                vyber
              </option>
              {[...new Set(vsechny.map((l) => l.kategorie))].map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <label>
            Jméno majitele
            <input name="jmeno" required maxLength={80} autoComplete="off" />
          </label>
          <label>
            Příjmení majitele
            <input name="prijmeni" required maxLength={80} autoComplete="off" />
          </label>
          <label>
            Číslo plachty <span className="poznamka">nepovinné</span>
            <input name="plachta" maxLength={20} autoComplete="off" />
          </label>
          {chybaLodi && (
            <p className="hlaska chyba" role="alert">
              {chybaLodi}
            </p>
          )}
          <button type="submit">Přidat loď</button>
        </form>
      </details>

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
            {vsechny
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

/**
 * Tlačítko lodi v cíli. Pod jménem domluvený znak, když je, jinak číslo
 * plachty — hlídač volá jméno, ale zapisovatel hledá očima i podle znaku.
 */
function TlacitkoLodi({
  lod,
  znak,
  onClick,
}: {
  lod: ZapisLod;
  znak?: string;
  onClick: (id: number) => void;
}) {
  const pod = [znak, lod.cisloPlachty].filter(Boolean).join(" · ");
  return (
    <button type="button" className="cil-lod" onClick={() => onClick(lod.prihlaskaId)}>
      {lod.lod}
      {pod && <small>{pod}</small>}
    </button>
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
