import Link from "@/app/sprava/odkaz";
import { Drobecky, drobeckySpravy } from "@/app/drobecky";
import { Vypadek } from "@/app/vypadek";
import { datum } from "@/app/datum";
import { NadpisRocniku, PataOkna, PruhRocniku } from "@/app/sprava/pruh-rocniku";
import { nactiJa } from "@/lib/ja";
import { nactiSerie } from "@/lib/api";
import { nactiSady } from "@/lib/oponentura";
import { nactiZastavky, type ZastavkaVysledky } from "@/lib/vysledky";
import {
  jenSveZastavky,
  NAZVY_ROLI,
  polozkaOponentury,
  prava,
  roleVRocniku,
  smi,
  type Polozka,
  type Udelena,
} from "@/lib/co-smim";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Správa ročníku" };

/**
 * Rozcestník ročníku: co můžu dělat a co čeká zrovna teď.
 *
 * <b>Proč vznikl.</b> Správa neměla rozcestník — jedinou navigací byla
 * rozbalovací nabídka pod ikonkou účtu, přihlášky a směrnice v ní vůbec
 * nebyly a šlo se na ně oklikou z kalendáře (audit, 6. 10. 2026). Kdo se
 * přihlásil, viděl seznam odkazů pojmenovaných slugem ročníku a musel vědět,
 * za kterým z nich je jeho práce.
 *
 * <b>Vede se úkolem, ne obrazovkou.</b> Nahoře stojí „co teď" spočítané
 * z dat — vrácené výsledky, nejbližší regata, rozjížďky, které nejsou venku.
 * Teprve pod tím je rozpis všeho ostatního. Pořadatel, který přijde zapsat
 * dojezdy, má svůj úkol na prvním řádku a nemusí hádat, že se na něj jde
 * přes „Výsledky".
 *
 * <b>U každé skupiny stojí role, ze které plyne.</b> Právě tu větu si člověk
 * nemá kde přečíst: role se uděluje na obrazovce oprávnění a pak už je vidět
 * jen podle toho, co se někde objeví nebo neobjeví.
 */
export default async function RozcestnikRocniku({
  params,
}: {
  params: Promise<{ serie: string }>;
}) {
  const { serie } = await params;

  const { ja } = await nactiJa();
  const udelena = prava(ja);

  const hlava = (
    <>
      <Drobecky cesta={drobeckySpravy(serie)} />
      <h1>Správa ročníku</h1>
    </>
  );

  if (!ja)
    return (
      <>
        {hlava}
        <p className="prazdno">
          Na správu se musíš <Link href="/prihlaseni">přihlásit</Link>.
        </p>
      </>
    );

  const moje = roleVRocniku(udelena, serie);
  if (moje.length === 0)
    return (
      <>
        {hlava}
        <p className="prazdno">
          V tomhle ročníku nemáš žádnou roli, takže tu není co spravovat. Roli
          udílí správce ročníku — pořadatele a editora jedné regaty i rozhodčí.
          Co která role smí, stojí v{" "}
          <Link href="/napoveda#role">nápovědě</Link>.
        </p>
      </>
    );

  // Zastávky jsou tu kvůli „co teď" i kvůli odkazům na přihlášky a směrnice.
  // Kdo je nesmí číst (čistý editor), dostane rozcestník bez nich — výpadek
  // jedné části nemá sebrat celou stránku.
  const { stav, data } = await nactiZastavky(serie);
  if (stav === "vypadek") return <Vypadek />;

  const zastavky = data ?? [];
  const jenSve = jenSveZastavky(udelena, serie);
  const mojeZastavky = jenSve
    ? zastavky.filter((z) => jenSve.includes(z.zavod))
    : zastavky;

  const ukoly = coTeď(udelena, serie, mojeZastavky);

  // Otázky k aplikaci jsou fronta, ne agenda — v pruhu nestojí a připomenou
  // se tady (konzilium, 12. 11. 2026). Výpadek téhle části nemá sebrat
  // obrazovku, takže se na ni jen nečeká.
  const otazky = await ukolOponentury(udelena, serie);
  if (otazky) ukoly.push(otazky);

  const nazevRocniku =
    (await nactiSerie().catch(() => []))?.find((s) => s.slug === serie)?.nazev ?? serie;

  return (
    <>
      <Drobecky cesta={drobeckySpravy(serie)} />
      <PruhRocniku serie={serie} aktivni="coted" />
      <NadpisRocniku
        serie={serie}
        nazevRocniku={nazevRocniku}
        tab="coted"
        podtitulek={moje.map((m, i) => (
          <span key={`${m.role}-${m.zavod ?? ""}-${i}`} className="stitek">
            {NAZVY_ROLI[m.role]}
            {m.zavod ? ` — ${nazevZastavky(zastavky, m.zavod)}` : " ročníku"}
          </span>
        ))}
      />

      <ul className="seznam ukoly-ted">
        {ukoly.map((u) => (
          <li key={u.kam}>
            <Link className="karta" href={u.kam}>
              <div className="nazev">{u.nazev}</div>
              <div className="detail">{u.popis}</div>
            </Link>
          </li>
        ))}
        {/* <b>Co teď nesmí být prázdné</b> (konzilium, 12. 11. 2026): mimo
            závodní den nevydá `coTeď` nic, a to je většina roku — sedm regat
            z osmi je plánovaných. Prázdná obrazovka by na nejčastější cestě
            roku přidala klepnutí, které měla přestavba ušetřit. */}
        {ukoly.length === 0 && <NejblizsiRegata serie={serie} zastavky={mojeZastavky} />}
      </ul>

      <PataOkna serie={serie} />
    </>
  );
}

