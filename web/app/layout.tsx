import type { Metadata } from "next";
import Link from "next/link";
import { prihlasovaniJde } from "@/lib/oidc";
import { nactiSerie } from "@/lib/api";
import { maSezeni, nactiJa } from "@/lib/ja";
import { Domu } from "@/app/domu";
import { Menu } from "@/app/menu";
import { Logo, ZnakPozadi } from "@/app/logo";
import { PruhUkazky } from "@/app/ukazka";
import { PrepinacRezimu } from "@/app/rezim";
import { cookies } from "next/headers";
import { COOKIE_REZIM, jeRezim } from "@/lib/rezim";
import { Profil } from "@/app/profil";
import { Partneri } from "@/app/partneri";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Orlický pohár", template: "%s — Orlický pohár" },
  description: "Seriál závodů plachetnic na Orlické přehradě.",
};

/**
 * <b>Nic se nesmí předrenderovat při buildu.</b> Hlavička nese přihlášeného
 * a je v layoutu, takže ji dědí každá stránka — a předrenderovaná hlavička
 * lže dvakrát: jednou o tom, kdo je přihlášený, a jednou o tom, že
 * přihlašování vůbec existuje. `prihlasovaniJde` se totiž vyhodnotí z
 * proměnných prostředí, a ty při buildu nejsou; nastavují se až za běhu.
 *
 * Projevilo se to jako „po přihlášení chvíli trvá, než naskočí profil":
 * `/pravidla` a `/appka` se stavěly staticky a vracely se z cache s
 * `s-maxage=31536000`, tedy s hlavičkou bez profilu i bez odkazu na
 * přihlášení. Na dynamických stránkách se profil objevil hned.
 *
 * Konfigurace v layoutu platí i pro všechny stránky pod ním, takže tohle
 * je jediné místo, kde to musí stát.
 */
export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Hlavička se ptá, kdo je přihlášený. Dokud identita neběží, je to null
  // a nic navíc se nezobrazí — veřejné stránky se tím nemění.
  const { ja, duvod } = await nactiJa();
  // Cookie bez platného tokenu je vlastní stav, ne „nepřihlášený". Kdyby se
  // slil s ním, nabízel by web přihlášení někomu, kdo se nemůže odhlásit.
  const sezeni = ja ? true : await maSezeni();
  // Nejnovější ročník pro odkazy v hlavičce. Výpadek API hlavičku shodit
  // nesmí, odkazy se jen vynechají.
  const rocnik = await nactiSerie()
    .then((serie) => serie?.[0])
    .catch(() => undefined);
  // Ručně zvolený vzhled. Bez cookie `undefined` a web se řídí systémem.
  const ulozeny = (await cookies()).get(COOKIE_REZIM)?.value;
  const rezim = jeRezim(ulozeny) ? ulozeny : undefined;

  return (
    <html lang="cs" data-rezim={rezim}>
      <body>
        {/* Cíl skoku pro tlačítko „nahoru". Kotva místo javascriptu:
            stránky se renderují serverem a kvůli jednomu tlačítku nemá smysl
            tahat na klienta hydrataci. */}
        <span id="nahoru" />
        <ZnakPozadi />
        {/* Jediné upozornění na vymyšlená data, nad menu (Filip, 15. 9. 2026). */}
        <PruhUkazky />
        <header className="hlavicka">
          <div className="obal">
            {/* Logo Orlik Yacht Series od rozhodčího (22. 9. 2026). Appka má
                zatím původní značku z app/scripts/ikona.py, ta je v
                app/logo-puvodni.tsx. */}
            <Link className="znacka" href="/" aria-label="Orlický pohár — úvodní stránka">
              <Logo />
            </Link>
            {/* Podtitulek tu byl nadbytečný — totéž stojí hned pod fotkou. */}
            <nav>
              {/* Značka vede domů taky, ale to není vidět — na telefonu je
                  z ní jen logo. Vypsaný odkaz stojí jedno slovo. Na samotné
                  domovské stránce mizí: odkaz sám na sebe je jen šum. */}
              <Domu />
              {/* Ročník a pořadí jsou nejčastější cesta dál (Filip, 15. 9. 2026).
                  Na úzkém displeji se nevejdou a jdou do kebabu, kde jsou
                  i Historie, Pravidla a Appka. */}
              {rocnik && (
                <>
                  <Link className="jen-siroke" href={`/serie/${rocnik.slug}`}>
                    Ročník {rocnik.rok}
                  </Link>
                  <Link className="jen-siroke" href={`/serie/${rocnik.slug}/poradi`}>
                    Průběžné pořadí
                  </Link>
                </>
              )}
              <PrepinacRezimu />
              <Menu rocnik={rocnik} rucniRezim={Boolean(rezim)} />
              {/* Přihlášení se nabízí, jen když je nastavené. Odkaz na
                  neexistující tok by byl slib, který web nesplní. */}
              {prihlasovaniJde &&
                (sezeni ? (
                  <Profil ja={ja} duvod={duvod} />
                ) : (
                  <Link href="/prihlaseni">Přihlásit</Link>
                ))}
            </nav>
          </div>
        </header>
        <main className="obal">{children}</main>
        <Partneri />
        {/* Výsledková tabulka bývá dlouhá a hlavička sice drží nahoře, ale
            na začátek stránky se z jejího konce jinak nedostaneš. */}
        <a className="nahoru" href="#nahoru" aria-label="Zpátky nahoru">
          <span aria-hidden="true">↑</span>
        </a>
      </body>
    </html>
  );
}
