namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>
/// Loď, která v ročníku ještě není. Přihlášením na zastávku se stává
/// účastníkem ročníku v téhle kategorii.
/// </summary>
public record NovaLodVstup(
    string Nazev,
    string Kategorie,
    string MajitelJmeno,
    string MajitelPrijmeni,
    string? CisloPlachty = null,
    string? Typ = null);

/// <summary>
/// Přihlášky lodí na zastávku: kdy se smí a co s nimi jde udělat.
/// <para>
/// Čisté funkce ze stejného důvodu jako <see cref="Zapis"/> a
/// <see cref="Workflow"/>. Kdo smí, tady není — přihlašuje pořadatel
/// zastávky a to hlídají <c>Rozsahy</c>.
/// </para>
/// </summary>
public static class Prihlasky
{
    /// <summary>
    /// Proč na zastávku nejde přihlašovat — nebo <c>null</c>.
    /// <para>
    /// <b>Od vypsání.</b> Plánovaná a potvrzená zastávka má jen termín;
    /// přihlašovat se na ni by znamenalo slibovat závod, který pořadatel
    /// ještě nevypsal. Po odjetí se přihlášky dál opravují — kdo přijel,
    /// se často ví přesně až večer.
    /// </para>
    /// </summary>
    public static string? ProcNejdeNaZavod(StavZavodu stav) => stav switch
    {
        StavZavodu.Vypsany or StavZavodu.Odjety => null,
        StavZavodu.Zruseny => "Zastávka je zrušená, lodě se na ni nepřihlašují.",
        _ => "Závod ještě není vypsaný. Lodě se přihlašují od vypsání.",
    };

    /// <summary>
    /// Proč loď do tohohle stavu přepnout nejde — nebo <c>null</c>.
    /// <para>
    /// Jde to oběma směry, protože překlep se musí dát vzít zpět. Jediná
    /// výjimka: <b>loď s výsledky zrušit nejde</b>. Zmizela by ze seznamu
    /// přihlášených, a výsledky by přitom dál platily — veřejná stránka by
    /// ukazovala pořadí lodi, která podle ní nejela.
    /// </para>
    /// </summary>
    public static string? ProcNejdePrepnout(StavUcasti ze, StavUcasti na, bool maVysledky) =>
        ze != na && na == StavUcasti.Zrusena && maVysledky
            ? "Loď už má na zastávce výsledky. Zrušit ji jde, až je v zápisu rozjížděk smažeš."
            : null;

    /// <summary>Stavy, do kterých jde loď přepnout. Posílá se na obrazovku.</summary>
    public static IEnumerable<StavUcasti> MozneZ(StavUcasti ze, bool maVysledky) =>
        Enum.GetValues<StavUcasti>().Where(na => na != ze && ProcNejdePrepnout(ze, na, maVysledky) is null);

    /// <summary>
    /// Proč novou loď nejde založit — nebo <c>null</c>. Délky jsou ty ze
    /// schématu: databáze by delší text odmítla až při uložení, a to
    /// hláškou, které pořadatel nerozumí.
    /// </summary>
    public static string? ProcNejdeNovaLod(NovaLodVstup v)
    {
        if (string.IsNullOrWhiteSpace(v.Nazev)) return "Loď musí mít název.";
        if (v.Nazev.Trim().Length > 120) return "Název lodi má nejvýš 120 znaků.";
        if (string.IsNullOrWhiteSpace(v.Kategorie)) return "Vyber kategorii, ve které loď pojede.";

        // Majitel stojí ve výsledcích vedle lodi, takže bez něj by řádek
        // v tabulce zůstal napůl prázdný.
        if (string.IsNullOrWhiteSpace(v.MajitelJmeno) || string.IsNullOrWhiteSpace(v.MajitelPrijmeni))
            return "Vyplň jméno i příjmení majitele. Ve výsledcích stojí vedle lodi.";

        if (v.MajitelJmeno.Trim().Length > 80 || v.MajitelPrijmeni.Trim().Length > 80)
            return "Jméno i příjmení majitele mají nejvýš 80 znaků.";

        if (v.CisloPlachty?.Trim().Length > 20) return "Číslo plachty má nejvýš 20 znaků.";
        if (v.Typ?.Trim().Length > 80) return "Typ lodi má nejvýš 80 znaků.";

        return null;
    }
}
