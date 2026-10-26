import { NextResponse } from "next/server";
import { nactiZaznamSpravy } from "@/lib/zaznam";

/**
 * Záznam rozjížďky pro mapu ve správě — <b>na revizi protestu</b>.
 *
 * Vlastní cesta, aby si ji mohla vzít klientská mapa: stránka se
 * renderuje serverem a token drží sezení, do prohlížeče se nedostane.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ serie: string; zavod: string; cislo: string }> },
) {
  const { serie, zavod, cislo } = await params;
  const cis = Number.parseInt(cislo, 10);
  if (!Number.isFinite(cis)) return NextResponse.json({ error: "Rozjížďka?" }, { status: 400 });

  const zaznam = await nactiZaznamSpravy(serie, zavod, cis);
  return zaznam
    ? NextResponse.json(zaznam, { headers: { "cache-control": "no-store" } })
    : NextResponse.json({ error: "Záznam se nedaří načíst." }, { status: 502 });
}
