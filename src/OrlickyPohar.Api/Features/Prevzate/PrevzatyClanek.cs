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

    /// <summary>
    /// Co zdroj ke článku dal, <b>syrově a nenávratně</b> — <c>og:image</c>
    /// z jeho stránky, jak stálo tam. Na rozdíl od <see cref="Obrazek"/> se
    /// nikdy nemaže (Filip, 26. 10. 2026).
    /// <para>
    /// <b>Proč dva sloupce:</b> <see cref="Obrazek"/> je rozhodnutí („tohle
    /// se smí ukázat"), tohle je pozorování („tohle tam bylo"). Když se
    /// pravidlo zdroje (<see cref="ZdrojKanalu.NeniFotka"/>) upřesní — a už
    /// se to stalo dvakrát — dá se rozhodnout znovu ze záznamu, bez jediného
    /// dotazu na cizí server. Dokud se mazalo obojí, byla oprava pravidla
    /// k ničemu: článek, který fotku ztratil, zůstal prázdný, protože se
    /// fotka dohledává jen u nových článků.
    /// </para>
    /// <para>
    /// Prázdné znamená <b>neptali jsme se</b> — řádek z doby před tímhle
    /// sloupcem, nebo článek, u kterého stažení stránky nevyšlo. Takový se
    /// smí doptat; článek, u kterého zdroj obrázek opravdu nemá, má tu
    /// adresu vyplněnou a nikdo se na něj neptá znovu.
    /// </para>
    /// </summary>
    public string? OdZdroje { get; set; }

    /// <summary>
    /// Naše kopie té fotky, přepočítaná na naše velikosti (Filip, 2. 10. 2026).
    /// Soubory leží v úložišti pod <see cref="PrevzateFotky.Klic"/>, v databázi
    /// je jen tohle id a rozměry velké varianty.
    /// <para>
    /// <b>Proč kopie, když stačil odkaz:</b> jejich server nemá rozbít náš web
    /// a náhled kolem 500 px je na velkou kartu úvodní stránky málo. Přebírat
    /// smíme podle domluvy u zdroje (<see cref="ZdrojKanalu.Souhlas"/>).
    /// </para>
    /// <para>
    /// Prázdné znamená, že kopii nemáme — ukládání je vypnuté, fotka byla moc
    /// malá, nebo se nestáhla. Pak se použije <see cref="Obrazek"/> u zdroje
    /// a po něm náhradní fotka. <b>Při vytlačení článku z rotace soubory mizí</b>
    /// (fronta <see cref="Fotky.SouborKeSmazani"/>).
    /// </para>
    /// </summary>
    public Guid? FotkaId { get; set; }

    /// <summary>Rozměry velké varianty naší kopie, v pixelech.</summary>
    public int? Sirka { get; set; }
    public int? Vyska { get; set; }

    /// <summary>Kdy vyšel u zdroje. Podle toho se řadí a podle toho se rotuje.</summary>
    public DateTimeOffset PublikovanoV { get; set; }

    /// <summary>Kdy jsme ho stáhli. Jen pro ladění, na zobrazení se nepoužívá.</summary>
    public DateTimeOffset StazenoV { get; set; }
}
