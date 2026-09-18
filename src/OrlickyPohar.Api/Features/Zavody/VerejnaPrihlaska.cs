using OrlickyPohar.Api.Features.Lode;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>Kapitán, jak ho zadal formulář. Kapitán a kormidelník je jedna role (Filip, 17. 9. 2026).</summary>
public record KapitanVstup(
    string Jmeno,
    string Prijmeni,
    string? Email = null,
    string? Telefon = null,
    string? CisloCsj = null);

/// <summary>
/// Přihláška lodi z veřejného formuláře.
/// </summary>
/// <param name="Souhlas">Kapitán potvrdil pravidla a zveřejnění lodi ve startovní listině.</param>
/// <param name="Past">Skryté pole pro roboty. Člověk ho nevyplní, protože ho nevidí.</param>
/// <param name="ZobrazenoV">Kdy se formulář otevřel. Robot ho odešle hned.</param>
public record VerejnaPrihlaskaVstup(
    string Lod,
    KapitanVstup Kapitan,
    string? CisloPlachty = null,
    string? Typ = null,
    string? Kategorie = null,
    string? MajitelJmeno = null,
    string? MajitelPrijmeni = null,
    string? Posadka = null,
    string? Poznamka = null,
    bool Souhlas = false,
    string? Past = null,
    DateTimeOffset? ZobrazenoV = null);

/// <summary>
/// Pravidla veřejné přihlášky. Čisté funkce.
/// <para>
/// <b>Bez účtu a bez hesla</b> (Filip, 17. 9. 2026): lidi se nemají
/// otravovat. Přihláška je na důvěře a pořadatel ji před zapsáním vidí;
/// nesmysl smaže. Proti robotům stačí past ve formuláři a strop na
/// zastávku — Turnstile se přidá, až spam skutečně přijde.
/// </para>
/// </summary>
public static class VerejnaPrihlaska
{
    public const int PosadkaNejvic = 400;
    public const int PoznamkaNejvic = 1000;

    /// <summary>Kolik přihlášek z webu unese zastávka za hodinu, než se začnou odmítat.</summary>
    public const int NejvicZaHodinu = 30;

    /// <summary>
    /// Formulář, který se odešle dřív, vyplnil stroj. Tři vteřiny nikdo
    /// nenapíše ani jméno lodi.
    /// </summary>
    public static readonly TimeSpan NejmeneNaVyplneni = TimeSpan.FromSeconds(3);

    public const string Robot = "Přihlášku se nepodařilo přijmout. Zkus to prosím znovu.";

    /// <summary>
    /// Proč přihlášku přijmout nejde — nebo <c>null</c>.
    /// <para>
    /// Past i příliš rychlé odeslání vracejí <b>stejnou obecnou hlášku</b>:
    /// robotovi se nemá říkat, na čem pohořel, a člověk se do ní netrefí.
    /// </para>
    /// </summary>
    public static string? ProcNejde(VerejnaPrihlaskaVstup v, DateTimeOffset ted)
    {
        if (!string.IsNullOrWhiteSpace(v.Past)) return Robot;
        if (v.ZobrazenoV is { } otevreno && ted - otevreno < NejmeneNaVyplneni) return Robot;

        if (string.IsNullOrWhiteSpace(v.Lod)) return "Napiš jméno lodi.";
        if (v.Lod.Trim().Length > 120) return "Jméno lodi má nejvýš 120 znaků.";
        if (v.CisloPlachty?.Trim().Length > 20) return "Číslo plachty má nejvýš 20 znaků.";
        if (v.Typ?.Trim().Length > 80) return "Typ lodi má nejvýš 80 znaků.";

        if (string.IsNullOrWhiteSpace(v.Kapitan.Jmeno) || string.IsNullOrWhiteSpace(v.Kapitan.Prijmeni))
            return "Vyplň jméno i příjmení kapitána.";
        if (v.Kapitan.Jmeno.Trim().Length > 80 || v.Kapitan.Prijmeni.Trim().Length > 80)
            return "Jméno i příjmení kapitána mají nejvýš 80 znaků.";
        if (v.Kapitan.CisloCsj?.Trim().Length > 20) return "Číslo člena ČSJ má nejvýš 20 znaků.";

        // Bez kontaktu nemá pořadatel jak přihlášku doplnit.
        if (Kontakty.ProcNejde(v.Kapitan.Email, v.Kapitan.Telefon, povinny: true) is { } chyba) return chyba;

        if (v.Posadka?.Trim().Length > PosadkaNejvic) return $"Posádka má nejvýš {PosadkaNejvic} znaků.";
        if (v.Poznamka?.Trim().Length > PoznamkaNejvic) return $"Poznámka má nejvýš {PoznamkaNejvic} znaků.";

        if (!v.Souhlas)
            return "Potvrď, že loď smí být ve startovní listině a že se pořadatel může ozvat.";

        return null;
    }
}
