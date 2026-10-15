import { NextResponse } from "next/server";

const API = process.env.API_URL ?? "http://localhost:8080";

/**
 * Řada hladiny pro graf, když si člověk přepne rozsah.
 *
 * <b>Proč přes web a ne rovnou z prohlížeče na API:</b> API je sice veřejné,
 * ale takhle má řada jedno místo, kde se cachuje, a widget nemusí znát jeho
 * adresu. Je to tatáž cesta, jakou chodí zbytek stránky.
 *
 * <b>Cache podle rozsahu.</b> Posledních 24 h se mění každých deset minut,
 * roční graf se po dni nezmění skoro vůbec — držet obojí stejně dlouho by
 * buď zbytečně zatěžovalo API, nebo ukazovalo starý den.
 */
const CACHE: Record<string, number> = {
  "24h": 300,
  "3d": 600,
  "1t": 1800,
  "2t": 3600,
  "1m": 3600,
  "3m": 21600,
  "1r": 86400,
};

export async function GET(request: Request) {
  const rozsah = new URL(request.url).searchParams.get("rozsah") ?? "";
  const revalidate = CACHE[rozsah];

  // Neznámý rozsah se k API nepouští: je to náš vlastní číselník a cizí
  // hodnota by znamenala dotaz navíc kvůli odpovědi, kterou známe předem.
  if (!revalidate) return NextResponse.json({ chyba: "Neznámý rozsah." }, { status: 400 });

  try {
    const odpoved = await fetch(`${API}/vodocet/orlik/rada?rozsah=${rozsah}`, {
      next: { revalidate },
      headers: { accept: "application/json" },
    });
    if (!odpoved.ok) return NextResponse.json({ chyba: "Řada se nenačetla." }, { status: 502 });

    return NextResponse.json(await odpoved.json(), {
      // Prohlížeč si smí řadu podržet taky — přepínání sem a tam je pak
      // bez dotazu a mikrocache před webem to nemusí řešit.
      headers: { "cache-control": `public, max-age=${Math.min(revalidate, 600)}` },
    });
  } catch {
    return NextResponse.json({ chyba: "API neodpovědělo." }, { status: 502 });
  }
}
