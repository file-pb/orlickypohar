import Link from "next/link";
import {
  nactiNovinky,
  nactiPoradi,
  nactiSerie,
  nactiSerii,
  type ZavodShrnuti,
} from "@/lib/api";
import { datumClanku, denAMesic } from "@/app/datum";
import { fotkaClanku } from "@/app/fotky";
import { Stav } from "@/app/stav";
import { ZnakTridy } from "@/app/tridy";
import { KaruselTridy } from "@/app/karusel-poradi";
import { PocasiAkce } from "@/app/pocasi";
import { BokVodocet } from "@/app/vodocet";
import { BokTeplotaVody } from "@/app/teplota";
import { BokKoupani } from "@/app/koupani";
import { BokVitr } from "@/app/vitr";
import { BokVystrahy } from "@/app/vystrahy";
import { dnesVPraze, vyberTerminu } from "@/lib/terminy";
import { PrepinacKalendare } from "@/app/kalendar-volba";
import { volbaKalendare, zastavkyKalendare } from "@/lib/kalendar-volba";

/**
 * Boky širokého monitoru.
 *
 * Filip, 15. 9. 2026: na širokém monitoru využít okraje — vlevo průběžné
 * pořadí, vpravo kalendář. Kde by se to se středem stránky zdvojilo
 * (stránka pořadí, kalendář ročníku), jdou do boků novinky a plakát
 * nejbližší akce.
 *
 * <b>Na menším displeji boky nejsou</b> — schová je CSS. Obsah se přitom
 * vykreslí na serveru i tam; stojí to jen dotazy, které web tak jako tak
 * cachuje, a zato nepotřebuje žádný javascript, který by zjišťoval šířku.
 *
 * <b>Střed je v HTML první.</b> Čtečka obrazovky i telefon začnou tím, kvůli
 * čemu člověk na stránku přišel; vlevo ho posadí až mřížka.
 */

/** Hlavní obsah boku. Pořadí a kalendář jsou hlavní informace stránky. */
export type Bok = "poradi" | "kalendar" | "novinky" | "akce";

/**
 * Widgety s cizími daty. Jen doplňují — v boku stojí vždycky pod hlavním
 * obsahem, nikdy nad ním (Filip, 18. 9. 2026).
 */
export type Doplnek = "vodocet" | "vystrahy" | "teplota" | "koupani" | "vitr" | "pocasi";

/** Pod obsahem na displeji bez boků, pokud stránka neřekne jinak. */
// Meteo pohromadě: vítr, výstrahy a počasí za sebou (Filip, 18. 9. 2026).
const DOLE: Doplnek[] = ["vodocet", "teplota", "koupani", "vitr", "vystrahy", "pocasi"];

/**
 * Rozložení boků (Filip, 18. 9. 2026: stránka má být v každém rozměru
 * kompaktní). Widgety mají všechny stránky s boky, nejen úvod; výchozí
 * rozdělení je to z úvodu.
 *
 * Widgety nikdy nerostou do šířky středu — velké vypadaly jako špalky
 * (Filip, 18. 9. 2026). Místo toho se se šířkou okna přesouvají:
 * - od 1600 px jdou pod obsah i widgety z levého boku, každý ve vlastním
 *   úzkém sloupci; pravý bok si své nechává, jinak by pod krátkým
 *   kalendářem zel prázdný (Filip, 18. 9. 2026);
 * - od 1280 px jsou pod obsahem jen dva sloupce (`stredDoplnky`; vlevo
 *   teplota a vítr, vpravo výstrahy nad počasím), zbytek v bocích;
 * - bez boků jsou pod obsahem ve sloupcích, na telefonu pod sebou.
 *
 * Bok s widgety není ukotvený (`sticky`): může být delší než okno a ukotvený
 * by se posouval uvnitř sebe. Ukotvený zůstává jen samotné pořadí nebo kalendář.
 */
export async function Boky({
  serie,
  vlevo = "poradi",
  vpravo = "kalendar",
  vlevoDoplnky = [],
  vpravoDoplnky = ["vodocet", "koupani"],
  stredDoplnky = ["teplota", "vitr", "vystrahy", "pocasi"],
  dole = DOLE,
  kalendar,
  children,
}: {
  serie?: string;
  vlevo?: Bok;
  vpravo?: Bok;
  vlevoDoplnky?: Doplnek[];
  vpravoDoplnky?: Doplnek[];
  /** Pod obsahem už od 1280 px; ostatní tam přijdou až od 1600 px. */
  stredDoplnky?: Doplnek[];
  dole?: Doplnek[];
  /** Parametr `?kalendar=` stránky, ať bok ukáže totéž co zbytek stránky. */
  kalendar?: string;
  children: React.ReactNode;
}) {
  const slug = serie ?? (await aktualniRocnik());
  // Pod obsahem s boky: střední widgety a od 1600 px i ty z levého boku.
  // Pravé zůstávají v boku ve všech šířkách.
  const siroke = DOLE.filter((d) => [...vlevoDoplnky, ...stredDoplnky].includes(d));

  return (
    <div className="s-boky">
      <div className="s-boky-stred">{children}</div>
      {slug && (
        <>
          <aside className={`bok bok-vlevo${vlevoDoplnky.length ? "" : " bok-pevny"}`}>
            {await obsah(vlevo, slug, kalendar)}
            {vlevoDoplnky.length > 0 && <div className="bok-doplnky">{await doplnky(vlevoDoplnky, slug)}</div>}
          </aside>
          <aside className={`bok bok-vpravo${vpravoDoplnky.length ? "" : " bok-pevny"}`}>
            {await obsah(vpravo, slug, kalendar)}
            {vpravoDoplnky.length > 0 && <div className="bok-doplnky">{await doplnky(vpravoDoplnky, slug)}</div>}
          </aside>
          {siroke.length > 0 && (
            <div className="doplnky-siroke">{await doplnky(siroke, slug, stredDoplnky)}</div>
          )}
          {/* Doplňky pod obsahem pro displej, kde boky nejsou (Filip,
              16. 9. 2026). S boky je CSS schová, tam jsou v bocích. */}
          <div className="doplnky">{await doplnky(dole, slug)}</div>
        </>
      )}
    </div>
  );
}

