import { NextResponse, type NextRequest } from "next/server";
import { NEJVIC_MB, vyvesSmernici } from "@/lib/smernice";

/**
 * Nahrání plachetní směrnice — <b>vlastní koncový bod, ne serverová akce</b>.
 *
 * <b>Proč to tak je</b> (zjištěno 12. 10. 2026): Cloudflare před webem
 * odmítal nahrávání směrnice se stavem **403** a k našemu nginxu se to
 * vůbec nedostalo. Zjištěno třemi pokusy, které se lišily jedinou věcí:
 *
 * <list type="bullet">
 * <item>multipart s PDF <b>bez</b> hlavičky <c>Next-Action</c> → projde,</item>
 * <item>multipart s hlavičkou <c>Next-Action</c> <b>bez</b> PDF → projde,</item>
 * <item>obojí naráz → <b>403 od Cloudflare</b>, blokační stránka v HTML.</item>
 * </list>
 *
 * Pravidlo WAF se tedy chytá na kombinaci „nahrávaný soubor v požadavku,
 * který nese hlavičku serverové akce". Prohlížeč z té blokační stránky
 * udělá <c>An unexpected response was received from the server</c>
 * a chybová hranice to vykreslí jako výpadek — takže to vypadá jako naše
 * porucha, přestože požadavek nikdy nedorazil.
 *
 * <para>
 * Jde to spravit i výjimkou ve WAF, ale ta je v cizím účtu a my na ni
 * nedosáhneme. Tohle je oprava, která drží sama o sobě: obyčejný
 * formulářový POST hlavičku akce nenese, takže pravidlo nemá na co
 * reagovat. <b>Navíc funguje bez javascriptu</b>, což u vody není
 * nevýhoda.
 * </para>
 *
 * <para>
 * <b>Kam se vrací, skládá koncový bod sám</b> z cesty, ne z pole
 * formuláře — adresa z formuláře by šla podvrhnout.
 * </para>
 *
 * <para>
 * <b>Původ se kontroluje ručně.</b> Serverová akce má ochranu proti
 * odeslání z cizí stránky v Nextu zabudovanou, obyčejný koncový bod ji
 * nemá — a bez ní by stačil formulář na cizím webu, který odešle soubor
 * sem i s cookie přihlášeného. Proto se porovnává <c>Origin</c>
 * s hostitelem požadavku. Chybějící <c>Origin</c> se odmítá taky:
 * prohlížeč ho u <c>POST</c> z formuláře posílá vždycky.
 * </para>
 */
export async function POST(
  pozadavek: NextRequest,
  { params }: { params: Promise<{ serie: string; zavod: string }> },
) {
  const { serie, zavod } = await params;

  /**
   * <b>Relativní adresa, ne složená z `pozadavek.url`.</b> V kontejneru je
   * `pozadavek.url` vnitřní adresa, na které Next poslouchá, takže by
   * prohlížeč skončil na `https://0.0.0.0:8080/…` — platforma to má jako
   * poučení a já jsem na to stejně naletěl. `Location` smí být relativní
   * a prohlížeč si ji doplní sám, takže není co poskládat špatně.
   *
   * 303: po POSTu se má prohlížeč vrátit GETem, jinak by obnovení stránky
   * nabídlo odeslat soubor znovu.
   */
  const zpet = (zprava: Record<string, string>) =>
    new NextResponse(null, {
      status: 303,
      headers: {
        location:
          `/sprava/${encodeURIComponent(serie)}/smernice/${encodeURIComponent(zavod)}` +
          `?${new URLSearchParams(zprava)}`,
      },
    });

  const puvod = pozadavek.headers.get("origin");
  const hostitel = pozadavek.headers.get("host");
  if (!puvod || !hostitel || new URL(puvod).host !== hostitel)
    return zpet({ chyba: "Odeslání nepřišlo z téhle stránky." });

  let formular: FormData;
  try {
    formular = await pozadavek.formData();
  } catch {
    return zpet({ chyba: "Soubor se nepodařilo přečíst. Zkus to prosím znovu." });
  }

  const soubor = formular.get("soubor");
  const poznamka = String(formular.get("poznamka") ?? "").trim() || undefined;

  if (!(soubor instanceof File) || soubor.size === 0)
    return zpet({ chyba: "Vyber soubor se směrnicí." });
  if (soubor.size > NEJVIC_MB * 1024 * 1024)
    return zpet({ chyba: `Směrnice může mít nejvýš ${NEJVIC_MB} MB.` });

  const chyba = await vyvesSmernici(serie, zavod, { soubor, poznamka });
  return zpet(chyba ? { chyba } : { stav: "vyveseno" });
}
