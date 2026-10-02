import Link from "next/link";
import { datumClanku } from "@/app/datum";
import { Nahled, NahledVelky } from "@/app/fotky";
import { bloky, type Blok, type ClanekShrnuti, type FormatClanku, type Novinka, type Usek } from "@/lib/api";

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
              <NahledVelky
                slug={c.slug}
                obrazek={c.obrazek}
                adresa={"fotkaZdroje" in c ? c.fotkaZdroje : undefined}
              />
            ) : (
              <Nahled
                slug={c.slug}
                obrazek={c.obrazek}
                adresa={"fotkaZdroje" in c ? c.fotkaZdroje : undefined}
              />
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
                {"zdroj" in c && c.zdroj && (
                  <span className="stitek stitek-zdroj">
                    {/* Logo zdroje k jeho jménu (Filip, 2. 10. 2026): s víc
                        zdroji je na první pohled vidět, odkud článek je.
                        Jméno zůstává textem — logo samo by čtečce obrazovky
                        ani v tmavém režimu nestačilo. */}
                    {"zdrojLogo" in c && c.zdrojLogo && (
                      <img className="stitek-logo" src={c.zdrojLogo} alt="" loading="lazy" />
                    )}
                    {c.zdroj}
                  </span>
                )}
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
 * Tělo článku.
 *
 * `format` říká, v jakém tvaru text je. **Vykresluje se zatím jen `Text`** —
 * odstavce oddělené prázdným řádkem, jako doteď.
 *
 * `Html` se schválně vypisuje **taky jako text**, ne jako značky. Není to
 * nedodělek, ale pořadí prací: vložené HTML se musí nejdřív převést na úzkou
 * množinu značek, které web umí vykreslit. Bez toho by schránka z Wordu
 * přinesla vlastní fonty a pevné velikosti, které rozvržení rozbijí, a
 * nevyčištěné HTML z databáze je XSS. Dokud čistička není, je bezpečnější
 * ukázat zdrojový text než ho pustit do stránky — a nic v tomhle formátu
 * zatím stejně nevzniká.
 */
export function Odstavce({ text, format }: { text: string; format?: FormatClanku }) {
  if (format === "Bloky") return <Telo bloky={bloky(text)} />;

  // `Text` i `Html`. Html by v databázi být nemělo — server ho při uložení
  // převádí na bloky — ale kdyby se tam přesto vyskytlo, je vypsat zdroj
  // bezpečnější než ho pustit do stránky.
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

/**
 * Tělo poskládané z bloků, které server vyrobil z vloženého HTML.
 *
 * **Nikde tu není `dangerouslySetInnerHTML`** a to je celý smysl: server
 * nevrací vyčištěné značky, ale strukturu, a tahle komponenta z ní staví
 * vlastní prvky. Ani chyba v serverovém rozboru proto nemůže skončit cizím
 * skriptem ve stránce — nanejvýš divně zalomeným textem.
 */
function Telo({ bloky }: { bloky: Blok[] }) {
  return (
    <>
      {bloky.map((b, i) => {
        // Bloky nemají vlastní identitu; pořadí se nemění, takže index stačí.
        switch (b.druh) {
          case "Nadpis":
            return b.uroven === 3 ? (
              <h3 key={i}>
                <Radka useky={b.useky} />
              </h3>
            ) : (
              <h2 key={i}>
                <Radka useky={b.useky} />
              </h2>
            );

          case "Seznam": {
            const polozky = (b.polozky ?? []).map((p, j) => (
              <li key={j}>
                <Radka useky={p} />
              </li>
            ));
            return b.cislovany ? <ol key={i}>{polozky}</ol> : <ul key={i}>{polozky}</ul>;
          }

          case "Obrazek":
            return b.adresa ? (
              // `fotka-clanku` je táž šířka jako fotka nad článkem, ne
              // náhled do karty. Obrázek zůstává u zdroje, nekopírujeme ho;
              // popis je od autora, a když chybí, je to dekorace a prázdný
              // `alt` je správně.
              <figure key={i} className="fotka-clanku">
                <img src={b.adresa} alt={b.popis ?? ""} loading="lazy" decoding="async" />
                {b.popis && <figcaption>{b.popis}</figcaption>}
              </figure>
            ) : null;

          default:
            return (
              <p key={i}>
                <Radka useky={b.useky} />
              </p>
            );
        }
      })}
    </>
  );
}

/** Úseky jedné řádky — tučné, kurzíva, odkaz. */
function Radka({ useky }: { useky?: Usek[] }) {
  return (
    <>
      {(useky ?? []).map((u, i) => {
        let obsah = <>{u.text}</>;
        if (u.tucne) obsah = <strong>{obsah}</strong>;
        if (u.kurziva) obsah = <em>{obsah}</em>;

        // Odkaz v těle vede jinam než na náš web, takže do nové karty
        // (konvence webu). Server pouští jen absolutní http(s) a mailto.
        return u.odkaz ? (
          <a key={i} href={u.odkaz} target="_blank" rel="noopener noreferrer">
            {obsah}
          </a>
        ) : (
          <span key={i}>{obsah}</span>
        );
      })}
    </>
  );
}
