"use client";

import { BARVY, NAZVY_BAREV, NAZVY_TVARU, ZnakBoje, znakPodleVyhlasky } from "@/app/znak-boje";
import type { BarvaBoje, TvarBoje } from "@/lib/boje";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapkaVyber } from "@/app/mapka-vyber";
import { prectiAkce, pipniAkce } from "./akce";
import type { Cteni } from "@/lib/souradnice";
import type { ZdrojPolohy } from "@/lib/boje";

/**
 * Pípání bóje — jediná část správy, která potřebuje javascript.
 *
 * <b>Polohu umí dát jen prohlížeč</b>, a přesnější ji nemá nikdo než ten,
 * kdo bóji právě spustil do vody (plán, *Trať staví pořadatel, pípnutím
 * u bóje*).
 *
 * <b>Poloha se sleduje, ne bere na jedno zavolání.</b> První odpověď
 * telefonu bývá z wi-fi nebo ze sítě a hlásí klidně 65 m; za pár sekund
 * se družice chytnou a přesnost spadne na jednotky metrů. Kdyby obrazovka
 * vzala první hodnotu, odmítne ji API (nad 100 m) nebo — hůř — projde
 * poloha posunutá o půl trati. Proto je přesnost **vidět celou dobu**
 * a tlačítko čeká, dokud nestojí za to.
 *
 * <b>Co obrazovka schválně neumí: pípnout bez signálu.</b> Plán to
 * u bójí slibuje, ale dnešní API to neunese — `PipnutiVstup` čas nenese
 * a `PostavenaV` se bere ze serverových hodin v okamžiku zápisu, takže
 * podržené pípnutí by se uložilo s časem nahrání, ne s časem postavení.
 * Fronta by tedy tichu vyrobila nepravdivé časy; dokud API nemá pole
 * s časem z telefonu, je lepší říct „nepovedlo se, pípni znovu".
 */

type Poloha = { sirka: number; delka: number; presnost: number | null };

/** Tatáž hranice jako v API (`Pipnuti.NejhorsiPresnostM`). */
const NEJHORSI_PRESNOST_M = 100;

