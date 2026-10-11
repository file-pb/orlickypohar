import Link from "next/link";
import { notFound } from "next/navigation";
import { Vypadek } from "@/app/vypadek";
import { Boky } from "@/app/boky";
import { ProcNejsouVysledky } from "@/app/stav";
import { CELKEM, NadpisTridy, TabyTrid, vyberTridu } from "@/app/tridy";
import { HlavaZastavky, adresaSekce } from "../hlava";
import { nactiZastavku } from "../data";
import { naRadky, Tabulka } from "../sekce-vysledky";

export const dynamic = "force-dynamic";

type Parametry = {
  params: Promise<{ slug: string; zavod: string }>;
  searchParams: Promise<{ trida?: string }>;
};

export const metadata = { title: "Výsledky" };

/**
 * Výsledky regaty. Vlastní sekce, ne první nadpis stránky: regata, která se
 * teprve pojede, tady nemá co ukázat a čtenáři stačí vědět, že sekce je —
 * co v ní místo tabulky stojí, vysvětluje `ProcNejsouVysledky`.
 */
export default async function Vysledky({ params, searchParams }: Parametry) {
  const { slug, zavod: slugZavodu } = await params;
  const { trida } = await searchParams;

  const zastavka = await nactiZastavku(slug, slugZavodu);
  if (!zastavka) return <Vypadek co="Výsledky" />;

  const { detail, trat } = zastavka;
  // Komunitní akce se nevyhodnocuje; sekce pro ni neexistuje.
  if (detail.druh === "Akce") notFound();

  const radky = naRadky(detail);
  // Celé pole napříč kategoriemi je pseudo-třída v tabech, ne druhá
  // tabulka pod tou první: na telefonu by druhá tabulka znamenala
  // rolovat přes celou první (Filip, 22. 9. 2026).
  const radkyCelkem = naRadky(detail, detail.poradiCelkem ?? []);
  const kategorie = [
    ...(radkyCelkem.length > 0 && detail.vyhodnoceni !== "PoKategoriich" ? [CELKEM] : []),
    ...(detail.vyhodnoceni === "CelePole" ? [] : [...new Set(radky.map((r) => r.kategorie))]),
  ];
  const aktivni = vyberTridu(kategorie, trida);
  const videt = aktivni === CELKEM ? radkyCelkem : radky.filter((r) => r.kategorie === aktivni);
  const naTridu = (k: string) =>
    `/serie/${slug}/zavody/${slugZavodu}/vysledky?trida=${encodeURIComponent(k)}`;

  return (
    <Boky serie={slug}>
      <HlavaZastavky
        serie={slug}
        zavod={slugZavodu}
        detail={detail}
        trat={trat}
        aktivni="vysledky"
      />
      <h2>Výsledky</h2>
      {detail.vysledkySkryte ? (
        <>
          {/* Ročník, u kterého se výsledky jednotlivých regat veřejně
              neukazují. Bez téhle věty vypadá odjetá regata jako ta, co se
              nejela — a to je horší než mlčet nahlas. Pořadí seriálu
              veřejné zůstává, proto na něj odkaz. */}
          <p className="prazdno">
            Výsledky jednotlivých regat tohohle ročníku nejsou zveřejněné —
            vznikaly ručně a jsou v nich nesrovnalosti. Platí{" "}
            <Link href={`/serie/${slug}/poradi`}>konečné pořadí seriálu</Link>.
          </p>
        </>
      ) : radky.length === 0 ? (
        <>
          <p className="prazdno">{ProcNejsouVysledky(detail.stav)}</p>
          <p className="poznamka">
            <Link href={adresaSekce(slug, slugZavodu, "lode")}>Kdo je přihlášený →</Link>
          </p>
        </>
      ) : (
        <>
          <TabyTrid kategorie={kategorie} aktivni={aktivni} adresa={naTridu} />
          <NadpisTridy kategorie={kategorie} aktivni={aktivni} />
          <Tabulka kategorie={aktivni} radky={videt} rozjizdky={detail.rozjizdky} />

          {/* Výsledky u regaty, která není vedená jako odjetá, do poháru
              nejdou — průběžné pořadí počítá jen z odjetých. Bez téhle věty
              by se čtenář marně sháněl po bodech, které v tabulce seriálu
              nejsou. */}
          {detail.stav !== "Odjety" && (
            <p className="poznamka">
              Regata není vedená jako odjetá, takže se tyhle výsledky do
              průběžného pořadí seriálu nepočítají —{" "}
              <Link href={`/serie/${slug}/poradi`}>co v pořadí je</Link>.
            </p>
          )}

          <p className="poznamka">
            {aktivni === CELKEM
              ? "Čísla v rozjížďkách jsou body — pořadí v celém poli, bez ohledu na kategorii."
              : "Čísla v rozjížďkách jsou body — pořadí v této kategorii, ne v celém poli."}
            {detail.pocetSkrtu > 0 && " Škrtnutá rozjížďka je přeškrtnutá a do součtu se nepočítá."}
            {detail.rozjizdky.some((r) => !r.doSerie) && " Rozjížďka s * se nepočítá do poháru."}{" "}
            <Link href="/pravidla">Jak se počítají body</Link>
          </p>
        </>
      )}
    </Boky>
  );
}
