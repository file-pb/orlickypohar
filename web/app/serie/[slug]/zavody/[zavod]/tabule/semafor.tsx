import { useEffect, useState } from "react";
import type { Snimek } from "@/lib/tabule";
import { VlajkaStavu } from "./vlajka";

/**
 * Semafor stavu rozjížďky (Filip, 15. 10. 2026: *„nějaký semaforek
 * s tím, jaký je stav rozjížďky"*).
 *
 * <b>Svítí jedno světlo, ostatní jsou zhasnutá</b> — ne tři barevné
 * tečky vedle sebe. Zhasnutá světla nesou význam: divák vidí, že stav
 * má tři polohy a ve které z nich se zrovna je, aniž by musel číst.
 *
 * <b>Přestavba trati přebíjí stav rozjížďky.</b> Když se čeká na trať,
 * „čeká na start" by bylo zavádějící: nečeká se na startovní proceduru,
 * ale na to, až tým postaví. Zelená v takové chvíli svítit nesmí.
 */

type Svetlo = "ceka" | "jede" | "dojeto" | "zruseno";

const POPIS: Record<Svetlo, string> = {
  ceka: "čeká na start",
  jede: "jede se",
  dojeto: "dojeto",
  zruseno: "zrušeno",
};

export function Semafor({ snimek, ted }: { snimek: Snimek; ted: number }) {
  const jede = snimek.rozjizdky.find((r) => r.stav === "Probiha");
  const ceka = snimek.rozjizdky.find((r) => r.stav === "Planovana");
  const posledni = [...snimek.rozjizdky].reverse().find((r) => r.stav === "Dokoncena");
  const rozjizdka = jede ?? ceka ?? posledni;
  if (!rozjizdka) return null;

  const prestavba = snimek.trat?.prestavba === true;
  const svetlo: Svetlo = prestavba
    ? "ceka"
    : rozjizdka.stav === "Probiha"
      ? "jede"
      : rozjizdka.stav === "Dokoncena"
        ? "dojeto"
        : rozjizdka.stav === "Zrusena"
          ? "zruseno"
          : "ceka";

  const popis = prestavba ? "čeká se na trať" : POPIS[svetlo];

  // Kdo je vyřízený: v cíli, nebo s kódem (DNF, DNS…). Na zbytek se čeká.
  // <b>Kód se počítá mezi vyřízené</b>, jinak by tabule do večera tvrdila,
  // že se čeká na loď, která vůbec nevyjela.
  const vCili = rozjizdka.poradi.filter((v) => v.misto !== null).length;
  const vyrizeno = rozjizdka.poradi.filter((v) => v.misto !== null || v.kod).length;
  const ceka_se = Math.max(0, snimek.lode.length - vyrizeno);

  const start = rozjizdka.startV ? Date.parse(rozjizdka.startV) : null;
  // Stopky běží od startu, odpočet do startu. Obojí z téhož času —
  // rozdíl je jen ve znaménku a v tom, co se o něm napíše.
  const odStartu = start !== null ? Math.floor((ted - start) / 1000) : null;
  // Všichni dojeli nebo mají kód, a rozjížďka pořád „běží": stopky nemají
  // co měřit a čekat se taky na nic nečeká. Je to jasná logická akce,
  // která má přednost před hodinami.
  const dojeli = svetlo === "jede" && snimek.lode.length > 0 && ceka_se === 0;

  const casomira =
    dojeli
      ? { popis: "rozjížďka", hodnota: "čeká na uzavření" }
      : svetlo === "jede" && odStartu !== null && zapomenuta(odStartu, snimek.oknoDo, ted)
      ? { popis: "rozjížďka", hodnota: "neuzavřená" }
      : svetlo === "jede" && odStartu !== null && odStartu >= 0
      ? { popis: "od startu", hodnota: hodiny(odStartu) }
      : svetlo === "ceka" && !prestavba && odStartu !== null && odStartu < 0
        ? { popis: "do startu", hodnota: hodiny(-odStartu) }
        : null;

  return (
    <div className={`semafor sviti-${svetlo}`}>
      <div className="horni">
        <div className="svetla" aria-hidden="true">
          <i className="ceka" />
          <i className="jede" />
          <i className="dojeto" />
        </div>
        <div className="co">
          <b>{popis}</b>
          <span>{rozjizdka.cislo}. rozjížďka</span>
        </div>
      </div>

      {casomira && (
        <div className="casomira">
          <b>{casomira.hodnota}</b>
          <span>{casomira.popis}</span>
        </div>
      )}

      {(vCili > 0 || ceka_se > 0) && svetlo !== "ceka" && (
        <p className="pocty">
          <b>{vCili}</b> v cíli
          {ceka_se > 0 && (
            <>
              {" · čeká se na "}
              <b>{ceka_se}</b>
            </>
          )}
        </p>
      )}
    </div>
  );
}