/**
 * Co čeká zrovna teď, od nejpozdnějšího. Tři věci, kvůli kterých se do správy
 * chodí: výsledky se vrátily k revizi, jede se, a co je hotové ještě není ven.
 */
function coTeď(udelena: Udelena[], serie: string, zastavky: ZastavkaVysledky[]): Polozka[] {
  const kam = (zavod: string, cesta = "/vysledky") =>
    `/sprava/${encodeURIComponent(serie)}${cesta}/${encodeURIComponent(zavod)}`;

  /**
   * Kam dlaždici poslat, když čekají tyhle rozjížďky.
   *
   * <b>Jedna čekající znamená jít rovnou do ní</b> (Filip, 20. 10. 2026:
   * *„tyhle tři tlačítka vypadá že dělají asi to samé"*). Vypadala tak,
   * protože to dělala: všechny vedly na `/vysledky/{zavod}`, takže po
   * kliknutí člověk stál před seznamem a znovu hledal, co šel dělat.
   * U víc čekajících seznam zůstává — tam je výběr na místě.
   */
  const kRozjizdkam = (zavod: string, cisla: readonly number[]) =>
    cisla.length === 1
      ? `${kam(zavod)}/${cisla[0]}`
      : kam(zavod);

  const ukoly: Polozka[] = [];

  // 1. Vrácené výsledky. Někdo na ně čeká a sám se to nedozví — rozhodčí
  //    napsal důvod a dokud se to neopraví, čísla nejdou dál.
  for (const z of zastavky.filter((z) => z.kRevizi.length > 0)) {
    if (!smi(udelena, { role: "Organizator", serie, zavod: z.zavod })) continue;
    ukoly.push({
      nazev: `Opravit vrácené výsledky — ${z.nazev}`,
      popis:
        z.kRevizi.length === 1
          ? `${z.kRevizi[0]}. rozjížďka. Rozhodčí napsal, co je špatně.`
          : `${z.kRevizi.length}× k revizi. Rozhodčí napsal, co je špatně.`,
      kam: kRozjizdkam(z.zavod, z.kRevizi),
      role: "Organizator",
    });
  }

  // 2. Regata, která se jede nebo se pojede nejblíž. Zápis z cíle je jediná
  //    práce, kde zdržení znamená ztracený výsledek, takže stojí nejvýš.
  const dnes = new Date().toISOString().slice(0, 10);
  const jede = zastavky
    .filter((z) => z.stav === "Vypsany" && z.datum >= dnes)
    .sort((a, b) => a.datum.localeCompare(b.datum))[0];
  if (jede && smi(udelena, { role: "Organizator", serie, zavod: jede.zavod })) {
    ukoly.push({
      nazev:
        jede.datum === dnes
          ? `Zapsat dojezdy — ${jede.nazev}`
          : `Chystá se ${jede.nazev}`,
      popis:
        jede.datum === dnes
          ? "Dnes. Start a klepání v cíli."
          : `${datum(jede.datum)}. Kdo je přihlášený a kdo chybí.`,
      // <b>Dvě různé práce, dvě různá místa.</b> V den závodu se zapisuje
      // v cíli, takže výsledky; předtím se sbírají přihlášky. Dřív vedlo
      // obojí na výsledky, kde se den předem nedá dělat nic — a popis
      // přitom sliboval „přihlášky, směrnice, rozjížďky", tedy tři místa,
      // z nichž tam nebylo ani jedno (Filip, 20. 10. 2026).
      kam: jede.datum === dnes ? kam(jede.zavod) : kam(jede.zavod, "/prihlasky"),
      role: "Organizator",
    });
  }

  // 3. Čeká na podpis rozhodčího. Nikde jinde se to nepřipomíná — a dřív
  //    se to počítalo z publikace, takže rozjížďka, která už venku byla
  //    a jen prošla revizí, rozhodčímu nenaskočila vůbec: pořadatel mu ji
  //    předal a on se to nedozvěděl (průchod scénářem D3, 8. 10. 2026).
  for (const z of zastavky.filter((z) => z.kPodpisu.length > 0)) {
    if (!smi(udelena, { role: "Rozhodci", serie })) continue;
    ukoly.push({
      nazev: `Ověřit výsledky — ${z.nazev}`,
      popis:
        z.kPodpisu.length === 1
          ? `${z.kPodpisu[0]}. rozjížďka čeká na tvůj podpis.`
          : `${z.kPodpisu.length} z ${z.pocetRozjizdek} rozjížděk čeká na tvůj podpis.`,
      kam: kRozjizdkam(z.zavod, z.kPodpisu),
      role: "Rozhodci",
    });
  }

  // 4. Podepsané, a přesto ne venku. Publikace pořád není stav — ale od
  //    27. 10. 2026 ji dělá rozhodčí (`Workflow.KdoSmiPublikovat`), protože
  //    správce u vody nebývá a čísla pak čekala, až si někdo doma otevře
  //    notebook (`docs/AUDIT-OBSAZENI.md`, nález O3).
  for (const z of zastavky.filter((z) => z.kPublikaci.length > 0)) {
    if (!smi(udelena, { role: "Rozhodci", serie })) continue;
    ukoly.push({
      nazev: `Pustit ven — ${z.nazev}`,
      popis:
        z.kPublikaci.length === 1
          ? `${z.kPublikaci[0]}. rozjížďka je podepsaná, a nikdo ji neuvidí.`
          : `${z.kPublikaci.length} podepsaných rozjížděk nikdo neuvidí.`,
      // Tahle jediná zůstává na seznamu i u jedné: pouští se po dávkách
      // a tlačítko „Pustit ven" je právě tam.
      kam: kam(z.zavod),
      role: "Rozhodci",
    });
  }

  return ukoly;
}

