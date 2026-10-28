import { NextResponse, type NextRequest } from "next/server";
import { nactiHlas } from "@/lib/oponentura";

/**
 * Přehrání hlasové odpovědi.
 *
 * <b>Proč to nejde rovnou z úložiště.</b> Fotky a směrnice mají veřejnou
 * adresu, protože jsou určené ven. Hlas rozhodčího k neuzavřenému
 * rozhodnutí určený ven není, takže ho API vydává za přihlášením — a token
 * je na serveru webu, ne v prohlížeči. Tahle cesta je to místo, kde se
 * obojí potká: <c>&lt;audio src&gt;</c> ukazuje sem, odsud se jde do API
 * s tokenem.
 *
 * <para>
 * <b>Necachovat nikde.</b> Odpověď závisí na tom, kdo se ptá, takže ji
 * nesmí držet ani prohlížeč, ani mikrocache před webem.
 * </para>
 */
export async function GET(
  _pozadavek: NextRequest,
  { params }: { params: Promise<{ serie: string; sada: string; id: string }> },
) {
  const { serie, sada, id } = await params;

  const odpoved = await nactiHlas(serie, sada, id);
  if (!odpoved) return new NextResponse(null, { status: 401 });
  if (!odpoved.ok || !odpoved.body)
    return new NextResponse(null, { status: odpoved.status === 404 ? 404 : 502 });

  return new NextResponse(odpoved.body, {
    headers: {
      "content-type": odpoved.headers.get("content-type") ?? "application/octet-stream",
      "cache-control": "no-store, private",
      // Přehrávač si o kus nahrávky říká skokem; bez tohohle si ho nevezme.
      "accept-ranges": odpoved.headers.get("accept-ranges") ?? "none",
    },
  });
}
