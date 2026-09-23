import Link from "next/link";
import { notFound } from "next/navigation";
import { Drobecky } from "@/app/drobecky";
import { Vypadek } from "@/app/vypadek";
import { STAVY, jeWeb, nactiClanek, nactiPrehled, nazevStavu, type StavClanku } from "@/lib/clanky";
import { SpravaObrazku } from "@/app/sprava/obrazek";
import { ulozAkce, stavAkce } from "../akce";

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

  const hlava = (
    <Drobecky
      cesta={
        web
          ? [
              { text: "Domů", kam: "/" },
              { text: "Obecné články", kam: `/sprava/${serie}/clanky` },
              { text: clanek?.titulek ?? "Článek" },
            ]
          : [
              { text: "Domů", kam: "/" },
              { text: "Ročník", kam: `/serie/${serie}` },
              { text: "Novinky", kam: `/sprava/${serie}/clanky` },
              { text: clanek?.titulek ?? "Článek" },
            ]
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
