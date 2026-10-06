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
/// <b>Záznam se nemaže, obsah se dá odvolat</b> (oponentura, 5. 10. 2026).
/// Do té doby platilo „vyvěšené zůstává" na obojí — a pořadatel, který
/// omylem nahrál PDF s telefony a adresami posádky, to neměl jak vzít zpět:
/// nová verze chybnou neodvolá a všechny verze se vydávaly veřejně. Stažení
/// (<see cref="StazenoV"/>) proto nechává řádek i historii, ale soubor
/// z úložiště zmizí a veřejné čtení verzi nevydá.
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

    /// <summary>
    /// Kdy byla stažena z vývěsky. Prázdné znamená, že visí.
    /// <para>
    /// Stažení <b>není smazání záznamu</b>: řádek zůstane i s tím, kdo ji
    /// vyvěsil, kdo stáhl a proč. Zmizí jen soubor z úložiště a adresa
    /// z veřejného čtení.
    /// </para>
    /// </summary>
    public DateTimeOffset? StazenoV { get; set; }

    public Guid? StahlId { get; set; }
    public Uzivatel? Stahl { get; set; }

    /// <summary>
    /// Proč se stahuje. <b>Povinné při stažení:</b> u dokumentu, podle
    /// kterého se jede, nesmí být odvolání bez vysvětlení — jinak se po
    /// sezóně nedá říct, jestli šlo o překlep nebo o chybný obsah.
    /// </summary>
    public string? DuvodStazeni { get; set; }
}

/// <summary>
/// Směrnice, jak ji vidí čtenář webu i appky.
/// <para>
/// Pole o stažení jsou <b>aditivní</b> a vyplněná jen pro správu. Veřejné
/// čtení stažené verze nevydává vůbec: appka zůstává lidem na telefonech
/// a starší verze klienta by o stažení nevěděla — odkaz na odvolaný
/// dokument je přesně ta jedna věc, která se stát nesmí.
/// </para>
/// </summary>
public record SmerniceDto(
    int Verze,
    string Nazev,
    string Adresa,
    DateTimeOffset VyveseneV,
    string? Poznamka,
    string? Vyvesil,
    DateTimeOffset? StazenoV = null,
    string? Stahl = null,
    string? DuvodStazeni = null,
    // Mohla uvíznout v edge cache? Platí jen pro verze vyvěšené dřív, než
    // se přestalo cachovat — u nich dá po stažení jistotu až ruční purge.
    bool MohlaUvaznoutVCache = false);

/// <summary>Formulář vyvěšení. Skládá ho server webu, ne prohlížeč.</summary>
public record SmerniceFormular(IFormFile? Soubor, string? Poznamka);

/// <summary>Proč se směrnice stahuje z vývěsky.</summary>
public record StazeniVstup(string? Duvod);

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
    public const int DuvodNejvic = 300;

    /// <summary>
    /// Hlavička, se kterou se směrnice ukládá. <b>Necachovat</b> — na rozdíl
    /// od fotek, které se kladou pod nový klíč a nikdy se nemění.
    /// <para>
    /// Fotky dostávají roční <c>immutable</c>, protože nová fotka je nový
    /// soubor. U směrnice je ale potřeba opak: stažení musí zabrat hned.
    /// S roční cache by Cloudflare vydával kopii smazaného souboru ještě
    /// rok po odvolání — příznak v databázi veřejnou adresu nezastaví
    /// (oponentura, 5. 10. 2026). Směrnice je malé PDF a stahuje si ji pár
    /// lidí před regatou, takže cache nemá co ušetřit.
    /// </para>
    /// </summary>
    public const string Cache = "no-store";

    /// <summary>
    /// Odkdy se směrnice ukládají bez cache. Nasazeno 6. 10. 2026 v 00:57
    /// (běh CI commitu <c>6e1d2d0</c>); konstanta je o hodinu později, aby
    /// hraniční soubor spadl na bezpečnou stranu.
    /// <para>
    /// <b>K čemu to je:</b> co se nahrálo dřív, nese v hlavičce roční
    /// <c>immutable</c>, takže po stažení z vývěsky může Cloudflare ještě
    /// chvíli vydávat kopii z edge cache a jistotu dá jen ruční
    /// <i>Purge by URL</i>. U novějších souborů je stažení účinné hned
    /// a připomínat purge by byl jen šum.
    /// </para>
    /// </summary>
    public static readonly DateTimeOffset CacheVypnutaOd =
        new(2026, 10, 6, 2, 0, 0, TimeSpan.Zero);

    /// <summary>
    /// Mohla tahle verze uvíznout v edge cache? Rozhoduje okamžik vyvěšení,
    /// ne stažení — hlavička se souboru dává při nahrání.
    /// </summary>
    public static bool MohlaUvaznoutVCache(PlachetniSmernice s) =>
        s.VyveseneV < CacheVypnutaOd;

    public const string Vypnuto = "Úložiště souborů zatím není nastavené.";

    public const string JeStazena = "Tahle verze je už stažená.";

    public const string DuvodChybi =
        "Napiš, proč se směrnice stahuje. U dokumentu, podle kterého se jede, "
        + "musí jít po sezóně dohledat, co se odvolalo a proč.";

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

    /// <summary>
    /// Proč stáhnout nejde — nebo <c>null</c>. Důvod se ořezává, prázdný
    /// neprojde.
    /// </summary>
    public static string? ProcNejdeStahnout(bool uzStazena, string? duvod)
    {
        if (uzStazena) return JeStazena;
        var oriznuty = duvod?.Trim();
        if (string.IsNullOrEmpty(oriznuty)) return DuvodChybi;
        return oriznuty.Length > DuvodNejvic
            ? $"Důvod stažení má nejvýš {DuvodNejvic} znaků."
            : null;
    }

    /// <summary>Visí tahle směrnice na vývěsce?</summary>
    public static bool Visi(PlachetniSmernice s) => s.StazenoV is null;

    /// <summary>Směrnice pro klienta, nebo <c>null</c>, když neznáme veřejnou adresu.</summary>
    public static SmerniceDto? Dto(PlachetniSmernice s, string? verejnaAdresa) =>
        string.IsNullOrWhiteSpace(verejnaAdresa)
            ? null
            : new SmerniceDto(
                s.Verze, s.Nazev, Nahravani.Adresa(verejnaAdresa, Klic(s.Id)),
                s.VyveseneV, s.Poznamka, s.Vyvesil?.Zobrazovane,
                s.StazenoV, s.Stahl?.Zobrazovane, s.DuvodStazeni,
                MohlaUvaznoutVCache(s));
}
