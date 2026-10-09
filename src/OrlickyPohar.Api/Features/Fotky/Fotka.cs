using OrlickyPohar.Api.Features.Identita;

namespace OrlickyPohar.Api.Features.Fotky;

/// <summary>
/// Nahraný obrázek — k článku, nebo k medailonku pořadatele.
/// <para>
/// <b>Soubory leží v objektovém úložišti, v databázi jen záznam o nich.</b>
/// Pravidlo platformy: na disku kontejneru nesmí být nic autoritativního.
/// Záznam nese, co se u fotky musí vědět a ze souboru se nevyčte: kdo je
/// autor a kdo potvrdil, že smí na web.
/// </para>
/// <para>
/// <b>Autor a souhlas vznikají s prvním nahráním</b>, ne dodatečně
/// (plán, oddíl <i>Fotky</i>): doplňovat je zpětně ke dvěma stům snímků je
/// práce, kterou nikdo neudělá. Souhlas se ukládá jako to, <b>kdo</b> ho
/// potvrdil a kdy — zaškrtávátko samo nic nedokazuje.
/// </para>
/// <para>
/// <b>Id je zároveň jméno souboru.</b> Nový obrázek je vždycky nový záznam
/// s novým jménem, takže soubor pod jednou adresou se nikdy nezmění a smí
/// se cachovat napořád.
/// </para>
/// </summary>
public class Fotka
{
    public Guid Id { get; set; }

    /// <summary>Rozměry největší uložené varianty, v pixelech.</summary>
    public int Sirka { get; set; }
    public int Vyska { get; set; }

    /// <summary>Kdo fotil. Na webu stojí pod obrázkem jako kredit.</summary>
    public required string Autor { get; set; }

    /// <summary>Co je na fotce. Slouží jako popisek i jako text pro čtečku obrazovky.</summary>
    public string? Popis { get; set; }

    /// <summary>
    /// Článek, do jehož <b>těla</b> se fotka nahrála. Prázdné znamená, že je
    /// to hlavní obrázek článku nebo medailonku — tam vazba vede opačně,
    /// z vlastníka na fotku.
    /// <para>
    /// Vazba je tu kvůli dvěma věcem: aby šel autorovi ukázat seznam obrázků,
    /// které do článku nahrál, a aby se daly uklidit, až článek zmizí.
    /// </para>
    /// </summary>
    public int? VTeleClankuId { get; set; }

    /// <summary>
    /// Bóje, ke které fotka patří. Prázdné znamená, že fotka visí jinde —
    /// u článku, medailonku nebo papírového zápisu.
    /// <para>
    /// <b>Vazba vede od fotky k bóji</b>, ne opačně jako u článku: u bóje
    /// jich je víc než jedna. Jedna fotka zblízka neřekne, co je za bójí
    /// na břehu, a právě to z ní dělá doklad k poloze (Filip, 9. 10. 2026).
    /// </para>
    /// </summary>
    public int? UBojeId { get; set; }
    public Boje.Boje? UBoje { get; set; }

    /// <summary>Kdo fotku nahrál a tím potvrdil souhlas autora se zveřejněním.</summary>
    public Guid NahralId { get; set; }
    public Uzivatel? Nahral { get; set; }

    public DateTimeOffset NahranoV { get; set; }
}

/// <summary>
/// Obrázek, jak ho vidí klient: dvě varianty a kredit.
/// <para>
/// <b>Adresy jsou úplné</b>, ne klíče v úložišti. Web ani appka nemají vědět,
/// kde soubory leží — výměna úložiště pak znamená změnit jednu proměnnou.
/// </para>
/// </summary>
/// <param name="Id">
/// Id fotky. Klient ho potřebuje, aby šlo odebrat <b>jednu konkrétní</b>
/// z několika u bóje; u vlastníků s jediným obrázkem k ničemu není.
/// <para>
/// <b>Bez výchozí hodnoty, a je to podmínka, ne styl.</b> `Guid Id = default`
/// shodí generování OpenAPI dokumentu pětistovkou: exportér schématu zapisuje
/// výchozí hodnoty do dokumentu a `default(Guid)` na tom padá
/// (`JsonException: The JSON value could not be converted to System.Guid`,
/// produkce 9. 10. 2026). Klient se generuje právě z toho dokumentu, takže
/// by se tím rozbilo i generování typů pro web a appku.
/// </para>
/// </param>
public record ObrazekDto(
    string Nahled,
    string Velky,
    int Sirka,
    int Vyska,
    string Autor,
    string? Popis,
    Guid Id);

