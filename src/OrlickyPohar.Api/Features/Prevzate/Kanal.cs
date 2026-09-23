using System.Globalization;
using System.Net;
using System.Text.RegularExpressions;
using System.Xml.Linq;

namespace OrlickyPohar.Api.Features.Prevzate;

/// <summary>Jedna položka cizího RSS kanálu, už očištěná.</summary>
public record PolozkaKanalu(
    string Odkaz, string Titulek, string? Perex, DateTimeOffset PublikovanoV);

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
