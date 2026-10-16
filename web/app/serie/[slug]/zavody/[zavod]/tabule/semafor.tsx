import type { Snimek } from "@/lib/tabule";

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
  const casomira =
    svetlo === "jede" && odStartu !== null && odStartu >= 0
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
