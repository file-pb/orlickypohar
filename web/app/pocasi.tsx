/**
 * Počasí u Radavy a Velkého víru pro nadcházející akci, z Windy
 * (Filip, 16. 9. 2026).
 *
 * <b>Bod předpovědi je mezi Radavou a Velkým vírem.</b> Obě místa leží
 * naproti sobě přes Orlík asi kilometr od sebe (Radava 49,511 N 14,165 E,
 * Velký vír 49,521 N 14,164 E), takže jedna předpověď platí pro obě.
 *
 * <b>Předpověď je jen na šest dní dopředu.</b> Bezplatné vložení Windy
 * drží 144 hodin, dál je předpověď placená. Vzdálenější akce proto widget
 * nedostane: prázdná mapa bez termínu akce by jen tahala data. Místo něj
 * se řekne, od kdy se předpověď objeví.
 *
 * Widget se otevírá na „teď" s detailem předpovědi pro bod po hodinách.
 * Posun rovnou na termín akce by šel parametrem `calendar`, ale jeho
 * hodnoty Windy nikde nepopisuje a spoléhat na odhad nechceme — den akce
 * je v detailu vidět tak jako tak.
 *
 * Rámeček se načítá líně: Windy stahuje stovky kilobajtů skriptů a dlaždic
 * mapy, a kdo k boku nedoroluje, nemá je platit.
 */

const BOD = { lat: 49.516, lon: 14.165 };
const DNU_PREDPOVEDI = 6;

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

/** Dnešek v pražském pásmu jako YYYY-MM-DD — akce se jedou na Orlíku. */
const dnesVPraze = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Prague" });

const dnuMezi = (od: string, do_: string) =>
  Math.round((Date.parse(`${do_}T00:00:00Z`) - Date.parse(`${od}T00:00:00Z`)) / 86_400_000);

const MESICE = [
  "ledna", "února", "března", "dubna", "května", "června",
  "července", "srpna", "září", "října", "listopadu", "prosince",
];

export function PocasiAkce({ datum, nazev }: { datum: string; nazev: string }) {
  const zbyva = dnuMezi(dnesVPraze(), datum.slice(0, 10));

  if (zbyva > DNU_PREDPOVEDI) {
    const od = new Date(Date.parse(`${datum.slice(0, 10)}T00:00:00Z`) - DNU_PREDPOVEDI * 86_400_000);
    return (
      <p className="bok-pocasi-pozde">
        Předpověď počasí u Radavy a Velkého víru se tu objeví {od.getUTCDate()}.{" "}
        {MESICE[od.getUTCMonth()]}, šest dní před akcí.
      </p>
    );
  }

  return (
    <div className="bok-pocasi">
      <iframe
        src={ADRESA}
        title={`Předpověď počasí u Radavy a Velkého víru pro ${nazev} (Windy)`}
        loading="lazy"
      />
      <p className="bok-pocasi-zdroj">Radava a Velký vír · předpověď Windy</p>
    </div>
  );
}
