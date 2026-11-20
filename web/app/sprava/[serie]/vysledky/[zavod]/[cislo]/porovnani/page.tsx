import Link from "@/app/sprava/odkaz";
import { notFound } from "next/navigation";
import { Drobecky, drobeckySpravy, drobekRegaty } from "@/app/drobecky";
import { Vypadek } from "@/app/vypadek";
import { nactiNavrhy, nactiZapis, type Navrh, type NavrhRadek } from "@/lib/vysledky";
import { KonceptVPorovnani } from "../koncept-ukazka";
import { pouzijNavrhAkce, prevezmiRadkyAkce } from "./akce";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Porovnání zápisů — správa" };

type Parametry = {
  params: Promise<{ serie: string; zavod: string; cislo: string }>;
  searchParams: Promise<{
    chyba?: string;
    stav?: string;
    kdo?: string;
    /** Kolik řádků se právě přečetlo z papíru. */
    zpapiru?: string;
    /** Kolik se jich nepodařilo přiřadit. */
    nepreceteno?: string;
    /** Kolik řádků se převzalo do výsledků. */
    kolik?: string;
  }>;
};

/**
 * Porovnání zápisů dvou zapisovatelů (PLAN.md, Zápis z vody, krok 4).
 *
 * <b>Na vodě zapisují dva a každý na svém telefonu.</b> Výsledky rozjížďky
 * jsou jedny, takže se v nich drží ta verze, která se uložila naposled;
 * ostatní zůstávají jako snímky. Tahle stránka je postaví vedle sebe,
 * zvýrazní místa, kde se liší, a nechá zapisovatele vybrat.
 *
 * <b>Srovnává se po místech v cíli</b>, ne po lodích: prohozená dvojice je
 * pak vidět jako dva rozdílné řádky vedle sebe, a chybějící loď jako
 * pomlčka u toho, kdo ji nemá.
 */
