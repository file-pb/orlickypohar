import Link from "next/link";
import { notFound } from "next/navigation";
import { Drobecky, drobeckySpravy } from "@/app/drobecky";
import { Vypadek } from "@/app/vypadek";
import { STAVY, jeWeb, nactiClanek, nactiPrehled, nazevStavu, type StavClanku } from "@/lib/clanky";
import { SpravaObrazku } from "@/app/sprava/obrazek";
import { ulozAkce, stavAkce, nahrajDoTelaAkce } from "../akce";
import { NEJVIC_MB, obrazkyVTele } from "@/lib/fotky";

export const dynamic = "force-dynamic";

export const metadata = { title: "Úprava článku" };

type Parametry = {
  params: Promise<{ serie: string; clanek: string }>;
  searchParams: Promise<{ chyba?: string; stav?: string; nastav?: StavClanku }>;
};

/**
 * Úprava jednoho článku.
 *
 * <b>Adresa se nemění, ani když se změní titulek</b> — mohla už někam
 * odejít a přepsat ji znamená rozbít odkaz. Je proto vypsaná, ne v poli.
 *
 * <b>Uložení a publikování jsou dvě tlačítka, ne jedno.</b> Slité by
 * uložení rozepsaného textu článek vydalo, nebo by oprava překlepu stáhla
 * publikovaný.
 */
