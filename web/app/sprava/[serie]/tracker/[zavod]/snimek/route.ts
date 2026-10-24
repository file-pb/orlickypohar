import { NextResponse } from "next/server";
import { nactiPolohy } from "@/lib/polohy";

/**
 * Snímek poloh pro obrazovku, která se ptá každých pár vteřin.
 *
 * <b>Proč route a ne serverová akce:</b> je to čtení, které se opakuje,
 * a token zůstává na serveru — prohlížeč posílá jen cookie sezení.
 * Odpověď se nesmí cachovat ani o vteřinu: cache je na straně API, kde
 * ji sdílí všichni diváci najednou.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ serie: string; zavod: string }> },
) {
  const { serie, zavod } = await params;
  const snimek = await nactiPolohy(serie, zavod);

  return snimek
    ? NextResponse.json(snimek, { headers: { "cache-control": "no-store" } })
    : NextResponse.json({ error: "Polohy se nedaří načíst." }, { status: 502 });
}
