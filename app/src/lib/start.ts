/**
 * Startovní procedura, jak ji appka počítá — pravidla zvlášť od vykreslování.
 *
 * Je to tentýž důvod jako u `web/lib/rozjizdky-tabule.ts`, odkud se tahle
 * pravidla berou: kdy procedura běží a kolik zbývá je pravidlo, ne kreslení,
 * a musí to jít ověřit bez telefonu (`app/testy/start.test.ts`). V mocku se
 * to nedá zahlédnout, protože tam žádná rozjížďka na start nečeká.
 *
 * <b>Proč to není sdílený modul s webem.</b> Appka a web nemají společný
 * balíček se zdrojovým kódem — sdílí se jen typy z OpenAPI
 * (`packages/api-client/generuj.sh`). Pravidla jsou tu proto zapsaná
 * znovu a testy obou stran hlídají, že říkají totéž; sdílení by znamenalo
 * nový balíček v buildu appky, a ten se do ní musí dostat přes EAS.
 */

/** Rozjížďka tak, jak ji vydává detail závodu — jen to, co odpočet potřebuje. */
export type RozjizdkaProOdpocet = {
  cislo: number;
  startV: string | null;
  stav: 'Planovana' | 'Probiha' | 'Dokoncena' | 'Zrusena';
};

/**
 * Jak dlouho před startem běží procedura, ve vteřinách, když to regata
 * neřekne jinak.
 *
 * Pětka je obvyklý začátek (výzvové znamení), ale <b>je to jen výchozí
 * hodnota</b>: ZPJ 26 k ní má hvězdičku *„nebo tak, jak je stanoveno ve
 * vypsání závodu nebo v plachetních směrnicích"*, takže délka je parametr
 * regaty (`Zavod.DelkaProceduryMin`, nález R12 oponentury rozhodčího).
 * Detail závodu ji vydává jako `delkaProceduryMin`; tahle konstanta platí
 * jen tam, kde ji API ještě nedalo — tedy u starší odpovědi.
 */
export const PROCEDURA_S = 5 * 60;

/** Kolik vteřin uplynulo od startu; záporné číslo znamená „do startu". */
export function odStartu(startV: string | null, ted: number): number | null {
  if (!startV) return null;
  const t = Date.parse(startV);
  return Number.isFinite(t) ? Math.round((ted - t) / 1000) : null;
}

/** `5:00`, `0:07` — vždy kladně, znaménko si nese význam jinde. */
export function mmss(vterin: number): string {
  const s = Math.abs(Math.round(vterin));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Co se zrovna děje na startu.
 *
 * <ul>
 *   <li><b>ceka</b> — rozjížďka má čas startu, ale procedura ještě neběží.</li>
 *   <li><b>procedura</b> — odpočet běží, `doStartuS` je kladné.</li>
 *   <li><b>jede</b> — po startu; `odStartuS` říká, jak dlouho se jede.</li>
 * </ul>
 */
export type StavStartu =
  | { druh: 'ceka'; cislo: number; startV: string }
  | { druh: 'procedura'; cislo: number; startV: string; doStartuS: number }
  | { druh: 'jede'; cislo: number; odStartuS: number };

/**
 * Která rozjížďka je právě na řadě a v jakém je stavu — nebo `null`, když
 * se na startu nic neděje.
 *
 * <b>Běžící rozjížďka přebíjí plánovanou.</b> Kdyby se díval jen na
 * plánované, ukazoval by odpočet další rozjížďky zatímco předchozí jede,
 * a to je na vodě ta horší zpráva: rozhodčí potřebuje vidět, co má pod
 * rukama teď.
 *
 * Z plánovaných se bere ta <b>nejbližší v čase</b>, ne první v seznamu:
 * pořadí v poli je podle čísla rozjížďky a odložená třetí může mít start
 * dřív než čtvrtá.
 */
export function stavStartu(
  rozjizdky: readonly RozjizdkaProOdpocet[],
  ted: number,
  /** Délka procedury té regaty ve vteřinách; bez ní platí pětka. */
  delkaS: number = PROCEDURA_S,
): StavStartu | null {
  const bezi = rozjizdky.find((r) => r.stav === 'Probiha');
  if (bezi) {
    const od = odStartu(bezi.startV, ted);
    return { druh: 'jede', cislo: bezi.cislo, odStartuS: od !== null && od > 0 ? od : 0 };
  }

  let nejblizsi: { r: RozjizdkaProOdpocet; od: number } | null = null;
  for (const r of rozjizdky) {
    if (r.stav !== 'Planovana') continue;
    const od = odStartu(r.startV, ted);
    // Start v minulosti u plánované rozjížďky není odpočet: buď ji nikdo
    // nespustil, nebo se čas zapomněl přepsat. Odpočet do záporu by lhal.
    if (od === null || od >= 0) continue;
    if (!nejblizsi || od > nejblizsi.od) nejblizsi = { r, od };
  }
  if (!nejblizsi) return null;

  const doStartu = -nejblizsi.od;
  const startV = nejblizsi.r.startV!;
  return doStartu <= delkaS
    ? { druh: 'procedura', cislo: nejblizsi.r.cislo, startV, doStartuS: doStartu }
    : { druh: 'ceka', cislo: nejblizsi.r.cislo, startV };
}

/**
 * Kdy procedura začne, v místním čase.
 *
 * Zóna je napevno pražská, ne telefonova: regata se jede na Orlíku a čas
 * má říkat tamní i tomu, kdo má v telefonu jinou zónu — a test pak dává
 * stejný výsledek kdekoli. Totéž dělá tabule.
 */
export function zacatekProcedury(startV: string, delkaS: number = PROCEDURA_S): string {
  const zacatek = Date.parse(startV) - delkaS * 1000;
  return new Intl.DateTimeFormat('cs-CZ', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Prague',
  }).format(new Date(zacatek));
}

