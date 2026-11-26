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

/**
 * Výplň a lem značky <b>nad fotomapou</b>. Dokud měla komponenta výchozí
 * hodnoty, byly to právě tyhle — a to byla past: červená znamená pravou
 * stranu plavební dráhy, kdežto `Barva` je nepovinná schválně, takže na
 * bílé kartě vyšel celý seznam červený. Appka to vyřešila tím, že výchozí
 * hodnoty nemá a volající je musí předat; web to od 22. 11. 2026 dělá
 * stejně a tohle je ta dvojice, kterou mapa předává výslovně.
 *
 * <b>Na kartách se dnes předává totéž, a to je dědictví, ne rozhodnutí.</b>
 * Mění se to jedním místem u volajícího, ne tady — proto je oddělené.
 */
export const MAPA_VYPLN = "#c1121f";

/** Bílý lem drží siluetu nad vodou, lesem i nad bílou bójí. */
export const MAPA_LEM = "#fff";

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
export function znakPodleVyhlasky(
  barva?: BarvaBoje,
  tvar?: TvarBoje,
  znaceni?: DruhZnaceni,
): string | null {
  // Slovník od Filipa, 26. 11. 2026; příbuzná kopie i s odůvodněním je
  // v appce, `app/src/lib/znak-vyhlaska.ts`.
  //
  // Sport se pozná nápisem SPORT, ne tvarem: týž „mimoň" bez nápisu je
  // obyčejná otočná bójka a bývá i červená nebo zelená.
  // Sportovní zóna je vždycky žlutá; otočné bójky jsou mimoni v barvách,
  // jaké kdo koupil (Filip, 26. 11. 2026).
  if (znaceni === "DrahaSport") return barva && barva !== "Zluta" ? null : "sportovní bóje";
  // Co není bóje, nemá výklad.
  if (znaceni === "Plavidlo" || znaceni === "ObjektNaBrehu") return null;
  // Plameňák stojí před barvami schválně: vyhláška ho nezná, takže se za
  // její znak nesmí vydávat ani tehdy, když je zrovna žlutý.
  if (tvar === "Plamenak") return null;
  // Plovatka je rovnocenná varianta znaku dráhy, ne výjimka.
  if (barva === "Cervena" && (tvar === "Valcova" || tvar === "Plovatka"))
    return "pravá strana plavební dráhy";
  if (barva === "Zelena" && (tvar === "Kuzelova" || tvar === "Plovatka"))
    return "levá strana plavební dráhy";
  // Zákaz vplutí je žlutá *kuželová*, ne každá žlutá.
  if (barva === "Zluta" && tvar === "Kuzelova") return "zakázaná nebo vyhrazená vodní plocha";
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
  vychoziVypln,
  lem,
}: {
  /** Čím přebarvit výplň. Používá vrstva světla, viz `Plasticita`. */
  vyplnPrepis?: string;
  /** Vrstva světla lem nemá — obkroužila by sama sebe uvnitř značky. */
  bezLemu?: boolean;
  /**
   * Čím se kreslí značka <b>bez zapsané barvy</b>. <b>Povinné</b>, a to
   * je ta oprava z 22. 11. 2026: dokud tu stála výchozí červená, kreslila
   * se značka bez barvy jako *pravá strana plavební dráhy*, protože
   * `Barva` je nepovinná schválně. Mapa předává <see cref="MAPA_VYPLN"/>,
   * karta má předat tlumenou. (Nález B druhého konzilia, 21. 11. 2026;
   * appka to tak měla první.)
   */
  vychoziVypln: string;
  /**
   * Barva lemu, <b>taky povinná</b>. Nad fotomapou bílá; na `papir` je
   * bílá na bílé <b>1,00:1</b>, takže žlutá, bílá, růžová a oranžová
   * silueta zůstanou pod mezí 3:1 bez obrysu. Karta proto předá lem
   * dopočítaný ze svého podkladu.
   */
  lem: string;
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
  const vypln = vyplnPrepis ?? (barva ? BARVY[barva] : vychoziVypln);
  const spolecne = bezLemu
    ? ({ fill: vypln } as const)
    : ({ fill: vypln, stroke: lem, strokeWidth: 3 } as const);

  // Plavidlo: lodička. Hýbe se a není to bóje, takže nesmí vypadat jako
  // něco zakotveného.
  if (znaceni === "Plavidlo")
    return (
      <g>
        <path
          d={`M ${x - r} ${y + r * 0.25} H ${x + r} L ${x + r * 0.65} ${y + r} H ${x - r * 0.6} Z`}
          fill="#dfe5ea"
          stroke={lem}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <path
          d={`M ${x} ${y + r * 0.2} V ${y - r * 1.15}`}
          stroke={lem}
          strokeWidth={2.4}
        />
        <path
          d={`M ${x + r * 0.16} ${y - r} L ${x + r * 0.95} ${y + r * 0.1} H ${x + r * 0.16} Z`}
          fill="#dfe5ea"
          stroke={lem}
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
        stroke={lem}
        strokeWidth={2.4}
      />
    );

  const h = y + 0.85 * r;

  switch (tvar) {
    case "Kuzelova":
      // <b>Kužel sedí na hladině a má viditelné dno</b> (24. 11. 2026).
      // Rovnostranný trojúhelník vypadal jako značka z pravítka; špička
      // má zaoblení 0,08 r, víc z kužele dělalo nafukovací patník.
      return (
        <path
          d={
            `M ${x - 0.87 * r} ${h} L ${x - 0.08 * r} ${y - 1.1 * r}` +
            ` Q ${x} ${y - 1.2 * r} ${x + 0.08 * r} ${y - 1.1 * r} L ${x + 0.87 * r} ${h}` +
            ` A ${0.87 * r} ${0.3 * r} 0 0 1 ${x - 0.87 * r} ${h} Z`
          }
          strokeLinejoin="round"
          {...spolecne}
        />
      );
    case "Valcova":
      return (
        <path
          d={
            `M ${x - 0.75 * r} ${h} V ${y - 0.5 * r}` +
            ` A ${0.75 * r} ${0.3 * r} 0 0 1 ${x + 0.75 * r} ${y - 0.5 * r} V ${h}` +
            ` A ${0.75 * r} ${0.3 * r} 0 0 1 ${x - 0.75 * r} ${h} Z`
          }
          strokeLinejoin="round"
          {...spolecne}
        />
      );
    case "Plovatka":
      // Tyč s plovákem u hladiny, ne úzký obdélník.
      return (
        <path
          d={
            `M ${x - 0.18 * r} ${y + 0.45 * r} V ${y - 0.95 * r}` +
            ` Q ${x} ${y - 1.2 * r} ${x + 0.18 * r} ${y - 0.95 * r} V ${y + 0.45 * r} Z` +
            ` M ${x - 0.5 * r} ${y + 0.42 * r}` +
            ` A ${0.5 * r} ${0.42 * r} 0 1 0 ${x + 0.5 * r} ${y + 0.42 * r}` +
            ` A ${0.5 * r} ${0.42 * r} 0 1 0 ${x - 0.5 * r} ${y + 0.42 * r} Z`
          }
          strokeLinejoin="round"
          {...spolecne}
        />
      );
    case "SferickyVrsek":
      // Poklop <b>na sukni</b>, ne samotná půlelipsa (Filip, 11. 10. 2026:
      // *„u té bójky sport to vypadá spíš jako polokoule poklop a uprostřed
      // je nápis sport"*). Tohle je ta, které se u Orlíku říká Mimoň.
      //
      // Nápis se nekreslí: při osmnácti pixelech by z něj byla šmouha,
      // a tvar sám stačí k tomu, aby se nepletl s kulovou bójí.
      return (
        <path
          d={
            `M ${x - 0.78 * r} ${h} V ${y}` +
            ` A ${0.78 * r} ${0.85 * r} 0 0 1 ${x + 0.78 * r} ${y} V ${h}` +
            ` A ${0.78 * r} ${0.3 * r} 0 0 1 ${x - 0.78 * r} ${h} Z`
          }
          strokeLinejoin="round"
          {...spolecne}
        />
      );
    case "Plamenak": {
      // <b>Je to nafukovací kruh s krkem, ne stojící pták</b> (Filip
      // poslal fotku, 24. 11. 2026). Předtím to byla silueta ptáka od
      // země — jiná věc než to, co na Izolepě plave.
      //
      // Kreslí se v poli 28 × 36, kde tvar vznikl, a sem se dostane
      // transformací: přepočítat ho bod po bodu by znamenalo rozejít se
      // s appkou při první úpravě.
      //
      // <b>Tenčí lem</b>, protože krk je užší než rám: při třech
      // jednotkách by rám byl širší než on sám.
      const k = r / 12;
      const lemK = 1.6 / k;
      return (
        <g transform={`translate(${x - 14 * k} ${y - 18 * k}) scale(${k})`}>
          <path
            d={
              "M 15.6 21.2 C 13.4 17.6, 12.2 12.6, 13 9.6" +
              " C 13.6 7.2, 12.2 5.4, 10 5.6 C 7.6 5.8, 6.4 7.6, 6.6 9.4" +
              " L 6.9 12.3 C 7.3 14.1, 9.4 14.6, 10.2 16.2" +
              " C 11 17.8, 11.4 19.6, 11.6 21.4 Z"
            }
            fill={vypln}
            stroke={lem}
            strokeWidth={lemK}
            strokeLinejoin="round"
          />
          <path d="M 2.5 12.9 L 6.8 9.3 L 6.9 12.3 Z" fill="#1b1b1b" stroke={lem} strokeWidth={lemK * 0.6} strokeLinejoin="round" />
          <path
            d={
              "M 3.4 23.6 A 10.8 7.2 0 1 0 25 23.6 A 10.8 7.2 0 1 0 3.4 23.6 Z" +
              " M 10.8 23.9 A 5 3.2 0 1 0 20.8 23.9 A 5 3.2 0 1 0 10.8 23.9 Z"
            }
            fill={vypln}
            fillRule="evenodd"
            stroke={lem}
            strokeWidth={lemK}
            strokeLinejoin="round"
          />
          {r >= 11 && (
            <>
              <circle cx={9.3} cy={8.4} r={1.35} fill="#ffffff" />
              <circle cx={9.1} cy={8.5} r={0.62} fill="#1b1b1b" />
            </>
          )}
        </g>
      );
    }
    case "Jiny":
      // <b>Zaoblený hranol, ne kolečko.</b> Do 24. 11. 2026 kreslil
      // „jiný tvar" totéž co kulová, takže obrazovka tvrdila kouli
      // o značce, u které nikdo tvar neurčil.
      return (
        <path
          d={
            `M ${x - 0.72 * r} ${y - 0.3 * r} A ${0.45 * r} ${0.45 * r} 0 0 1 ${x - 0.27 * r} ${y - 0.75 * r}` +
            ` H ${x + 0.27 * r} A ${0.45 * r} ${0.45 * r} 0 0 1 ${x + 0.72 * r} ${y - 0.3 * r}` +
            ` V ${h - 0.45 * r} A ${0.45 * r} ${0.45 * r} 0 0 1 ${x + 0.27 * r} ${h}` +
            ` H ${x - 0.27 * r} A ${0.45 * r} ${0.45 * r} 0 0 1 ${x - 0.72 * r} ${h - 0.45 * r} Z`
          }
          strokeLinejoin="round"
          {...spolecne}
        />
      );
    default:
      // Kulová i neuvedený tvar: koule sedící na hladině. Barva nese
      // nejvíc a tvar je nepovinný schválně — na vodě se pípá jednou rukou.
      return <circle cx={x} cy={h - 0.85 * r} r={0.85 * r} {...spolecne} />;
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
  vychoziVypln,
  lem,
}: {
  x: number;
  y: number;
  r?: number;
  barva?: BarvaBoje;
  tvar?: TvarBoje;
  znaceni?: DruhZnaceni;
  plasticita?: Plasticita;
  /** Výplň bez zapsané barvy. Povinná — viz `ZakladniZnak`. */
  vychoziVypln: string;
  /** Barva lemu. Povinná — viz `ZakladniZnak`. */
  lem: string;
}) {
  const zaklad = (
    <ZakladniZnak
      x={x}
      y={y}
      r={r}
      barva={barva}
      tvar={tvar}
      znaceni={znaceni}
      vychoziVypln={vychoziVypln}
      lem={lem}
    />
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
          vychoziVypln={vychoziVypln}
          /* Lem se předává, i když ho `bezLemu` potlačí: lodička a kapka
             ho kreslí vlastními cestami, takže parametr musí být vždycky
             po ruce. */
          lem={lem}
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
      {/* <b>Dvojice se předává výslovně</b> (22. 11. 2026). Jsou to
          tytéž hodnoty, co tu platily jako výchozí, takže se vzhled
          nemění — jen už není skrytá. Že má řádek v seznamu kreslit
          bezbarvou značku červeně, je dědictví, ne rozhodnutí; až se
          rozhodne jinak, mění se tenhle jeden řádek. */}
      <ZnakBoje
        x={11}
        y={11}
        r={7}
        barva={barva}
        tvar={tvar}
        znaceni={znaceni}
        plasticita="objem"
        vychoziVypln={MAPA_VYPLN}
        lem={MAPA_LEM}
      />
    </svg>
  );
}
