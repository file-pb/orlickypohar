import type { BarvaBoje, DruhZnaceni, TvarBoje } from "@/lib/boje";

/**
 * Jak bóje vypadá na vodě: barva a tvar.
 *
 * <b>Patří to bóji, ne prvku</b> (Filip, 9. 10. 2026) — a tohle je jediné
 * místo, které z toho dělá obrázek. Mapka, seznam i veřejná stránka pak
 * kreslí totéž, takže se tvar nemůže na dvou obrazovkách lišit.
 *
 * <para>
 * <b>Znaky z vyhlášky jsou kombinace, ne kategorie.</b> Červená válcová je
 * pravá strana plavební dráhy, zelená kuželová levá, žlutá značí zakázanou
 * nebo vyhrazenou plochu. Model proto drží barvu a tvar zvlášť: bóje, které
 * stavíme my, mají barvu, jakou zrovna máme.
 * </para>
 */

/**
 * Barva pro kreslení. <b>Ne proměnné motivu:</b> zelená bóje je zelená i na
 * tmavém pozadí a i když si někdo přebarví web — je to vlastnost předmětu
 * ve vodě, ne prvek rozhraní.
 */
export const BARVY: Record<NonNullable<BarvaBoje>, string> = {
  Cervena: "#c1121f",
  Zelena: "#1b7f4b",
  Zluta: "#e8b400",
  Oranzova: "#e8740c",
  Bila: "#ffffff",
  Modra: "#1f5fa8",
  // Fórek pro Izolepu (Filip, 11. 10. 2026). Světlejší než červená
  // schválně — dvě barvy, které se mají rozeznat, se nesmí lišit jen
  // odstínem.
  Ruzova: "#f06ba8",
};

export const NAZVY_BAREV: Record<NonNullable<BarvaBoje>, string> = {
  Cervena: "červená",
  Zelena: "zelená",
  Zluta: "žlutá",
  Oranzova: "oranžová",
  Bila: "bílá",
  Modra: "modrá",
  Ruzova: "růžová",
};

/** Jak se značení jmenuje v popiskách. `zadne` drží prázdno pro čitelnost. */
export const NAZVY_ZNACENI: Record<string, string> = {
  DrahaPrava: "pravá strana dráhy",
  DrahaLeva: "levá strana dráhy",
  DrahaSport: "sport",
  DrahaZakaz: "zákaz vplutí",
  NaseBoje: "",
  Plavidlo: "plavidlo",
  ObjektNaBrehu: "objekt na břehu",
  zadne: "",
};

export const NAZVY_TVARU: Record<NonNullable<TvarBoje>, string> = {
  Valcova: "válcová",
  Kuzelova: "kuželová",
  Kulova: "kulová",
  SferickyVrsek: "válec se sférickým vrškem",
  Plovatka: "plovatka",
  Jiny: "jiný tvar",
  Plamenak: "plameňák",
};

/**
 * Co ta kombinace znamená podle vyhlášky, nebo <c>null</c>. Píše se
 * k bóji jako vysvětlivka — kdo na Vltavě jezdí, pozná to i bez ní, ale
 * pořadatel, který bóji zadává, si tím ověří, že vybral správně.
 */
export function znakPodleVyhlasky(barva?: BarvaBoje, tvar?: TvarBoje): string | null {
  if (barva === "Cervena" && tvar === "Valcova") return "pravá strana plavební dráhy";
  if (barva === "Zelena" && tvar === "Kuzelova") return "levá strana plavební dráhy";
  if (barva === "Zluta" && tvar === "SferickyVrsek") return "sportovní bóje";
  // Plameňák stojí před žlutou schválně: vyhláška ho nezná, takže se za
  // její znak nesmí vydávat ani tehdy, když je zrovna žlutý. Jinak by
  // nafukovací pták hlásil zakázanou vodní plochu.
  if (tvar === "Plamenak") return null;
  if (barva === "Zluta") return "zakázaná nebo vyhrazená vodní plocha";
  return null;
}