/// <summary>
/// Pravidla nahrávání. Čisté funkce, bez databáze a bez úložiště.
/// </summary>
public static class Nahravani
{
    /// <summary>
    /// Fotka z telefonu mívá 3 až 8 MB. Strop je nad tím s rezervou, ale
    /// nepustí dovnitř nic, co by se nevešlo do paměti kontejneru.
    /// </summary>
    public const long NejvicBajtu = 15 * 1024 * 1024;

    /// <summary>
    /// Strop na rozměr. Soubor může být malý a rozbalit se do obrovské
    /// bitmapy — 60 Mpx je 240 MB v paměti, víc kontejner s 512 MB neunese.
    /// </summary>
    public const long NejvicPixelu = 60_000_000;

    /// <summary>
    /// Šířky variant. Náhled do karty a velká fotka nad článkem — ta má
    /// na obrazovce nejvýš 46 rem, tedy 736 px, na hustém displeji dvakrát.
    /// </summary>
    public const int SirkaNahledu = 480;
    public const int SirkaVelke = 1600;

    public const int AutorNejvic = 120;
    public const int PopisNejvic = 300;

    /// <summary>
    /// Klíč souboru v úložišti. <b>Předpona <c>fotky/</c></b> nechává místo
    /// pro jiné druhy souborů (trasy, vypsání závodu) ve stejném bucketu.
    /// </summary>
    public static string Klic(Guid id, int sirka) => $"fotky/{id:N}-{sirka}.webp";

    public static IEnumerable<string> Klice(Guid id) =>
        [Klic(id, SirkaNahledu), Klic(id, SirkaVelke)];

    /// <summary>
    /// Proč fotku nahrát nejde — nebo <c>null</c>, když jde. Obsah souboru
    /// se kontroluje až při zpracování; tady jen to, co se ví předem.
    /// </summary>
    public static string? ProcNejde(long delka, string? autor, string? popis, bool souhlas)
    {
        if (delka <= 0) return "Vyber soubor s fotkou.";
        if (delka > NejvicBajtu) return $"Fotka může mít nejvýš {NejvicBajtu / 1024 / 1024} MB.";

        if (string.IsNullOrWhiteSpace(autor))
            return "Napiš, kdo fotku fotil. Na webu se pod ní ukáže.";
        if (autor.Trim().Length > AutorNejvic) return $"Autor může mít nejvýš {AutorNejvic} znaků.";
        if (popis?.Trim().Length > PopisNejvic) return $"Popis může mít nejvýš {PopisNejvic} znaků.";

        // Bez souhlasu se nic nenahrává, ani „zatím". Nahraná fotka je na
        // veřejné adrese, i když ji stránka ještě neukazuje.
        if (!souhlas) return "Potvrď, že autor souhlasí se zveřejněním fotky na webu.";

        return null;
    }

    /// <summary>Úplná adresa souboru. Předpona se bere, jak je, jen bez koncového lomítka.</summary>
    public static string Adresa(string verejnaAdresa, string klic) =>
        $"{verejnaAdresa.TrimEnd('/')}/{klic}";

    /// <summary>Obrázek pro klienta, nebo <c>null</c>, když žádný není nebo nejsou známé adresy.</summary>
    public static ObrazekDto? Dto(Fotka? f, string? verejnaAdresa) =>
        f is null || string.IsNullOrWhiteSpace(verejnaAdresa)
            ? null
            : new ObrazekDto(
                Adresa(verejnaAdresa, Klic(f.Id, SirkaNahledu)),
                Adresa(verejnaAdresa, Klic(f.Id, SirkaVelke)),
                f.Sirka, f.Vyska, f.Autor, f.Popis, f.Id);
}
