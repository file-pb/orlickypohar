import Link from "next/link";
import { notFound } from "next/navigation";
import { Drobecky, drobeckySpravy, drobekRegaty } from "@/app/drobecky";
import { Vypadek } from "@/app/vypadek";
import { nactiNavrhy, nactiZapis, type Navrh, type NavrhRadek } from "@/lib/vysledky";
import { KonceptVPorovnani } from "../koncept-ukazka";
import { pouzijNavrhAkce } from "./akce";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Porovnání zápisů — správa" };

type Parametry = {
  params: Promise<{ serie: string; zavod: string; cislo: string }>;
  searchParams: Promise<{ chyba?: string; stav?: string; kdo?: string }>;
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
      ) : navrhy.length === 1 ? (
        <>
          <p className="hlaska" role="status">
            Zapisoval jeden člověk ({navrhy[0].kdo}), takže se porovnávat nemá s čím. Až bude
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

          <div className="stavy">
            {navrhy.map((n) => (
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

/** Kdy zapisovatel naposledy uložil, v místním čase Orlíku. */
const cas = (iso: string) =>
  new Date(iso).toLocaleString("cs-CZ", { timeZone: "Europe/Prague", timeStyle: "short", dateStyle: "short" });