/**
 * Značka bóje na mapě. <b>Bílý lem vždycky</b>, ať je vidět nad vodou,
 * lesem i nad bílou bójí — bez něj by bílá na světlém podkladu zmizela.
 */
/**
 * Kolik plastičnosti značka unese. <b>Rozhoduje o tom velikost a podklad</b>
 * (Filip, 15. 10. 2026: *„na mapce tam to musí být přehledné a jasné:
 * jednoduchou, plochou, a jinde B a C"*).
 *
 * Na mapce je značka osm pixelů nad fotomapou, kde každý odlesk ubírá
 * čitelnost — tam zůstává plochá. V řádku seznamu má osmnáct pixelů, což
 * unese světlo, ale ne odlesk. Ve velkém náhledu prvku je místa dost na
 * obojí.
 *
 * <b>Dělá se to vrstvením, ne přechodem.</b> Gradient by potřeboval `defs`
 * s jedinečným id, a tahle značka se kreslí mnohokrát v jednom SVG
 * i ve víc SVG na jedné stránce — duplicitní id je nevalidní dokument.
 * Vrstvení je tentýž tvar menší a posunutý, takže funguje i u kužele
 * a válce, kde by plošné světlo přeteklo přes okraj.
 */
export type Plasticita = "zadna" | "objem" | "odlesk";

