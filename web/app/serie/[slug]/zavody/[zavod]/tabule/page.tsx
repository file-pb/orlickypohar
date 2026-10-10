import { notFound } from "next/navigation";
import { ApiNedostupne, nactiZavod } from "@/lib/api";
import { snimekZavodu } from "@/lib/tabule";
import { Vypadek } from "@/app/vypadek";
import { Obrazovka } from "./obrazovka";

export const dynamic = "force-dynamic";

type Parametry = { params: Promise<{ slug: string; zavod: string }> };

export const metadata = { title: "Tabule" };

/**
 * Tabule do hospody (Filip, 9. 10. 2026: *„stránka, která by se dala
 * pustit v hospodě na telku, když se něco pojede"*).
 *
 * <b>Co tu schválně není:</b> mapa, polohy a dráhy lodí. Fáze 8 nezačala
 * a tabule bez ní dává smysl sama — co se zrovna jede, kdo je na startu,
 * jak dopadly rozjížďky a jak to hýbe pohárem. Je to schránka, do které
 * mapa zapadne, až vznikne.
 *
 * <b>Jen publikované výsledky.</b> Plán nechává „procesní děj" (under
 * review, potvrzeno, protest) jako **přepínač u regaty**, ne jako
 * pravidlo — a ten přepínač zatím není. Výchozí stav je ten
 * konzervativní, takže tabule ukazuje to, co je venku.
 *
 * <b>Bez boků a bez navigace.</b> Visí to na telce přes místnost; každý
 * pixel, který není čitelný od vedlejšího stolu, je k ničemu.
 */
export default async function Tabule({ params }: Parametry) {
  const { slug, zavod } = await params;

  try {
    const detail = await nactiZavod(slug, zavod);
    if (!detail) notFound();

    return <Obrazovka serie={slug} zavod={zavod} prvni={snimekZavodu(detail)} />;
  } catch (e) {
    if (e instanceof ApiNedostupne) return <Vypadek co="Tabule" />;
    throw e;
  }
}