/**
 * Otázky k aplikaci jako <b>položka fronty</b>, ne jako tab.
 *
 * Objeví se, jen když něco visí — sada, která není dokončená. Trvalá cesta
 * k nim je v patě okna; tohle je připomínka, ne navigace.
 *
 * <b>Výpadek téhle části nesmí sebrat obrazovku.</b> Je to doplněk nad
 * úkoly, které se počítají z přehledu zastávek, takže při jakémkoliv jiném
 * stavu než `ok` se prostě nic nepřipomene.
 */
async function ukolOponentury(udelena: Udelena[], serie: string): Promise<Polozka | null> {
  const polozka = polozkaOponentury(udelena, serie);
  if (!polozka) return null;

  const { stav, data } = await nactiSady(serie);
  if (stav !== "ok" || !data) return null;

  const visi = data.filter((s) => s.stav !== "Odpovezeno");
  if (visi.length === 0) return null;

  const cekaOtazek = visi.reduce((n, s) => n + (s.pocetOtazek - s.odpovezeno), 0);
  const prorozhodciho = smi(udelena, { role: "Rozhodci", serie });

  return {
    ...polozka,
    nazev: "Odpovědět na otázky k aplikaci",
    popis: prorozhodciho
      ? `${cekaOtazek} ${tvarOtazek(cekaOtazek)} čeká na tvou odpověď.`
      : `${cekaOtazek} ${tvarOtazek(cekaOtazek)} čeká na rozhodčího.`,
  };
}

