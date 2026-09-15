/**
 * Počasí u Radavy a Velkého víru pod nejbližší akcí, z Windy
 * (Filip, 16. 9. 2026).
 *
 * <b>Bod předpovědi je mezi Radavou a Velkým vírem.</b> Obě místa leží
 * naproti sobě přes Orlík asi kilometr od sebe (Radava 49,511 N 14,165 E,
 * Velký vír 49,521 N 14,164 E), takže jedna předpověď platí pro obě.
 *
 * <b>Widget je vidět vždycky, liší se popisek.</b> Akce, která je v pásu
 * předpovědi pod mapou, dostane větu, který den hledat. Vzdálenější akce
 * dostane aktuální předpověď: předpověď na víc než šest dní nemá validitu
 * (Filip, 16. 9. 2026).
 *
 * <b>Pás má pět dní: dnešek a čtyři další.</b> Změřeno 16. 9. 2026 přímo
 * ve vloženém Windy — středa 16. až neděle 20., do strany se posouvá, dál
 * nesahá. Hranice je proto čtyři dny, ne šest: akce za pět nebo šest dní
 * by v pásu nebyla, i když Windy data na 144 hodin má.
 *
 * <b>Mapa se na termín akce posunout nedá.</b> Parametr `calendar` Windy
 * nepopisuje a zkouška 16. 9. 2026 ukázala, že `calendar=48` ukazuje tentýž
 * čas jako `calendar=now`. Den akce proto ukazuje pás předpovědi, ne mapa.
 *
 * Rámeček se načítá líně: Windy stahuje stovky kilobajtů skriptů a dlaždic
 * mapy, a kdo k boku nedoroluje, nemá je platit.
 */

const BOD = { lat: 49.516, lon: 14.165 };
/** Kolik dní po dnešku ukazuje pás předpovědi pod mapou. */
const DNU_V_PASU = 4;

const ADRESA =
  "https://embed.windy.com/embed2.html?" +
  new URLSearchParams({
    lat: String(BOD.lat),
    lon: String(BOD.lon),
    detailLat: String(BOD.lat),
    detailLon: String(BOD.lon),
    zoom: "11",
    level: "surface",
    overlay: "wind",
    product: "ecmwf",
    menu: "",
    message: "true",
    marker: "true",
    calendar: "now",
    pressure: "",
    type: "map",
    location: "coordinates",
    detail: "true",
    // Na vodě se vítr čte v uzlech.
    metricWind: "kt",
    metricTemp: "°C",
    radarRange: "-1",
  });

/** Tentýž bod na windy.com, pro odkaz pod widgetem. */
const MAPA_WINDY = `https://www.windy.com/?${BOD.lat},${BOD.lon},11`;

/** Dnešek v pražském pásmu jako YYYY-MM-DD — akce se jedou na Orlíku. */
const dnesVPraze = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Prague" });

const dnuMezi = (od: string, do_: string) =>
  Math.round((Date.parse(`${do_}T00:00:00Z`) - Date.parse(`${od}T00:00:00Z`)) / 86_400_000);

const MESICE = [
  "ledna", "února", "března", "dubna", "května", "června",
  "července", "srpna", "září", "října", "listopadu", "prosince",
];
/** „v sobotu", „ve středu" — den akce ve větě. */
const VE_DNI = ["v neděli", "v pondělí", "v úterý", "ve středu", "ve čtvrtek", "v pátek", "v sobotu"];

export function PocasiAkce({ datum, nazev }: { datum: string; nazev: string }) {
  const den = datum.slice(0, 10);
  const zbyva = dnuMezi(dnesVPraze(), den);
  const d = new Date(`${den}T00:00:00Z`);
  const kdy = `${d.getUTCDate()}. ${MESICE[d.getUTCMonth()]}`;
  const vPredpovedi = zbyva >= 0 && zbyva <= DNU_V_PASU;

  return (
    <div className="bok-pocasi">
      <iframe
        src={ADRESA}
        title={`Předpověď počasí u Radavy a Velkého víru (Windy)`}
        loading="lazy"
      />
      <p className="bok-pocasi-zdroj">
        {vPredpovedi ? (
          <>
            {nazev} {VE_DNI[d.getUTCDay()]} {kdy} najdeš v pásu předpovědi.
          </>
        ) : (
          <>Aktuální předpověď. Akce {kdy} se v pásu objeví čtyři dny předem.</>
        )}{" "}
        Radava a Velký vír,{" "}
        {/* Cizí web do nové karty, ať čtenář nepřijde o stránku poháru. */}
        <a href={MAPA_WINDY} target="_blank" rel="noopener noreferrer">
          Windy
        </a>
        .
      </p>
    </div>
  );
}