function ZakladniZnak({
  x,
  y,
  r = 8,
  barva,
  tvar,
  znaceni,
  vyplnPrepis,
  bezLemu = false,
}: {
  /** Čím přebarvit výplň. Používá vrstva světla, viz `Plasticita`. */
  vyplnPrepis?: string;
  /** Vrstva světla lem nemá — obkroužila by sama sebe uvnitř značky. */
  bezLemu?: boolean;
  x: number;
  y: number;
  r?: number;
  barva?: BarvaBoje;
  tvar?: TvarBoje;
  /**
   * Čím je značka značená. <b>Rozhoduje dřív než tvar</b>, protože
   * plavidlo a objekt na břehu žádný tvar ani barvu nemají — a bez
   * tohohle by se kreslily jako červené kolečko, tedy jako bóje, která
   * tam neplave.
   */
  znaceni?: DruhZnaceni;
}) {
  const vypln = vyplnPrepis ?? (barva ? BARVY[barva] : "#c1121f");
  const spolecne = bezLemu
    ? ({ fill: vypln } as const)
    : ({ fill: vypln, stroke: "#fff", strokeWidth: 3 } as const);

  // Plavidlo: lodička. Hýbe se a není to bóje, takže nesmí vypadat jako
  // něco zakotveného.
  if (znaceni === "Plavidlo")
    return (
      <g>
        <path
          d={`M ${x - r} ${y + r * 0.25} H ${x + r} L ${x + r * 0.65} ${y + r} H ${x - r * 0.6} Z`}
          fill="#dfe5ea"
          stroke="#fff"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <path
          d={`M ${x} ${y + r * 0.2} V ${y - r * 1.15}`}
          stroke="#fff"
          strokeWidth={2.4}
        />
        <path
          d={`M ${x + r * 0.16} ${y - r} L ${x + r * 0.95} ${y + r * 0.1} H ${x + r * 0.16} Z`}
          fill="#dfe5ea"
          stroke="#fff"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </g>
    );

  // Objekt na břehu: kapka. Je to místo, ne těleso ve vodě.
  if (znaceni === "ObjektNaBrehu")
    return (
      <path
        d={
          `M ${x} ${y - r * 1.15} C ${x} ${y - r * 1.15}, ${x + r} ${y - r * 0.1}, ${x + r} ${y + r * 0.3}` +
          ` A ${r} ${r} 0 0 1 ${x - r} ${y + r * 0.3}` +
          ` C ${x - r} ${y - r * 0.1}, ${x} ${y - r * 1.15}, ${x} ${y - r * 1.15} Z`
        }
        fill="#9aa6af"
        stroke="#fff"
        strokeWidth={2.4}
      />
    );

  switch (tvar) {
    case "Kuzelova":
      // Kužel vrcholem vzhůru, jak ho popisuje vyhláška.
      return (
        <polygon points={`${x},${y - r * 1.2} ${x - r},${y + r * 0.8} ${x + r},${y + r * 0.8}`} {...spolecne} />
      );
    case "Valcova":
      return <rect x={x - r * 0.85} y={y - r} width={r * 1.7} height={r * 2} {...spolecne} />;
    case "Plovatka":
      // Tyč nad hladinou, ne těleso — proto úzká a vysoká.
      return <rect x={x - r * 0.35} y={y - r * 1.4} width={r * 0.7} height={r * 2.8} {...spolecne} />;
    case "SferickyVrsek":
      // Poklop, ne válec s koulí nahoře (Filip, 11. 10. 2026: *„u té bójky
      // sport to vypadá spíš jako polokoule poklop a uprostřed je nápis
      // sport"*). Tohle je ta, které se u Orlíku říká Mimoň.
      //
      // Nápis se nekreslí: při osmnácti pixelech by z něj byla šmouha,
      // a tvar sám stačí k tomu, aby se nepletl s kulovou bójí.
      return (
        <path
          d={`M ${x - r} ${y + r * 0.5} A ${r} ${r * 0.95} 0 0 1 ${x + r} ${y + r * 0.5} Z`}
          {...spolecne}
        />
      );
    case "Plamenak":
      // Nafukovací plameňák (Filip, 11. 10. 2026). Při osmnácti pixelech
      // z ptáka nezbyde ornitologie, ale <b>nesmí splynout s kolečkem</b>
      // — to je celý důvod, proč má vlastní tvar.
      //
      // <b>Jedna silueta, ne poskládané díly.</b> Z těla, krku a hlavy
      // zvlášť vyšla kachna: bílý lem obkroužil každý kus a krk zmizel.
      // Takhle lem obchází celý obrys a krk zůstane krkem.
      //
      // <b>Tenčí lem než u ostatních tvarů</b>, a taky kvůli krku: při
      // třech jednotkách na dvaadvacetijednotkové ploše je rám širší než
      // on sám. Plameňák je zato velký a růžový, takže se na mapě ztratí
      // nejmíň ze všech.
      return (
        <path
          d={
            `M ${x - r} ${y + r * 0.35}` +
            ` C ${x - r} ${y - r * 0.2}, ${x - r * 0.5} ${y - r * 0.45}, ${x + r * 0.02} ${y - r * 0.4}` +
            ` C ${x + r * 0.34} ${y - r * 0.7}, ${x + r * 0.14} ${y - r}, ${x + r * 0.3} ${y - r * 1.22}` +
            ` C ${x + r * 0.36} ${y - r * 1.42}, ${x + r * 0.64} ${y - r * 1.46}, ${x + r * 0.72} ${y - r * 1.28}` +
            ` L ${x + r * 1.02} ${y - r * 0.9}` +
            ` L ${x + r * 0.68} ${y - r * 0.98}` +
            ` C ${x + r * 0.64} ${y - r * 1.1}, ${x + r * 0.56} ${y - r * 1.12}, ${x + r * 0.52} ${y - r * 1.18}` +
            ` C ${x + r * 0.42} ${y - r * 0.94}, ${x + r * 0.66} ${y - r * 0.68}, ${x + r * 0.32} ${y - r * 0.26}` +
            ` C ${x + r * 0.64} ${y + r * 0.1}, ${x + r * 0.56} ${y + r * 0.95}, ${x - r * 0.12} ${y + r}` +
            ` C ${x - r * 0.72} ${y + r * 1.04}, ${x - r} ${y + r * 0.8}, ${x - r} ${y + r * 0.35} Z`
          }
          fill={vypln}
          stroke="#fff"
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      );
    default:
      // Kulová, „jiný" i neuvedený tvar: kolečko. Barva nese nejvíc
      // a tvar je nepovinný schválně — na vodě se pípá jednou rukou.
      return <circle cx={x} cy={y} r={r} {...spolecne} />;
  }
}