/** Stránky mimo ročník (úvod, pravidla) berou do boků ten nejnovější. */
async function aktualniRocnik() {
  try {
    return (await nactiSerie())?.[0]?.slug;
  } catch {
    return undefined;
  }
}

/**
 * Widgety v daném pořadí. Každý zvlášť v try — výpadek jednoho zdroje
 * nesmí vzít ostatní.
 */
async function doplnky(ktere: Doplnek[], slug: string, stredni: Doplnek[] = []) {
  const vysledek: React.ReactNode[] = [];
  for (const d of ktere) {
    try {
      const obsah = await doplnek(d, slug);
      // Obal s názvem widgetu: podle něj ho široké rozložení posadí do mřížky.
      const trida = `doplnek doplnek-${d}${stredni.includes(d) ? " doplnek-stred" : ""}`;
      if (obsah) vysledek.push(<div key={d} className={trida}>{obsah}</div>);
    } catch {
      // Chybějící widget je v pořádku; stránka stojí na hlavním obsahu.
    }
  }
  return vysledek;
}

async function doplnek(d: Doplnek, slug: string) {
  switch (d) {
    case "vodocet":
      return await BokVodocet();
    case "vystrahy":
      return await BokVystrahy();
    case "teplota":
      return await BokTeplotaVody();
    case "koupani":
      return await BokKoupani();
    case "vitr":
      return await BokVitr();
    case "pocasi": {
      const termin = (await nadchazejici(slug))[0];
      if (!termin) return null;
      return (
        <section>
          <h2 className="bok-nadpis">Počasí · {termin.nazev}</h2>
          <PocasiAkce datum={termin.datum} nazev={termin.nazev} />
        </section>
      );
    }
  }
}

async function obsah(bok: Bok, slug: string, kalendar?: string) {
  // Bok je doplněk. Když se nepovede načíst, prostě chybí — kvůli němu
  // nesmí spadnout stránka, která sama o sobě funguje.
  try {
    switch (bok) {
      case "poradi":
        return await BokPoradi({ slug });
      case "kalendar":
        return await BokKalendar({ slug, kalendar });
      case "novinky":
        return await BokNovinky({ slug });
      case "akce":
        return await BokAkce({ slug });
    }
  } catch {
    return null;
  }
}

/**
 * Pořadí každé třídy jako karusel: vidět jsou tři lodě a celá třída pomalu
 * projede dokola (Filip, 15. 9. 2026). Celé pořadí je o klik dál.
 */
async function BokPoradi({ slug }: { slug: string }) {
  const poradi = await nactiPoradi(slug);
  const tridy = poradi?.kategorie.filter((k) => k.lode.length > 0) ?? [];
  if (!poradi || tridy.length === 0) return null;

  return (
    <section>
      <h2 className="bok-nadpis">Průběžné pořadí</h2>
      {tridy.map((k) => (
        <div key={k.kategorie} className="bok-trida">
          <Link
            className="bok-trida-hlava"
            href={`/serie/${slug}/poradi?trida=${encodeURIComponent(k.kategorie)}`}
          >
            <ZnakTridy nazev={k.kategorie} />
            {k.kategorie}
          </Link>
          <KaruselTridy lode={k.lode} />
        </div>
      ))}
      <p className="bok-dal">
        <Link href={`/serie/${slug}/poradi`}>Celé pořadí →</Link>
      </p>
    </section>
  );
}

type Termin = ZavodShrnuti & { akce: boolean };

/**
 * Co teprve bude: zastávky poháru i komunitní akce dohromady, podle data.
 * Odjeté a zrušené se nevypisují — kalendář v boku je o tom, kam se chystat.
 */
async function nadchazejici(slug: string): Promise<Termin[]> {
  const detail = await nactiSerii(slug);
  if (!detail) return [];

  const dnes = new Date().toISOString().slice(0, 10);

  return [
    ...detail.zavody.map((z) => ({ ...z, akce: false })),
    ...(detail.akce ?? []).map((z) => ({ ...z, akce: true })),
  ]
    .filter((z) => z.stav !== "Odjety" && z.stav !== "Zruseny" && (z.datumKonce ?? z.datum) >= dnes)
    .sort((a, b) => a.datum.localeCompare(b.datum));
}

