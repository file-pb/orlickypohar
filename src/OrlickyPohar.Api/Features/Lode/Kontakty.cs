namespace OrlickyPohar.Api.Features.Lode;

/// <summary>
/// Kontrola e-mailu a telefonu. Čisté funkce — ptá se na ně medailonek
/// pořadatele i přihláška lodi, a obě místa musí pustit totéž.
/// </summary>
public static class Kontakty
{
    public const int EmailNejvic = 320;
    public const int TelefonNejvic = 40;

    /// <summary>
    /// Adresa se zavináčem, doménou s tečkou a bez mezer. Víc se neověřuje:
    /// přísnější kontrola odmítne skutečné adresy a stejně nepozná překlep.
    /// </summary>
    public static bool JeEmail(string email)
    {
        if (email.Length > EmailNejvic || email.Any(char.IsWhiteSpace)) return false;

        var zavinac = email.IndexOf('@');
        if (zavinac <= 0 || zavinac != email.LastIndexOf('@')) return false;

        var domena = email[(zavinac + 1)..];
        return domena.Contains('.') && !domena.StartsWith('.') && !domena.EndsWith('.');
    }

    /// <summary>Číslice, mezery a obvyklé oddělovače; 9 až 15 číslic.</summary>
    public static bool JeTelefon(string telefon)
    {
        if (telefon.Length > TelefonNejvic) return false;
        if (!telefon.All(z => char.IsAsciiDigit(z) || z is ' ' or '+' or '-' or '(' or ')' or '/'))
            return false;

        return telefon.Count(char.IsAsciiDigit) is >= 9 and <= 15;
    }

    /// <summary>
    /// Proč kontakt uložit nejde — nebo <c>null</c>. <paramref name="povinny"/>
    /// říká, že aspoň jedno z dvojice musí být vyplněné: bez kontaktu by
    /// pořadatel neměl jak přihlášku doplnit.
    /// </summary>
    public static string? ProcNejde(string? email, string? telefon, bool povinny)
    {
        var e = email?.Trim();
        var t = telefon?.Trim();

        if (povinny && string.IsNullOrEmpty(e) && string.IsNullOrEmpty(t))
            return "Vyplň e-mail nebo telefon, ať se ti pořadatel může ozvat.";
        if (!string.IsNullOrEmpty(e) && !JeEmail(e)) return "E-mail nevypadá jako e-mailová adresa.";
        if (!string.IsNullOrEmpty(t) && !JeTelefon(t))
            return "Telefon může obsahovat číslice, mezery a „+“ a musí mít aspoň devět číslic.";

        return null;
    }

    /// <summary>
    /// Nejnovější kontakt osoby, pokud se od něj zadaný liší — jinak
    /// <c>null</c> a nic se neukládá. Prázdné pole neznamená „smazat":
    /// kdo vyplní jen telefon, e-mail si nechává.
    /// </summary>
    public static KontaktOsoby? Novy(
        KontaktOsoby? posledni, string? email, string? telefon, DateTimeOffset kdy, int? ucastId)
    {
        var e = string.IsNullOrWhiteSpace(email) ? posledni?.Email : email.Trim();
        var t = string.IsNullOrWhiteSpace(telefon) ? posledni?.Telefon : telefon.Trim();

        if (e is null && t is null) return null;
        if (posledni is not null
            && string.Equals(posledni.Email, e, StringComparison.OrdinalIgnoreCase)
            && posledni.Telefon == t)
            return null;

        return new KontaktOsoby { Email = e, Telefon = t, ZadanoV = kdy, UcastId = ucastId };
    }

    /// <summary>
    /// Odkdy jsou kontakty staré a mažou se. <b>Drží se do konce následující
    /// sezóny</b> (Filip, 17. 9. 2026) — kvůli pozvánkám na další ročník.
    /// Kontakt z roku 2026 tedy vydrží celý rok 2027 a 1. 1. 2028 zmizí.
    /// </summary>
    public static DateTimeOffset SmazatStarsiNez(DateTimeOffset ted) =>
        new(ted.Year - 1, 1, 1, 0, 0, 0, TimeSpan.Zero);
}
