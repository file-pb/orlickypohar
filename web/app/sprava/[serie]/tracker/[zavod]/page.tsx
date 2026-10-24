import { notFound } from "next/navigation";
import { Drobecky, drobeckySpravy, drobekRegaty } from "@/app/drobecky";
import { nazevZastavky } from "@/lib/kalendar";
import { dataTrackeru, PanelTrackeru } from "./panel";

type Parametry = { params: Promise<{ serie: string; zavod: string }> };

// Odpověď závisí na tom, kdo se ptá, a mění se po vteřinách.
export const dynamic = "force-dynamic";

export const metadata = { title: "Tracker regaty — správa" };

/**
 * Živá mapa regaty pro pořadatele a rozhodčího.
 *
 * <b>Tam, kde se podle polohy jedná, mapa je nutná</b> (Filip, 24. 10.
 * 2026). Text *„1,2 km jihozápadně"* odpoví na *„startujeme?"*, ale
 * neodpoví na *„je ještě na vodě, nebo už u břehu?"* — a to je otázka za
 * šera a ve zhoršeném počasí, tedy ten bezpečnostní rozměr, kvůli kterému
 * celá kapitola existuje i bez jediné zveřejněné rozjížďky.
 *
 * <b>Táž mapa visí i pod výsledky</b> (`panel.tsx`), protože kdo zapisuje
 * cíl, je právě ten, koho zajímá, kdo je ještě na vodě. Tahle stránka
 * zůstává kvůli telefonu u cíle: mapa přes celý displej je něco jiného než
 * mapa pod seznamem rozjížděk. Mapa se tu proto kreslí vždycky, i když se
 * zrovna nikdo nehlásí — člověk sem jde kvůli ní.
 *
 * <b>Veřejnost se sem nedostane.</b> Živý přenos ven je vlastní přepínač,
 * který zamyká rozprava; dokud se na něj mapa nenapojí, platí bezpečná
 * výchozí hodnota.
 */
export default async function TrackerRegaty({ params }: Parametry) {
  const { serie, zavod } = await params;

  const [data, nazev] = await Promise.all([
    dataTrackeru(serie, zavod),
    nazevZastavky(serie, zavod),
  ]);
  if (data.stav === "neni") notFound();

  return (
    <div className="tracker-strana">
      <Drobecky cesta={[...drobeckySpravy(serie), drobekRegaty(serie, zavod, nazev)]} />
      <h1>Tracker — {nazev}</h1>

      <PanelTrackeru serie={serie} zavod={zavod} data={data} />
    </div>
  );
}