/**
 * Tři termíny ročníku (Filip, 16. 9. 2026): nadcházející, a když jich do
 * konce sezóny zbývá méně, doplněné posledními odjetými — výběr je
 * v `vyberTerminu`. Ročník, který zatím nemá nic, dostane místo seznamu
 * kartu o přípravě kalendáře ve stejné výšce, aby bok neposkočil.
 *
 * Které termíny, řídí volba kalendáře (pohár / vše / mimo pohár) — táž
 * jako na stránce ročníku, ať bok neukazuje něco jiného než celý kalendář
 * o klik dál. Přepínač je i tady: na úvodu je tohle jediný kalendář.
 */
export async function BokKalendar({
  slug,
  kalendar,
  kotva,
}: {
  slug: string;
  /** Parametr `?kalendar=` z adresy; bez něj rozhodne cookie. */
  kalendar?: string;
  /** Id sekce, na kterou se po přepnutí vrátit. Jen jedna kopie na stránce. */
  kotva?: string;
}) {
  const detail = await nactiSerii(slug);
  if (!detail) return null;

  const akce = detail.akce ?? [];
  const volba = await volbaKalendare(kalendar);
  const terminy = vyberTerminu(zastavkyKalendare(detail.zavody, akce, volba), dnesVPraze());

  return (
    <section id={kotva}>
      <h2 className="bok-nadpis">Kalendář</h2>
      {akce.length > 0 && <PrepinacKalendare volba={volba} kotva={kotva} />}
      {terminy.length === 0 ? (
        <div className="bok-priprava">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
            <path d="M3.5 10h17M8 3v4M16 3v4M8 14h2.5M13.5 14H16M8 17.2h2.5" />
          </svg>
          <b>Kalendář {detail.rok} se připravuje</b>
          <span>Zastávky a akce ročníku se tu objeví, jakmile budou vypsané.</span>
        </div>
      ) : (
        <ul className="bok-seznam">
          {terminy.map((z) => (
            <li key={z.slug}>
              <Link href={`/serie/${slug}/zavody/${z.slug}`}>
                <span className="bok-nazev">{z.nazev}</span>
                <span className="detail">
                  {denAMesic(z.datum)}
                  {/* Jen ve „Vše": v „Mimo pohár" je akcí všechno. */}
                  {z.akce && volba === "vse" && " · komunitní akce"} <Stav stav={z.stav} akce={z.akce} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="bok-dal">
        <Link href={`/serie/${slug}`}>Celý kalendář →</Link>
      </p>
    </section>
  );
}

async function BokNovinky({ slug }: { slug: string }) {
  // Pět posledních (Filip, 16. 9. 2026). Pod novinky přijdou widgety,
  // proto ne víc, i když má bok výšku.
  const clanky = await nactiNovinky(slug, 5);
  if (!clanky || clanky.length === 0) return null;

  return (
    <section>
      <h2 className="bok-nadpis">Novinky</h2>
      <ul className="bok-seznam">
        {clanky.map((c) => (
          <li key={c.slug}>
            <Link href={c.adresa}>
              <span className="bok-nazev">{c.titulek}</span>
              <span className="detail">{datumClanku(c.publikovanoV)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="bok-dal">
        <Link href={`/serie/${slug}/novinky`}>Všechny novinky →</Link>
      </p>
    </section>
  );
}

/**
 * Plakát nejbližší akce — Filipova „grafika k akci". Přednost má komunitní
 * akce, protože kola poháru má čtenář v kalendáři vedle; když žádná není,
 * ukáže se nejbližší zastávka.
 *
 * Fotka je z náhradního setu podle slugu, stejně jako u novinek: není
 * z té akce, a proto u ní nestojí popisek, jen kredit v patičce stránky.
 */
async function BokAkce({ slug }: { slug: string }) {
  const terminy = await nadchazejici(slug);
  const termin = terminy.find((z) => z.akce) ?? terminy[0];
  if (!termin) return null;

  const fotka = fotkaClanku(termin.slug);

  return (
    <section>
      <h2 className="bok-nadpis">{termin.akce ? "Nejbližší akce" : "Nejbližší zastávka"}</h2>
      <Link className="bok-plakat" href={`/serie/${slug}/zavody/${termin.slug}`}>
        <picture>
          <source type="image/avif" srcSet={`/foto/${fotka.soubor}-800.avif`} />
          <img src={`/foto/${fotka.soubor}.jpg`} alt="" loading="lazy" decoding="async" />
        </picture>
        <span className="text">
          <Stav stav={termin.stav} akce={termin.akce} />
          <b>{termin.nazev}</b>
          <span>
            {denAMesic(termin.datum)}
            {termin.poradatel && ` · ${termin.poradatel}`}
          </span>
        </span>
      </Link>
      {/* Počasí na místě pro termín akce (Filip, 16. 9. 2026). */}
      <PocasiAkce datum={termin.datum} nazev={termin.nazev} />
    </section>
  );
}
