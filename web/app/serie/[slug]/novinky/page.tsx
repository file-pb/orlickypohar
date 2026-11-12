import { notFound } from "next/navigation";
import { ApiNedostupne, nactiNovinky, nactiSerii } from "@/lib/api";
import { Vypadek } from "@/app/vypadek";
import { VypisNovinek } from "@/app/novinky";
import { Drobecky } from "@/app/drobecky";
import { Boky } from "@/app/boky";
import { NadpisSerie, PruhSerie } from "@/app/serie/[slug]/pruh-serie";

export const dynamic = "force-dynamic";

type Parametry = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Parametry) {
  const { slug } = await params;
  try {
    const serie = await nactiSerii(slug);
    return { title: serie ? `Novinky — ${serie.nazev}` : "Novinky" };
  } catch {
    return { title: "Novinky" };
  }
}

export default async function Novinky({ params }: Parametry) {
  const { slug } = await params;

  // Výpadek API se ošetřuje tady, ne přes `error.tsx` — viz app/vypadek.tsx.
  let serie, clanky;
  try {
    // Obecné články mimo ročník patří i sem — čtenář hledá novinky tady.
    [serie, clanky] = await Promise.all([nactiSerii(slug), nactiNovinky(slug)]);
  } catch (e) {
    if (e instanceof ApiNedostupne) return <Vypadek />;
    throw e;
  }
  if (!serie) notFound();

  return (
    <Boky serie={serie.slug}>
      <PruhSerie slug={serie.slug} aktivni="novinky" />
      <NadpisSerie nazevRocniku={serie.nazev} cast="novinky" />

      {/* Blog je na dvou úrovních: sérii píše organizátor poháru, regatu
          její pořadatel. Ve výpisu jsou pohromadě a odlišuje je štítek —
          čtenáře zajímá, co je nového, ne kdo to spravuje. */}
      {!clanky || clanky.length === 0 ? (
        <p className="prazdno">Zatím tu nic není. Novinky přibudou během sezóny.</p>
      ) : (
        <VypisNovinek serie={serie.slug} clanky={clanky} />
      )}
    </Boky>
  );
}
