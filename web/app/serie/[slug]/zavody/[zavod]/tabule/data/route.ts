import { NextResponse } from "next/server";
import { nactiZavod } from "@/lib/api";
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
    const detail = await nactiZavod(slug, zavod);
    if (!detail) return NextResponse.json({ error: "Regata není." }, { status: 404 });
    return NextResponse.json(snimekZavodu(detail));
  } catch {
    return NextResponse.json({ error: "API nedostupné." }, { status: 503 });
  }
}
