import Link from "next/link";
import { notFound } from "next/navigation";
import { Drobecky } from "@/app/drobecky";
import { Vypadek } from "@/app/vypadek";
import { NEJVIC_MB } from "@/lib/fotky";
import {
  KODY,
  nactiZapis,
  nazevStavu,
  type KodVysledku,
  type ZapisLod,
} from "@/lib/vysledky";
import { odeberPapirAkce, papirAkce, zapisAkce } from "./akce";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Zápis rozjížďky — správa" };

type Parametry = {
  params: Promise<{ serie: string; zavod: string; cislo: string }>;
  searchParams: Promise<{ chyba?: string; stav?: string; navrh?: string }>;
};

/**
 * Zápis výsledků jedné rozjížďky: všechny lodě ročníku, pořadí v cíli
 * a kód.
 *
 * <b>Celé serverové a bez javascriptu</b>, stejně jako zbytek administrace.
 * Zapisuje se na břehu z telefonu a jeden formulář s tabulkou nepotřebuje
 * nic, co by prohlížeč neuměl sám.
 *
 * <b>Jestli smí měnit, říká API</b> i s důvodem. Obrazovka ho jen ukáže —
 * druhá kopie pravidel by se rozešla při první změně.
 */
export default async function ZapisRozjizdky({ params, searchParams }: Parametry) {
  const { serie, zavod, cislo } = await params;
  const zpravy = await searchParams;

  const cisloRozjizdky = Number(cislo);
  if (!Number.isInteger(cisloRozjizdky) || cisloRozjizdky < 1) notFound();

  const { stav, data: zapis } = await nactiZapis(serie, zavod, cisloRozjizdky);

  // Výpadek nesmí spolknout výsledek zápisu.
  if (stav === "vypadek")
    return (
      <>
        {zpravy.chyba && (
          <p className="hlaska chyba" role="alert">
            {zpravy.chyba}
          </p>
        )}
        <Vypadek />
      </>
    );

  if (stav === "neni") notFound();

  const hlava = (
    <>
      <Drobecky
        cesta={[
          { text: "Domů", kam: "/" },
          { text: "Ročník", kam: `/serie/${serie}` },
          { text: "Výsledky", kam: `/sprava/${serie}/vysledky` },
          { text: "Regata", kam: `/sprava/${serie}/vysledky/${zavod}` },
          { text: `${cisloRozjizdky}. rozjížďka` },
        ]}
      />
      <h1>{cisloRozjizdky}. rozjížďka</h1>
    </>
  );

  if (stav === "neprihlasen")
    return (
      <>
        {hlava}
        <p className="prazdno">
          Na zápis výsledků se musíš <Link href="/prihlaseni">přihlásit</Link>.
        </p>
      </>
    );

  if (stav === "odmitnut")
    return (
      <>
        {hlava}
        <p className="prazdno">
          Přihlášení vypršelo. <Link href="/prihlaseni">Přihlas se znovu</Link>.
        </p>
      </>
    );

  if (stav === "nesmi" || !zapis)
    return (
      <>
        {hlava}
        <p className="prazdno">
          K výsledkům téhle regaty nemáš přístup. Zapisuje je její pořadatel,
          ověřuje a schvaluje rozhodčí ročníku.
        </p>
      </>
    );

  const navrh = rozkoduj(zpravy.navrh);
  const kategorie = poKategoriich(zapis.lode);

  return (
    <>
      <Drobecky
        cesta={[
          { text: "Domů", kam: "/" },
          { text: "Ročník", kam: `/serie/${serie}` },
          { text: "Výsledky", kam: `/sprava/${serie}/vysledky` },
          { text: zapis.zavodNazev, kam: `/sprava/${serie}/vysledky/${zavod}` },
          { text: `${zapis.cislo}. rozjížďka` },
        ]}
      />
      <h1>{zapis.cislo}. rozjížďka</h1>
      <p className="podtitulek">
        {zapis.zavodNazev}
        <span className={`stitek vysledek-${zapis.stavVysledku.toLowerCase()}`}>
          {nazevStavu(zapis.stavVysledku)}
        </span>
      </p>

      {/* Důvod vrácení stojí nahoře: kdo zápis opravuje, čte ho první. */}
      {zapis.duvodRevize && (
        <p className="hlaska chyba" role="status">
          <b>Vráceno k revizi:</b> {zapis.duvodRevize}
        </p>
      )}

      {zpravy.chyba && (
        <p className="hlaska chyba" role="alert">
          {zpravy.chyba}
        </p>
      )}
      {zpravy.stav && !zpravy.chyba && (
        <p className="hlaska hotovo" role="status">
          {hotovo(zpravy.stav, zapis.stavVysledku === "KRevizi")}
        </p>
      )}

      {zapis.procNelze && (
        <p className="hlaska" role="status">
          {zapis.procNelze}
        </p>
      )}

      {zapis.lode.length === 0 ? (
        <p className="prazdno">
          Do ročníku zatím není přihlášená žádná loď, takže není komu výsledek
          zapsat.
        </p>
      ) : (
        <form action={zapisAkce}>
          <input type="hidden" name="serie" value={serie} />
          <input type="hidden" name="zavod" value={zavod} />
          <input type="hidden" name="cislo" value={zapis.cislo} />
          <input type="hidden" name="lode" value={zapis.lode.map((l) => l.prihlaskaId).join(",")} />
          {/* Podoba sady, ze které tenhle formulář vyšel. Když mezitím uloží
              někdo jiný, API uložení odmítne a rozepsaný zápis zůstane. */}
          <input type="hidden" name="revize" value={zapis.revize} />

          <div className="tabulka-obal zapis">
            <table>
              <thead>
                <tr>
                  <th className="lod">Loď</th>
                  <th>Pořadí v cíli</th>
                  <th>Kód</th>
                  <th>Čas</th>
                </tr>
              </thead>
              <tbody>
                {kategorie.map(([nazev, lode]) => [
                  <tr key={`k-${nazev}`} className="kategorie">
                    <td colSpan={4}>{nazev}</td>
                  </tr>,
                  ...lode.map((l) => {
                    const hodnota = navrh ? navrh.get(l.prihlaskaId) : l;
                    return (
                      <tr key={l.prihlaskaId}>
                        <td className="lod">
                          {l.lod}
                          {l.cisloPlachty && <div className="majitel">{l.cisloPlachty}</div>}
                        </td>
                        <td>
                          <input
                            type="number"
                            name={`poradi-${l.prihlaskaId}`}
                            min={1}
                            step={1}
                            inputMode="numeric"
                            aria-label={`Pořadí v cíli — ${l.lod}`}
                            defaultValue={hodnota?.poradiVCili ?? ""}
                            disabled={!zapis.smiZapisovat}
                          />
                        </td>
                        <td>
                          <select
                            name={`kod-${l.prihlaskaId}`}
                            aria-label={`Kód — ${l.lod}`}
                            defaultValue={hodnota?.kod ?? ""}
                            disabled={!zapis.smiZapisovat}
                          >
                            <option value="">—</option>
                            {(Object.keys(KODY) as KodVysledku[]).map((k) => (
                              <option key={k} value={k} title={KODY[k]}>
                                {k.toUpperCase()} · {KODY[k]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="kod">{cas(l.casSekundy)}</td>
                      </tr>
                    );
                  }),
                ])}
              </tbody>
            </table>
          </div>

          {zapis.smiZapisovat && (
            <div className="zapis-akce">
              <button type="submit">Uložit zápis</button>
              <p className="poznamka">
                Ukládá se celá rozjížďka najednou. Prázdný řádek znamená, že loď
                v téhle rozjížďce výsledek nemá. Pořadí, nebo kód — ne obojí.
                Časy z importu zůstávají, jak jsou.
              </p>
            </div>
          )}
        </form>
      )}

      {zapis.pocetNavrhu > 1 && (
        <p className="hlaska" role="status">
          Rozjížďku ukládalo víc zapisovatelů. Ve výsledcích je poslední uložená verze —{" "}
          <Link href={`/sprava/${serie}/vysledky/${zavod}/${zapis.cislo}/porovnani`}>
            porovnat zápisy
          </Link>
          .
        </p>
      )}

      {/* Papír z cíle zůstává dokladem k číslům (PLAN.md, Zápis z vody).
          Nahrává ho pořadatel a vidí ho i rozhodčí, který zápis ověřuje —
          veřejně nikde není. */}
      <section id="papir">
        <h2>Papírový zápis</h2>
        {zapis.papir ? (
          <figure className="fotka-clanku" style={{ maxWidth: "30rem" }}>
            <a href={zapis.papir.velky} target="_blank" rel="noopener noreferrer">
              <img src={zapis.papir.nahled} alt="Fotka papírového zápisu rozjížďky" />
            </a>
            <figcaption>Nahrál {zapis.papir.autor}. Veřejně není nikde.</figcaption>
          </figure>
        ) : (
          <p className="poznamka" style={{ marginTop: 0 }}>
            Fotka papíru z cíle tu zatím není. Slouží jako doklad k číslům, na web se nedostane.
          </p>
        )}

        {zapis.smiPapir && (
          <>
            <form action={papirAkce} className="formular">
              <input type="hidden" name="serie" value={serie} />
              <input type="hidden" name="zavod" value={zavod} />
              <input type="hidden" name="cislo" value={zapis.cislo} />
              <label>
                {zapis.papir ? "Nahradit jinou fotkou" : "Fotka papíru"}
                <input
                  name="soubor"
                  type="file"
                  required
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                />
                <span className="poznamka">
                  JPEG, PNG nebo WebP do {NEJVIC_MB} MB. Autor se doplní z tvého účtu, souhlas se
                  neptá — fotka se nikde nezveřejňuje.
                </span>
              </label>
              <button type="submit">{zapis.papir ? "Nahradit fotku" : "Nahrát fotku"}</button>
            </form>

            {zapis.papir && (
              <form action={odeberPapirAkce} className="formular">
                <input type="hidden" name="serie" value={serie} />
                <input type="hidden" name="zavod" value={zavod} />
                <input type="hidden" name="cislo" value={zapis.cislo} />
                <p className="poznamka" style={{ margin: 0 }}>
                  Odebraná fotka se smaže i z úložiště.
                </p>
                <button type="submit">Odebrat fotku</button>
              </form>
            )}
          </>
        )}
      </section>

      <p className="poznamka">
        <Link href={`/sprava/${serie}/vysledky/${zavod}`}>Zpátky na rozjížďky regaty</Link>
      </p>
    </>
  );
}

/** Lodě po kategoriích v pořadí, v jakém je vydalo API. */
function poKategoriich(lode: ZapisLod[]): [string, ZapisLod[]][] {
  const skupiny = new Map<string, ZapisLod[]>();
  for (const l of lode) skupiny.set(l.kategorie, [...(skupiny.get(l.kategorie) ?? []), l]);
  return [...skupiny];
}

/**
 * Rozepsaný zápis z adresy po chybě. Když v adrese je, platí celý — i
 * prázdné řádky, protože pořadatel je mohl vyprázdnit schválně.
 */
function rozkoduj(navrh?: string) {
  if (navrh === undefined) return null;

  const mapa = new Map<number, { poradiVCili: number | null; kod: KodVysledku | null }>();
  for (const radek of navrh.split(".").filter(Boolean)) {
    const [id, poradi, kod] = radek.split("~");
    mapa.set(Number(id), {
      poradiVCili: poradi ? Number(poradi) : null,
      kod: kod && kod in KODY ? (kod as KodVysledku) : null,
    });
  }
  return mapa;
}

/** Naměřený čas jako h:mm:ss. Jen ke čtení — formulář ho nemění. */
function cas(sekundy?: number | null) {
  if (sekundy == null) return "";
  const h = Math.floor(sekundy / 3600);
  const m = Math.floor((sekundy % 3600) / 60);
  const s = sekundy % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function hotovo(stav: string, kRevizi: boolean) {
  switch (stav) {
    case "ulozeno":
      // Uložení samo zápis z revize nevrací — to je vědomý krok ve workflow,
      // a bez téhle věty by oprava zůstala ležet a rozhodčí by o ní nevěděl.
      return kRevizi
        ? "Zápis uložen. Až bude opravený celý, vrať ho na stránce regaty do návrhu, ať ho rozhodčí ověří znovu."
        : "Zápis uložen.";
    case "papir":
      return "Fotka papírového zápisu nahraná. Veřejně nikde není.";
    case "papir-odebran":
      return "Fotka papírového zápisu odebraná a smazaná z úložiště.";
    case "nova":
      return "Rozjížďka přidaná. Je v návrhu a na webu ji nikdo neuvidí, dokud ji správce nepustí ven.";
    default:
      return "Hotovo.";
  }
}
