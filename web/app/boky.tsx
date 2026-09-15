import Link from "next/link";
import {
  nactiClanky,
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

export type Bok = "poradi" | "kalendar" | "novinky" | "akce";

export async function Boky({
  serie,
  vlevo = "poradi",
  vpravo = "kalendar",
  children,
}: {
  serie?: string;
  vlevo?: Bok;
  vpravo?: Bok;
  children: React.ReactNode;
}) {
  const slug = serie ?? (await aktualniRocnik());

  return (
    <div className="s-boky">
      <div className="s-boky-stred">{children}</div>
      {slug && (
        <>
          <aside className="bok bok-vlevo">{await obsah(vlevo, slug)}</aside>
          <aside className="bok bok-vpravo">{await obsah(vpravo, slug)}</aside>
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

async function obsah(bok: Bok, slug: string) {
  // Bok je doplněk. Když se nepovede načíst, prostě chybí — kvůli němu
  // nesmí spadnout stránka, která sama o sobě funguje.
  try {
    switch (bok) {
      case "poradi":
        return await BokPoradi({ slug });
      case "kalendar":
        return await BokKalendar({ slug });
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

async function BokKalendar({ slug }: { slug: string }) {
  // Deset, ne pět: bok má výšku, ať ji využije (Filip, 16. 9. 2026).
  const terminy = (await nadchazejici(slug)).slice(0, 10);

  return (
    <section>
      <h2 className="bok-nadpis">Kalendář</h2>
      {terminy.length === 0 ? (
        <p className="bok-prazdno">V ročníku už nic dalšího není.</p>
      ) : (
        <ul className="bok-seznam">
          {terminy.map((z) => (
            <li key={z.slug}>
              <Link href={`/serie/${slug}/zavody/${z.slug}`}>
                <span className="bok-nazev">{z.nazev}</span>
                <span className="detail">
                  {denAMesic(z.datum)}
                  {z.akce && " · komunitní akce"} <Stav stav={z.stav} akce={z.akce} />
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
  // Pět posledních (Filip, 16. 9. 2026). Pod novinky přijde widget ČHMÚ,
  // proto ne víc, i když má bok výšku.
  const clanky = await nactiClanky(slug, { limit: 5 });
  if (!clanky || clanky.length === 0) return null;

  return (
    <section>
      <h2 className="bok-nadpis">Novinky</h2>
      <ul className="bok-seznam">
        {clanky.map((c) => (
          <li key={c.slug}>
            <Link href={`/serie/${slug}/novinky/${c.slug}`}>
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
