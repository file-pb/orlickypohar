"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BARVY, NAZVY_BAREV, NAZVY_TVARU, ZnakVRadku } from "@/app/znak-boje";
import { POPIS_NEJVIC } from "@/lib/boje";
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
import { NahledPrvku, type ZnackaNahledu } from "@/app/nahled-prvku";
import { fotkaKeZnacceAkce, pipniAkce, slozPrvekAkce } from "./akce";

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
  const [hotove, setHotove] = useState<
    { id: number; poloha: Poloha; znak: { barva: BarvaBoje; tvar: TvarBoje; znaceni: DruhZnaceni } }[]
  >([]);

  const [znaceni, setZnaceni] = useState<DruhZnaceni>(null);
  const [barva, setBarva] = useState<BarvaBoje>(null);
  const [tvar, setTvar] = useState<TvarBoje>(null);
  const [minule, setMinule] = useState<
    Record<string, { znaceni: DruhZnaceni; barva: BarvaBoje; tvar: TvarBoje }>
  >({});

  /**
   * Co se postavilo naposled. <b>Drží se kvůli „projet to znovu jinak"</b>
   * (Filip, 10. 10. 2026): tatáž dvojice bójí se v jedné rozjížďce jede
   * několikrát a pokaždé může mít jiný předpis — po proudu a pak zpátky
   * proti němu. Opakovaný průjezd je další položka trati, ne druhá
   * hodnota na prvku, takže se nepípá a nevybírá značení znovu.
   */
  const [posledni, setPosledni] = useState<{
    typ: TypStavby;
    body: { id: number; poloha: Poloha; znak: { barva: BarvaBoje; tvar: TvarBoje; znaceni: DruhZnaceni } }[];
  } | null>(null);

  /**
   * Fotka a poznámka k bodu, který se zrovna pípá. <b>Drží se do
   * pípnutí</b>: značka ještě nemá id, takže fotku není kam připnout.
   * Obojí je mimo hlavní cestu (Filip, 10. 10. 2026: *„přednost má
   * ergonomie klikacího zadávání, nechci, aby se to tam cpalo"*) —
   * jedno tlačítko, které se rozbalí, až když ho někdo vyvolá.
   */
  const [fotka, setFotka] = useState<File | null>(null);
  const [popis, setPopis] = useState("");
  const [pisuPopis, setPisuPopis] = useState(false);
  const vyberFotky = useRef<HTMLInputElement>(null);

  const [zMapy, setZMapy] = useState(false);
  const [delam, setDelam] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [hlaska, setHlaska] = useState<string | null>(null);

  const vsechnyBody = typ ? hotove.length >= typ.body.length : false;
  const krok: "typ" | "jak" | "body" | "zavrsit" = !typ
    ? "typ"
    : !volba
      ? "jak"
      : vsechnyBody
        ? "zavrsit"
        : "body";
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

    // <b>Vždycky se musí dojít k `finally`.</b> Když se cokoliv utrhne —
    // volání nevrátí nic, akce vyhodí výjimku —, zůstane jinak `delam`
    // na true a obrazovka navždy visí na „Zapisuji…" (Filip, 11. 10.
    // 2026). Zamrzlá obrazovka je horší než chyba: u chyby se dá
    // rozhodnout, co dál.
    try {

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
        popis: popis.trim() || undefined,
      });
      if (chybaPipnuti || id === null) {
        setChyba(chybaPipnuti ?? "Značku se nepodařilo zapsat.");
        return;
      }

      if (znaceni) setMinule({ ...minule, [typ.id]: { znaceni, barva, tvar } });
      setZMapy(false);

      // Fotka až po pípnutí: dřív značka nemá id, na které by se dala
      // pověsit. Když se nepovede, značka zůstane — je to doklad navíc,
      // ne podmínka, a stavbu na vodě kvůli ní zastavovat nebudeme.
      if (fotka) {
        const { chyba: chybaFotky } = await fotkaKeZnacceAkce(serie, zavod, id, fotka);
        if (chybaFotky) setChyba(`Značka je zapsaná, ale fotka ne: ${chybaFotky}`);
        setFotka(null);
        if (vyberFotky.current) vyberFotky.current.value = "";
      }
      setPopis("");
      setPisuPopis(false);

      const vsechny = [
        ...hotove,
        { id, poloha: { sirka: poloha.sirka, delka: poloha.delka }, znak: { barva, tvar, znaceni } },
      ];
      setHotove(vsechny);

      if (vsechny.length < typ.body.length) {
        // Značení se pro další bod nepředvyplňuje: druhý konec brány bývá
        // tentýž znak, ale u startu je to klidně molo proti lodi. Na jeden
        // dotyk je k dispozici „jako minule".
        setZnaceni(null);
        setBarva(null);
        setTvar(null);
        router.refresh();
        return;
      }

      // U startu a cíle se ještě čeká na růžici: azimut linie vznikne teprve
      // tímhle druhým bodem, takže dřív se směr vybrat nedal. Prvek se složí
      // až po něm — jinak by se uložil bez směru a šipka by se neměla odkud
      // vzít.
      if (patriSmer(typ)) {
        router.refresh();
        return;
      }

      await slozPrvek(vsechny);
    } catch (e) {
      setChyba(
        `Zápis se nepovedl: ${e instanceof Error ? e.message : "neznámá chyba"}. ` +
          "Zkus to prosím znovu.",
      );
    } finally {
      setDelam(false);
    }
  };

  /**
   * Složí prvek z bodů, které dostane. <b>Bere je parametrem, ne ze
   * stavu:</b> při posledním pípnutí se volá hned po `setHotove`, a to
   * se ještě nestihlo projevit — ze stavu by chyběl právě ten bod, co
   * prvek dokončil.
   */
  const slozPrvek = async (body: typeof hotove) => {
    if (!typ || !volba) return;
    setDelam(true);

    // Totéž `finally` jako u zápisu bodu: zamrzlá obrazovka je horší
    // než chyba.
    try {
      const { chyba: chybaPrvku } = await slozPrvekAkce(serie, zavod, {
        typ: volba.typ,
        poradi: dalsiPoradi,
        bojeAId: body[0].id,
        bojeBId: body[1]?.id ?? null,
        strana: volba.strana,
        smer: patriSmer(typ) ? smer : null,
        druhStartu: patriDruhStartu(typ) ? druhStartuZVolby(volba) : null,
      });

      if (chybaPrvku) {
        // Značky zůstanou: jsou to měření, která se opravdu stala.
        setChyba(`Značky jsou zapsané, ale prvek se nepovedl: ${chybaPrvku}`);
        vycisti();
        router.refresh();
        return;
      }

      setHlaska(`${volba.jmeno.toLowerCase()} — prvek je na trati.`);
      setPosledni({ typ, body });
      vycisti();
      router.refresh();
    } catch (e) {
      setChyba(
        "Značky jsou zapsané, ale prvek se nepovedl: " +
          `${e instanceof Error ? e.message : "neznámá chyba"}. Zkus ho složit ve formuláři níž.`,
      );
      router.refresh();
    } finally {
      setDelam(false);
    }
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

  // Náhled: pípnuté značky plus ta, kterou stavitel zrovna vybral.
  // Čekající se kreslí průsvitně — ještě ve vodě není.
  const doNahledu: ZnackaNahledu[] = hotove.map((h) => ({
    barva: h.znak.barva ?? undefined,
    tvar: h.znak.tvar ?? undefined,
    znaceni: h.znak.znaceni ?? undefined,
    jmeno: predvolba(h.znak.znaceni)?.jmeno ?? "značka",
  }));
  if (krok === "body" && znaceni)
    doNahledu.push({
      barva: barva ?? undefined,
      tvar: tvar ?? undefined,
      znaceni: znaceni ?? undefined,
      jmeno: vybrana?.jmeno ?? "značka",
      cekajici: true,
    });

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

      {typ && volba && (
        <NahledPrvku
          typ={typ}
          stopa={volba.stopa}
          znacky={doNahledu}
          smer={smer}
          popisek={`${volba.jmeno}${doNahledu.length ? " — " + popisZnacek(doNahledu) : ""}`}
        />
      )}

      {krok === "typ" && (
        <>
          <p className="poznamka">
            Nejdřív kolik bodů. Čím to je, se řekne hned potom — a značky se
            pojmenují samy.
          </p>
          {posledni && (
            <button
              type="button"
              className="volba znovu"
              onClick={() => {
                setTyp(posledni.typ);
                setVolba(null);
                setSmer(null);
                setHotove(posledni.body);
                setHlaska(null);
                setChyba(null);
              }}
            >
              <b>Projet to znovu jinak</b>
              <span className="detail">
                Tytéž značky, nový předpis. Nepípá se, nevybírá značení.
              </span>
            </button>
          )}

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
                    znaceni={p.id}
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
              <div className="chipy">
                <button
                  type="button"
                  className="chip"
                  onClick={() => setZMapy(true)}
                  disabled={delam || !znaceni}
                >
                  Vybrat z mapy
                </button>

                {/* Fotka a poznámka stojí stranou hlavní cesty: píšou se
                    jen občas a hlavní cesta je předvolba → pípnout. */}
                <button
                  type="button"
                  className={fotka ? "chip vybrany" : "chip"}
                  onClick={() => vyberFotky.current?.click()}
                  disabled={delam}
                >
                  {fotka ? "Fotka připravená" : "Vyfotit"}
                </button>
                <button
                  type="button"
                  className={popis.trim() ? "chip vybrany" : "chip"}
                  onClick={() => setPisuPopis(!pisuPopis)}
                  disabled={delam}
                >
                  Poznámka
                </button>
              </div>

              <input
                ref={vyberFotky}
                type="file"
                accept="image/*"
                capture="environment"
                className="skryte"
                onChange={(e) => setFotka(e.target.files?.[0] ?? null)}
              />

              {pisuPopis && (
                <label className="poznamka-znacky">
                  Poznámka ke značce
                  <input
                    type="text"
                    value={popis}
                    maxLength={POPIS_NEJVIC}
                    placeholder="kotva se trhá"
                    onChange={(e) => setPopis(e.target.value)}
                  />
                </label>
              )}
              <button type="button" className="zrusit" onClick={vycisti} disabled={delam}>
                Zrušit prvek
              </button>
            </>
          )}
        </>
      )}

      {/* Růžice se ukáže, až stojí oba body: dřív azimut linie neexistuje
          a vymyslet ho nejde. Prvek na ni počká. */}
      {krok === "zavrsit" && typ && volba && !patriSmer(typ) && (
        <div className="ruzice">
          {/* Tenhle krok nastane jen po „projet to znovu jinak": v běžné
              cestě prvek vznikne posledním pípnutím a ptát se podruhé by
              bylo klepnutí navíc. */}
          <p className="krok">
            <b>{volba.jmeno}</b>
            <span className="detail"> — tytéž značky, jen nový předpis.</span>
          </p>
          <button
            type="button"
            className="velke"
            disabled={delam}
            onClick={() => slozPrvek(hotove)}
          >
            {delam ? "Zapisuji…" : "Na trať"}
          </button>
          <button type="button" className="zrusit" onClick={vycisti} disabled={delam}>
            Zrušit
          </button>
        </div>
      )}

      {krok === "zavrsit" && typ && volba && patriSmer(typ) && !dvojice && (
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

      {krok === "zavrsit" && typ && volba && patriSmer(typ) && dvojice && (
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
 * Krátký popis značek do titulku náhledu — a zároveň jeho `aria-label`,
 * takže musí říkat, co je na obrázku. <b>Jméno značení, ne barva:</b>
 * „sport" nese víc než „žlutá", a plavidlo s molem žádnou barvu nemají.
 */
function popisZnacek(znacky: ZnackaNahledu[]): string {
  return znacky.map((z) => z.jmeno + (z.cekajici ? " (čeká)" : "")).join(" a ");
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
