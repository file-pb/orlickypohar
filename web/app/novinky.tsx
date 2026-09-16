import Link from "next/link";
import { datumClanku } from "@/app/datum";
import { Nahled } from "@/app/fotky";
import type { ClanekShrnuti } from "@/lib/api";

/**
 * Výpis novinek. Používá ho úvodní stránka, seznam novinek ročníku
 * i stránka zastávky — je to slovník, ne abstrakce: kdyby novinka vypadala
 * na každé stránce jinak, čtenář by hádal, jestli je to totéž.
 */
export function VypisNovinek({ serie, clanky }: { serie: string; clanky: ClanekShrnuti[] }) {
  return (
    <ul className="seznam novinky">
      {clanky.map((c) => (
        <li key={c.slug}>
          <Link className="karta s-fotkou" href={`/serie/${serie}/novinky/${c.slug}`}>
            {/* Náhled je dekorace, ne informace — proto nenese popisek
                a nesmí se tvářit, že je z toho závodu. */}
            <Nahled slug={c.slug} obrazek={c.obrazek} />
            {/* Text v obalu, aby ležel vedle fotky. Dalo by se to poskládat
                i mřížkou bez něj, ale fotka by pak musela vědět, kolik je
                pod ní řádků — a perex je nepovinný, takže se to mění. */}
            <div className="text">
              <div className="nazev">
                <span>{c.titulek}</span>
                {/* Odkud článek je. Blog má dvě úrovně a pozvánka pořadatele
                    na svůj závod je něco jiného než souhrn od organizátora. */}
                {c.zavodNazev && <span className="stitek">{c.zavodNazev}</span>}
              </div>
              {c.perex && <p className="perex">{c.perex}</p>}
              <div className="detail">
                {datumClanku(c.publikovanoV)}
                {c.autor && ` · ${c.autor}`}
              </div>
            </div>
          </Link>
        </li>
      ))}
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
