import { notFound } from "next/navigation";
import { ApiNedostupne, nactiClanky, nactiSerii } from "@/lib/api";
import { Vypadek } from "@/app/vypadek";
import { VypisNovinek } from "@/app/novinky";
import { Drobecky } from "@/app/drobecky";
import { PruhUkazky } from "@/app/ukazka";
import { Boky } from "@/app/boky";

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
    [serie, clanky] = await Promise.all([nactiSerii(slug), nactiClanky(slug)]);
  } catch (e) {
    if (e instanceof ApiNedostupne) return <Vypadek />;
    throw e;
  }
  if (!serie) notFound();

  return (
    <Boky serie={serie.slug}>
      <PruhUkazky slug={serie.slug} />
      <Drobecky
        cesta={[
          { text: "Domů", kam: "/" },
          { text: "Ročník", kam: `/serie/${serie.slug}` },
          { text: "Novinky" },
        ]}
      />
      <h1>Novinky</h1>

      {/* Blog je na dvou úrovních: sérii píše organizátor poháru, zastávku
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