export default async function PorovnaniZapisu({ params, searchParams }: Parametry) {
  const { serie, zavod, cislo } = await params;
  const zpravy = await searchParams;

  const cisloRozjizdky = Number(cislo);
  if (!Number.isInteger(cisloRozjizdky) || cisloRozjizdky < 1) notFound();

  const { stav, data } = await nactiNavrhy(serie, zavod, cisloRozjizdky);
  // Uložený zápis je tu kvůli konceptu z telefonu: bez něj nejde říct, co
  // v něm je navíc proti serveru.
  const { data: zapis } = await nactiZapis(serie, zavod, cisloRozjizdky);

  if (stav === "vypadek") return <Vypadek />;
  if (stav === "neni") notFound();

  const zapisAdresa = `/sprava/${serie}/vysledky/${zavod}/${cisloRozjizdky}`;
  const drobecky = (
    <Drobecky
      cesta={drobeckySpravy(serie, [
        drobekRegaty(serie, zavod, data?.zavodNazev),
        { text: "Výsledky", kam: `/sprava/${serie}/vysledky/${zavod}` },
        { text: `${cisloRozjizdky}. rozjížďka`, kam: zapisAdresa },
        { text: "Porovnání" },
      ])}
    />
  );

  if (stav === "neprihlasen" || stav === "odmitnut")
    return (
      <>
        {drobecky}
        <h1>Porovnání zápisů</h1>
        <p className="prazdno">
          {stav === "odmitnut" ? "Přihlášení vypršelo. " : "Na porovnání zápisů se musíš "}
          <Link href="/prihlaseni">{stav === "odmitnut" ? "Přihlas se znovu" : "přihlásit"}</Link>.
        </p>
      </>
    );

  if (stav === "nesmi" || !data)
    return (
      <>
        {drobecky}
        <h1>Porovnání zápisů</h1>
        <p className="prazdno">Zápisy téhle regaty porovnává její pořadatel.</p>
      </>
    );

  const navrhy = data.navrhy;
  const mist = Math.max(0, ...navrhy.map((n) => n.radky.length));
  // Snímky z papíru mají vlastní zacházení — přebírají se po řádcích,
  // ne tlačítkem „Použít verzi". V tabulce vedle sebe ale zůstávají:
  // porovnat je s lidskými je přesně to, kvůli čemu vznikly.
  const zPapiru = navrhy.filter((n) => n.zPapiru);
  const lidske = navrhy.filter((n) => !n.zPapiru);

  return (
    <>
      {drobecky}
      <h1>Porovnání zápisů</h1>
      <p className="podtitulek">
        {data.zavodNazev} · {data.cislo}. rozjížďka
      </p>

      {zpravy.chyba && (
        <p className="hlaska chyba" role="alert">
          {zpravy.chyba}
        </p>
      )}
      {zpravy.stav === "pouzito" && !zpravy.chyba && (
        <p className="hlaska hotovo" role="status">
          Do zápisu se vzala verze, kterou zapsal {zpravy.kdo || "zapisovatel"}. Ostatní snímky
          zůstávají, kdyby se ukázalo, že platí jiná.
        </p>
      )}
      {zpravy.stav === "prevzato" && !zpravy.chyba && (
        <p className="hlaska hotovo" role="status">
          Převzato z papíru: {pocet(zpravy.kolik, "řádek", "řádky", "řádků")}.
          Zbytek výsledků zůstal, jak byl.
        </p>
      )}
      {zpravy.zpapiru && !zpravy.chyba && !zpravy.stav && (
        <p className="hlaska" role="status">
          Z papíru se přečetlo {pocet(zpravy.zpapiru, "loď", "lodě", "lodí")}
          {zpravy.nepreceteno
            ? ` a ${pocet(zpravy.nepreceteno, "řádek", "řádky", "řádků")} se nepodařilo přiřadit`
            : ""}
          . Výsledky se tím nezměnily — projdi čísla proti fotce níž a zaškrtni, co platí.
        </p>
      )}

      {/* Neodeslaný zápis z telefonu. Snímky výš jsou ze serveru, tenhle se
          tam nedostal — a právě on bývá to, co při ruční opravě vypadne. */}
      <KonceptVPorovnani
        serie={serie}
        zavod={zavod}
        cislo={data.cislo}
        jmena={Object.fromEntries((zapis?.lode ?? []).map((l) => [l.prihlaskaId, l.lod]))}
        ulozene={(zapis?.lode ?? []).map((l) => ({
          id: l.prihlaskaId,
          poradi: l.poradiVCili ?? null,
          kod: l.kod ?? null,
        }))}
        zapisAdresa={zapisAdresa}
      />

      {navrhy.length === 0 ? (
        <p className="prazdno">
          Rozjížďku zatím nikdo neuložil, takže není co porovnávat.
        </p>
      ) : lidske.length === 1 && zPapiru.length === 0 ? (
        <>
          <p className="hlaska" role="status">
            Zapisoval jeden člověk ({lidske[0].kdo}), takže se porovnávat nemá s čím. Až bude
            u cíle druhý telefon, objeví se jeho verze tady.
          </p>
          <Tabulka navrhy={navrhy} mist={mist} />
        </>
      ) : (
        <>
          <p className="poznamka">
            Zvýrazněné řádky jsou místa, kde se zápisy liší. Vyberte verzi, která platí —
            přepíše výsledky rozjížďky. Ostatní snímky zůstanou.
          </p>
          <Tabulka navrhy={navrhy} mist={mist} />

          {/* <b>Snímek z papíru se potvrzuje po řádcích</b> (oponentura
              rozhodčího; Filip, 18. 11. 2026). Četl ho stroj, ne člověk —
              kdyby se dal odklepnout jedním tlačítkem, rozhodčí ho
              odklepne a nezkontroluje, a chyba rozpoznání se stane
              výsledkem. Fotka je proto na téže obrazovce: potvrzuje se
              proti ní, ne proti dojmu. */}
          {zPapiru.map((n) => (
            <ZPapiru
              key={n.uzivatelId}
              navrh={n}
              serie={serie}
              zavod={zavod}
              cislo={data.cislo}
              papir={zapis?.papir ?? null}
              ulozene={Object.fromEntries(
                (zapis?.lode ?? []).map((l) => [
                  l.prihlaskaId,
                  { poradi: l.poradiVCili ?? null, kod: l.kod ?? null, lod: l.lod, kategorie: l.kategorie },
                ]),
              )}
            />
          ))}

          <div className="stavy">
            {lidske.map((n) => (
              <form key={n.uzivatelId} action={pouzijNavrhAkce}>
                <input type="hidden" name="serie" value={serie} />
                <input type="hidden" name="zavod" value={zavod} />
                <input type="hidden" name="cislo" value={data.cislo} />
                <input type="hidden" name="autor" value={n.uzivatelId} />
                <input type="hidden" name="kdo" value={n.kdo} />
                <button type="submit">Použít verzi: {n.kdo}</button>
              </form>
            ))}
          </div>

          <p className="poznamka">
            Když platí kus od každého, sepište správné pořadí ve{" "}
            <Link href={zapisAdresa}>formuláři zápisu</Link>. Ten je jeden a rozhoduje.
          </p>
        </>
      )}

      <p className="poznamka">
        <Link href={zapisAdresa}>Zpátky na zápis rozjížďky</Link>
      </p>
    </>
  );
}

