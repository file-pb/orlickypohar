import { NextResponse } from "next/server";
import { nactiVerejnePolohy } from "@/lib/polohy";

/**
 * Živé polohy pro tabuli.
 *
 * <b>Vlastní cesta vedle snímku</b>, ne pole v něm: snímek drží mikrocache
 * před webem deset vteřin a nese pořadí ze zápisu, kdežto polohy mají
 * vlastní cache na API a jiný důvod existence. Smíchat je by znamenalo,
 * že výpadek jednoho shodí druhé.
 *
 * <b>Výpadek nesmí vrátit 200</b> — mikrocache by si ho uložila jako
 * platnou odpověď a rozdávala ji celé hospodě.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ slug: string; zavod: string }> },
) {
  const { slug, zavod } = await params;
  const polohy = await nactiVerejnePolohy(slug, zavod);

  return polohy
    ? NextResponse.json(polohy, { headers: { "cache-control": "no-store" } })
    : NextResponse.json({ error: "Polohy se nedaří načíst." }, { status: 502 });
}