/**
 * Fáze startovní procedury podle ZPJ 26.
 *
 * <b>Signály nejsou každou minutu.</b> Pravidlo zná čtyři okamžiky —
 * vyzývací znamení, přípravné znamení, jedna minuta a start — a mezi
 * přípravným znamením a poslední minutou jsou **tři minuty ticha**.
 * Odpočet rozdělený na stejné minuty by tedy sliboval kroky, které se
 * nekonají.
 *
 * <ul>
 *   <li><b>vyzva</b> — od začátku procedury do přípravného znamení.
 *       U pětiminutovky trvá minutu, u delší procedury víc: variabilní
 *       je jen začátek, zbytek pravidlo přibíjí ke startu.</li>
 *   <li><b>priprava</b> — od čtvrté minuty do konce druhé.</li>
 *   <li><b>minuta</b> — poslední minuta, od spuštění přípravné vlajky.</li>
 * </ul>
 */
export type FazeProcedury = 'vyzva' | 'priprava' | 'minuta';

/** Přípravné znamení padne čtyři minuty před startem (ZPJ 26). */
export const PRIPRAVNE_S = 4 * 60;

/** Přípravná vlajka se spouští minutu před startem (ZPJ 26). */
export const MINUTA_S = 60;

/** Ve které fázi procedura je, když do startu zbývá `doStartuS` vteřin. */
export function fazeProcedury(doStartuS: number): FazeProcedury {
  if (doStartuS <= MINUTA_S) return 'minuta';
  if (doStartuS <= PRIPRAVNE_S) return 'priprava';
  return 'vyzva';
}

/** Jeden úsek procedury k vykreslení: jak je dlouhý a kolik z něj uběhlo. */
export type UsekProcedury = {
  faze: FazeProcedury;
  /** Délka úseku ve vteřinách; podle ní se dělí šířka na obrazovce. */
  delkaS: number;
  /** Kolik z úseku uběhlo, 0 až 1. */
  hotovo: number;
};

/**
 * Úseky procedury pro pruh odpočtu — <b>nestejně dlouhé</b>, protože
 * takové jsou i v pravidlech.
 *
 * U pětiminutovky vyjde poměr 1 : 3 : 1. U delší procedury roste jen
 * první úsek; u kratší než čtyři minuty vyzývací fáze zmizí úplně,
 * protože přípravné znamení by padlo dřív než ona.
 */
export function usekyProcedury(
  doStartuS: number,
  delkaS: number = PROCEDURA_S,
): UsekProcedury[] {
  const vyzvaS = Math.max(0, delkaS - PRIPRAVNE_S);
  const pripravaS = Math.max(0, Math.min(delkaS, PRIPRAVNE_S) - MINUTA_S);
  const minutaS = Math.min(delkaS, MINUTA_S);

  const ubehlo = delkaS - doStartuS;
  let zacatek = 0;

  return ([
    { faze: 'vyzva' as const, delkaS: vyzvaS },
    { faze: 'priprava' as const, delkaS: pripravaS },
    { faze: 'minuta' as const, delkaS: minutaS },
  ])
    .filter((u) => u.delkaS > 0)
    .map((u) => {
      const hotovo = Math.max(0, Math.min(1, (ubehlo - zacatek) / u.delkaS));
      zacatek += u.delkaS;
      return { ...u, hotovo };
    });
}

/**
 * Jedna věta pod odpočet. <b>Prázdné znamená „jen číslo"</b> — dokud se
 * nestartuje, nemá co dodat.
 */
export function popisStartu(stav: StavStartu | null): string | null {
  if (!stav) return null;
  if (stav.druh === 'jede') return `Rozjížďka ${stav.cislo} jede ${mmss(stav.odStartuS)}`;
  if (stav.druh === 'procedura') return `Rozjížďka ${stav.cislo} startuje`;
  return `Rozjížďka ${stav.cislo} — procedura začne ve ${zacatekProcedury(stav.startV)}`;
}