/** Místa v cíli pod sebou, verze vedle sebe. */
function Tabulka({ navrhy, mist }: { navrhy: Navrh[]; mist: number }) {
  const mista = Array.from({ length: mist }, (_, i) => i + 1);

  return (
    <div className="tabulka-obal">
      <table className="porovnani">
        <thead>
          <tr>
            <th className="lod">Místo</th>
            {navrhy.map((n) => (
              <th key={n.uzivatelId}>
                {n.kdo}
                {n.muj && " (ty)"}
                <div className="majitel">{cas(n.zapsanoV)}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mista.map((misto) => {
            const radky = navrhy.map((n) => n.radky.find((r) => r.poradiVCili === misto));
            const shoda = radky.every((r) => r?.prihlaskaId === radky[0]?.prihlaskaId);

            return (
              <tr key={misto} className={shoda ? undefined : "rozdil"}>
                <td className="lod">{misto}.</td>
                {radky.map((r, i) => (
                  <td key={navrhy[i].uzivatelId}>{lod(r)}</td>
                ))}
              </tr>
            );
          })}
          <Kody navrhy={navrhy} />
        </tbody>
      </table>
    </div>
  );
}

/** Lodě s kódem stojí pod pořadím — v cíli místo nezabraly. */
function Kody({ navrhy }: { navrhy: Navrh[] }) {
  const sKodem = navrhy.map((n) => n.radky.filter((r) => r.kod));
  if (sKodem.every((r) => r.length === 0)) return null;

  const mist = Math.max(...sKodem.map((r) => r.length));

  return (
    <>
      {Array.from({ length: mist }, (_, i) => {
        const radky = sKodem.map((r) => r[i]);
        const shoda = radky.every(
          (r) => r?.prihlaskaId === radky[0]?.prihlaskaId && r?.kod === radky[0]?.kod,
        );

        return (
          <tr key={`kod-${i}`} className={shoda ? undefined : "rozdil"}>
            <td className="lod">kód</td>
            {radky.map((r, j) => (
              <td key={navrhy[j].uzivatelId}>
                {r ? `${r.lod} · ${r.kod?.toUpperCase()}` : "—"}
              </td>
            ))}
          </tr>
        );
      })}
    </>
  );
}

const lod = (radek?: NavrhRadek) =>
  radek ? (
    <>
      {radek.lod}
      <span className="stitek kategorie-lodi">{radek.kategorie}</span>
    </>
  ) : (
    "—"
  );

/**
 * Kdy zapisovatel naposledy uložil, v místním čase Orlíku.
 *
 * <b>Včetně sekund.</b> Ve výsledcích je ta verze, která se uložila jako
 * poslední — a dva zapisovatelé v cíli ukládají pár sekund po sobě, takže
 * na minuty zaokrouhlený čas je u obou stejný a nejde z něj poznat, čí
 * čísla rozjížďka právě má (audit obsazení, 26. 10. 2026).
 */
const cas = (iso: string) =>
  new Date(iso).toLocaleString("cs-CZ", {
    timeZone: "Europe/Prague",
    timeStyle: "medium",
    dateStyle: "short",
  });

/**
 * Počet se skloňovaným tvarem. Čeština má tři, a „1 lodí" se čte jako
 * překlep, ne jako číslo.
 */
function pocet(kolik: string | undefined, jedna: string, dve: string, pet: string) {
  const n = Number(kolik);
  if (!Number.isInteger(n) || n < 1) return `${kolik ?? "?"} ${pet}`;
  return `${n} ${n === 1 ? jedna : n < 5 ? dve : pet}`;
}

/**
 * Snímek přečtený z fotky papíru: řádky k potvrzení, fotka vedle nich.
 *
 * <b>Zaškrtává se, co platí</b>, a nepřebírá se nic dalšího. Není to
 * import celé sady, ale oprava jednotlivých míst — řádky, které nikdo
 * neposoudil, se nesmějí přepsat.
 *
 * Řádek, který se shoduje s tím, co už v zápisu je, je předzaškrtnutý
 * schválně <b>ne</b>: zaškrtnutí má znamenat „tohle jsem přečetl a
 * souhlasí", ne „tohle aplikace předvyplnila".
 */
function ZPapiru({
  navrh,
  serie,
  zavod,
  cislo,
  papir,
  ulozene,
}: {
  navrh: Navrh;
  serie: string;
  zavod: string;
  cislo: number;
  papir: { nahled: string; velky: string; autor: string } | null;
  ulozene: Record<number, {
    poradi: number | null;
    kod: string | null;
    lod: string;
    kategorie: string;
  }>;
}) {
  /** Co z řádku čte člověk: pořadí, nebo kód. */
  const hodnota = (poradi: number | null | undefined, kod: string | null | undefined) =>
    poradi != null ? `${poradi}.` : (kod?.toUpperCase() ?? "—");

  return (
    <section className="zpapiru">
      <h2>Přečteno z papíru</h2>
      <p className="poznamka">
        Vložil {navrh.kdo} · {cas(navrh.zapsanoV)}. Čísla četl stroj, ne člověk —
        projdi je proti fotce a zaškrtni ta, která platí. Co nezaškrtneš, zůstane
        ve výsledcích, jak je.
      </p>

      {papir ? (
        <figure className="fotka-clanku" style={{ maxWidth: "26rem" }}>
          <a href={papir.velky} target="_blank" rel="noopener noreferrer">
            <img src={papir.nahled} alt="Fotka papírového zápisu rozjížďky" />
          </a>
          <figcaption>Nahrál {papir.autor}. Otevře se v novém okně ve velkém.</figcaption>
        </figure>
      ) : (
        <p className="hlaska" role="status">
          U téhle rozjížďky fotka papíru není, takže není proti čemu čísla
          porovnat. Nahraj ji v <Link href={`/sprava/${serie}/vysledky/${zavod}/${cislo}#papir`}>zápisu</Link>,
          nebo řádky neber.
        </p>
      )}

      {/* <b>Kolize se předpovídá, nezkouší.</b> Pořadí je unikátní
          v kategorii, takže převzetí jednoho řádku narazí na loď, která to
          místo v zápisu drží — a server dávku odmítne celou. Bez téhle
          věty by to člověk zjistil až pokusem a nevěděl, koho zaškrtnout
          s ní. */}
      <form action={prevezmiRadkyAkce}>
        <input type="hidden" name="serie" value={serie} />
        <input type="hidden" name="zavod" value={zavod} />
        <input type="hidden" name="cislo" value={cislo} />
        <input type="hidden" name="autor" value={navrh.uzivatelId} />

        <div className="tabulka-obal">
          <table>
            <thead>
              <tr>
                <th>Vzít</th>
                <th className="lod">Loď</th>
                <th>Z papíru</th>
                <th>V zápisu</th>
              </tr>
            </thead>
            <tbody>
              {navrh.radky.map((r) => {
                const ted = ulozene[r.prihlaskaId];
                const stejne =
                  (ted?.poradi ?? null) === (r.poradiVCili ?? null) &&
                  (ted?.kod ?? null) === (r.kod ?? null);

                // Kdo to místo v zápisu drží teď. Shoda sama o sobě
                // kolize není — tatáž loď na témž místě nic nemění.
                const koliduje =
                  r.poradiVCili != null
                    ? Object.entries(ulozene).find(
                        ([id, u]) =>
                          Number(id) !== r.prihlaskaId &&
                          u.poradi === r.poradiVCili &&
                          u.kategorie === r.kategorie,
                      )?.[1]
                    : undefined;

                return (
                  <tr key={r.prihlaskaId} className={stejne ? undefined : "lisi"}>
                    {/* <b>Terč je celá buňka, ne jen čtvereček.</b> Ten
                        má 18 px a na telefonu se do něj netrefí; `label`
                        kolem něj roztáhne klepací plochu na celý sloupec
                        a drží 44 pt (konzilium, bod 5). */}
                    <td className="vzit">
                      <label>
                        <input
                          type="checkbox"
                          name="radek"
                          value={r.prihlaskaId}
                          aria-label={`Vzít z papíru — ${r.lod}`}
                        />
                      </label>
                    </td>
                    <td className="lod">
                      {r.lod}
                      {koliduje && (
                        <div className="majitel">
                          {r.poradiVCili}. místo teď drží {koliduje.lod} — vezmi i ji
                        </div>
                      )}
                    </td>
                    <td>{hodnota(r.poradiVCili, r.kod)}</td>
                    <td className="kod">
                      {ted ? hodnota(ted.poradi, ted.kod) : "loď v zápisu není"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="zapis-akce">
          <button type="submit">Převzít zaškrtnuté</button>
        </div>
      </form>

      {/* Co stroj nepřečetl. Mlčet o tom by znamenalo tvrdit, že tabulka
          výš je celý papír — a rozhodčí by tomu uvěřil. */}
      {navrh.neprecteno && navrh.neprecteno.length > 0 && (
        <>
          <p className="hlaska" role="status">
            Tohle z papíru nešlo přiřadit k lodi. Jestli tam ta místa patří,
            dopiš je ručně ve <Link href={`/sprava/${serie}/vysledky/${zavod}/${cislo}`}>formuláři zápisu</Link>.
          </p>
          <ul className="seznam">
            {navrh.neprecteno.map((radek, i) => (
              <li key={`${radek}-${i}`}>
                <code>{radek}</code>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
