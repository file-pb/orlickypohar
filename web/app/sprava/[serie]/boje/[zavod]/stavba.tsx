"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BARVY, NAZVY_BAREV, NAZVY_TVARU, ZnakVRadku } from "@/app/znak-boje";
import type { BarvaBoje, DruhZnaceni, TvarBoje } from "@/lib/boje";
import { NAZVY_SMERU, type DruhStartu, type SvetovaStrana } from "@/lib/trat";
import {
  TYPY,
  VOLBY,
  ZNACENI,
  jmenaBodu,
  kolmice,
  patriDruhStartu,
  patriSmer,
  predvolba,
  type Predvolba,
  type TypStavby,
  type Volba,
} from "@/lib/stavba-prvku";
import { MapkaVyber } from "@/app/mapka-vyber";
import { pipniAkce, slozPrvekAkce } from "./akce";

type Poloha = { sirka: number; delka: number };

/**
 * Stavba prvku na vodě: vyber, kolik bodů, řekni jak se to jede, a pípej.
 *
 * <b>Jednotkou práce je prvek, ne bóje</b> (Filip, 10. 10. 2026).
 * Stavitel nemyslí „pokládám bóji 1 a bóji 2, a potom z nich složím
 * start" — myslí „pokládám start". Jména značek se proto nezadávají.
 *
 * <para>
 * <b>Typ říká, kolik bodů se pípá; čím prvek je, řekne až předpis.</b>
 * Otočná a průjezdní se sdružily do *jedné značky*, brána a otočná linie
 * do *dvou* — stavitel nemá klasifikovat dřív, než položí.
 * </para>
 *
 * <para>
 * <b>Předpis se volí před pípáním.</b> Plyne to ze sdružení: dokud se
 * neví, jestli se u značky otáčí nebo projíždí, nejde ji pojmenovat —
 * a jméno se po zápisu nepřepisuje, protože záznam značky je měření.
 * Náhled tím navíc vede ruku už při prvním pípnutí.
 * </para>
 *
 * <para>
 * <b>Pravidla jsou v `lib/stavba-prvku.ts`</b>, čistém modulu bez Reactu,
 * protože tenhle průvodce má jít i do appky. Tahle komponenta umí jen
 * tlačítka, polohu a kreslení.
 * </para>
 *
 * <para>
 * <b>Poloha se bere při každém doteku znovu.</b> Mezi dvěma body se
 * popojede, takže držet jedno měření by druhou značku položilo tam, kde
 * stála první.
 * </para>
 */
