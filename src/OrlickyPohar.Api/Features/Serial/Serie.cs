namespace OrlickyPohar.Api.Features.Serial;

/// <summary>
/// Jeden ročník poháru. Nese kategorie a přihlášky — tedy to, co platí celý rok
/// bez ohledu na jednotlivá zastavení.
/// </summary>
public class Serie
{
    public int Id { get; set; }

    /// <summary>Orlický pohár 2026.</summary>
    public required string Nazev { get; set; }

    public int Rok { get; set; }

    /// <summary>Část veřejné adresy. Veřejné stránky se indexují, takže URL nesmí být číslo.</summary>
    public required string Slug { get; set; }

    /// <summary>Publikované ročníky vidí čtenář, nepublikované jen správce.</summary>
    public bool Publikovano { get; set; }

    /// <summary>
    /// Smí čtenář vidět výsledky jednotlivých regat tohohle ročníku?
    /// <para>
    /// Publikace je o celém ročníku, tohle o jeho vnitřku: kalendář i pořadí
    /// seriálu zůstávají veřejné, ale stránka regaty nevydá rozjížďky ani
    /// výsledky. Správce je vidí dál — ročník slouží ke kontrole a tréninku.
    /// </para>
    /// <para>
    /// <b>Není to obecný koncept, ale vlastnost jednoho ročníku.</b> Ročník
    /// 2026 vznikal z ručního sešitu a jsou v něm doložené nesrovnalosti
    /// (Filip, 23. 9. 2026); zveřejnit je po zásluze by otevřelo zpětné spory
    /// o odjeté regaty. Ročníky vedené od začátku v aplikaci tenhle problém
    /// nemají, a proto je výchozí hodnota <c>true</c>: mlčení se zapíná
    /// vědomě, ne omylem.
    /// </para>
    /// </summary>
    public bool VysledkyZavoduVerejne { get; set; } = true;

    /// <summary>
    /// Kolik nejhorších zastávek se v průběžném pořadí škrtá.
    /// <para>
    /// Je to číslo na ročníku, ne pravidlo v kódu. Rozhodčí 22. 9. 2026:
    /// od devíti zastávek dva škrty; co bylo dřív, neřešit.
    /// </para>
    /// </summary>
    public int PocetSkrtu { get; set; } = 1;

    public List<Kategorie> Kategorie { get; set; } = [];
}

/// <summary>
/// Race / Nad7m / Pod7m. Patří sérii, ne závodu — loď jede celý rok v jedné
/// kategorii, takže kategorii nese celoroční přihláška.
/// Dá se přidat i přejmenovat; do seriálu se boduje vždy uvnitř kategorie.
/// </summary>
public class Kategorie
{
    public int Id { get; set; }

    public int SerieId { get; set; }
    public Serie? Serie { get; set; }

    public required string Nazev { get; set; }

    /// <summary>Pořadí pro zobrazení. Abecedně by Nad7m předběhlo Race bez důvodu.</summary>
    public int Poradi { get; set; }
}

/// <summary>
/// Loď přihlášená do ročníku v jedné kategorii. <b>Nositel bodů v seriálu.</b>
/// Body sbírá loď, ne posádka — kormidelník se mezi závody mění, loď ne.
/// </summary>
public class Prihlaska
{
    public int Id { get; set; }

    public int SerieId { get; set; }
    public Serie? Serie { get; set; }

    public int LodId { get; set; }
    public Lode.Lod? Lod { get; set; }

    public int KategorieId { get; set; }
    public Kategorie? Kategorie { get; set; }
}
