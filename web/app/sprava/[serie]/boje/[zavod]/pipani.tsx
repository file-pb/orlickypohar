"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { pipniAkce } from "./akce";

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
}: {
  serie: string;
  zavod: string;
  /** Když se přenastavuje, id a jméno bóje, která tam stojí dosud. */
  prenastavuje: { id: number; nazev: string } | null;
  nejvicZnaku: number;
}) {
  const router = useRouter();
  const [poloha, setPoloha] = useState<Poloha | null>(null);
  const [chybaPolohy, setChybaPolohy] = useState<string | null>(null);
  const [nazev, setNazev] = useState(prenastavuje?.nazev ?? "");
  const [poradi, setPoradi] = useState("");
  const [posilam, setPosilam] = useState(false);
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

  return (
    <section className="formular">
      <h2>{prenastavuje ? `Přenastavit „${prenastavuje.nazev}“` : "Pípnout bóji"}</h2>

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

      <label>
        Čím ta bóje je
        <input
          type="text"
          value={nazev}
          onChange={(e) => setNazev(e.target.value)}
          maxLength={nejvicZnaku}
          placeholder="Např. bóje 1, start levý, cíl"
        />
      </label>

      <label>
        Pořadí na trati (nepovinné)
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={poradi}
          onChange={(e) => setPoradi(e.target.value)}
          placeholder={prenastavuje ? "převezme se po staré bóji" : "nechej prázdné: zařadí se za poslední"}
        />
      </label>

      <button type="button" onClick={pipni} disabled={!muzuPipnout}>
        {posilam ? "Posílám…" : prenastavuje ? "Pípnout novou polohu" : "Pípnout tady"}
      </button>

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
    </section>
  );
}
