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
 * Jak dlouho se jede: `12:38`, a nad hodinu `1:04:11`.
 *
 * <b>Odpočet a trvání nejsou totéž.</b> Odpočet je vždycky krátký, kdežto
 * rozjížďka může jet hodiny — a `mmss` by z toho udělalo `2845:13`, což
 * je číslo, které se ani nevejde do rámečku, ani se nedá přečíst.
 */
export function trvani(vterin: number): string {
  const s = Math.abs(Math.round(vterin));
  const hodin = Math.floor(s / 3600);
  if (hodin === 0) return mmss(s);
  const minut = Math.floor((s % 3600) / 60);
  return `${hodin}:${String(minut).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
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
  | { druh: 'odstartovano'; cislo: number; odStartuS: number }
  | { druh: 'jede'; cislo: number; odStartuS: number };

/**
 * Nejdelší jízda, která ještě dává smysl.
 *
 * Dvacetičtyřhodinovka se jede *„klidně 30 h i s tou přípravou a dojezdy"*
 * (Filip, 24. 10. 2026), takže mez musí být velkorysá. Co běží déle,
 * není jízda — je to <b>rozjížďka, kterou nikdo neuzavřel</b>.
 */
export const NEJDELSI_JIZDA_S = 30 * 3600;

/**
 * Běží ta rozjížďka tak dlouho, že to není jízda, ale zapomenutý záznam?
 *
 * <b>Změřeno 29. 10. 2026 na skutečných datech:</b> regata Jarní vítr měla
 * rozjížďku ve stavu „probíhá" od 27. 10., tedy 47 hodin. Odpočet další
 * rozjížďky by se kvůli ní <b>nikdy neukázal</b> — běžící přebíjí
 * plánovanou — a panel místo něj hlásil „Rozjížďka 4 jede 2845:13".
 *
 * Rozjížďka bez času startu se za zapomenutou nepovažuje: o jejím stáří
 * nic nevíme a tvrdit, že je zapomenutá, by bylo domýšlení.
 */
function jeZapomenuta(r: RozjizdkaProOdpocet, ted: number): boolean {
  const od = odStartu(r.startV, ted);
  return od !== null && od > NEJDELSI_JIZDA_S;
}

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
  const bezi = rozjizdky.find(
    (r) => r.stav === 'Probiha' && !jeZapomenuta(r, ted),
  );
  if (bezi) {
    const od = odStartu(bezi.startV, ted);
    return { druh: 'jede', cislo: bezi.cislo, odStartuS: od !== null && od > 0 ? od : 0 };
  }

  let nejblizsi: { r: RozjizdkaProOdpocet; od: number } | null = null;
  for (const r of rozjizdky) {
    if (r.stav !== 'Planovana') continue;
    const od = odStartu(r.startV, ted);
    if (od === null) continue;

    // Start padl, ale rozjížďka je pořád „plánovaná" — nikdo nepotvrdil,
    // že se jede. Miloš (nahrávka 21): *„pokud ty dlaždice nevyužiju, tak
    // by se měla objevit kolonka start nebo odstartováno."* Dokud na to
    // neklepne, panel to drží; po `NEPOTVRZENY_START_S` to přestává být
    // čerstvý start a stává se zapomenutým časem, na který se nečeká.
    if (od >= 0) {
      if (od <= NEPOTVRZENY_START_S) {
        return { druh: 'odstartovano', cislo: r.cislo, odStartuS: od };
      }
      continue;
    }
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
 * Jak dlouho po startu ještě platí klid na práci.
 *
 * Pět minut (Filip, 29. 10. 2026). Není to konec rozhodčího práce, ale
 * konec té části, kde každá vteřina něco znamená: po startu se řeší
 * předčasné starty a případné odvolání, a teprve pak se dá zvednout
 * telefon.
 */
export const PO_STARTU_NERUSIT_S = 5 * 60;

/**
 * O kolik dřív než procedura začíná klid na telefonu.
 *
 * Minutu (Filip, 29. 10. 2026): appka v ní ohlásí, že se přepíná do
 * *Nerušit*, a pak že procedura za chvíli začne. Totéž číslo má partitura
 * jako `PREDEHRA_S` — kdyby se rozešla, telefon by ztichl dřív nebo
 * později, než o tom řekne.
 */
export const PREDEHRA_KLIDU_S = 60;

/**
 * Jak dlouho se po startu čeká na potvrzení, že se jede.
 *
 * Patnáct minut. Kratší by panel sebralo rozhodčímu, který zrovna řeší
 * předčasný start; delší by z něj udělalo pomník nad rozjížďkou, kterou
 * nikdo nikdy nerozjel.
 */
export const NEPOTVRZENY_START_S = 15 * 60;

/**
 * Má teď telefon mlčet?
 *
 * <b>Okno od zahájení procedury do pěti minut po startu</b> — tedy přesně
 * ta chvíle, kdy *„Milošovi zavolá manželka a udělá to z něj blbce před
 * celým soutěžním polem"* (Filip, 29. 10. 2026). Mimo ně se režim telefonu
 * nemění: vypnout rozhodčímu vyzvánění na celý den by byla medvědí služba.
 *
 * <b>Je to pravidlo, ne přepínač.</b> Zapnout *Nerušit* umí jen Android;
 * na iPhonu je to systémové nastavení, do kterého aplikace nesmí. Tahle
 * funkce říká jen, kdy by to mělo platit — kdo a jak to provede, je věc
 * platformy (viz `docs/APPKA-PORADI-PRACI.md`).
 */
export function maBytKlid(
  stav: StavStartu | null,
  ted: number = Date.now(),
  /** Délka procedury té regaty ve vteřinách; bez ní platí pětka. */
  delkaS: number = PROCEDURA_S,
): boolean {
  if (!stav) return false;
  if (stav.druh === 'procedura') return true;
  if (stav.druh === 'jede' || stav.druh === 'odstartovano')
    return stav.odStartuS <= PO_STARTU_NERUSIT_S;

  // Čeká se. Klid začíná o minutu dřív než procedura, aby appka stihla
  // ohlásit, že se přepíná (Filip, 29. 10. 2026) — rozhodčí tak ví, že
  // telefon ztichne, a nepřekvapí ho to uprostřed hovoru.
  const od = odStartu(stav.startV, ted);
  if (od === null) return false;
  const doZahajeni = -od - delkaS;
  return doZahajeni <= PREDEHRA_KLIDU_S;
}

/**
 * Jedna věta pod odpočet. <b>Prázdné znamená „jen číslo"</b> — dokud se
 * nestartuje, nemá co dodat.
 */
export function popisStartu(stav: StavStartu | null): string | null {
  if (!stav) return null;
  if (stav.druh === 'jede') return `Rozjížďka ${stav.cislo} jede ${trvani(stav.odStartuS)}`;
  if (stav.druh === 'odstartovano')
    return `Rozjížďka ${stav.cislo} — start padl před ${trvani(stav.odStartuS)}`;
  if (stav.druh === 'procedura') return `Rozjížďka ${stav.cislo} startuje`;
  return `Rozjížďka ${stav.cislo} — procedura začne ve ${zacatekProcedury(stav.startV)}`;
}
