using OrlickyPohar.Api.Features.Bodovani;
using System.Globalization;
using System.Text;

namespace OrlickyPohar.Api.Features.Lode;

/// <summary>
/// Loď, jak ji napovídá veřejný formulář přihlášky.
/// <para>
/// <b>Jen to, co už na webu veřejně je</b> — jméno lodi, plachta, typ,
/// poslední kategorie a kormidelník. Kontakty nikdy: našeptávač
/// je otevřený komukoliv a jinak by z něj šlo vylovit cizí e-mail
/// napsáním názvu lodi.
/// </para>
/// <para>
/// <b>Majitel tu byl do 9. 10. 2026 a byl to přesně ten únik, před kterým
/// odstavec výš varuje.</b> Veřejná startovní listina vydává kormidelníka,
/// majitel je jinak jen pod <c>/sprava/</c> — a našeptávač ho vydával
/// komukoliv bez tokenu. Že jsou dnešní jména vygenerovaná, na tom nic
/// nemění: první skutečná přihláška z nich udělá skutečná, protože formulář
/// bez vyplněného majitele zapíše jako majitele kapitána.
/// </para>
/// </summary>
/// <param name="Kategorie">Kategorie, ve které loď naposledy jela. V ročníku je závazná.</param>
/// <param name="VRocniku">Loď už v ročníku jede — přihlašuje se ze seznamu, nezakládá znovu.</param>
/// <param name="PosledniRok">Poslední ročník, ve kterém loď jela.</param>
public record NapovedaLodiDto(
    string Lod,
    string? CisloPlachty,
    string? Typ,
    string? Kategorie,
    string? Kormidelnik,
    bool VRocniku,
    int? PosledniRok);

/// <summary>
/// Hledání lodí pro našeptávač. Čisté funkce, bez databáze — lodí jsou
/// nižší stovky a filtrovat je v paměti je levnější než vymýšlet, jak
/// v SQL porovnávat bez diakritiky na databázi, která nemusí mít
/// <c>unaccent</c> (tatáž past jako u slugu pořadatelů).
/// </summary>
public static class Napoveda
{
    public const int NejvicVysledku = 8;

    /// <summary>Kratší dotaz vrací všechno a nic nenapoví.</summary>
    public const int NejmeneZnaku = 2;

    /// <summary>Text na porovnávání: bez diakritiky, bez mezer, malými písmeny.</summary>
    public static string Klic(string? text)
    {
        if (string.IsNullOrEmpty(text)) return "";

        var rozlozeny = text.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(rozlozeny.Length);

        foreach (var znak in rozlozeny)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(znak) == UnicodeCategory.NonSpacingMark) continue;
            if (char.IsAsciiLetterOrDigit(znak)) sb.Append(char.ToLowerInvariant(znak));
        }

        return sb.ToString();
    }

    /// <summary>
    /// Pořadí nálezu. Nižší je lepší: nejdřív loď, jejíž jméno dotazem
    /// začíná, pak jméno, které ho obsahuje, a nakonec shoda v čísle
    /// plachty. <c>null</c> znamená, že loď do nabídky nepatří.
    /// </summary>
    public static int? Vaha(string dotaz, string nazev, string? cisloPlachty)
    {
        var q = Klic(dotaz);
        if (q.Length < NejmeneZnaku) return null;

        var jmeno = Klic(nazev);
        if (jmeno.StartsWith(q, StringComparison.Ordinal)) return 0;
        if (jmeno.Contains(q, StringComparison.Ordinal)) return 1;

        var plachta = Klic(cisloPlachty);
        return plachta.Length > 0 && plachta.Contains(q, StringComparison.Ordinal) ? 2 : null;
    }

    /// <summary>
    /// Nabídka pro dotaz: nejlepší shody, uvnitř stejné váhy podle abecedy.
    /// <b>Lodě z letošního ročníku mají přednost</b> — kdo se přihlašuje,
    /// nejspíš hledá tu, která už jezdí.
    /// </summary>
    public static IReadOnlyList<NapovedaLodiDto> Najdi(
        string? dotaz, IEnumerable<NapovedaLodiDto> lode, int nejvic = NejvicVysledku) =>
    [
        .. lode
            .Select(l => (Lod: l, Vaha: Vaha(dotaz ?? "", l.Lod, l.CisloPlachty)))
            .Where(n => n.Vaha is not null)
            .OrderBy(n => n.Vaha)
            .ThenByDescending(n => n.Lod.VRocniku)
            .ThenBy(n => n.Lod.Lod, Jmena.Cesky)
            .Take(nejvic)
            .Select(n => n.Lod),
    ];
}
