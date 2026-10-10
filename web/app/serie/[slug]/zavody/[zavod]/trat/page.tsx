import { notFound } from "next/navigation";
import { ApiNedostupne, nactiVerejnouTrat, nactiZavod, type VerejnaTrat } from "@/lib/api";
import { NAZVY_SMERU, nazevStrany, nazevTypu } from "@/lib/trat";
import { MapkaTrati, type PrvekNaMape } from "@/app/mapka-trati";
import { IkonaPrvku } from "@/app/ikona-prvku";
import { Drobecky } from "@/app/drobecky";
import { Vypadek } from "@/app/vypadek";
import { datum } from "@/app/datum";

export const dynamic = "force-dynamic";

type Parametry = { params: Promise<{ slug: string; zavod: string }> };

export const metadata = { title: "Trať" };

/**
 * Trať regaty pro závodníky a diváky.
 *
 * <b>Vlastní adresa, ne odstavec na stránce regaty</b> (plán, oddíl *Úvodník
 * a taby*): tohle je to, co si závodník otevře před startem a pošle dál.
 * Zvlášť taky proto, že se čte bez cache — stránka regaty se smí odležet
 * minutu, trať ne.
 *
 * <b>Odemčená trať říká „počkej", ne nic</b> (plán, oddíl *Trať je veřejná,
 * jakmile ji rozhodčí přijme*). Prázdná stránka vypadá jako porucha a stará
 * mapka lže: kdo podle ní vyrazí, pluje k bóji, která už stojí jinde.
 */
export default async function VerejnaTratStranka({ params }: Parametry) {
  const { slug, zavod: slugZavodu } = await params;

  let zavod;
  let trat: VerejnaTrat | null;
  try {
    [zavod, trat] = await Promise.all([
      nactiZavod(slug, slugZavodu),
      nactiVerejnouTrat(slug, slugZavodu),
    ]);
  } catch (e) {
    if (e instanceof ApiNedostupne) return <Vypadek co="Trať" />;
    throw e;
  }
  if (!zavod) notFound();

  return (
    <>
      <Drobecky
        cesta={[
          { text: "Domů", kam: "/" },
          { text: "Ročník", kam: `/serie/${slug}` },
          { text: zavod.nazev, kam: `/serie/${slug}/zavody/${slugZavodu}` },
          { text: "Trať" },
        ]}
      />
      <h1>Trať</h1>
      <p className="podtitulek">
        {zavod.nazev} · {datum(zavod.datum, zavod.datumKonce)}
        {/* Ke které rozjížďce trať patří (plán, *Trať je veřejná*, past 2).
            U vícerozjížďkové regaty má každá jinou — bez tohohle si lidi
            stáhnou GPX od té včerejší. U regaty s jednou tratí to číslo
            není a věta by jen překážela. */}
        {trat?.cisloRozjizdky != null && (
          <>
            {" · "}
            <b>{trat.cisloRozjizdky}. rozjížďka</b>
          </>
        )}
      </p>

      {trat === null ? (
        <p className="prazdno">
          Trať zatím není vyvěšená. Objeví se tady ve chvíli, kdy ji rozhodčí
          přijme — do té doby se staví a čísla by stejně neplatila.
        </p>
      ) : trat.prestavba ? (
        // Tahle hláska je důvod, proč stránka vzniká. Dokud ji API vydávalo
        // a web ne, přestavba se venku nijak neprojevila.
        <p className="hlaska">
          <b>Trať se přestavuje, počkej.</b> Starou schválně neukazujeme: kdo
          by podle ní vyrazil, pluje k bóji, která už jinde stojí. Jakmile ji
          rozhodčí znovu přijme, bude tu nová.
        </p>
      ) : (
        <>
          <MapkaTrati prvky={trat.prvky.map(naMapu)} />
          <PoradiPrvku prvky={trat.prvky} />
          <MimoTrat trat={trat} />
          {trat.prijatoV && (
            <p className="poznamka">
              Vyvěšeno {kdy(trat.prijatoV)}, kdy trať přijal rozhodčí. Dokud je
              přijatá, nikdo s ní nehýbe; při přestavbě tu bude stát, že se
              přestavuje.{" "}
              {/* Odkaz na směrnici jen tehdy, když nějaká visí: slovo
                  „směrnice" u regaty, která ji nevyvěsila, pošle člověka
                  hledat dokument, co není. */}
              {zavod.smernice && zavod.smernice.length > 0 ? (
                <>
                  Co platí, je{" "}
                  <a
                    href={zavod.smernice[0].adresa}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    plachetní směrnice
                  </a>{" "}
                  — tahle stránka je obrázek k ní, ne pravidlo.
                </>
              ) : (
                <>Je to obrázek trati, ne pravidlo — co platí, řekne pořadatel.</>
              )}
            </p>
          )}
        </>
      )}
    </>
  );
}

