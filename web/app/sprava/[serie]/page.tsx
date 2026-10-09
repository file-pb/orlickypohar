import Link from "next/link";
import { Drobecky, drobeckySpravy } from "@/app/drobecky";
import { Stav } from "@/app/stav";
import { Vypadek } from "@/app/vypadek";
import { datum } from "@/app/datum";
import { nactiJa } from "@/lib/ja";
import { nactiZastavky, type ZastavkaVysledky } from "@/lib/vysledky";
import {
  jenSveZastavky,
  NAZVY_ROLI,
  polozkyRocniku,
  polozkyWebu,
  polozkyZastavky,
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
  const rocnikove = polozkyRocniku(udelena, serie);
  const web = polozkyWebu(udelena);

  return (
    <>
      {hlava}
      <p className="podtitulek">
        {moje.map((m, i) => (
          <span key={`${m.role}-${m.zavod ?? ""}-${i}`} className="stitek">
            {NAZVY_ROLI[m.role]}
            {m.zavod ? ` — ${nazevZastavky(zastavky, m.zavod)}` : " ročníku"}
          </span>
        ))}
      </p>

      <h2>Co teď</h2>
      {ukoly.length === 0 ? (
        <p className="prazdno">
          Nic nečeká. V den regaty tu bude zápis z cíle; do té doby se chystá{" "}
          {mojeZastavky.length > 0
            ? "u regaty níž — přihlášky a směrnice."
            : "v rozpisu níž."}
        </p>
      ) : (
        <ul className="seznam">
          {ukoly.map((u) => (
            <li key={u.kam}>
              <Link className="karta" href={u.kam}>
                <div className="nazev">{u.nazev}</div>
                <div className="detail">{u.popis}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {mojeZastavky.length > 0 && (
        <>
          <h2>{jenSve ? "Moje regaty" : "Regaty ročníku"}</h2>
          <p className="poznamka">
            U každé je zápis výsledků, přihlášky, směrnice i bóje na trati —
            všechno, co se k jedné regatě dělá, pohromadě. Odsud se na to
            chodí a drobečky na těch obrazovkách sem vedou zpátky.
          </p>
          <ul className="seznam">
            {mojeZastavky.map((z) => (
              /* Kotva na kartu regaty. Je to adresa toho, co jinde chybí —
                 „regata ve správě" vlastní stránku nemá a tahle karta je
                 ona, takže na ni míří drobeček regaty i „zpátky na regatu"
                 z bójí a směrnic (`drobekRegaty`). */
              <li key={z.zavod} id={z.zavod}>
                <div className="karta">
                  <div className="nazev">
                    {z.nazev}
                    <Stav stav={z.stav} />
                    {z.kRevizi > 0 && (
                      <span className="stitek vysledek-krevizi">{z.kRevizi}× k revizi</span>
                    )}
                  </div>
                  <div className="detail">{datum(z.datum)}</div>
                  {/* Zrušená zastávka nemá výsledky ani přihlášky a API je
                      odmítne — odkaz na ni by byl slib naprázdno. */}
                  <p className="poznamka">
                    {z.stav === "Zruseny"
                      ? "Zrušeno. Nic se tu nezapisuje."
                      : polozkyZastavky(udelena, serie, z.zavod).map((p, i) => (
                          <span key={p.kam}>
                            {i > 0 && " · "}
                            <Link href={p.kam}>{p.nazev}</Link>
                          </span>
                        ))}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {rocnikove.length > 0 && (
        <>
          <h2>Celý ročník</h2>
          <ul className="seznam">
            {rocnikove.map((p) => (
              <li key={p.kam}>
                <Link className="karta" href={p.kam}>
                  <div className="nazev">
                    {p.nazev}
                    <span className="stitek">{NAZVY_ROLI[p.role]}</span>
                  </div>
                  <div className="detail">{p.popis}</div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {web.length > 0 && (
        <>
          <h2>Mimo ročník</h2>
          <ul className="seznam">
            {web.map((p) => (
              <li key={p.kam}>
                <Link className="karta" href={p.kam}>
                  <div className="nazev">
                    {p.nazev}
                    <span className="stitek">{NAZVY_ROLI[p.role]} webu</span>
                  </div>
                  <div className="detail">{p.popis}</div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
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

  const ukoly: Polozka[] = [];

  // 1. Vrácené výsledky. Někdo na ně čeká a sám se to nedozví — rozhodčí
  //    napsal důvod a dokud se to neopraví, čísla nejdou dál.
  for (const z of zastavky.filter((z) => z.kRevizi > 0)) {
    if (!smi(udelena, { role: "Organizator", serie, zavod: z.zavod })) continue;
    ukoly.push({
      nazev: `Opravit vrácené výsledky — ${z.nazev}`,
      popis: `${z.kRevizi}× k revizi. Rozhodčí napsal, co je špatně.`,
      kam: kam(z.zavod),
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
          : `${datum(jede.datum)}. Přihlášky, směrnice, rozjížďky.`,
      kam: kam(jede.zavod),
      role: "Organizator",
    });
  }

  // 3. Čeká na podpis rozhodčího. Nikde jinde se to nepřipomíná — a dřív
  //    se to počítalo z publikace, takže rozjížďka, která už venku byla
  //    a jen prošla revizí, rozhodčímu nenaskočila vůbec: pořadatel mu ji
  //    předal a on se to nedozvěděl (průchod scénářem D3, 8. 10. 2026).
  for (const z of zastavky.filter((z) => z.kPodpisu > 0)) {
    if (!smi(udelena, { role: "Rozhodci", serie })) continue;
    ukoly.push({
      nazev: `Ověřit výsledky — ${z.nazev}`,
      popis: `${z.kPodpisu} z ${z.pocetRozjizdek} rozjížděk čeká na tvůj podpis.`,
      kam: kam(z.zavod),
      role: "Rozhodci",
    });
  }

  // 4. Podepsané, a přesto ne venku. Publikace není stav a není to podpis:
  //    „čísla platí" říká rozhodčí, „ať to vidí veřejnost" správce.
  for (const z of zastavky.filter((z) => z.kPublikaci > 0)) {
    if (!smi(udelena, { role: "Spravce", serie })) continue;
    ukoly.push({
      nazev: `Pustit ven — ${z.nazev}`,
      popis:
        z.kPublikaci === 1
          ? "Jedna potvrzená rozjížďka, a nikdo ji neuvidí."
          : `${z.kPublikaci} potvrzených rozjížděk nikdo neuvidí.`,
      kam: kam(z.zavod),
      role: "Spravce",
    });
  }

  return ukoly;
}

const nazevZastavky = (zastavky: ZastavkaVysledky[], zavod: string) =>
  zastavky.find((z) => z.zavod === zavod)?.nazev ?? zavod;
