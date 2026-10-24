import Link from "next/link";
import type { VerejnaTrat, ZavodDetail } from "@/lib/api";
import { STRANKA_BLESKU, type Blesky } from "@/lib/blesky";

/**
 * Pruh upozornění nad celou stránkou regaty (Filip, 11. 10. 2026: *„Nad tím
 * nějaké Alerty ohledně té regaty jako např že se jede první druhá rozjížďka
 * a nebo že rozprava bude tehdy a tehdy"*).
 *
 * <b>Stojí nad taby, ne v sekci.</b> Co se zrovna děje, platí ve všech
 * sekcích — kdo se dívá na seznam lodí, má stejně vědět, že se právě jede.
 *
 * <b>Nic se tu nevymýšlí.</b> Každé upozornění stojí na poli, které API
 * vydává: stav rozjížďky, čas startu, přestavba trati, stav regaty, datum
 * vyvěšení směrnice. Rozprava mezi nimi chybí, protože ji model nemá —
 * až bude, přibude sem řádek.
 *
 * Jediná výjimka z toho pravidla jsou <b>blesky</b>: ty nejsou z našeho API,
 * ale z družice přes EUMETSAT (`lib/blesky.ts`). Patří sem, protože jsou
 * důvod regatu přerušit, a nikam jinam na stránku se nehodí — a ukazují se
 * <b>jen v den regaty</b> (Filip, 24. 10. 2026: *„zajímá nás to nejvíce
 * v den závodu, mimo tyto exponované dny to není až zase tak nutné"*).
 */

type Upozorneni = {
  klic: string;
  /** Vyžaduje pozornost teď hned — jinak je to jen informace. */
  nalehave?: boolean;
  text: React.ReactNode;
};

/** „2026-05-15T12:30:00" → „12:30". Bez data: start je vždycky dnes. */
const cas = (kdy: string) =>
  new Date(kdy).toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit" });

/**
 * Totéž pro čas, který přichází v UTC (snímek družice). Zónu je tu nutné
 * říct: bez ní by se čas na vývojovém stroji a v kontejneru lišil o dvě
 * hodiny, protože server jede v UTC.
 */
const casPraha = (iso: string) =>
  new Date(iso).toLocaleTimeString("cs-CZ", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Europe/Prague",
  });

/** Kolik dní je směrnice ještě novinka. Po týdnu ji každý, koho se týká, zná. */
const CERSTVA_SMERNICE_DNU = 7;

/** Kolik řádků pruhu se na telefonu vejde, aniž by odtlačil obsah pod okraj. */
const NEJVIC_UPOZORNENI = 3;

/**
 * Od kolika kilometrů níž je bouřka věc, kvůli které se jde z vody.
 * Družice má přesnost řádu deseti kilometrů (viz `lib/blesky.ts`), takže
 * jemnější hranice by předstírala přesnost, kterou data nemají.
 */
const BOURKA_BLIZKO_KM = 30;

/**
 * Pod touhle plochou se aktivita nehlásí. ATBD přístroje připouští falešné
 * výboje a jeden osamocený pixel je přesně ten případ; tohle jsou zhruba
 * tři pixely výřezu.
 */
const NEJMENSI_PLOCHA_KM2 = 2;

function dnuOd(kdy: string) {
  return (Date.now() - new Date(kdy).getTime()) / 86_400_000;
}

/** Datum v pražském pásmu jako YYYY-MM-DD — regaty se jedou na Orlíku. */
const denVPraze = (kdy: Date) => kdy.toLocaleDateString("sv-SE", { timeZone: "Europe/Prague" });

/** Jede se dnes? U vícedenní regaty platí celé rozpětí. */
export function jedeSeDnes(zavod: ZavodDetail, ted = new Date()): boolean {
  if (zavod.stav === "Zruseny") return false;
  const dnes = denVPraze(ted);
  return dnes >= zavod.datum && dnes <= (zavod.datumKonce ?? zavod.datum);
}

