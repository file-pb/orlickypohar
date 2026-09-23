import Link from "next/link";
import { datumClanku } from "@/app/datum";
import { Nahled, NahledVelky } from "@/app/fotky";
import type { ClanekShrnuti, Novinka } from "@/lib/api";

/**
 * Výpis novinek. Používá ho úvodní stránka, seznam novinek ročníku
 * i stránka regaty — je to slovník, ne abstrakce: kdyby novinka vypadala
 * na každé stránce jinak, čtenář by hádal, jestli je to totéž.
 *
 * <b>`hlavni` je úvodní stránka</b> (Filip, 17. 9. 2026): první článek je
 * velký s fotkou nahoře a tři další menší — ve dvou sloupcích vpravo vedle
 * něj, v jednom pod ním. Rozložení řeší CSS podle šířky bloku, ne okna,
 * protože vedle boků je střed různě široký.
 */
export function VypisNovinek({
  serie,
  clanky,
  hlavni = false,
}: {
  serie: string;
  clanky: (ClanekShrnuti | Novinka)[];
  hlavni?: boolean;
}) {
  return (
    <ul className={`seznam novinky${hlavni ? " novinky-uvod" : ""}`}>
      {clanky.map((c, i) => {
        // Přejatá novinka vede ke zdroji, tedy pryč z webu. Odkaz ven se
        // otevírá v nové kartě; vnitřní ne (konvence webu). `Link` je na to
        // špatný nástroj — předběžně by načítal cizí stránku.
        const vnejsi = "vnejsi" in c && c.vnejsi;
        const kam = "adresa" in c ? c.adresa : `/serie/${serie}/novinky/${c.slug}`;
        const Karta = vnejsi
          ? ({ children }: { children: React.ReactNode }) => (
              <a className="karta s-fotkou" href={kam} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            )
          : ({ children }: { children: React.ReactNode }) => (
              <Link className="karta s-fotkou" href={kam}>
                {children}
              </Link>
            );

        return (
        <li key={c.slug} className={hlavni && i === 0 ? "hlavni" : undefined}>
          <Karta>
            {/* Náhled je dekorace, ne informace — proto nenese popisek
                a nesmí se tvářit, že je z toho závodu. */}
            {hlavni && i === 0 ? (
              <NahledVelky slug={c.slug} obrazek={c.obrazek} />
            ) : (
              <Nahled slug={c.slug} obrazek={c.obrazek} />
            )}
            {/* Text v obalu, aby ležel vedle fotky. Dalo by se to poskládat
                i mřížkou bez něj, ale fotka by pak musela vědět, kolik je
                pod ní řádků — a perex je nepovinný, takže se to mění. */}
            <div className="text">
              <div className="nazev">
                <span>{c.titulek}</span>
                {/* Odkud článek je. Blog má dvě úrovně a pozvánka pořadatele
                    na svůj závod je něco jiného než souhrn od organizátora. */}
                {c.zavodNazev && <span className="stitek">{c.zavodNazev}</span>}
                {/* Odkud text je. Přebírat ho smíme právě pod podmínkou, že
                    uvedeme zdroj s odkazem — štítek je ta první půlka,
                    odkaz karty ta druhá. */}
                {"zdroj" in c && c.zdroj && <span className="stitek">{c.zdroj}</span>}
              </div>
              {c.perex && <p className="perex">{c.perex}</p>}
              <div className="detail">
                {datumClanku(c.publikovanoV)}
                {c.autor && ` · ${c.autor}`}
                {vnejsi && " · celý článek u zdroje ↗"}
              </div>
            </div>
          </Karta>
        </li>
        );
      })}
    </ul>
  );
}

/**
 * Tělo článku. Odstavce jsou oddělené prázdným řádkem — žádný markdown,
 * žádné HTML z databáze. Až bude potřeba víc než odstavce, je to aditivní
 * sloupec s formátem, ne přepis toho, co je uložené.
 */
export function Odstavce({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n\s*\n/)
        .map((o) => o.trim())
        .filter(Boolean)
        .map((o, i) => (
          // Odstavce nemají vlastní identitu, takže index je tu jediný klíč,
          // který dává smysl — a seznam se stejně nepřerovnává.
          <p key={i}>{o}</p>
        ))}
    </>
  );
}