export function Pipani({
  serie,
  zavod,
  prenastavuje,
  nejvicZnaku,
  stojici,
  byvala,
  stred,
  bezNadpisu,
}: {
  serie: string;
  zavod: string;
  /**
   * Když se přenastavuje, bóje, která tam stojí dosud — i s polohou.
   * Poloha je tu kvůli mapě: viz střed u <c>MapkaVyber</c> níž.
   */
  prenastavuje: { id: number; nazev: string; sirka: number; delka: number } | null;
  nejvicZnaku: number;
  /** Jména bójí, které u regaty zrovna stojí. Ta se nenabízejí. */
  stojici: string[];
  /** Jména, která se u téhle regaty už použila — nabídka se jimi učí. */
  byvala: string[];
  /** Kam se otevře mapa, když se bod bere z ní. Nejlíp poslední bóje. */
  stred: { sirka: number; delka: number };
  /**
   * Nadpis se vynechá, když formulář visí v rozbalovátku — jeho
   * `summary` už ten nadpis je a dvakrát pod sebou vypadá jako chyba.
   */
  bezNadpisu?: boolean;
}) {
  const router = useRouter();
  const [poloha, setPoloha] = useState<Poloha | null>(null);
  const [chybaPolohy, setChybaPolohy] = useState<string | null>(null);
  const [nazev, setNazev] = useState(prenastavuje?.nazev ?? "");
  const [poradi, setPoradi] = useState("");
  // Barva a tvar: prázdné znamená „neuvedeno". U přenastavení se obojí
  // převezme po staré bóji, takže se tu nechává prázdné schválně — je to
  // tentýž kus plastu a na vodě ho nikdo nechce přeťukávat.
  const [barva, setBarva] = useState<NonNullable<BarvaBoje> | "">("");
  const [tvar, setTvar] = useState<NonNullable<TvarBoje> | "">("");
  const [posilam, setPosilam] = useState(false);
  const [zMapy, setZMapy] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [hotovo, setHotovo] = useState<string | null>(null);

  /** Právě jsme uložili, takže změna cíle je náš vlastní následek. */
  const poUlozeni = useRef(false);

  /**
   * Jméno se při přechodu na přenastavení přepíše, aby pořadatel u vody
   * neopisoval, jak se bóje jmenuje. API ho totiž po staré bóji nepřebírá,
   * i když to komentář u `PipniAsync` slibuje — přebírá jen pořadí.
   *
   * <b>Potvrzení po uložení se nesmí smazat.</b> Přenastavená bóje zmizí
   * z trati, takže stránka po uložení sama přepne zpátky na „pípnout
   * novou" — a tenhle efekt se tím spustí. Kdyby při tom hlášku zahodil,
   * pořadatel by neviděl vůbec nic a nevěděl by, jestli se zápis povedl
   * (vyzkoušeno v prohlížeči 9. 10. 2026).
   */
  useEffect(() => {
    setNazev(prenastavuje?.nazev ?? "");
    setPoradi("");
    setChyba(null);
    if (poUlozeni.current) poUlozeni.current = false;
    else setHotovo(null);
  }, [prenastavuje?.id, prenastavuje?.nazev]);

  const sleduji = useRef<number | null>(null);

  /**
   * Zakázanou polohu se obrazovka doví rovnou, ne až z chyby sledování.
   *
   * Sledování ji ohlásí taky, ale až v nějakém zpětném volání; tenhle
   * dotaz odpoví **hned při otevření** a `onchange` zachytí i okamžik,
   * kdy člověk polohu povolí v nastavení stránky. U vody se čeká na
   * družice dost dlouho na to, aby se nečekalo ještě na vysvětlení.
   */
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;

    let platne = true;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((stav) => {
        const posud = () => {
          if (!platne) return;
          if (stav.state === "denied")
            setChybaPolohy(
              "Polohu má stránka zakázanou. Povol ji v nastavení stránky a načti ji znovu.",
            );
          else setChybaPolohy(null);
        };
        posud();
        stav.onchange = posud;
      })
      .catch(() => {
        // Starší prohlížeče dotaz neumí; zbytek obrazovky funguje dál.
      });

    return () => {
      platne = false;
    };
  }, []);

  /**
   * Hlídač ticha. Dokud člověk neodpoví na dotaz prohlížeče, nepřijde
   * ani poloha, ani chyba — a `timeout` u sledování na tohle nesahá,
   * ten běží až po povolení. Obrazovka proto po chvíli řekne aspoň to,
   * že se nic neděje; mlčící „Hledám polohu…" vypadá stejně jako
   * rozbitá stránka a u vody se podle ní nedá nic udělat.
   */
  useEffect(() => {
    if (poloha !== null || chybaPolohy !== null) return;
    const hlidac = setTimeout(() => {
      setChybaPolohy(
        "Poloha pořád nepřišla. Zkontroluj, že má stránka povolenou polohu a že " +
          "telefon vidí na oblohu; sledování běží dál.",
      );
    }, 15000);
    return () => clearTimeout(hlidac);
  }, [poloha, chybaPolohy]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setChybaPolohy(
        "Tenhle prohlížeč polohu nedá. Na telefonu ji dává jen stránka přes https.",
      );
      return;
    }

    sleduji.current = navigator.geolocation.watchPosition(
      (p) => {
        setPoloha({
          sirka: p.coords.latitude,
          delka: p.coords.longitude,
          presnost: Number.isFinite(p.coords.accuracy) ? p.coords.accuracy : null,
        });
        // Poloha dorazila: stížnost hlídače ticha už neplatí a nesmí
        // přebít souřadnice, které se mají ukázat.
        setChybaPolohy(null);
      },
      (e) => {
        // Hlášky jsou konkrétní, protože každá chce něco jiného udělat.
        if (e.code === e.PERMISSION_DENIED)
          setChybaPolohy(
            "Polohu jsi prohlížeči zakázal. Povol ji v nastavení stránky a načti ji znovu.",
          );
        else if (e.code === e.POSITION_UNAVAILABLE)
          setChybaPolohy("Telefon polohu nenašel. Vyjdi z kabiny a chvíli počkej.");
        else setChybaPolohy("Poloha nepřišla včas. Zkus to ještě chvíli nechat běžet.");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );

    return () => {
      if (sleduji.current !== null) navigator.geolocation.clearWatch(sleduji.current);
    };
  }, []);

  const dostPresna =
    poloha !== null && (poloha.presnost === null || poloha.presnost <= NEJHORSI_PRESNOST_M);
  const muzuPipnout = dostPresna && nazev.trim().length > 0 && !posilam;

  /**
   * Nabídka jmen. <b>Z toho, co se u téhle regaty už jmenovalo</b>, plus
   * obvyklá jména pro případ, že se staví poprvé. Jména bójí, které
   * zrovna stojí, se vynechávají — dvě „start levý" ve vodě naráz jsou
   * překlep, ne záměr.
   */
  const navrhy = useMemo(() => {
    const stoji = new Set(stojici);
    const obvykla = ["start levý", "start pravý", "horní", "brána vlevo", "brána vpravo", "cíl"];
    const vse = [...byvala, ...obvykla].filter((n) => !stoji.has(n));
    return [...new Set(vse)].slice(0, 8);
  }, [byvala, stojici]);

  async function pipni() {
    if (!poloha || !muzuPipnout) return;

    setPosilam(true);
    setChyba(null);
    setHotovo(null);

    const vysledek = await pipniAkce(serie, zavod, {
      nazev,
      poradi: Number(poradi) || 0,
      sirka: poloha.sirka,
      delka: poloha.delka,
      presnostM: poloha.presnost,
      nahrazujeId: prenastavuje?.id ?? null,
      barva: barva || null,
      tvar: tvar || null,
    });

    setPosilam(false);

    if (vysledek.chyba) {
      setChyba(vysledek.chyba);
      return;
    }

    poUlozeni.current = true;
    setHotovo(
      prenastavuje
        ? `Bóje „${nazev.trim()}“ je přenastavená. Ta předchozí zůstala v historii.`
        : `Bóje „${nazev.trim()}“ stojí na trati.`,
    );
    setNazev("");
    setPoradi("");
    // Seznam vykresluje server, takže se musí přenačíst.
    router.refresh();
  }

  /**
   * Zápis bodu vzatého z mapy.
   *
   * <b>Nečeká na polohu z telefonu</b>, a právě o to jde: start mezi
   * molem na břehu a bójí plavební dráhy se z mapy vybere rychleji, než
   * se tam dojede pípnout (Filip, 10. 10. 2026). Jméno, barva, tvar
   * i pořadí se berou z polí výš, takže se nic nepřeťukává podruhé.
   *
   * <b>Přesnost se neposílá</b> — mapa nic neměří a API by číslo od
   * jiného zdroje než telefonu odmítlo (`Pipnuti.ProcNejde`).
   */
  async function vezmiZMapy(bod: { sirka: number; delka: number }) {
    setPosilam(true);
    setChyba(null);
    setHotovo(null);

    const vysledek = await pipniAkce(serie, zavod, {
      nazev,
      poradi: Number(poradi) || 0,
      sirka: bod.sirka,
      delka: bod.delka,
      presnostM: null,
      nahrazujeId: prenastavuje?.id ?? null,
      zdroj: "Mapa",
      barva: barva || null,
      tvar: tvar || null,
    });

    setPosilam(false);

    if (vysledek.chyba) {
      // Mapa zůstane otevřená, aby ten bod nebylo potřeba hledat znovu.
      setChyba(vysledek.chyba);
      return;
    }

    setZMapy(false);
    poUlozeni.current = true;
    setHotovo(
      prenastavuje
        ? `Bóje „${nazev.trim()}“ je přenastavená podle mapy. Ta předchozí zůstala v historii.`
        : `Bóje „${nazev.trim()}“ stojí na trati podle mapy.`,
    );
    setNazev("");
    setPoradi("");
    router.refresh();
  }

  return (
    <section className="formular">
      {!bezNadpisu && (
        <h2>{prenastavuje ? `Přenastavit „${prenastavuje.nazev}“` : "Pípnout bóji"}</h2>
      )}

      {prenastavuje && (
        <p className="poznamka">
          Nová poloha vznikne jako <b>nový záznam</b> a ta dosavadní zůstane
          v historii — trasa z té doby se jinak nedá přečíst. Pořadí na trati
          se převezme.{" "}
          <Link href={`/sprava/${serie}/boje/${zavod}`}>Zrušit přenastavení</Link>
        </p>
      )}

      <p aria-live="polite" className={chybaPolohy ? "hlaska chyba" : "detail"}>
        {chybaPolohy
          ? chybaPolohy
          : poloha === null
            ? "Hledám polohu…"
            : poloha.presnost === null
              ? `Poloha ${poloha.sirka.toFixed(5)}, ${poloha.delka.toFixed(5)} — telefon přesnost nehlásí.`
              : `Poloha ${poloha.sirka.toFixed(5)}, ${poloha.delka.toFixed(5)} — přesnost ${Math.round(poloha.presnost)} m.` +
                (poloha.presnost > NEJHORSI_PRESNOST_M
                  ? " To je moc; počkej, až se chytnou družice."
                  : "")}
      </p>

      {/* <b>Jména na jeden dotek</b> (Filip, 10. 10. 2026: „jede a tahá se
          se závažím a lany na motoráku, není dobré ho zatěžovat formem
          a textíky"). Nabídka je z toho, co se u téhle regaty už
          jmenovalo, doplněná o obvyklá jména — psaní zůstává jako
          záložní cesta, ne jako hlavní. */}
      <fieldset className="volby">
        <legend>Čím ta bóje je</legend>
        <div className="chipy">
          {navrhy.map((n) => (
            <button
              key={n}
              type="button"
              className={nazev === n ? "chip vybrany" : "chip"}
              onClick={() => setNazev(nazev === n ? "" : n)}
            >
              {n}
            </button>
          ))}
        </div>
        <details>
          <summary>Jiné jméno</summary>
          <input
            type="text"
            value={nazev}
            onChange={(e) => setNazev(e.target.value)}
            maxLength={nejvicZnaku}
            placeholder="Např. bóje 1, start levý, cíl"
          />
        </details>
      </fieldset>

      {/* Barva je vlastnost, kterou stavitel vidí před sebou — ukázat ji
          jde líp barvou než jménem v rozbalovátku. */}
      <fieldset className="volby">
        <legend>Barva</legend>
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
              onClick={() => setBarva(barva === b ? "" : b)}
            />
          ))}
        </div>
      </fieldset>

      <details className="volby">
        <summary>
          Tvar a pořadí{" "}
          <span className="poznamka">
            {prenastavuje ? "převezmou se po staré bóji" : "nepovinné"}
          </span>
        </summary>

        <div className="chipy">
          {(Object.keys(NAZVY_TVARU) as NonNullable<TvarBoje>[]).map((x) => (
            <button
              key={x}
              type="button"
              className={tvar === x ? "chip vybrany" : "chip"}
              onClick={() => setTvar(tvar === x ? "" : x)}
            >
              <svg viewBox="0 0 22 22" width="18" height="18" aria-hidden="true">
                <ZnakBoje x={11} y={11} r={7} barva={barva || undefined} tvar={x} />
              </svg>{" "}
              {NAZVY_TVARU[x]}
            </button>
          ))}
        </div>

        <label>
          Pořadí na trati
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={poradi}
            onChange={(e) => setPoradi(e.target.value)}
            placeholder={prenastavuje ? "převezme se po staré bóji" : "nechej prázdné: zařadí se za poslední"}
          />
        </label>

        {znakPodleVyhlasky(barva || undefined, tvar || undefined) && (
          <span className="poznamka">
            Tahle kombinace je podle vyhlášky{" "}
            <b>{znakPodleVyhlasky(barva || undefined, tvar || undefined)}</b>.
          </span>
        )}
      </details>

      {/* <b>Dva nástroje na dvě situace</b> (Filip, 10. 10. 2026): bóji,
          kterou právě spouštíš do vody, pípneš; molo na druhém břehu
          vybereš z mapy, protože tam jezdit nemusíš. Proto stojí vedle
          sebe, a ne v rozbalovátku — mají mít stejně blízko. */}
      <div className="tlacitka">
        <button type="button" onClick={pipni} disabled={!muzuPipnout}>
          {posilam ? "Posílám…" : prenastavuje ? "Pípnout novou polohu" : "Pípnout tady"}
        </button>
        <button
          type="button"
          className="jinak"
          onClick={() => setZMapy(true)}
          disabled={posilam || zMapy || nazev.trim().length === 0}
        >
          {nazev.trim().length === 0 ? "Nejdřív vyber, čím ta bóje je" : "Vybrat z mapy"}
        </button>
      </div>

      {zMapy && (
        <MapkaVyber
          // U přenastavení se otevře na staré poloze té bóje (Filip,
          // 10. 10. 2026). Bóji se posouvá o kus, ne na druhý konec
          // přehrady, takže je to ta nejbližší známá pravda — a je blíž
          // než i vlastní poloha, protože z mapy se vybírá právě tehdy,
          // když u ní člověk nestojí.
          //
          // Jinak tam, kde člověk zrovna stojí; u stolu poloha není, tak
          // u poslední bóje na trati.
          stred={
            prenastavuje
              ? { sirka: prenastavuje.sirka, delka: prenastavuje.delka }
              : (poloha ?? stred)
          }
          vyber={vezmiZMapy}
          zrus={() => setZMapy(false)}
          cekam={posilam}
        />
      )}

      {chyba && (
        <p className="hlaska chyba" role="alert">
          {chyba}
        </p>
      )}
      {hotovo && (
        <p className="hlaska" role="status">
          {hotovo}
        </p>
      )}

      <ZOdkazu
        serie={serie}
        zavod={zavod}
        nazev={nazev}
        poradi={poradi}
        prenastavuje={prenastavuje}
        poUlozeni={(zprava) => {
          poUlozeni.current = true;
          setHotovo(zprava);
          setNazev("");
          setPoradi("");
          router.refresh();
        }}
      />
    </section>
  );
}

