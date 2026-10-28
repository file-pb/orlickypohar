"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Nahrání hlasové odpovědi z mikrofonu.
 *
 * <b>Hlas je nosná část dotazníku, ne doplněk.</b> Miloš odpovídá hlasem
 * a je v tom výborný: osm otázek vyřídil třinácti nahrávkami za třináct
 * minut. Proto je tlačítko u každé otázky a ne schované někde pod
 * „pokročilé".
 *
 * <b>Jediné místo téhle obrazovky s javascriptem</b>, stejně jako cílová
 * obrazovka ve výsledcích: mikrofon bez něj nejde. Zaškrtnutí a text se
 * ukládají obyčejným formulářem, takže na telefonu bez javascriptu
 * zůstanou funkční.
 *
 * <b>Formát se nevnucuje.</b> Chrome nahrává Opus ve WebM, Safari na
 * iPhonu AAC v MP4 — a na čí telefon odpověď přijde, nevíme. Prohlížeči se
 * proto nabídne, co umí, a server si formát pozná z obsahu
 * (`Dotazovani.PoznejZvuk`). Vnucovat jeden by znamenalo, že na polovině
 * telefonů nahrávání nejde a nikdo nepozná proč.
 */

/** Co prohlížeči nabídnout, v pořadí podle toho, co je menší. */
const FORMATY = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "audio/mpeg",
];

type Stav = "pripraveno" | "nahravam" | "posilam" | "chyba";

export function Hlas({
  serie,
  sada,
  kod,
}: {
  serie: string;
  sada: string;
  /** Kód otázky, ke které nahrávka patří. */
  kod: string;
}) {
  const router = useRouter();
  const [stav, setStav] = useState<Stav>("pripraveno");
  const [chyba, setChyba] = useState<string | null>(null);
  const [sekund, setSekund] = useState(0);
  const [umi, setUmi] = useState(true);

  const zapisovac = useRef<MediaRecorder | null>(null);
  const kusy = useRef<Blob[]>([]);
  const zacatek = useRef(0);

  // `MediaRecorder` nemá starý prohlížeč a `getUserMedia` chybí i na
  // nezabezpečeném připojení. Tlačítko, které nic neudělá, je horší než
  // věta, že to tady nejde.
  useEffect(() => {
    setUmi(
      typeof MediaRecorder !== "undefined" &&
        Boolean(navigator.mediaDevices?.getUserMedia),
    );
  }, []);

  // Běžící čas nahrávky. Je to jediná zpětná vazba, že mikrofon doopravdy
  // bere — bez ní člověk mluví do něčeho, o čem neví, jestli poslouchá.
  useEffect(() => {
    if (stav !== "nahravam") return;
    const tik = setInterval(
      () => setSekund(Math.round((Date.now() - zacatek.current) / 1000)),
      250,
    );
    return () => clearInterval(tik);
  }, [stav]);

  // Zhasnutá karta nebo odchod ze stránky uprostřed nahrávání nesmí nechat
  // mikrofon zapnutý.
  useEffect(
    () => () => {
      zapisovac.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  async function zacni() {
    setChyba(null);
    try {
      const proud = await navigator.mediaDevices.getUserMedia({ audio: true });
      const typ = FORMATY.find((t) => MediaRecorder.isTypeSupported(t));
      // Bez `mimeType` si prohlížeč vybere sám — a to je správně, protože
      // nevyjmenovaný formát je pořád lepší než odmítnuté nahrávání.
      const zapis = new MediaRecorder(proud, typ ? { mimeType: typ } : undefined);

      kusy.current = [];
      zapis.ondataavailable = (e) => {
        if (e.data.size > 0) kusy.current.push(e.data);
      };
      zapis.onstop = () => {
        proud.getTracks().forEach((t) => t.stop());
        void posli(new Blob(kusy.current, { type: zapis.mimeType }));
      };

      zapisovac.current = zapis;
      zacatek.current = Date.now();
      setSekund(0);
      // Po vteřinových kusech: dlouhá odpověď se tak nedrží celá v paměti
      // a zastavení nemá co dohánět.
      zapis.start(1000);
      setStav("nahravam");
    } catch (e) {
      setStav("chyba");
      setChyba(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Prohlížeč nepustil mikrofon. Povol ho v nastavení stránky a zkus to znovu."
          : "Mikrofon se nepodařilo zapnout. Odpověz prosím textem.",
      );
    }
  }

  function skonci() {
    setStav("posilam");
    zapisovac.current?.stop();
  }

  async function posli(nahravka: Blob) {
    if (nahravka.size === 0) {
      setStav("chyba");
      setChyba("Nahrávka je prázdná. Zkus to prosím znovu.");
      return;
    }

    const telo = new FormData();
    // Koncovka jen kvůli tomu, aby soubor šel otevřít ručně; server formát
    // pozná z obsahu.
    telo.set("nahravka", nahravka, `odpoved-${kod}.${koncovka(nahravka.type)}`);
    telo.set("sekund", String(Math.max(1, Math.round((Date.now() - zacatek.current) / 1000))));

    try {
      const odpoved = await fetch(
        `/sprava/${encodeURIComponent(serie)}/oponentura/${encodeURIComponent(sada)}` +
          `/nahravky/${encodeURIComponent(kod)}`,
        { method: "POST", body: telo },
      );

      if (!odpoved.ok) {
        const telo = (await odpoved.json().catch(() => null)) as { error?: string } | null;
        setStav("chyba");
        setChyba(telo?.error ?? `Uložení se nepovedlo (${odpoved.status}).`);
        return;
      }

      setStav("pripraveno");
      setSekund(0);
      // Nahrávka se pak vypisuje ze serveru jako všechno ostatní — vlastní
      // seznam v prohlížeči by byl druhá pravda o tom, co je uložené.
      router.refresh();
    } catch {
      setStav("chyba");
      setChyba("Odeslání se nepovedlo. Zkus to prosím znovu.");
    }
  }

  if (!umi)
    return (
      <p className="poznamka">
        Tenhle prohlížeč neumí nahrávat z mikrofonu. Odpověz prosím textem.
      </p>
    );

  return (
    <div className="hlas">
      {stav === "nahravam" ? (
        <button type="button" className="hlas-stop" onClick={skonci}>
          Zastavit a uložit ({cas(sekund)})
        </button>
      ) : (
        <button
          type="button"
          className="hlas-start"
          onClick={() => void zacni()}
          disabled={stav === "posilam"}
        >
          {stav === "posilam" ? "Ukládám…" : "Odpovědět hlasem"}
        </button>
      )}

      {stav === "nahravam" && (
        <span className="hlas-bezi" role="status">
          Nahrávám — mluv a pak dej zastavit.
        </span>
      )}
      {chyba && (
        <span className="hlas-chyba" role="alert">
          {chyba}
        </span>
      )}
    </div>
  );
}

/** `audio/webm;codecs=opus` → `webm`. */
function koncovka(typ: string) {
  const zaklad = typ.split(";")[0];
  return (
    {
      "audio/webm": "webm",
      "audio/ogg": "ogg",
      "audio/mp4": "m4a",
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
    }[zaklad] ?? "bin"
  );
}

const cas = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