/** „1 otázka · 2 otázky · 5 otázek" — číslovka řídí tvar, ne naopak. */
const tvarOtazek = (n: number) => (n === 1 ? "otázka" : n < 5 ? "otázky" : "otázek");

/**
 * Když nic nečeká, stojí tu <b>nejbližší regata</b> — fakt, ne úkol.
 *
 * Jméno proto není rozkazovací způsob: rozkaz si drží skutečné úkoly
 * (*Zapsat dojezdy*, *Pustit ven*), a fakt mezi nimi s vlastním slovesem by
 * se četl jako další práce. Karta vede do okna té regaty, takže i z prázdné
 * obrazovky je práce na jedno klepnutí.
 *
 * <b>Ve druhé fázi</b> se detail vymění za první chybějící dokument řady
 * vypsání → směrnice → trať → startovní listina. Dneska na to nejsou data:
 * `ZastavkaVysledkyDto` nese termín a stav zápisu, o vyvěšení nic.
 */
function NejblizsiRegata({
  serie,
  zastavky,
}: {
  serie: string;
  zastavky: ZastavkaVysledky[];
}) {
  const dnes = new Date().toISOString().slice(0, 10);
  const dalsi = zastavky
    .filter((z) => z.stav !== "Zruseny" && z.datum >= dnes)
    .sort((a, b) => a.datum.localeCompare(b.datum))[0];

  if (!dalsi)
    return (
      <li>
        <p className="prazdno">
          Teď nic nečeká a žádná další regata v ročníku není. Co je odjeté,
          najdeš v <Link href={`/sprava/${encodeURIComponent(serie)}/regaty`}>Regatách</Link>.
        </p>
      </li>
    );

  return (
    <li>
      <Link
        className="karta fakt"
        href={`/sprava/${encodeURIComponent(serie)}/zavod/${encodeURIComponent(dalsi.zavod)}`}
      >
        <div className="cim">
          {dalsi.nazev} · {datum(dalsi.datum)} · {STAV_SLOVEM[dalsi.stav] ?? dalsi.stav}
        </div>
        <div className="nazev">Nejbližší regata</div>
        <div className="detail">Teď nic nečeká.</div>
      </Link>
    </li>
  );
}

const STAV_SLOVEM: Record<string, string> = {
  Planovany: "plánováno",
  Vypsany: "vypsáno",
  Odjety: "odjeto",
  Zruseny: "zrušeno",
};

const nazevZastavky = (zastavky: ZastavkaVysledky[], zavod: string) =>
  zastavky.find((z) => z.zavod === zavod)?.nazev ?? zavod;
