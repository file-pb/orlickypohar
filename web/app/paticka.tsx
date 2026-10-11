import { nactiVitr } from "@/lib/vitr";
import { nactiVystrahy } from "@/lib/chmi";
import { nactiTeplotuHladiny, centra } from "@/lib/satelit";
import { DEST_DBZ, nactiRadar } from "@/lib/radar";
import { PatickaLista } from "@/app/paticka-lista";

/**
 * Souhrn pro zavřenou lištu počasí.
 *
 * <b>Čísla, ne nápis „Počasí".</b> Kdo se dívá na vodu, chce vědět kolik
 * stupňů a kolik fouká; lišta, která to neřekne, je jen další tlačítko.
 *
 * <b>Data se nenačítají podruhé.</b> Tytéž funkce volají i widgety uvnitř
 * panelu a všechny jsou za cache (`unstable_cache`, případně `fetch`
 * s `revalidate`), takže druhé volání v témže vykreslení nic nestojí.
 *
 * <b>Co se nepovede načíst, prostě chybí.</b> Lišta je doplněk; kvůli
 * výpadku ČHMÚ nesmí spadnout stránka. Výjimka je výstraha — o té se mlčet
 * nedá, a když se nedaří načíst, ví to panel uvnitř (`BokVystrahy`).
 */
async function souhrn() {
  const [vitr, vystrahy, hladina, radar] = await Promise.all([
    nactiVitr().catch(() => []),
    nactiVystrahy().catch(() => null),
    nactiTeplotuHladiny().catch(() => null),
    nactiRadar().catch(() => null),
  ]);

  const polozky: React.ReactNode[] = [];

  // Výstraha první a barevně: je to jediná položka, kvůli které má smysl
  // lištu otevřít hned.
  const nejvyssi = vystrahy?.vystrahy.reduce<number | null>(
    (nej, v) => (nej === null || v.stupen > nej ? v.stupen : nej),
    null,
  );
  if (nejvyssi != null)
    polozky.push(
      <span key="vystraha" className={`paticka-udaj paticka-vystraha stupen-${nejvyssi}`}>
        {vystrahy!.vystrahy.length === 1 ? vystrahy!.vystrahy[0].jev : "výstrahy ČHMÚ"}
      </span>,
    );

  const nadrz = hladina ? centra(hladina.snimky, new Date())[0] : undefined;
  if (nadrz)
    polozky.push(
      <span key="voda" className="paticka-udaj">
        <span className="paticka-stitek">voda</span>
        {nadrz.teplota.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} °C
      </span>,
    );

  const ted = vitr[0]?.historie.at(-1);
  if (ted)
    polozky.push(
      <span key="vitr" className="paticka-udaj">
        <span className="paticka-stitek">vítr</span>
        {ted.rychlost.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} m/s
      </span>,
    );

  // Déšť jen tehdy, když doopravdy přijde. „Bez srážek" je na liště
  // zbytečné slovo — ticho znamená totéž.
  const prsi = radar?.kroky.find((k) => k.dbz !== null && k.dbz >= DEST_DBZ);
  if (prsi)
    polozky.push(
      <span key="dest" className="paticka-udaj paticka-dest">
        {prsi.minut === 0 ? "prší" : `déšť za ${prsi.minut} min`}
      </span>,
    );

  return polozky;
}

/**
 * Lišta s počasím a vodou u spodku okna. Widgety, které nejsou v boku,
 * bydlí od 11. 10. 2026 tady — viz `PatickaLista`, proč.
 */
export async function PatickaPocasi({ children }: { children: React.ReactNode }) {
  const polozky = await souhrn();

  return <PatickaLista souhrn={polozky}>{children}</PatickaLista>;
}
