import Link from "next/link";
import { nactiClanky, nactiZavod } from "@/lib/api";
import { Vypadek } from "@/app/vypadek";
import { VypisNovinek } from "@/app/novinky";
import { Boky } from "@/app/boky";
import { Medailonek, maObsah } from "@/app/medailonek";
import { HlavaZastavky, adresaSekce } from "./hlava";
import { nactiZastavku } from "./data";

// Stránky stojí na databázi, ne na obsahu známém v době buildu. Bez tohohle
// by je Next předrenderoval při sestavení — a build by pak vyžadoval běžící
// API, což je závislost, kterou nikdo nechce.
export const dynamic = "force-dynamic";

type Parametry = { params: Promise<{ slug: string; zavod: string }> };

// Viz stránka ročníku: titulek nesmí shodit vykreslení.
export async function generateMetadata({ params }: Parametry) {
  const { slug, zavod } = await params;
  try {
    const z = await nactiZavod(slug, zavod);
    return { title: z?.nazev ?? "Regata" };
  } catch {
    return { title: "Regata" };
  }
}

/**
 * Úvod regaty: co to za akci je a kdo ji pořádá.
 *
 * <b>Tohle je první sekce schválně</b> (Filip, 11. 10. 2026: *„Jako první je
 * nějaká prezentace té dané regaty… To jsou jakési představení, články"*).
 * Dřív tady vítal nadpis „Výsledky" i regatu, která se pojede za měsíc.
 *
 * <b>Prezentaci píše pořadatel jako články.</b> Stránka regaty je jeho
 * (plán, oddíl *Jak se po webu chodí*) a `Clanek` s vazbou na závod už
 * umí fotky, plánované vydání i editor bloků. Pole na regatě by vyrobilo
 * druhý editor vedle článků — plán tenhle spor řeší ve prospěch článků
 * a úvodník jako jejich příznak teprve přijde.
 */
export default async function Uvod({ params }: Parametry) {
  const { slug, zavod: slugZavodu } = await params;

  const [zastavka, clanky] = await Promise.all([
    nactiZastavku(slug, slugZavodu),
    nactiClanky(slug, { zavod: slugZavodu }).catch(() => null),
  ]);
  if (!zastavka) return <Vypadek co="Regata" />;

  const { detail, trat } = zastavka;
  const akce = detail.druh === "Akce";

  return (
    <Boky serie={slug}>
      <HlavaZastavky
        serie={slug}
        zavod={slugZavodu}
        detail={detail}
        trat={trat}
        aktivni="uvod"
      />

      {akce && (
        <p className="poznamka">
          Akce mimo pohár — do <Link href={`/serie/${slug}/poradi`}>průběžného pořadí</Link> se
          nepočítá.
        </p>
      )}

      {clanky && clanky.length > 0 ? (
        <>
          <h2>{akce ? "Novinky k akci" : "O regatě"}</h2>
          <VypisNovinek serie={slug} clanky={clanky} />
        </>
      ) : (
        <p className="prazdno">
          {akce
            ? "K akci zatím nic nevyšlo."
            : "Pořadatel zatím o regatě nic nenapsal."}
          {!akce && (
            <>
              {" "}
              Co je o ní známo, stojí v{" "}
              <Link href={adresaSekce(slug, slugZavodu, "lode")}>ostatních sekcích</Link>.
            </>
          )}
        </p>
      )}

      {/* Pořadatel na úvodu: kdo chce jet, hledá nejdřív, kdo to pořádá
          a kam se ozvat. Škrty a koeficient čte ten, kdo už jel — ty jsou
          v sekci Směrnice. */}
      {maObsah(detail.medailonek) && <Medailonek poradatel={detail.medailonek} />}
    </Boky>
  );
}
