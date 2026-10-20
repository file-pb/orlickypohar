import { NextResponse } from "next/server";
import { nactiVerejnouTrat, nactiZavod } from "@/lib/api";
import { snimekZavodu } from "@/lib/tabule";

/**
 * Snímek pro tabuli, který si obrazovka sama obnovuje.
 *
 * <b>Proč vlastní cesta a ne obnovení celé stránky:</b> tabule visí na
 * telce, kterou nikdo neobsluhuje. Kdyby se obnovovala načtením stránky,
 * výpadek API by jí smazal obsah a zůstalo by „nedaří se načíst" — a to
 * plán výslovně zakazuje (*Tabule do hospody*). Takhle si prohlížeč drží
 * poslední dobrý snímek a jen zestárne.
 *
 * <b>Výpadek nesmí vrátit 200</b>, jinak si ho mikrocache uloží jako
 * platnou odpověď a bude ho deset vteřin rozdávat celé hospodě.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ slug: string; zavod: string }> },
) {
  const { slug, zavod } = await params;

  try {
    // Trať se čte vedle detailu a její výpadek snímek neshodí: tabule bez
    // trati pořád umí ukázat rozjížďky a pořadí, kdežto „nedaří se načíst"
    // by byla prázdná obrazovka až do rána.
    // <b>Bez minutové cache.</b> Obrazovka si o snímek říká po dvaceti
    // vteřinách, jenže `nactiZavod` si odpověď držel minutu — takže alert
    // „v cíli" vyskočil klidně o minutu později, a při smůle až po konci
    // rozjížďky (Filip, 20. 10. 2026). Mikrocache nginxu před webem tutéž
    // odpověď deset vteřin rozdá celé hospodě, takže API to nezatíží.
    const [detail, trat] = await Promise.all([
      nactiZavod(slug, zavod, true),
      nactiVerejnouTrat(slug, zavod).catch(() => null),
    ]);
    if (!detail) return NextResponse.json({ error: "Regata není." }, { status: 404 });
    return NextResponse.json(snimekZavodu(detail, trat));
  } catch {
    return NextResponse.json({ error: "API nedostupné." }, { status: 503 });
  }
}