/**
 * Čas jako h:mm:ss, nebo mm:ss do hodiny. <b>Vteřiny vždycky</b>: na
 * odpočtu před startem je to to jediné, co se hýbe, a bez nich by
 * obrazovka vypadala zaseknutě.
 */
/**
 * Odkdy je čas od startu nesmysl.
 *
 * <b>Rozjížďka, kterou nikdo neuzavřel, běží dál</b> — a stopky s ní.
 * Na mocku z toho bylo „od startu 3020:59:39", tedy sto dvacet pět dní
 * (24. 10. 2026). Divák z takového čísla nic nemá a pořadateli má říct
 * něco jiného: že se zapomnělo zastavit čas.
 *
 * <b>Mez se nevymýšlí, bere se z okna té regaty</b> (Filip, 24. 10. 2026:
 * *„u 24h je to více než okno dne"*, *„24 se jede klidně 30 h i s tou
 * přípravou a dojezdy"*). Okno si pořadatel nastavuje při rozpravě, takže
 * na dvacetičtyřhodinovce je dlouhé a na odpolední regatě krátké; za jeho
 * tvrdým koncem tracker nic nezapisuje, a co „běží" i potom, neběží
 * doopravdy. Kulaté číslo by jedné regatě lhalo vždycky.
 *
 * Náhradní mez platí jen pro regatu bez okna — tedy do první rozpravy.
 * <b>Čtyřicet hodin</b> (Filip, 24. 10. 2026: *„maratony zavírej po
 * 40 hodinách, pokud nedojde k nějaké jasné logické akci jako
 * vyhodnocení nebo dojezdu všech lodí"*): dvacetičtyřhodinovka zabere
 * i s přípravou a dojezdy ke třiceti hodinám, takže čtyřicet nepřekročí
 * nic, co se doopravdy jede.
 */
const BEZ_OKNA_S = 40 * 3600;

/**
 * Běží rozjížďka tak dlouho, že ji zjevně nikdo neuzavřel?
 *
 * <b>Čas je až poslední pojistka.</b> Napřed se ptáme na jasnou věc —
 * jestli jsou všechny lodě vyřízené —, a teprve potom na hodiny. Mez
 * přitom není kulaté číslo: bere se z okna té regaty, protože za jeho
 * tvrdým koncem tracker nic nezapisuje a co „běží" i potom, neběží
 * doopravdy.
 */
function zapomenuta(odStartu: number, oknoDo: string | null, ted: number): boolean {
  if (oknoDo === null) return odStartu >= BEZ_OKNA_S;
  const konec = Date.parse(oknoDo);
  return Number.isFinite(konec) && ted > konec;
}

