import type { Metadata } from "next";
import Link from "next/link";
import { prihlasovaniJde } from "@/lib/oidc";
import { nactiJa } from "@/lib/ja";
import { Domu } from "@/app/domu";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Orlický pohár", template: "%s — Orlický pohár" },
  description: "Seriál závodů plachetnic na Orlické přehradě.",
};

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Hlavička se ptá, kdo je přihlášený. Dokud identita neběží, je to null
  // a nic navíc se nezobrazí — veřejné stránky se tím nemění.
  const ja = await nactiJa();

  return (
    <html lang="cs">
      <body>
        {/* Cíl skoku pro tlačítko „nahoru". Kotva místo javascriptu:
            stránky se renderují serverem a kvůli jednomu tlačítku nemá smysl
            tahat na klienta hydrataci. */}
        <span id="nahoru" />
        <header className="hlavicka">
          <div className="obal">
            {/* Značka je tatáž jako ikona appky — kreslí ji app/scripts/ikona.py,
                aby existovala jedna, ne dvě podobné. */}
            <Link className="znacka" href="/">
              <img src="/logo.png" alt="" width={40} height={40} />
              <span>Orlický pohár</span>
            </Link>
            {/* Podtitulek tu byl nadbytečný — totéž stojí hned pod fotkou. */}
            <nav>
              {/* Značka vede domů taky, ale to není vidět — na telefonu je
                  z ní jen logo. Vypsaný odkaz stojí jedno slovo. Na samotné
                  domovské stránce mizí: odkaz sám na sebe je jen šum. */}
              <Domu />
              <Link href="/historie">Historie</Link>
              <Link href="/pravidla">Pravidla</Link>
              <Link href="/appka">Appka</Link>
              {/* Přihlášení se nabízí, jen když je nastavené. Odkaz na
                  neexistující tok by byl slib, který web nesplní. */}
              {prihlasovaniJde &&
                (ja ? (
                  <>
                    <span className="kdo" title={ja.email ?? undefined}>
                      {ja.zobrazovane}
                    </span>
                    <Link href="/odhlaseni">Odhlásit</Link>
                  </>
                ) : (
                  <Link href="/prihlaseni">Přihlásit</Link>
                ))}
            </nav>
          </div>
        </header>
        <main className="obal">{children}</main>
        {/* Výsledková tabulka bývá dlouhá a hlavička sice drží nahoře, ale
            na začátek stránky se z jejího konce jinak nedostaneš. */}
        <a className="nahoru" href="#nahoru" aria-label="Zpátky nahoru">
          <span aria-hidden="true">↑</span>
        </a>
      </body>
    </html>
  );
}
