import { notFound } from "next/navigation";
import { ApiNedostupne, nactiObecnyClanek, nactiSerie } from "@/lib/api";
import { datumClanku } from "@/app/datum";
import { Vypadek } from "@/app/vypadek";
import { Odstavce } from "@/app/novinky";
import { FotkaClanku } from "@/app/fotky";
import { Drobecky } from "@/app/drobecky";
import { Boky } from "@/app/boky";

export const dynamic = "force-dynamic";

type Parametry = { params: Promise<{ clanek: string }> };

export async function generateMetadata({ params }: Parametry) {
  const { clanek } = await params;
  try {
    const c = await nactiObecnyClanek(clanek);
    return { title: c?.titulek ?? "Novinka", description: c?.perex ?? undefined };
  } catch {
    return { title: "Novinka" };
  }
}

/**
 * Obecný článek mimo ročník (od 22. 9. 2026). Vypadá stejně jako novinka
 * ročníku — čtenář nemá hádat, jestli je to něco jiného. Boky ukazují
 * aktuální ročník, protože web žije sezónou, i když tenhle text ne.
 */
export default async function ObecnyClanek({ params }: Parametry) {
  const { clanek } = await params;

  let c, serie;
  try {
    [c, serie] = await Promise.all([nactiObecnyClanek(clanek), nactiSerie()]);
  } catch (e) {
    if (e instanceof ApiNedostupne) return <Vypadek />;
    throw e;
  }
  if (!c) notFound();

  const obsah = (
    <>
      <Drobecky cesta={[{ text: "Domů", kam: "/" }, { text: c.titulek }]} />

      <h1>{c.titulek}</h1>
      <p className="podtitulek">
        {datumClanku(c.publikovanoV)}
        {c.autor && ` · ${c.autor}`}
      </p>

      <FotkaClanku slug={c.slug} obrazek={c.obrazek} />

      <article className="clanek">
        {c.perex && <p className="perex">{c.perex}</p>}
        <Odstavce text={c.telo} format={c.format} />
      </article>
    </>
  );

  const aktualni = serie?.[0]?.slug;
  return aktualni ? <Boky serie={aktualni}>{obsah}</Boky> : obsah;
}