/** Soupis prvků v pořadí. Mapka ukazuje kde, tenhle seznam čím a jak. */
function PoradiPrvku({ prvky }: { prvky: VerejnaTrat["prvky"] }) {
  if (prvky.length === 0)
    return (
      <p className="prazdno">
        Trať je vyvěšená, ale nemá jediný prvek — zeptej se pořadatele. Na vodě
        nejspíš něco stojí, jen to sem nestihl zapsat.
      </p>
    );

  return (
    <>
      <h2>Čím se pluje</h2>
      <ol className="seznam-prvku">
        {prvky.map((p, i) => (
          <li key={i}>
            <IkonaPrvku typ={p.typ} strana={p.strana} />
            <span className="poradi-prvku">{p.poradi}.</span>{" "}
            <b>{nazevTypu(p.typ)}</b>{" "}
            <span>
              {p.a.nazev}
              {p.b && ` – ${p.b.nazev}`}
            </span>
            {p.strana && <span className="stitek">{nazevStrany(p.strana)}</span>}
            {p.smer && <span className="stitek">{NAZVY_SMERU[p.smer]}</span>}
            {p.poznamka && <p className="poznamka">{p.poznamka}</p>}
          </li>
        ))}
      </ol>
    </>
  );
}

/**
 * Bóje, které na vodě stojí, ale žádný prvek je nepoužívá.
 *
 * <b>Mlčet o nich je horší než je vypsat.</b> Závodník je uvidí — plavou
 * tam — a bez téhle věty bude hádat, jestli je má obeplout. Typicky je to
 * zbytek po přestavbě nebo bóje k něčemu jinému; může to ale být i to, že
 * pořadatel zapomněl udělat prvek, a pak je lepší, když se někdo ozve.
 *
 * <para>
 * Páruje se podle jména, protože ven se id bójí nevydávají. Jmenná kolize
 * by prvkovou bóji skryla z tohohle seznamu — to je ta neškodnější chyba
 * než naopak.
 * </para>
 */
function MimoTrat({ trat }: { trat: VerejnaTrat }) {
  const vPrvcich = new Set(trat.prvky.flatMap((p) => [p.a.nazev, ...(p.b ? [p.b.nazev] : [])]));
  const zbyle = trat.boje.filter((b) => !vPrvcich.has(b.nazev));
  if (zbyle.length === 0) return null;

  return (
    <p className="poznamka">
      Na vodě stojí i {zbyle.map((b) => b.nazev).join(", ")} — {zbyle.length === 1 ? "ta" : "ty"}{" "}
      ale {zbyle.length === 1 ? "není" : "nejsou"} součástí trati a na mapce
      {zbyle.length === 1 ? " ji" : " je"} proto nekreslíme.
    </p>
  );
}

/** Veřejný prvek pro mapku. Jestli je druhý konec bóje, se ven nevydává. */
function naMapu(p: VerejnaTrat["prvky"][number], i: number): PrvekNaMape {
  const konec = (k: NonNullable<VerejnaTrat["prvky"][number]["b"]>) => ({
    nazev: k.nazev,
    sirka: k.sirka,
    delka: k.delka,
    barva: k.barva,
    tvar: k.tvar,
  });

  const konce = [konec(p.a)];
  if (p.b) konce.push(konec(p.b));

  return { klic: i, typ: p.typ, poradi: p.poradi, konce, smer: p.smer };
}

function kdy(kdy: string) {
  return new Date(kdy).toLocaleString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