export default async function UpravaClanku({ params, searchParams }: Parametry) {
  const { serie, clanek: slug } = await params;
  const zpravy = await searchParams;

  // Přehled kvůli výběru regat: nabídnout se smí jen to, kam člověk
  // doopravdy smí psát, jinak si vybere a dostane „nemáš práva".
  const [{ stav, clanek }, prehled] = await Promise.all([
    nactiClanek(serie, slug),
    nactiPrehled(serie),
  ]);

  if (stav === "vypadek") {
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
  }

  // Obecný článek mimo ročník: bez ročníku v cestě a bez volby regaty.
  const web = jeWeb(serie);
  // Server vrací u uloženého vloženého článku formát `Html` — je to tentýž
  // obsah jako uložené bloky, jen tvar, ve kterém se dá psát.
  const vlozeny = clanek?.format === "Html";
  // Seznam se načítá jen tam, kde má smysl — u článku psaného jako odstavce
  // se obrázek do textu vložit nedá.
  const obrazkyTela = vlozeny ? await obrazkyVTele(serie, slug) : [];

  const hlava = (
    <Drobecky
      cesta={
        web
          ? drobeckySpravy(null, [
              { text: "Obecné články", kam: `/sprava/${serie}/clanky` },
              { text: clanek?.titulek ?? "Článek" },
            ])
          : drobeckySpravy(serie, [
              { text: "Novinky", kam: `/sprava/${serie}/clanky` },
              { text: clanek?.titulek ?? "Článek" },
            ])
      }
    />
  );

  if (stav === "neprihlasen" || stav === "odmitnut")
    return (
      <>
        {hlava}
        <h1>Úprava článku</h1>
        <p className="prazdno">
          Na úpravu se musíš <Link href="/prihlaseni">přihlásit</Link>.
        </p>
      </>
    );

  // „Nenašlo se" a „nesmíš" splývají schválně už na straně API — jinak by
  // se z odpovědi dalo vyčíst, co v ročníku je.
  if (stav === "neni" || stav === "nesmi" || !clanek) notFound();

  const radek = prehled.prehled?.clanky.find((c) => c.slug === slug);
  const stavClanku = radek?.stav;

  return (
    <>
      {hlava}
      <h1>{clanek.titulek}</h1>
      <p className="podtitulek">
        Adresa <code>{clanek.slug}</code>
        {stavClanku && ` · ${nazevStavu(stavClanku)}`}
        {clanek.zavodNazev && ` · ${clanek.zavodNazev}`}
      </p>

      {zpravy.chyba && (
        <p className="hlaska chyba" role="alert">
          {zpravy.chyba}
        </p>
      )}
      {zpravy.stav === "zalozeno" && (
        <p className="hlaska hotovo" role="status">
          Článek je založený jako koncept. Dopiš ho a publikuj.
        </p>
      )}
      {zpravy.stav === "ulozeno" && (
        <p className="hlaska hotovo" role="status">
          Uloženo.
        </p>
      )}
      {zpravy.stav === "obrazek" && (
        <p className="hlaska hotovo" role="status">
          Fotka nahraná.
        </p>
      )}
      {zpravy.stav === "obrazek-odebran" && (
        <p className="hlaska hotovo" role="status">
          Fotka odebraná.
        </p>
      )}
      {zpravy.stav === "prepnuto" && zpravy.nastav && (
        <p className="hlaska hotovo" role="status">
          Stav změněn na „{nazevStavu(zpravy.nastav)}".
        </p>
      )}

      <form action={ulozAkce} className="formular">
        <input type="hidden" name="serie" value={serie} />
        <input type="hidden" name="slug" value={clanek.slug} />

        <label>
          Titulek
          <input name="titulek" required maxLength={200} defaultValue={clanek.titulek} />
        </label>

        {web ? (
          <input type="hidden" name="zavod" value="" />
        ) : (
          <label>
            Kam patří
            <select name="zavod" defaultValue={clanek.zavod ?? ""}>
              {prehled.prehled?.smiNaRocnik && <option value="">Celý ročník</option>}
              {prehled.prehled?.zastavky.map((z) => (
                <option key={z.slug} value={z.slug}>
                  {z.nazev}
                </option>
              ))}
            </select>
          </label>
        )}

        <label>
          Perex
          <input name="perex" maxLength={600} defaultValue={clanek.perex ?? ""} />
          <span className="poznamka">
            Pár vět do výpisu a na úvodní stránku. Není to začátek textu, píše se zvlášť.
          </span>
        </label>

        <label>
          Autor
          <input name="autor" maxLength={120} defaultValue={clanek.autor ?? ""} />
        </label>

        <label>
          Text
          <textarea name="telo" required rows={16} defaultValue={clanek.telo} />
          <span className="poznamka">
            {vlozeny
              ? "Vyčištěné HTML — to, co se doopravdy uloží. Co čistička zahodila, už tu není."
              : "Odstavce odděl prázdným řádkem."}
          </span>
        </label>

        {/* Zaškrtnuté zůstane u článku, který už jako vložený uložený je:
            jeho tělo je HTML a odškrtnutím by se z něj staly odstavce
            plné značek. */}
        <label>
          <input type="checkbox" name="vlozene" value="1" defaultChecked={vlozeny} /> Text je
          vložený z Wordu nebo z webu
        </label>

        <button type="submit">Uložit</button>
      </form>

      {/* Obrázky do textu. Vlastní sekce, protože se chovají jinak než
          hlavní obrázek: nenahrazují se, je jich víc a autor si adresu vloží
          do textu sám. Bez javascriptu se to jinak udělat nedá — a je to
          zároveň jediná cesta, jak obrázek do těla dostat: cizí adresu
          čistička zahodí, protože její velikost neřídíme. */}
      {vlozeny && (
        <section id="obrazky-v-textu">
          <h2>Obrázky v textu</h2>
          {/* `encType` se neuvádí — u serverové akce ho React nastaví sám
              a ruční by přepsal. */}
          <form action={nahrajDoTelaAkce} className="formular">
            <input type="hidden" name="serie" value={serie} />
            <input type="hidden" name="slug" value={slug} />
            <label>
              Soubor
              <input type="file" name="soubor" accept="image/jpeg,image/png,image/webp" required />
              <span className="poznamka">
                JPEG, PNG nebo WebP do {NEJVIC_MB} MB. Zmenší se na šířku 1600 px a převede
                do WebP, takže i fotka z mobilu stránku nezpomalí.
              </span>
            </label>
            <label>
              Autor fotky
              <input name="autor" maxLength={120} required />
            </label>
            <label>
              Popis
              <input name="popis" maxLength={300} />
              <span className="poznamka">Stojí pod obrázkem a čte ho hlasová čtečka.</span>
            </label>
            <label>
              <input name="souhlas" type="checkbox" required /> Autor souhlasí se zveřejněním
            </label>
            <button type="submit">Nahrát obrázek</button>
          </form>

          {obrazkyTela.length > 0 && (
            <>
              <p className="poznamka">
                Adresu vlož do textu jako <code>&lt;img src=&quot;…&quot; alt=&quot;popis&quot;&gt;</code>.
              </p>
              <ul className="seznam">
                {obrazkyTela.map((o) => (
                  <li
                    key={o.velky}
                    style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}
                  >
                    <img src={o.nahled} alt="" width={64} height={64}
                         style={{ objectFit: "cover", borderRadius: 6, flex: "none" }} />
                    {/* Jen ke zkopírování — pole je na výběr myší lepší než
                        prostý text a bez javascriptu jinak nic nejde. */}
                    <input
                      readOnly
                      value={`<img src="${o.velky}" alt="${o.popis ?? ""}">`}
                      style={{ flex: 1, minWidth: 0 }}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <SpravaObrazku
        serie={serie}
        druh="clanky"
        klic={clanek.slug}
        obrazek={clanek.obrazek}
        bezObrazku="Na webu je u článku ilustrační fotka z Orlíku."
      />

      <h2>Stav</h2>
      <div className="stavy">
        {STAVY.filter((s) => s.stav !== stavClanku).map((s) => (
          <form key={s.stav} action={stavAkce}>
            <input type="hidden" name="serie" value={serie} />
            <input type="hidden" name="slug" value={clanek.slug} />
            <input type="hidden" name="stav" value={s.stav} />
            <input type="hidden" name="zpet" value="clanek" />
            <button type="submit" title={s.popis}>
              {s.nazev}
            </button>
          </form>
        ))}
      </div>
      <p className="poznamka">
        Smazaný článek se z výpisu ztratí, ale nezmizí — vrátit jde jako
        koncept. Publikovat rovnou ze smazaného nejde schválně.
      </p>
    </>
  );
}