function hodiny(sekund: number) {
  const h = Math.floor(sekund / 3600);
  const m = Math.floor((sekund % 3600) / 60);
  const se = sekund % 60;
  const dve = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${dve(m)}:${dve(se)}` : `${m}:${dve(se)}`;
}

/**
 * Poslední tři lodě v cíli (Filip, 15. 10. 2026: *„ti, kdo právě
 * dojeli — na to stačí widget s pár řádky"*).
 *
 * <b>Poslední podle pořadí v cíli, ne podle času.</b> Výsledek nese
 * uplynulý čas, ne hodinu dojezdu, takže „kdo dojel naposledy" se dá
 * poznat jen z toho, kdo má nejvyšší místo. Přes rozjížďky se to řetězí:
 * když v té běžící dojely teprve dvě lodě, třetí řádek je poslední
 * z předchozí.
 */
export function Dojezdy({ snimek }: { snimek: Snimek }) {
  // <b>Zrušená rozjížďka tady nemá co dělat.</b> Dojezdy v ní zůstávají
  // zapsané a na výsledkové stránce jsou vidět, ale „Právě dojeli" je
  // hlášení o závodě, ne archiv — po zrušení by tabule dál oznamovala
  // pořadí, které neplatí (17. 10. 2026).
  const vsechny = snimek.rozjizdky
    .filter((r) => r.stav !== "Zrusena")
    .flatMap((r) =>
      r.poradi
        .filter((v) => v.misto !== null)
        .sort((a, b) => a.misto! - b.misto!)
        .map((v) => ({ ...v, rozjizdka: r.cislo })),
    );
  const posledni = vsechny.slice(-3).reverse();
  if (posledni.length === 0) return null;

  return (
    <section className="dojeli">
      <h2>Právě dojeli</h2>
      <ol>
        {posledni.map((v) => (
          <li key={`${v.rozjizdka}-${v.lod}`}>
            <b>{v.misto}.</b> {v.lod}
            <span className="detail">
              {v.rozjizdka}. rozjížďka{v.kod ? ` · ${v.kod}` : ""}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Stav jako tenký proužek nahoře (Filip, 24. 10. 2026: *„tu startovačku
 * dej jen jako info popup, jinak stav můžeme nějakým tenkým proužkem
 * s carrousel textem v barvě stavu nahoře"*).
 *
 * <b>Proč místo semaforu:</b> semafor zabíral roh obrazovky na údaj,
 * který se dá říct větou — a každý jeho centimetr jde z mapy. Změnu
 * stavu beztak oznamuje alert uprostřed, takže stálý widget říkal
 * podruhé totéž.
 *
 * Zprávy se střídají, protože na jeden řádek se nevejdou, a je jich
 * málo na to, aby se text musel posouvat: střídání se čte líp než
 * běžící pás.
 */
export function StavovyProuzek({
  snimek,
  ted,
  ukazkovePolohy,
}: {
  snimek: Snimek;
  ted: number;
  /** Jedou po mapě vymyšlené plavby? Pak to musí být napsané. */
  ukazkovePolohy?: boolean;
}) {
  const [kde, setKde] = useState(0);

  const jede = snimek.rozjizdky.find((r) => r.stav === "Probiha");
  const ceka = snimek.rozjizdky.find((r) => r.stav === "Planovana");
  const posledni = [...snimek.rozjizdky].reverse().find((r) => r.stav === "Dokoncena");
  const rozjizdka = jede ?? ceka ?? posledni;

  const prestavba = snimek.trat?.prestavba === true;
  const svetlo: Svetlo = !rozjizdka
    ? "ceka"
    : prestavba
      ? "ceka"
      : rozjizdka.stav === "Probiha"
        ? "jede"
        : rozjizdka.stav === "Dokoncena"
          ? "dojeto"
          : rozjizdka.stav === "Zrusena"
            ? "zruseno"
            : "ceka";

  const zpravy: string[] = [];
  if (rozjizdka) {
    const co = prestavba ? "čeká se na trať" : POPIS[svetlo];
    zpravy.push(`${rozjizdka.cislo}. rozjížďka — ${co}`);

    const start = rozjizdka.startV ? Date.parse(rozjizdka.startV) : null;
    const odStartu = start !== null ? Math.floor((ted - start) / 1000) : null;
    const vyrizeniVsichni =
      svetlo === "jede" &&
      snimek.lode.length > 0 &&
      rozjizdka.poradi.filter((v) => v.misto !== null || v.kod).length >= snimek.lode.length;

    if (vyrizeniVsichni) {
      zpravy.push("rozjížďka čeká na uzavření");
    } else if (svetlo === "jede" && odStartu !== null && zapomenuta(odStartu, snimek.oknoDo, ted)) {
      zpravy.push("rozjížďka neuzavřená");
    } else if (svetlo === "jede" && odStartu !== null && odStartu >= 0) {
      zpravy.push(`od startu ${hodiny(odStartu)}`);
    } else if (svetlo === "ceka" && !prestavba && odStartu !== null && odStartu < 0) {
      zpravy.push(`do startu ${hodiny(-odStartu)}`);
    }

    const vCili = rozjizdka.poradi.filter((v) => v.misto !== null).length;
    const vyrizeno = rozjizdka.poradi.filter((v) => v.misto !== null || v.kod).length;
    const cekaSe = Math.max(0, snimek.lode.length - vyrizeno);
    if (svetlo !== "ceka" && (vCili > 0 || cekaSe > 0)) {
      zpravy.push(cekaSe > 0 ? `${vCili} v cíli · čeká se na ${cekaSe}` : `${vCili} v cíli`);
    }
  }

  useEffect(() => {
    if (zpravy.length < 2) return;
    const tik = setInterval(() => setKde((k) => k + 1), 5000);
    return () => clearInterval(tik);
  }, [zpravy.length]);

  if (ukazkovePolohy) zpravy.push("polohy lodí jsou ukázkové — tracker zatím neposílá");

  if (zpravy.length === 0) return null;
  const zprava = zpravy[kde % zpravy.length];

  return (
    <p className={`stav-rozjizdky-tabule sviti-${svetlo}`} role="status">
      <VlajkaStavu stav={svetlo} />
      {/* Klíč na textu: při střídání naběhne animace znovu, jinak by se
          řádek jen přepsal a nikdo by si změny nevšiml. */}
      <span key={zprava}>{zprava}</span>
    </p>
  );
}
