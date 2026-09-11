using System.Globalization;
using System.Text;

namespace OrlickyPohar.Api.Features.Clanky;

/// <summary>
/// Pravidla psaní článků, která nepotřebují databázi.
/// <para>
/// Zvlášť ze stejného důvodu jako <c>Prava</c> a <c>Udeleni</c>: ptá se na ně
/// každý zápis, takže se musí dát zkoušet bez databáze, bez tokenu a bez
/// Dockeru.
/// </para>
/// </summary>
public static class Psani
{
    /// <summary>Nejdelší slug, který se ještě vejde do sloupce.</summary>
    private const int SlugNejvic = 120;

    /// <summary>
    /// Které přechody mezi stavy dávají smysl.
    /// <para>
    /// <b>Z každého stavu se dá jít kamkoliv, kromě návratu ze smazaného
    /// rovnou mezi publikované.</b> Smazaný článek se nejdřív vrátí jako
    /// koncept a teprve pak se rozhodne, jestli má znovu vyjít — jinak by
    /// omylem smazaný text šel jedním kliknutím zpátky na veřejnost i s tím,
    /// co se na něm mezitím mělo opravit.
    /// </para>
    /// </summary>
    public static string? ProcNejde(StavClanku ze, StavClanku na)
    {
        if (ze == na) return null;

        return (ze, na) switch
        {
            (StavClanku.Smazano, StavClanku.Publikovano) =>
                "Smazaný článek se nejdřív vrátí jako koncept, teprve pak se publikuje.",
            _ => null,
        };
    }

    /// <summary>
    /// Slug z titulku: bez diakritiky, malými písmeny, slova spojená pomlčkou.
    /// <para>
    /// Vyrábí se ze jména schválně, ne z náhodného čísla: adresa článku má
    /// být čitelná a dát se přečíst do telefonu. Kdo chce jinou, zadá si ji.
    /// </para>
    /// <para>
    /// Diakritika padá, protože slug jde do adresy. „Jarní vítr" má být
    /// <c>jarni-vitr</c>, ne procenty zakódovaná změť.
    /// </para>
    /// </summary>
    public static string Slug(string text)
    {
        var bezDiakritiky = text.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(bezDiakritiky.Length);

        foreach (var znak in bezDiakritiky)
        {
            // Znaménka nad písmeny se po rozkladu objeví jako samostatné
            // znaky; tady prostě vypadnou a zůstane holé písmeno.
            if (CharUnicodeInfo.GetUnicodeCategory(znak) == UnicodeCategory.NonSpacingMark) continue;

            if (char.IsAsciiLetterOrDigit(znak)) sb.Append(char.ToLowerInvariant(znak));
            else if (sb.Length > 0 && sb[^1] != '-') sb.Append('-');
        }

        var slug = sb.ToString().Trim('-');
        if (slug.Length > SlugNejvic) slug = slug[..SlugNejvic].TrimEnd('-');

        return slug;
    }

    /// <summary>
    /// Proč článek takhle uložit nejde — nebo <c>null</c>, když jde.
    /// Vrací text, protože jediný, kdo z toho něco má, je člověk na druhé
    /// straně obrazovky.
    /// </summary>
    public static string? ProcNejdeUlozit(string? titulek, string? telo, string? slug)
    {
        if (string.IsNullOrWhiteSpace(titulek)) return "Článek musí mít titulek.";
        if (string.IsNullOrWhiteSpace(telo)) return "Článek musí mít text.";

        // Slug se odvozuje z titulku, takže prázdný znamená titulek složený
        // jen ze znaků, které do adresy nepatří — třeba samých otazníků.
        if (string.IsNullOrEmpty(slug))
            return "Z titulku nejde udělat adresa. Napiš do něj aspoň jedno písmeno nebo číslici.";

        return null;
    }
}
