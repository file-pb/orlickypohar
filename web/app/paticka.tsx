import { nactiVitr } from "@/lib/vitr";
import { nactiVystrahy } from "@/lib/chmi";
import { nactiTeplotuHladiny, centra } from "@/lib/satelit";
import { barvaDbz, DEST_DBZ, nactiRadar, type Krok } from "@/lib/radar";
import { nactiKoupani, STUPNE } from "@/lib/koupani";
import { nactiOrlik, zmenaCm } from "@/lib/vodocet";
import { Rukav } from "@/app/vitr";
import { PatickaLista } from "@/app/paticka-lista";

/**
 * Souhrn pro zavřenou lištu počasí.
 *
 * <b>Čísla a grafika, ne nápis „Počasí"</b> (Filip, 11. 10. 2026: *„do té
 * lišty dej data a grafiku i z ostatních widgetů, ať se to trochu zaplní"*).
 * Kdo se dívá na vodu, chce vidět kolik stupňů, odkud fouká a jestli hladina
 * stoupá — lišta, která to neřekne, je jen další tlačítko.
 *
 * <b>Pořadí je pořadí důležitosti</b>, protože na úzkém displeji se konec
 * uřízne (lišta se dá posunout do strany). Napřed to, co mění rozhodnutí
 * vyplout: výstraha a déšť. Pak vítr, voda, hladina a kvalita.
 *
 * <b>Data se nenačítají podruhé.</b> Tytéž funkce volají i widgety uvnitř
 * panelu a všechny jsou za cache (`unstable_cache`, případně `fetch`
 * s `revalidate`), takže druhé volání v témže vykreslení nic nestojí.
 * Vodočet je výjimka v tom, že jeho widget je v boku, ne v panelu — číslo
 * hladiny na liště je ale to, kvůli čemu se na vodočet nejčastěji kouká.
 *
 * <b>Co se nepovede načíst, prostě chybí.</b> Lišta je doplněk; kvůli
 * výpadku ČHMÚ nesmí spadnout stránka.
 */

/** Šipka trendu. Stejné čtení jako ve widgetech: dolů klesá, nahoru stoupá. */
function Trend({ zmena, popis }: { zmena: number; popis: string }) {
  if (zmena === 0) return null;
  return (
    <span className={`paticka-trend ${zmena > 0 ? "nahoru" : "dolu"}`} title={popis}>
      {zmena > 0 ? "↑" : "↓"}
    </span>
  );
}

/** Pás srážek na příští hodinu v barvách stupnice ČHMÚ, zmenšený na lištu. */
function PasekRadaru({ kroky }: { kroky: Krok[] }) {
  return (
    <span className="paticka-radar" aria-hidden="true">
      {kroky.map((k) => (
        <span
          key={k.minut}
          style={k.dbz !== null ? { background: barvaDbz(k.dbz) } : undefined}
        />
      ))}
    </span>
  );
}

const cislo = (n: number, desetinnych = 1) =>
  n.toLocaleString("cs-CZ", { maximumFractionDigits: desetinnych });