export function upozorneniZastavky(
  zavod: ZavodDetail,
  trat: VerejnaTrat | null,
  kam: { trat: string; tabule: string; prihlaska: string; smernice: string },
  blesky: Blesky | null = null,
): Upozorneni[] {
  const u: Upozorneni[] = [];

  // Bouřka je první, protože je to jediné upozornění o bezpečnosti — kvůli
  // ostatním se nikdo z vody nevrací. Když se snímek nepodaří načíst, řádek
  // chybí: pruh nikdy netvrdí, že je klid, takže se z jeho mlčení nedá nic
  // vyčíst (na rozdíl od widgetu výstrah, který to říct musí).
  if (blesky && blesky.nejblizKm !== null && blesky.plochaKm2 >= NEJMENSI_PLOCHA_KM2) {
    const blizko = blesky.nejblizKm <= BOURKA_BLIZKO_KM;
    u.push({
      klic: "blesky",
      nalehave: blizko,
      text: (
        <>
          {blizko ? (
            <b>
              Bouřka {blesky.nejblizKm} km {blesky.smer}.
            </b>
          ) : (
            <>
              Blesková aktivita {blesky.nejblizKm} km {blesky.smer}.
            </>
          )}{" "}
          <a href={STRANKA_BLESKU} target="_blank" rel="noopener noreferrer">
            Z družice v {casPraha(blesky.cas)} →
          </a>
        </>
      ),
    });
  }

  // Co se právě jede, je nejdůležitější věta na stránce. Tabule to ukazuje
  // v plné velikosti, tady stačí odkaz.
  const probiha = zavod.rozjizdky.find((r) => r.stav === "Probiha");
  if (probiha)
    u.push({
      klic: "probiha",
      nalehave: true,
      text: (
        <>
          <b>Právě se jede {probiha.cislo}. rozjížďka.</b>{" "}
          <Link href={kam.tabule}>Sledovat na tabuli →</Link>
        </>
      ),
    });

  // Nejbližší start, který teprve bude. Rozjížďky chodí v pořadí, takže
  // stačí první plánovaná s časem.
  const pristi = zavod.rozjizdky.find((r) => r.stav === "Planovana" && r.startV);
  if (pristi?.startV)
    u.push({
      klic: "start",
      text: (
        <>
          Start {pristi.cislo}. rozjížďky v {cas(pristi.startV)}.
        </>
      ),
    });

  if (trat?.prestavba)
    u.push({
      klic: "prestavba",
      nalehave: true,
      text: (
        <>
          <b>Trať se právě přestavuje.</b> <Link href={kam.trat}>Co je s tratí →</Link>
        </>
      ),
    });

  // Nově vyvěšená směrnice je důvod, proč se na stránku chodí znovu. Starší
  // verze zůstávají ve vývěsce, ale upozorňovat na ně nemá smysl — a u
  // dojeté regaty nemá smysl ani ta nová: podle ní se už jelo.
  const smernice = zavod.smernice?.[0];
  const pojede = zavod.stav !== "Odjety" && zavod.stav !== "Zruseny";
  if (pojede && smernice && dnuOd(smernice.vyveseneV) <= CERSTVA_SMERNICE_DNU)
    u.push({
      klic: "smernice",
      text: (
        <>
          {zavod.smernice!.length > 1 ? "Nová verze plachetní směrnice" : "Plachetní směrnice je venku"}{" "}
          (verze {smernice.verze}). <Link href={kam.smernice}>Přečíst →</Link>
        </>
      ),
    });

  // Vypsáno znamená přesně tohle: pořadatel vydal vypsání a směrnice, takže
  // se dá hlásit (plán, oddíl *Stav přihlášek se nemodeluje*). Jakmile se
  // jede, je to věta pro někoho jiného — a sekce Lodě ji říká dál.
  if (zavod.stav === "Vypsany" && !probiha)
    u.push({
      klic: "prihlasky",
      text: (
        <>
          Přihlášky jsou otevřené. <Link href={kam.prihlaska}>Přihlásit loď →</Link>
        </>
      ),
    });

  if (zavod.stav === "Zruseny")
    u.push({
      klic: "zruseno",
      nalehave: true,
      text: <b>Regata se nekoná. Do poháru se nepočítá.</b>,
    });

  // Pruh, který zabere půl obrazovky, přestane být pruh. Pořadí výše je
  // pořadí důležitosti, takže se uřízne konec — a to, co se uřízne, stojí
  // i v sekci, na kterou vede tab.
  return u.slice(0, NEJVIC_UPOZORNENI);
}

export function Upozorneni({ upozorneni }: { upozorneni: Upozorneni[] }) {
  if (upozorneni.length === 0) return null;

  return (
    <ul className="upozorneni" aria-label="Co je u regaty nového">
      {upozorneni.map((z) => (
        <li key={z.klic} className={z.nalehave ? "nalehave" : undefined}>
          {z.text}
        </li>
      ))}
    </ul>
  );
}