export function Stavba({
  serie,
  zavod,
  dalsiPoradi,
  stred,
}: {
  serie: string;
  zavod: string;
  /** Kolikátý prvek se staví — jen do automatických jmen. */
  dalsiPoradi: number;
  /** Kam se otevře mapa, když se vybírá bod. Nejlíp poslední značka. */
  stred: Poloha;
}) {
  const router = useRouter();

  const [typ, setTyp] = useState<TypStavby | null>(null);
  const [volba, setVolba] = useState<Volba | null>(null);
  const [smer, setSmer] = useState<SvetovaStrana>(null);
  const [hotove, setHotove] = useState<{ id: number; poloha: Poloha }[]>([]);

  const [znaceni, setZnaceni] = useState<DruhZnaceni>(null);
  const [barva, setBarva] = useState<BarvaBoje>(null);
  const [tvar, setTvar] = useState<TvarBoje>(null);
  const [minule, setMinule] = useState<
    Record<string, { znaceni: DruhZnaceni; barva: BarvaBoje; tvar: TvarBoje }>
  >({});

  const [zMapy, setZMapy] = useState(false);
  const [delam, setDelam] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [hlaska, setHlaska] = useState<string | null>(null);

  const krok: "typ" | "jak" | "body" = !typ ? "typ" : !volba ? "jak" : "body";
  const bod = typ ? typ.body[hotove.length] : null;
  const jmena = typ ? jmenaBodu(typ, volba, dalsiPoradi) : [];
  const vybrana = predvolba(znaceni);

  /** Předvolba z minula pro tenhle typ — regata má svůj slovník. */
  const zMinula = typ ? minule[typ.id] : undefined;
  const predvolbaMinule = zMinula ? predvolba(zMinula.znaceni) : null;

  const vycisti = () => {
    setTyp(null);
    setVolba(null);
    setSmer(null);
    setHotove([]);
    setZnaceni(null);
    setBarva(null);
    setTvar(null);
    setZMapy(false);
    setChyba(null);
  };

  const vybranaPredvolba = (p: Predvolba) => {
    setZnaceni(p.id);
    setBarva(p.volnaBarva ? (barva ?? p.barva) : p.barva);
    setTvar(p.tvary.length === 1 ? p.tvary[0] : p.tvary.length === 0 ? null : (tvar ?? p.tvary[0]));
  };

  /**
   * Zapíše bod, ať přišel z telefonu nebo z mapy, a po posledním z nich
   * složí prvek.
   *
   * <b>Zdroj se rozlišuje.</b> U polohy z mapy se neposílá přesnost —
   * není to měření, takže vymyslet k ní metry by byla lež v datech.
   */
  const zapis = async (
    poloha: Poloha & { presnost: number | null },
    zdroj: "Telefon" | "Mapa",
  ) => {
    if (!typ || !volba || !bod) return;
    setDelam(true);
    setChyba(null);

    const { chyba: chybaPipnuti, id } = await pipniAkce(serie, zavod, {
      nazev: jmena[hotove.length],
      poradi: 0,
      sirka: poloha.sirka,
      delka: poloha.delka,
      presnostM: zdroj === "Telefon" ? poloha.presnost : null,
      nahrazujeId: null,
      zdroj,
      barva: barva ?? undefined,
      tvar: tvar ?? undefined,
      znaceni: znaceni ?? undefined,
    });
    if (chybaPipnuti || id === null) {
      setChyba(chybaPipnuti ?? "Značku se nepodařilo zapsat.");
      setDelam(false);
      return;
    }

    if (znaceni) setMinule({ ...minule, [typ.id]: { znaceni, barva, tvar } });
    setZMapy(false);

    const vsechny = [...hotove, { id, poloha: { sirka: poloha.sirka, delka: poloha.delka } }];
    setHotove(vsechny);

    if (vsechny.length < typ.body.length) {
      // Značení se pro další bod nepředvyplňuje: druhý konec brány bývá
      // tentýž znak, ale u startu je to klidně molo proti lodi. Na jeden
      // dotyk je k dispozici „jako minule".
      setZnaceni(null);
      setBarva(null);
      setTvar(null);
      setDelam(false);
      router.refresh();
      return;
    }

    // U startu a cíle se ještě čeká na růžici: azimut linie vznikne teprve
    // tímhle druhým bodem, takže dřív se směr vybrat nedal. Prvek se složí
    // až po něm — jinak by se uložil bez směru a šipka by se neměla odkud
    // vzít.
    if (patriSmer(typ)) {
      setDelam(false);
      router.refresh();
      return;
    }

    await slozPrvek(vsechny);
  };

  const slozPrvek = async (body: { id: number; poloha: Poloha }[]) => {
    if (!typ || !volba) return;
    setDelam(true);

    const { chyba: chybaPrvku } = await slozPrvekAkce(serie, zavod, {
      typ: volba.typ,
      poradi: dalsiPoradi,
      bojeAId: body[0].id,
      bojeBId: body[1]?.id ?? null,
      strana: volba.strana,
      smer: patriSmer(typ) ? smer : null,
      druhStartu: patriDruhStartu(typ) ? druhStartuZVolby(volba) : null,
    });

    setDelam(false);
    if (chybaPrvku) {
      setChyba(`Značky jsou zapsané, ale prvek se nepovedl: ${chybaPrvku}`);
      vycisti();
      router.refresh();
      return;
    }

    setHlaska(`${volba.jmeno.toLowerCase()} — prvek je na trati.`);
    vycisti();
    router.refresh();
  };

  const pipni = async () => {
    setDelam(true);
    const poloha = await kdeJsem();
    setDelam(false);
    if (typeof poloha === "string") {
      setChyba(poloha);
      return;
    }
    await zapis(poloha, "Telefon");
  };

  // Růžice: azimut linie plyne z obou pípnutých poloh, průjezd je na ni
  // kolmý. Nabízí se proto dvě možnosti, ne osm.
  const dvojice =
    hotove.length === 2 ? kolmice(hotove[0].poloha, hotove[1].poloha) : null;

  return (
    <section className="stavba" aria-labelledby="stavba-nadpis">
      <h2 id="stavba-nadpis">Postavit prvek</h2>

      {chyba && (
        <p className="hlaska chyba" role="alert">
          {chyba}
        </p>
      )}
      {hlaska && (
        <p className="hlaska" role="status">
          {hlaska}
        </p>
      )}

      {krok === "typ" && (
        <>
          <p className="poznamka">
            Nejdřív kolik bodů. Čím to je, se řekne hned potom — a značky se
            pojmenují samy.
          </p>
          <div className="volby">
            {TYPY.map((t) => (
              <button key={t.id} type="button" className="volba" onClick={() => setTyp(t)}>
                <b>{t.jmeno}</b>
                <span className="detail">{t.popis}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {krok === "jak" && typ && (
        <>
          <p className="krok">
            <b>{typ.jmeno}</b> — jak se to jede?
          </p>
          <div className="volby">
            {VOLBY[typ.jak].map((v) => (
              <button key={v.jmeno} type="button" className="volba" onClick={() => setVolba(v)}>
                <b>{v.jmeno}</b>
                <span className="detail">{v.detail}</span>
              </button>
            ))}
          </div>
          <button type="button" className="zrusit" onClick={vycisti}>
            Zpět na výběr
          </button>
        </>
      )}

      {krok === "body" && typ && volba && bod && (
        <>
          <p className="krok">
            <b>{volba.jmeno}</b> — {bod.vyzva}
            {typ.body.length > 1 && (
              <span className="detail">
                {" "}
                ({hotove.length + 1} z {typ.body.length}) · vznikne „{jmena[hotove.length]}"
              </span>
            )}
          </p>

          {predvolbaMinule && zMinula && (
            <button
              type="button"
              className="chip jakoMinule"
              onClick={() => {
                setZnaceni(zMinula.znaceni);
                setBarva(zMinula.barva);
                setTvar(zMinula.tvar);
              }}
            >
              Jako minule: {predvolbaMinule.jmeno}
              {zMinula.tvar ? ` · ${NAZVY_TVARU[zMinula.tvar]}` : ""}
            </button>
          )}

          <p className="poznamka">Čím je to značené?</p>
          <div className="volby">
            {ZNACENI.map((p) => (
              <button
                key={p.id}
                type="button"
                className={znaceni === p.id ? "volba vybrany" : "volba"}
                aria-pressed={znaceni === p.id}
                onClick={() => vybranaPredvolba(p)}
              >
                <span className="znacka">
                  <ZnakVRadku
                    barva={p.barva ?? undefined}
                    tvar={p.tvary[0] ?? undefined}
                  />
                </span>
                <b>{p.jmeno}</b>
                <span className="detail">{p.detail}</span>
              </button>
            ))}
          </div>

          {vybrana && vybrana.tvary.length > 1 && (
            <div className="chipy">
              {vybrana.tvary.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={tvar === t ? "chip vybrany" : "chip"}
                  aria-pressed={tvar === t}
                  onClick={() => setTvar(t)}
                >
                  {NAZVY_TVARU[t]}
                </button>
              ))}
            </div>
          )}

          {vybrana?.volnaBarva && (
            <div className="chipy">
              {(Object.keys(NAZVY_BAREV) as NonNullable<BarvaBoje>[]).map((b) => (
                <button
                  key={b}
                  type="button"
                  className={barva === b ? "barva vybrana" : "barva"}
                  style={{ background: BARVY[b] }}
                  aria-label={NAZVY_BAREV[b]}
                  aria-pressed={barva === b}
                  title={NAZVY_BAREV[b]}
                  onClick={() => setBarva(b)}
                />
              ))}
            </div>
          )}

          {/* Dva nástroje na dvě situace (Filip, 10. 10. 2026): značku,
              kterou spouštíš do vody, pípneš; molo na druhém břehu
              vybereš z mapy, protože tam jezdit nemusíš. */}
          {zMapy ? (
            <MapkaVyber
              stred={hotove[hotove.length - 1]?.poloha ?? stred}
              vyber={(b) => zapis({ ...b, presnost: null }, "Mapa")}
              zrus={() => setZMapy(false)}
              cekam={delam}
            />
          ) : (
            <>
              <button
                type="button"
                className="velke"
                onClick={pipni}
                disabled={delam || !znaceni}
              >
                {delam ? "Zapisuji…" : znaceni ? "Pípnout tady" : "Nejdřív vyber značení"}
              </button>
              <button
                type="button"
                className="chip"
                onClick={() => setZMapy(true)}
                disabled={delam || !znaceni}
              >
                Vybrat z mapy
              </button>
              <button type="button" className="zrusit" onClick={vycisti} disabled={delam}>
                Zrušit prvek
              </button>
            </>
          )}
        </>
      )}

      {/* Růžice se ukáže, až stojí oba body: dřív azimut linie neexistuje
          a vymyslet ho nejde. Prvek na ni počká. */}
      {typ && volba && patriSmer(typ) && hotove.length === 2 && !dvojice && (
        <div className="ruzice">
          {/* Dva body na jednom místě linii netvoří. Vymyslet k nim směr
              by znamenalo nakreslit na mapu šipku, kterou nikdo neurčil —
              radši se to řekne nahlas. */}
          <p className="hlaska chyba" role="alert">
            Oba body jsou prakticky na jednom místě, takže linie nemá směr.
            Zruš prvek a pípni druhý bod dál od prvního.
          </p>
          <button type="button" className="zrusit" onClick={vycisti} disabled={delam}>
            Zrušit prvek
          </button>
        </div>
      )}

      {typ && volba && patriSmer(typ) && dvojice && (
        <div className="ruzice">
          <p className="krok">
            <b>{typ.jak === "start" ? "Kterým směrem se startuje" : "Kterým směrem se proplouvá"}</b>
            <span className="detail">
              {" "}
              Šipka je vždycky kolmá na linii, takže jsou jen dvě možnosti.
            </span>
          </p>
          <div className="chipy">
            {dvojice.map((s) => (
              <button
                key={s}
                type="button"
                className={smer === s ? "chip vybrany" : "chip"}
                aria-pressed={smer === s}
                onClick={() => setSmer(s)}
              >
                {NAZVY_SMERU[s]}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="velke"
            disabled={delam || !smer}
            onClick={() => slozPrvek(hotove)}
          >
            {delam ? "Zapisuji…" : smer ? "Na trať" : "Vyber směr"}
          </button>
          <button type="button" className="zrusit" onClick={vycisti} disabled={delam}>
            Zrušit prvek
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * Druh startu z předpisu. <b>Je to tentýž výběr</b> — „pevná linie" nebo
 * „otevírající se brána" je u startu zároveň odpověď na to, jak se jede,
 * takže se neptáme dvakrát.
 */
function druhStartuZVolby(volba: Volba): DruhStartu {
  return volba.jmeno === "Otevírající se brána" ? "OtevirajiciSeBrana" : "PevnaLinie";
}

/** Poloha z telefonu, nebo text chyby. */
function kdeJsem(): Promise<(Poloha & { presnost: number | null }) | string> {
  if (typeof navigator === "undefined" || !navigator.geolocation)
    return Promise.resolve("Tenhle prohlížeč polohu neumí.");

  return new Promise((hotovo) => {
    navigator.geolocation.getCurrentPosition(
      (p) =>
        hotovo({
          sirka: p.coords.latitude,
          delka: p.coords.longitude,
          presnost: Number.isFinite(p.coords.accuracy) ? p.coords.accuracy : null,
        }),
      () => hotovo("Polohu se nepodařilo zjistit. Povol ji v nastavení stránky."),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });
}
