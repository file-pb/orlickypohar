import { NextResponse, type NextRequest } from "next/server";
import { NEJVIC_MB, nahrajHlas } from "@/lib/oponentura";

/**
 * Nahrání hlasové odpovědi — <b>vlastní koncový bod, ne serverová akce</b>.
 *
 * <b>Dva důvody, oba doložené.</b>
 *
 * <list type="number">
 * <item>
 * Cloudflare před webem odmítá nahrávání se stavem **403**, když požadavek
 * nese soubor <b>i</b> hlavičku serverové akce <c>Next-Action</c>
 * (zjištěno 12. 10. 2026 třemi pokusy, podrobně
 * v <c>…/smernice/[zavod]/nahrat/route.ts</c>). Obyčejný <c>POST</c>
 * hlavičku akce nenese, takže pravidlo nemá na co reagovat.
 * </item>
 * <item>
 * Nahrávka vzniká v prohlížeči jako <c>Blob</c> z <c>MediaRecorder</c>,
 * takže ji odesílá javascript — ne odeslaný formulář. Koncový bod je to,
 * na co se dá zavolat <c>fetch</c>.
 * </item>
 * </list>
 *
 * <para>
 * <b>Token zůstává na serveru.</b> Prohlížeč posílá nahrávku sem, odsud jde
 * do API s tokenem ze sezení — stejně jako u zbytku správy.
 * </para>
 *
 * <para>
 * <b>Původ se kontroluje ručně.</b> Serverová akce má ochranu proti
 * odeslání z cizí stránky v Nextu zabudovanou, obyčejný koncový bod ji
 * nemá. Chybějící <c>Origin</c> se odmítá taky: prohlížeč ho u <c>fetch</c>
 * s <c>POST</c> posílá vždycky.
 * </para>
 *
 * <para>
 * Odpovídá JSONem, ne přesměrováním: volající je javascript, který po
 * uložení stránku obnoví sám.
 * </para>
 */
export async function POST(
  pozadavek: NextRequest,
  { params }: { params: Promise<{ serie: string; sada: string; kod: string }> },
) {
  const { serie, sada, kod } = await params;

  const chybne = (chyba: string, stav = 400) =>
    NextResponse.json({ error: chyba }, { status: stav });

  const puvod = pozadavek.headers.get("origin");
  const hostitel = pozadavek.headers.get("host");
  if (!puvod || !hostitel || new URL(puvod).host !== hostitel)
    return chybne("Odeslání nepřišlo z téhle stránky.", 403);

  let formular: FormData;
  try {
    formular = await pozadavek.formData();
  } catch {
    return chybne("Nahrávku se nepodařilo přečíst. Zkus to prosím znovu.");
  }

  const soubor = formular.get("nahravka");
  if (!(soubor instanceof File) || soubor.size === 0)
    return chybne("Nahrávka je prázdná. Zkus to prosím znovu.");
  if (soubor.size > NEJVIC_MB * 1024 * 1024)
    return chybne(`Nahrávka může mít nejvýš ${NEJVIC_MB} MB.`);

  // Délka z prohlížeče je nepovinná a nemusí přijít vůbec; nula znamená
  // „nevím", ne nulovou nahrávku.
  const sekund = Number(formular.get("sekund") ?? 0);

  const chyba = await nahrajHlas(serie, sada, kod, {
    soubor,
    jmeno: soubor.name || "odpoved",
    sekund: Number.isFinite(sekund) && sekund > 0 ? sekund : undefined,
  });

  return chyba ? chybne(chyba) : NextResponse.json({ stav: "ulozeno" });
}