/**
 * Značka bóje. <b>Bílý lem vždycky</b>, ať je vidět nad vodou, lesem
 * i nad bílou bójí — bez něj by bílá na světlém podkladu zmizela.
 *
 * Plastičnost se skládá z téhož tvaru nakresleného podruhé: menší,
 * posunutý k levému hornímu okraji a bílý s nízkým krytím. Proto drží tvar
 * i u kužele a válce, kde by plošné světlo přeteklo ven.
 *
 * <b>Plavidlo, objekt na břehu a plameňák zůstávají ploché</b> bez ohledu
 * na to, co se žádá. Lodička a pták mají obrys, do kterého se zmenšená
 * kopie netrefí — vznikla by z ní šmouha, a plameňák se pozná tvarem,
 * ne leskem.
 */
export function ZnakBoje({
  x,
  y,
  r = 8,
  barva,
  tvar,
  znaceni,
  plasticita = "zadna",
}: {
  x: number;
  y: number;
  r?: number;
  barva?: BarvaBoje;
  tvar?: TvarBoje;
  znaceni?: DruhZnaceni;
  plasticita?: Plasticita;
}) {
  const zaklad = (
    <ZakladniZnak x={x} y={y} r={r} barva={barva} tvar={tvar} znaceni={znaceni} />
  );

  const slozity =
    znaceni === "Plavidlo" || znaceni === "ObjektNaBrehu" || tvar === "Plamenak";
  if (plasticita === "zadna" || slozity) return zaklad;

  return (
    <g>
      {zaklad}
      {/* Světlo: tentýž tvar na 55 % velikosti, posunutý k levému hornímu
          okraji. Bez lemu — ten by uvnitř značky obkroužil sám sebe. */}
      <g opacity="0.3">
        <ZakladniZnak
          x={x - r * 0.26}
          y={y - r * 0.26}
          r={r * 0.55}
          barva={barva}
          tvar={tvar}
          znaceni={znaceni}
          vyplnPrepis="#ffffff"
          bezLemu
        />
      </g>
      {plasticita === "odlesk" && (
        /* Ostrý odlesk až u velkého náhledu: při osmnácti pixelech je z něj
           bílá tečka, která vypadá jako chyba vykreslení. */
        <ellipse
          cx={x - r * 0.3}
          cy={y - r * 0.38}
          rx={r * 0.26}
          ry={r * 0.17}
          fill="#ffffff"
          opacity="0.55"
        />
      )}
    </g>
  );
}

/**
 * Značka bóje do řádku textu — seznam bójí, výpis prvků.
 *
 * <b>Bez barvy ani tvaru se nekreslí nic</b>, místo šedivého kolečka:
 * prázdno aspoň nelže. Tvar je nepovinný, takže samotná barva stačí.
 */
export function ZnakVRadku({
  barva,
  tvar,
  znaceni,
}: {
  barva?: BarvaBoje;
  tvar?: TvarBoje;
  znaceni?: DruhZnaceni;
}) {
  // Plavidlo a molo barvu ani tvar nemají, ale nakreslit se mají — proto
  // se prázdno pozná až po nich.
  if (!barva && !tvar && !znaceni) return null;

  const popis =
    [NAZVY_ZNACENI[znaceni ?? "zadne"], barva && NAZVY_BAREV[barva], tvar && NAZVY_TVARU[tvar]]
      .filter(Boolean)
      .join(", ") || "značka";

  return (
    <svg
      className="znak-boje"
      viewBox="0 0 22 22"
      width="18"
      height="18"
      role="img"
      aria-label={popis}
    >
      <title>{popis}</title>
      <ZnakBoje x={11} y={11} r={7} barva={barva} tvar={tvar} znaceni={znaceni} plasticita="objem" />
    </svg>
  );
}
