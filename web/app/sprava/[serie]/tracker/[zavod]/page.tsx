import Link from "@/app/sprava/odkaz";
import { notFound } from "next/navigation";
import { Vypadek } from "@/app/vypadek";
import { Drobecky, drobeckySpravy, drobekRegaty } from "@/app/drobecky";
import { nazevZastavky } from "@/lib/kalendar";
import { nactiJa } from "@/lib/ja";
import { prava, smi } from "@/lib/co-smim";
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
 *
 * <b>Kdo na to nemá, dostane větu, ne prázdnou mapu</b> (Filip, 24. 10.
 * 2026). Data chráněná byla vždycky — API chce pořadatele téhle regaty nebo
 * rozhodčího ročníku a čtení bez tokenu vrací prázdno — jenže stránka to
 * mlčky nakreslila jako mapu bez lodí. To je horší než odmítnutí: vypadá to
 * jako porucha trackeru.
 *
 * <b>Ptá se na tutéž podmínku jako API</b> (`PolohyEndpoints`): pořadatel
 * téhle regaty, nebo rozhodčí ročníku. Stav z `nactiTrat` by stačit nemohl —
 * trať smí číst i ten, kdo na polohy nemá, takže by stránka pustila mapu dál
 * (změřeno na účtu bez role). Rozhodnutí zůstává na API; tohle je jen to,
 * aby obrazovka řekla pravdu místo prázdna.
 */
export default async function TrackerRegaty({ params }: Parametry) {
  const { serie, zavod } = await params;

  const [data, nazev, { ja }] = await Promise.all([
    dataTrackeru(serie, zavod),
    nazevZastavky(serie, zavod),
    nactiJa(),
  ]);
  if (data.stav === "neni") notFound();

  const udelena = prava(ja);
  const smiVidet =
    smi(udelena, { role: "Organizator", serie, zavod }) ||
    smi(udelena, { role: "Rozhodci", serie });

  return (
    <div className="tracker-strana">
      <Drobecky cesta={[...drobeckySpravy(serie), drobekRegaty(serie, zavod, nazev)]} />
      <h1>Tracker — {nazev}</h1>

      {!ja ? (
        <p className="prazdno">
          Na živé polohy lodí se musíš <Link href="/prihlaseni">přihlásit</Link>.
        </p>
      ) : !smiVidet ? (
        <p className="prazdno">
          Živé polohy lodí vidí pořadatel téhle regaty nebo rozhodčí ročníku.
        </p>
      ) : data.stav === "vypadek" ? (
        <Vypadek />
      ) : (
        <PanelTrackeru serie={serie} zavod={zavod} data={data} />
      )}
    </div>
  );
}