/**
 * Poloha z cizího zápisu — souřadnic, odkazu do mapy, QR kódu.
 *
 * <b>Je to cesta pro nestandardní případ</b> (Filip, 9. 10. 2026): zapíše
 * ji někdo u počítače za stavitele, který pípat neumí, nebo ji rozhodčí
 * dostane po telefonu od člověka mimo proces — *„ukotvi mi to tam a pošli
 * mi odkaz v mapě"*. Z mobilu se pípá z GPS a bod, který je vidět na
 * mapě, se bere křížkem výš; tohle zůstává pro polohu, kterou někdo
 * poslal hotovou.
 *
 * <b>Nejdřív se ukáže, čemu obrazovka rozumí, a teprve pak se staví.</b>
 * Špatně přečtená souřadnice posune celou trať a poznalo by se to až na
 * vodě; jedno klepnutí navíc je proti tomu nic. Bod vybraný křížkem
 * tuhle mezizastávku nemá, protože je vidět na mapě sám.
 *
 * <b>Nečeká na polohu z telefonu.</b> U stolu žádná není a tenhle blok na
 * ní nesmí viset.
 */
function ZOdkazu({
  serie,
  zavod,
  nazev,
  poradi,
  prenastavuje,
  poUlozeni,
}: {
  serie: string;
  zavod: string;
  nazev: string;
  poradi: string;
  prenastavuje: { id: number; nazev: string } | null;
  poUlozeni: (zprava: string) => void;
}) {
  const [vstup, setVstup] = useState("");
  const [ctu, setCtu] = useState(false);
  const [precteno, setPrecteno] = useState<(Cteni & { odkud?: string }) | null>(null);
  const [zdroj, setZdroj] = useState<ZdrojPolohy>("Mapa");
  const [posilam, setPosilam] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  async function prect(text: string, odkud: ZdrojPolohy) {
    setCtu(true);
    setChyba(null);
    setZdroj(odkud);
    setPrecteno(await prectiAkce(text));
    setCtu(false);
  }

  /**
   * QR z obrázku. <b>Knihovna se stahuje až tady</b>, ne při načtení
   * stránky — pípání u vody ji nepotřebuje a je to 45 kB.
   *
   * Kreslí se na bílý podklad s okrajem: QR potřebuje kolem sebe klidovou
   * zónu a fotka obrazovky ji často nemá. Bez okraje se tenhle konkrétní
   * kód z Mapy.com nepřečetl (ověřeno 9. 10. 2026).
   */
  async function zFotky(soubor: File) {
    setCtu(true);
    setChyba(null);
    setPrecteno(null);
    try {
      const jsQR = (await import("jsqr")).default;
      const obrazek = await createImageBitmap(soubor);

      const nejvic = 1400;
      const mera = Math.min(1, nejvic / Math.max(obrazek.width, obrazek.height));
      const sirka = Math.round(obrazek.width * mera);
      const vyska = Math.round(obrazek.height * mera);
      const okraj = Math.round(Math.max(sirka, vyska) * 0.08);

      const platno = document.createElement("canvas");
      platno.width = sirka + okraj * 2;
      platno.height = vyska + okraj * 2;
      const kresba = platno.getContext("2d");
      if (!kresba) throw new Error("plátno");
      kresba.fillStyle = "#fff";
      kresba.fillRect(0, 0, platno.width, platno.height);
      kresba.drawImage(obrazek, okraj, okraj, sirka, vyska);

      const body = kresba.getImageData(0, 0, platno.width, platno.height);
      const nalezeno = jsQR(body.data, platno.width, platno.height, {
        inversionAttempts: "attemptBoth",
      });

      if (!nalezeno) {
        setCtu(false);
        setChyba(
          "V té fotce žádný QR kód nevidím. Zkus ji oříznout na samotný kód, " +
            "nebo vlož odkaz rovnou.",
        );
        return;
      }

      setVstup(nalezeno.data);
      setCtu(false);
      await prect(nalezeno.data, "Qr");
    } catch {
      setCtu(false);
      setChyba("Fotku se nepodařilo přečíst.");
    }
  }

  async function postav() {
    if (precteno?.stav !== "poloha") return;

    setPosilam(true);
    setChyba(null);

    const vysledek = await pipniAkce(serie, zavod, {
      nazev,
      poradi: Number(poradi) || 0,
      sirka: precteno.poloha.sirka,
      delka: precteno.poloha.delka,
      presnostM: null,
      nahrazujeId: prenastavuje?.id ?? null,
      zdroj,
    });

    setPosilam(false);
    if (vysledek.chyba) {
      setChyba(vysledek.chyba);
      return;
    }

    setVstup("");
    setPrecteno(null);
    poUlozeni(
      prenastavuje
        ? `Bóje „${nazev.trim()}“ je přenastavená podle mapy. Ta předchozí zůstala v historii.`
        : `Bóje „${nazev.trim()}“ stojí na trati podle mapy.`,
    );
  }

  return (
    <details className="zmapy">
      <summary>Máš polohu od někoho jiného? Odkaz nebo QR kód</summary>

      <p className="poznamka">
        Pro případ, kdy u bóje nikdo s telefonem není a polohu ti někdo
        pošle odkazem nebo ji opíšeš odjinud. Bod, který prostě vidíš na
        mapě, vezmi radši křížkem — tlačítkem <b>Vybrat z mapy</b> výš.{" "}
        <b>Uloží se jako odečtená</b>, bez přesnosti, protože mapa nic
        neměří.
      </p>

      <label className="siroke">
        Souřadnice nebo odkaz z mapy
        <textarea
          rows={2}
          value={vstup}
          onChange={(e) => setVstup(e.target.value)}
          placeholder="49.4957253N, 14.1841419E — nebo odkaz z Mapy.com či Google Maps"
        />
      </label>

      <div className="tlacitka">
        <button type="button" onClick={() => prect(vstup, "Mapa")} disabled={ctu || !vstup.trim()}>
          {ctu ? "Čtu…" : "Přečíst"}
        </button>

        <label className="jako-tlacitko">
          Načíst z fotky QR kódu
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const soubor = e.target.files?.[0];
              // Vstup se vyprázdní, ať jde tatáž fotka vybrat znovu.
              e.target.value = "";
              if (soubor) zFotky(soubor);
            }}
          />
        </label>
      </div>

      {precteno?.stav === "nic" && (
        <p className="hlaska chyba" role="alert">
          {precteno.duvod}
        </p>
      )}

      {precteno?.stav === "poloha" && (
        <div className="hlaska" role="status">
          <b>
            {precteno.poloha.sirka.toFixed(5)}, {precteno.poloha.delka.toFixed(5)}
          </b>{" "}
          — {precteno.jak}.{" "}
          <a
            href={`https://www.openstreetmap.org/?mlat=${precteno.poloha.sirka}&mlon=${precteno.poloha.delka}#map=17/${precteno.poloha.sirka}/${precteno.poloha.delka}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Zkontrolovat na mapě
          </a>
          {precteno.odkud && (
            <span className="detail">Zkratka vedla na {precteno.odkud}</span>
          )}
          <p className="poznamka">
            Jméno a pořadí se berou z polí výš. Zapíše se to jako{" "}
            {zdroj === "Qr" ? "poloha z QR kódu" : "poloha z mapy"}.
          </p>
          <button type="button" onClick={postav} disabled={posilam || nazev.trim().length === 0}>
            {posilam
              ? "Posílám…"
              : nazev.trim().length === 0
                ? "Nejdřív napiš, čím ta bóje je"
                : prenastavuje
                  ? "Přenastavit sem"
                  : "Postavit sem"}
          </button>
        </div>
      )}

      {chyba && (
        <p className="hlaska chyba" role="alert">
          {chyba}
        </p>
      )}
    </details>
  );
}
