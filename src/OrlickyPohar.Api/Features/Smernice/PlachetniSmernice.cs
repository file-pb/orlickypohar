using OrlickyPohar.Api.Features.Fotky;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Features.Smernice;

/// <summary>
/// Plachetní směrnice vyvěšená u zastávky (Filip, 3. 10. 2026: „to je
/// nutnost u regaty"). Dokument pořadatele, podle kterého se jede.
/// <para>
/// <b>Nová verze je nový záznam, ne přepis.</b> Appka je oficiální vývěska,
/// takže musí jít doložit, co bylo vyvěšené a odkdy — oprava se vyvěšuje,
/// nepřepisuje se. Z téhož důvodu se soubor po uložení nemění a jeho adresa
/// je podle <see cref="Id"/>, takže se nikdy nezmění pod rukama.
/// </para>
/// <para>
/// <b>Soubor, ne text v databázi.</b> Směrnici píše pořadatel ve Wordu
/// a vydává jako PDF. Převádět ji na bloky by znamenalo přepisovat cizí
/// úřední text a riskovat, že se naše verze rozejde s tou, podle které se
/// jede.
/// </para>
/// </summary>
public class PlachetniSmernice
{
    /// <summary>Id je zároveň jméno souboru v úložišti.</summary>
    public Guid Id { get; set; }

    public int ZavodId { get; set; }
    public Zavod? Zavod { get; set; }

    /// <summary>Pořadí vyvěšení u téhle zastávky, od jedné. Čtenář pozná opravu.</summary>
    public int Verze { get; set; }

    /// <summary>Jméno souboru od pořadatele. Slouží jako popisek odkazu.</summary>
    public required string Nazev { get; set; }

    public long Velikost { get; set; }

    /// <summary>Co se oproti minulé verzi mění. Nepovinné, ale u opravy se hodí.</summary>
    public string? Poznamka { get; set; }

    /// <summary>Kdo vyvěsil. U vývěsky musí být vidět, kdo za ní stojí.</summary>
    public Guid VyvesilId { get; set; }
    public Uzivatel? Vyvesil { get; set; }

    public DateTimeOffset VyveseneV { get; set; }
}

/// <summary>Směrnice, jak ji vidí čtenář webu i appky.</summary>
public record SmerniceDto(
    int Verze,
    string Nazev,
    string Adresa,
    DateTimeOffset VyveseneV,
    string? Poznamka,
    string? Vyvesil);

/// <summary>Formulář vyvěšení. Skládá ho server webu, ne prohlížeč.</summary>
public record SmerniceFormular(IFormFile? Soubor, string? Poznamka);

/// <summary>
/// Pravidla vyvěšení. Čisté funkce, bez databáze a bez úložiště.
/// </summary>
public static class Vyveseni
{
    /// <summary>
    /// Směrnice bývá do dvou megabajtů; dvacet je nad tím s rezervou pro
    /// skenovanou přílohu a pořád se vejde do paměti kontejneru.
    /// </summary>
    public const long NejvicBajtu = 20 * 1024 * 1024;

    public const int NazevNejvic = 200;
    public const int PoznamkaNejvic = 300;

    public const string Vypnuto = "Úložiště souborů zatím není nastavené.";

    public const string NeniPdf =
        "Směrnice musí být PDF. Word nebo sken ulož jako PDF a nahraj znovu.";

    /// <summary>
    /// Klíč v úložišti. <b>Předpona <c>smernice/</c></b> drží dokumenty
    /// stranou od fotek (<c>fotky/</c>) i od přejatých obrázků
    /// (<c>prevzate/</c>) — jsou to tři různé věci s různou životností.
    /// </summary>
    public static string Klic(Guid id) => $"smernice/{id:N}.pdf";

    /// <summary>PDF začíná <c>%PDF-</c>. Koncovka ani typ z prohlížeče nic nedokazují.</summary>
    public static bool JePdf(ReadOnlySpan<byte> zacatek) =>
        zacatek.Length >= 5
        && zacatek[0] == (byte)'%' && zacatek[1] == (byte)'P' && zacatek[2] == (byte)'D'
        && zacatek[3] == (byte)'F' && zacatek[4] == (byte)'-';

    /// <summary>Proč vyvěsit nejde — nebo <c>null</c>, když jde.</summary>
    public static string? ProcNejde(long delka, string? nazev, string? poznamka)
    {
        if (delka <= 0) return "Vyber soubor se směrnicí.";
        if (delka > NejvicBajtu) return $"Směrnice může mít nejvýš {NejvicBajtu / 1024 / 1024} MB.";
        if (string.IsNullOrWhiteSpace(nazev)) return "Soubor nemá jméno.";
        if (nazev.Trim().Length > NazevNejvic) return $"Jméno souboru má nejvýš {NazevNejvic} znaků.";
        if (poznamka?.Trim().Length > PoznamkaNejvic)
            return $"Poznámka může mít nejvýš {PoznamkaNejvic} znaků.";
        return null;
    }

    /// <summary>Směrnice pro klienta, nebo <c>null</c>, když neznáme veřejnou adresu.</summary>
    public static SmerniceDto? Dto(PlachetniSmernice s, string? verejnaAdresa) =>
        string.IsNullOrWhiteSpace(verejnaAdresa)
            ? null
            : new SmerniceDto(
                s.Verze, s.Nazev, Nahravani.Adresa(verejnaAdresa, Klic(s.Id)),
                s.VyveseneV, s.Poznamka, s.Vyvesil?.Zobrazovane);
}
