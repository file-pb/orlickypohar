using System.Globalization;
using System.Net;
using System.Text.RegularExpressions;
using System.Xml.Linq;

namespace OrlickyPohar.Api.Features.Prevzate;

/// <summary>Jedna položka cizího RSS kanálu, už očištěná.</summary>
public record PolozkaKanalu(
    string Odkaz, string Titulek, string? Perex, DateTimeOffset PublikovanoV,
    // Doplňuje se až ze stránky článku — RSS obrázky nevydává.
    string? Obrazek = null,
    // Totéž syrově, jak to stálo u zdroje: `Obrazek` je rozhodnutí,
    // tohle pozorování. Viz `PrevzatyClanek.OdZdroje`.
    string? OdZdroje = null,
    // Naše kopie té fotky, když se povedla. Doplňuje ji sběr, ne rozbor
    // kanálu: rozbor je čistá funkce nad textem a na síť nesahá.
    UlozenaFotka? Fotka = null);

/// <summary>
/// Rozbor RSS 2.0. Čistá funkce nad textem, žádná síť — proto se dá ověřit
/// bez Dockeru a bez cizího serveru, na kterém stejně nezáleží nám.
/// </summary>
public static partial class Kanal
{
    /// <summary>
    /// Nejdelší perex, který si necháme. Kanál svazu dává kolem dvou set
    /// znaků, ale cizí text není pod naší kontrolou a celý článek do výpisu
    /// novinek nepatří — je to upoutávka, ne převzaté dílo.
    /// </summary>
    public const int DelkaPerexu = 400;

    [GeneratedRegex("<[^>]+>")]
    private static partial Regex Znacky();

    [GeneratedRegex(@"\s+")]
    private static partial Regex Mezery();

    [GeneratedRegex(
        """<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']""",
        RegexOptions.IgnoreCase)]
    private static partial Regex OgObrazek();

    [GeneratedRegex(
        """<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']""",
        RegexOptions.IgnoreCase)]
    private static partial Regex OgObrazekObracene();

    /// <summary>
    /// Fotka, kterou zdroj dal ke článku — <c>og:image</c> z jeho stránky.
    /// RSS obrázky nevydává, takže je to jediné místo, kde se dá vzít.
    /// <para>
    /// Bere se jen absolutní adresa přes http(s). Relativní by se musela
    /// skládat vůči adrese stránky a `javascript:` nebo `data:` v cizím
    /// HTML nemá co dělat v atributu, který nám poteče do <c>src</c>.
    /// </para>
    /// </summary>
    public static string? Obrazek(string? html)
    {
        if (string.IsNullOrWhiteSpace(html)) return null;

        // Pořadí atributů v meta značce není dané, takže se zkouší obojí.
        var nalez = OgObrazek().Match(html);
        if (!nalez.Success) nalez = OgObrazekObracene().Match(html);
        if (!nalez.Success) return null;

        var adresa = WebUtility.HtmlDecode(nalez.Groups[1].Value).Trim();
        return Uri.TryCreate(adresa, UriKind.Absolute, out var uri)
               && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp)
            ? adresa
            : null;
    }

    /// <summary>
    /// Vytáhne položky z RSS. Přeskočí ty, které nemají odkaz nebo titulek —
    /// bez odkazu není kam poslat čtenáře a bez titulku není co ukázat.
    /// Vrací je seřazené od nejnovější, protože pořadí v kanálu je věcí
    /// zdroje a spoléhat se na ně by znamenalo věřit cizímu serveru víc,
    /// než je potřeba.
    /// </summary>
    public static IReadOnlyList<PolozkaKanalu> Rozeber(string xml)
    {
        XDocument dokument;
        try
        {
            dokument = XDocument.Parse(xml);
        }
        catch (System.Xml.XmlException)
        {
            // Cizí server umí vrátit chybovou stránku s kódem 200. Prázdný
            // výsledek je pak správná odpověď: nic nového nepřišlo.
            return [];
        }

        var polozky = new List<PolozkaKanalu>();
        foreach (var item in dokument.Descendants("item"))
        {
            var odkaz = Text(item.Element("link"));
            var titulek = Text(item.Element("title"));
            if (string.IsNullOrWhiteSpace(odkaz) || string.IsNullOrWhiteSpace(titulek)) continue;

            polozky.Add(new PolozkaKanalu(
                odkaz,
                titulek,
                Perex(Text(item.Element("description"))),
                Datum(Text(item.Element("pubDate")))));
        }

        return [.. polozky.OrderByDescending(p => p.PublikovanoV)];
    }

    private static string? Text(XElement? prvek) => prvek?.Value.Trim();

    /// <summary>
    /// Perex z HTML: pryč značky, entity zpátky na znaky, víc bílých znaků
    /// na jednu mezeru. Zkracuje se na hranici slova — useknuté slovo
    /// s výpustkou vypadá jako chyba webu, ne jako upoutávka.
    /// </summary>
    private static string? Perex(string? html)
    {
        if (string.IsNullOrWhiteSpace(html)) return null;

        var text = Mezery().Replace(WebUtility.HtmlDecode(Znacky().Replace(html, " ")), " ").Trim();
        if (text.Length == 0) return null;
        if (text.Length <= DelkaPerexu) return text;

        var mez = text.LastIndexOf(' ', DelkaPerexu);
        return string.Concat(text.AsSpan(0, mez > 0 ? mez : DelkaPerexu).TrimEnd(), "…");
    }

    /// <summary>
    /// RFC 1123 s posunem, jak ho kanál vydává („Wed, 23 Sep 2026 10:16:47
    /// +0200"). Nečitelné datum neznamená zahodit článek — dostane čas
    /// minimální, takže se propadne na konec a rotace ho vytlačí první.
    /// Tiše ho posunout na „teď" by ho naopak vystřelilo nahoru.
    /// </summary>
    private static DateTimeOffset Datum(string? text) =>
        DateTimeOffset.TryParse(text, CultureInfo.InvariantCulture,
            DateTimeStyles.AllowWhiteSpaces, out var kdy)
            ? kdy
            : DateTimeOffset.MinValue;
}
