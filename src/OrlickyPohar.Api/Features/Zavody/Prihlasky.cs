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
        StavZavodu.Zruseny => "Regata je zrušená, lodě se na ni nepřihlašují.",
        _ => "Závod ještě není vypsaný. Lodě se přihlašují od vypsání.",
    };

    /// <summary>
    /// Proč loď do tohohle stavu přepnout nejde — nebo <c>null</c>.
    /// <para>
    /// <b>Většina přechodů jde oběma směry</b>, protože překlep se musí dát
    /// vzít zpět. Výjimky:
    /// </para>
    /// <list type="bullet">
    /// <item><b>Požadavek</b> vzniká jen přihláškou z webu, ručně se do něj nevrací.</item>
    /// <item><b>Vyloučení</b> je rozhodnutí rozhodčího; rozhodčí zase nic
    /// jiného nemění (přihlášky vede pořadatel).</item>
    /// <item><b>Loď s výsledky</b> přijela. Odhlásit, odmítnout, vrátit
    /// k doplnění ani zapsat jako nedostavenou ji nejde — zmizela by ze
    /// seznamu a výsledky by přitom dál platily.</item>
    /// </list>
    /// </summary>
    public static string? ProcNejdePrepnout(StavUcasti ze, StavUcasti na, bool maVysledky, Kdo kdo = Kdo.Poradatel)
    {
        if (ze == na) return null;

        if (na == StavUcasti.Pozadavek)
            return "Požadavek vzniká jen přihláškou z webu. Loď zapiš, nebo vrať k doplnění.";

        var vylouceni = ze == StavUcasti.Vyloucena || na == StavUcasti.Vyloucena;
        if (vylouceni && kdo != Kdo.Rozhodci) return "O vyloučení ze závodu rozhoduje rozhodčí.";
        if (!vylouceni && kdo == Kdo.Rozhodci) return "Přihlášky vede pořadatel. Rozhodčí jen vylučuje.";

        if (maVysledky && na is StavUcasti.Zrusena or StavUcasti.Odmitnuta
                or StavUcasti.KDoplneni or StavUcasti.Nedostavila)
            return "Loď už má na zastávce výsledky, takže přijela. "
                   + "Tenhle stav jde nastavit, až výsledky v zápisu rozjížděk smažeš.";

        return null;
    }

    /// <summary>Kdo přihlášku přepíná. Pravidla se liší, viz <see cref="ProcNejdePrepnout"/>.</summary>
    public enum Kdo
    {
        Poradatel,
        Rozhodci,
    }

    /// <summary>
    /// Přechody, u kterých musí být napsané proč. Kapitán se jinak nedozví,
    /// co má doplnit, a vyloučení bez důvodu by nešlo obhájit.
    /// </summary>
    public static bool PotrebujeDuvod(StavUcasti na) =>
        na is StavUcasti.KDoplneni or StavUcasti.Odmitnuta or StavUcasti.Vyloucena;

    public const int DuvodNejvic = 500;

    public static string? ProcNejdeDuvod(StavUcasti na, string? duvod)
    {
        if (PotrebujeDuvod(na) && string.IsNullOrWhiteSpace(duvod))
            return na switch
            {
                StavUcasti.KDoplneni => "Napiš, co má kapitán doplnit nebo opravit.",
                StavUcasti.Vyloucena => "Napiš důvod vyloučení.",
                _ => "Napiš, proč přihlášku nepřijímáš.",
            };

        return duvod?.Trim().Length > DuvodNejvic ? $"Důvod může mít nejvýš {DuvodNejvic} znaků." : null;
    }

    /// <summary>
    /// Smí pořadatel přihlášku smazat? Jen nesmysl z webu: požadavek,
    /// vrácenou nebo odmítnutou, a bez výsledků. Zapsaná loď se odhlašuje — její historie
    /// má zůstat.
    /// </summary>
    public static bool SmiSmazat(StavUcasti stav, bool maVysledky) =>
        !maVysledky && stav is StavUcasti.Pozadavek or StavUcasti.Odmitnuta or StavUcasti.KDoplneni;

    /// <summary>Stavy, do kterých jde loď přepnout. Posílá se na obrazovku.</summary>
    public static IEnumerable<StavUcasti> MozneZ(StavUcasti ze, bool maVysledky, Kdo kdo = Kdo.Poradatel) =>
        Enum.GetValues<StavUcasti>().Where(na => na != ze && ProcNejdePrepnout(ze, na, maVysledky, kdo) is null);

    /// <summary>
    /// Je loď v tomhle stavu na veřejné stránce zastávky? Seznam je o tom,
    /// kdo jede nebo jel. Nepřijaté, odhlášené a nedostavené tam nejsou;
    /// vyloučená ano — její výsledky se na stránce ukazují taky.
    /// </summary>
    public static bool VerejneViditelna(StavUcasti stav) =>
        stav is StavUcasti.Prihlasena or StavUcasti.Potvrzena or StavUcasti.Vyloucena;

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
