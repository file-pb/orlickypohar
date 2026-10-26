import { NextResponse } from "next/server";
import { nactiZaznam } from "@/lib/zaznam";

/**
 * Záznam dojeté rozjížďky pro zrychlenou přehrávku na tabuli.
 *
 * <b>Vlastní cesta vedle snímku</b>: stahuje se jednou za rozjížďku a je
 * o dva řády větší než snímek, takže do něj nepatří. Tabule si ho vezme,
 * až bude co přehrávat.
 *
 * <b>Výpadek nesmí vrátit 200</b> — mikrocache před webem by si ho
 * uložila jako platnou odpověď.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ slug: string; zavod: string; cislo: string }> },
) {
  const { slug, zavod, cislo } = await params;
  const cis = Number.parseInt(cislo, 10);
  if (!Number.isFinite(cis)) return NextResponse.json({ error: "Rozjížďka?" }, { status: 400 });

  const zaznam = await nactiZaznam(slug, zavod, cis);
  return zaznam
    ? NextResponse.json(zaznam, { headers: { "cache-control": "no-store" } })
    : NextResponse.json({ error: "Záznam se nedaří načíst." }, { status: 502 });
}
