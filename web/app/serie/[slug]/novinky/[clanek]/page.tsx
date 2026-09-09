import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiNedostupne, nactiClanek } from "@/lib/api";
import { datumClanku } from "@/app/datum";
import { Vypadek } from "@/app/vypadek";
import { Odstavce } from "@/app/novinky";
import { PruhUkazky } from "@/app/ukazka";

export const dynamic = "force-dynamic";

type Parametry = { params: Promise<{ slug: string; clanek: string }> };

export async function generateMetadata({ params }: Parametry) {
  const { slug, clanek } = await params;
  try {
    const c = await nactiClanek(slug, clanek);
    // Perex je psaný jako pár vět do výpisu, takže je zároveň tím nejlepším
    // popiskem do vyhledávače i do náhledu sdíleného odkazu.
    return { title: c?.titulek ?? "Novinka", description: c?.perex ?? undefined };
  } catch {
    return { title: "Novinka" };
  }
}

export default async function ClanekStranka({ params }: Parametry) {
  const { slug, clanek } = await params;

  // Výpadek API se ošetřuje tady, ne přes `error.tsx` — viz app/vypadek.tsx.
  let c;
  try {
    c = await nactiClanek(slug, clanek);
  } catch (e) {
    if (e instanceof ApiNedostupne) return <Vypadek />;
    throw e;
  }
  if (!c) notFound();

  return (
    <>
      <PruhUkazky slug={slug} />
      <p className="drobecky">
        <Link href={`/serie/${slug}/novinky`}>Novinky</Link>
      </p>

      <h1>{c.titulek}</h1>
      <p className="podtitulek">
        {datumClanku(c.publikovanoV)}
        {c.autor && ` · ${c.autor}`}
      </p>

      <article className="clanek">
        {c.perex && <p className="perex">{c.perex}</p>}
        <Odstavce text={c.telo} />
      </article>

      {/* Článek zastávky vede na její stránku. Pozvánka bez odkazu na závod,
          o kterém je, nutí čtenáře hledat ho v kalendáři. */}
      {c.zavod && (
        <p className="poznamka">
          <Link href={`/serie/${slug}/zavody/${c.zavod}`}>
            {c.zavodNazev ?? "Zastávka"} — informace a výsledky →
          </Link>
        </p>
      )}
    </>
  );
}
