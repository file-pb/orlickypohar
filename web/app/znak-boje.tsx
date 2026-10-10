import type { BarvaBoje, TvarBoje } from "@/lib/boje";

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
export function ZnakBoje({
  x,
  y,
  r = 8,
  barva,
  tvar,
}: {
  x: number;
  y: number;
  r?: number;
  barva?: BarvaBoje;
  tvar?: TvarBoje;
}) {
  const vypln = barva ? BARVY[barva] : "#c1121f";
  const spolecne = { fill: vypln, stroke: "#fff", strokeWidth: 3 } as const;

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
      return (
        <g>
          <rect x={x - r * 0.8} y={y - r * 0.3} width={r * 1.6} height={r * 1.6} {...spolecne} />
          <circle cx={x} cy={y - r * 0.6} r={r * 0.65} {...spolecne} />
        </g>
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
 * Značka bóje do řádku textu — seznam bójí, výpis prvků.
 *
 * <b>Bez barvy ani tvaru se nekreslí nic</b>, místo šedivého kolečka:
 * prázdno aspoň nelže. Tvar je nepovinný, takže samotná barva stačí.
 */
export function ZnakVRadku({ barva, tvar }: { barva?: BarvaBoje; tvar?: TvarBoje }) {
  if (!barva && !tvar) return null;

  const popis = [barva && NAZVY_BAREV[barva], tvar && NAZVY_TVARU[tvar]]
    .filter(Boolean)
    .join(", ");

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
      <ZnakBoje x={11} y={11} r={7} barva={barva} tvar={tvar} />
    </svg>
  );
}
