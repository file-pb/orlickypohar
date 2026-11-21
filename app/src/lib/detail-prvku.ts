/**
 * Které akce detail prvku vůbec nabídne a v jakém pořadí.
 *
 * <b>Rozhodnutí 7, 9 a 10 druhého konzilia (21. 11. 2026).</b> Pořadí je
 * dané frekvencí a nevratností, s jednou výjimkou: <b>fakta jsou nahoře,
 * protože se nemačkají, ale předčítají</b> — do vysílačky, vestoje
 * v houpající se lodi a bez rolování. Fakta tenhle soubor neřeší, ta na
 * obrazovce stojí nad akcemi vždycky.
 *
 * <para>
 * <b>Chybějící akce se nezešedivuje, chybí.</b> Dokud prvek nedošel na
 * server, nemá serverová čísla, takže na něj nejde pověsit fotku ani
 * přesun — a to je na vodě ten <b>obvyklejší</b> tvar detailu, ne
 * výjimka. Zešedivělé tlačítko slibuje úkon, který neexistuje.
 * </para>
 *
 * <para>
 * <b>Pravidla jsou tady, ne ve vykreslování</b>, protože jsou to tři
 * rozhodnutí konzilia a každé se dá porušit jedinou podmínkou v JSX.
 * Testy: `app/testy/detail-prvku.test.ts`.
 * </para>
 */
export type AkceDetailu =
  | 'presunout'
  | 'vyfotit'
  | 'vybrat-z-galerie'
  | 'sebrat'
  | 'barva-a-tvar'
  | 'vys'
  | 'niz'
  | 'smazat';

export type StavDetailu = {
  /** Prvek už došel na server a má svoje čísla. */
  naServeru: boolean;
  /** Trať je přijatá rozhodčím, tedy zamčená. */
  zamceno: boolean;
  /** Jede se po té značce víckrát. */
  opakuje: boolean;
  /** Kdo se dívá: pomocník má užší příznak než pořadatel a rozhodčí. */
  jePomocnik: boolean;
};

export function akceDetailu(s: StavDetailu): AkceDetailu[] {
  // Zamčená trať nedovolí nic. Nabízet cokoliv znamená poslat stavitele
  // k úkonu, který server odmítne — a zámek by byl jen nápis.
  if (s.zamceno) return [];

  const akce: AkceDetailu[] = [];

  // <b>Přesun je hlavní práce dne</b> a měří, takže stojí první. Pomocník
  // ho smí: *Přesunout sem* je pípnutí, tedy přesně to, kvůli čemu jeho
  // příznak existuje. Zákaz by nic neušetřil — pomocník, který nesmí
  // přesouvat, pípne vedle staré bóje novou značku, a to smí; výsledkem
  // je trať se zdvojenými značkami a bez řetězu nahrazení.
  if (s.naServeru) akce.push('presunout');

  // <b>Galerie nad foťákem</b>: cesta, které může chybět EXIF, nemá být
  // ta snáz dosažitelná.
  if (s.naServeru) akce.push('vybrat-z-galerie', 'vyfotit');

  // Sebrání měření není, je to rozhodnutí o trati — proto ne pomocníkovi.
  // S mazáním je to jedno pravidlo, ne dvě.
  if (!s.jePomocnik) akce.push('sebrat');

  // Barva a tvar se mění jednou za ráno, z jedné krabice bójí.
  akce.push('barva-a-tvar');

  // Pořadí je rozhodnutí rozhodčího, takže oprava o jedno místo patří
  // nízko — ne jako režim, jen jako oprava sledu.
  //
  // <b>U značky s opakováním ne</b>, a ze stejného důvodu jako mazání:
  // řádka je jedna na značku, ale přerovnat se dá jen prvek, takže by
  // se obrazovka musela zeptat „který průjezd". Tenhle dotaz zakázalo
  // rozhodnutí 6 prvního běhu doslova.
  if (!s.jePomocnik && !s.opakuje) akce.push('vys', 'niz');

  // <b>Mazání u značky s opakováním se nenabízí vůbec</b> (podmínka,
  // na které se shodli všichni tři). Dotaz „který průjezd" na
  // nejnevratnějším terči obrazovky je horší než ta akce chybějící,
  // a dialog tam zakázalo rozhodnutí 6 prvního běhu doslova.
  if (!s.jePomocnik && !s.opakuje) akce.push('smazat');

  return akce;
}
