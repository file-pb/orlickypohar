namespace OrlickyPohar.Api.Features.Prevzate;

/// <summary>
/// Článek přejatý z cizího kanálu — dnes „Novinky ze svazu" z RSS Českého
/// svazu jachtingu. Držíme <b>titulek, perex, datum a odkaz na originál</b>,
/// nic víc: kanál sám plný text nevydává a přebírat ho by bylo něco jiného
/// než odkázat. Čtenář se dočte u zdroje.
/// <para>
/// <b>Proč vlastní tabulka a ne druh <c>Clanek</c>:</b> má jiný životní
/// cyklus. Naše články zůstávají všechny a nikdy se nemažou, přejaté se
/// rotují — novější vytlačí starší a na serveru jich leží nejvýš
/// <see cref="SberPrevzatych.Kolik"/> (Filip, 23. 9. 2026). Přejatý článek
/// navíc nemá koncept, sérii, zastávku, tělo ani fotku v našem úložišti,
/// takže by ve sdílené tabulce zbyla řada sloupců, které u něj nic neznamenají.
/// </para>
/// <para>
/// Oddělení má ještě jeden důsledek, a ten je záměr: <b>náš RSS kanál se
/// skládá jen z našich článků</b>. Přeposílat cizí obsah dál nám nikdo
/// nedovolil a s oddělenou tabulkou to není otázka filtru, na který se dá
/// zapomenout.
/// </para>
/// </summary>
public class PrevzatyClanek
{
    public int Id { get; set; }

    /// <summary>Jméno zdroje do štítku, například „Český svaz jachtingu".</summary>
    public required string Zdroj { get; set; }

    /// <summary>Rozcestník zdroje. Vede na jeho výpis článků, ne na tenhle.</summary>
    public required string ZdrojOdkaz { get; set; }

    /// <summary>
    /// Adresa původního článku. <b>Přirozený klíč</b> — kanál ji vydává jako
    /// <c>guid</c> i <c>link</c> a mezi běhy se nemění, takže druhé stažení
    /// téhož článku nic nezduplikuje.
    /// </summary>
    public required string Odkaz { get; set; }

    public required string Titulek { get; set; }

    /// <summary>Krátký úryvek z kanálu, bez HTML. Může chybět.</summary>
    public string? Perex { get; set; }

    /// <summary>
    /// Adresa fotky, kterou k článku dal zdroj (<c>og:image</c> na jeho
    /// stránce). <b>Ukládá se odkaz, ne kopie</b> — obrázek zůstává jejich
    /// a načítá se z jejich serveru. Jsou to náhledy kolem 500 px a 20 kB,
    /// takže na kartu ve výpisu stačí, a kopírovat cizí fotografie je něco
    /// jiného než je ukázat s odkazem na článek.
    /// <para>
    /// Když ji zdroj nemá, zůstane prázdná a web sáhne po náhradní fotce
    /// jako u vlastního článku bez obrázku — karta bez fotky být nemá
    /// (Filip, 23. 9. 2026).
    /// </para>
    /// </summary>
    public string? Obrazek { get; set; }

    /// <summary>Kdy vyšel u zdroje. Podle toho se řadí a podle toho se rotuje.</summary>
    public DateTimeOffset PublikovanoV { get; set; }

    /// <summary>Kdy jsme ho stáhli. Jen pro ladění, na zobrazení se nepoužívá.</summary>
    public DateTimeOffset StazenoV { get; set; }
}