async function souhrn() {
  const [vitr, vystrahy, hladina, radar, koupani, vodocet] = await Promise.all([
    nactiVitr().catch(() => []),
    nactiVystrahy().catch(() => null),
    nactiTeplotuHladiny().catch(() => null),
    nactiRadar().catch(() => null),
    nactiKoupani().catch(() => []),
    nactiOrlik().catch(() => null),
  ]);

  // Co platí hned, jde dopředu; klidný stav dozadu. Pořadí je to, co na
  // telefonu rozhoduje, co ještě bude vidět.
  const napred: React.ReactNode[] = [];
  const polozky: React.ReactNode[] = [];

  // Výstrahy jsou na liště vždycky, i když žádná neplatí (Filip, 11. 10.
  // 2026). Mlčení by si čtenář přeložil jako „nic nehrozí" — a to je
  // tvrzení, které při výpadku ČHMÚ nikdo neověřil. Dutá tečka proto
  // znamená „nevíme", zelená „nic neplatí", štítek „tohle platí".
  const nejvyssi = vystrahy?.vystrahy.reduce<number | null>(
    (nej, v) => (nej === null || v.stupen > nej ? v.stupen : nej),
    null,
  );
  if (nejvyssi != null)
    napred.push(
      <span key="vystraha" className={`paticka-udaj paticka-vystraha stupen-${nejvyssi}`}>
        {vystrahy!.vystrahy.length === 1 ? vystrahy!.vystrahy[0].jev : "výstrahy ČHMÚ"}
      </span>,
    );
  else
    polozky.push(
      <span key="vystraha" className="paticka-udaj">
        <span
          className={`vystrahy-tecka${vystrahy ? "" : " nezname"}`}
          aria-hidden="true"
        />
        {vystrahy ? "bez výstrah" : "výstrahy nenačteny"}
      </span>,
    );

  // Radar je na liště vždycky, ne jen když prší: pásek ukazuje, jak hustě
  // a kdy, a prázdný pásek je odpověď „do hodiny nic". Věta se mění.
  const prsi = radar?.kroky.find((k) => k.dbz !== null && k.dbz >= DEST_DBZ);
  if (radar) {
    const polozka = (
      <span key="dest" className={`paticka-udaj${prsi ? " paticka-dest" : ""}`}>
        <PasekRadaru kroky={radar.kroky} />
        {prsi ? (prsi.minut === 0 ? "prší" : `déšť za ${prsi.minut} min`) : "bez srážek"}
      </span>
    );
    (prsi ? napred : polozky).push(polozka);
  }

  const ted = vitr[0]?.historie.at(-1);
  if (ted)
    polozky.push(
      <span key="vitr" className="paticka-udaj">
        <Rukav smer={ted.smer} rychlost={ted.rychlost} />
        {cislo(ted.rychlost)} m/s
        {/* Nárazy jsou to, co převrhne loď, ne průměr. Lomítkem, ne větou:
            na liště je místo na číslo, ne na „v nárazech". */}
        {ted.naraz !== null && (
          <span className="paticka-vedle" title={`v nárazech ${cislo(ted.naraz)} m/s`}>
            / {cislo(ted.naraz)}
          </span>
        )}
      </span>,
    );

  const nadrz = hladina ? centra(hladina.snimky, new Date())[0] : undefined;
  if (nadrz)
    polozky.push(
      <span key="voda" className="paticka-udaj">
        <span className="paticka-stitek">voda</span>
        {cislo(nadrz.teplota)} °C
        {nadrz.zmena != null && (
          <Trend zmena={nadrz.zmena} popis={`${cislo(Math.abs(nadrz.zmena))} °C proti minulému snímku`} />
        )}
      </span>,
    );

  if (vodocet) {
    const zmena = zmenaCm(vodocet.historie, 6);
    polozky.push(
      <span key="hladina" className="paticka-udaj">
        <span className="paticka-stitek">hladina</span>
        {cislo(vodocet.hladina, 2)} m
        <Trend zmena={zmena} popis={`${Math.abs(zmena)} cm za 6 h`} />
      </span>,
    );
  }

  // Nejhorší stupeň, ne všechna místa: na liště je prostor na jedno slovo
  // a zajímá to horší z nich.
  const nejhorsi = koupani.reduce<number | null>(
    (nej, k) => (nej === null || k.stupen > nej ? k.stupen : nej),
    null,
  );
  if (nejhorsi != null)
    polozky.push(
      <span key="koupani" className="paticka-udaj">
        <span className={`koupani-tecka stupen-${nejhorsi}`} aria-hidden="true" />
        {STUPNE[nejhorsi]}
      </span>,
    );

  return [...napred, ...polozky];
}

/**
 * Lišta s počasím a vodou u spodku okna. Widgety, které nejsou v boku,
 * bydlí od 11. 10. 2026 tady — viz `PatickaLista`, proč.
 */
export async function PatickaPocasi({ children }: { children: React.ReactNode }) {
  const polozky = await souhrn();

  return <PatickaLista souhrn={polozky}>{children}</PatickaLista>;
}
