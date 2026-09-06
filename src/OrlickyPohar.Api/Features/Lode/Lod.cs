namespace OrlickyPohar.Api.Features.Lode;

/// <summary>
/// Závodník, majitel lodi nebo rozhodčí. Většina osob v systému <b>nikdy nebude
/// mít účet</b> — figurují jen jako majitelé a členové posádek, takže napojení
/// na účet je volitelné a osoba existuje samostatně.
/// </summary>
public class Osoba
{
    public int Id { get; set; }

    public required string Jmeno { get; set; }
    public required string Prijmeni { get; set; }

    /// <summary>
    /// Volitelné napojení na účet. <b>Vlastní interní identifikátor</b>, nikdy
    /// <c>sub</c> z tokenu — ten se při výměně poskytovatele identity změní
    /// a z výměny by se stala datová migrace.
    /// </summary>
    public Guid? UserId { get; set; }
}

/// <summary>
/// Loď. Ve výsledcích se vedle jména lodi uvádí jméno majitele, proto je
/// majitel odkaz na osobu, ne text.
/// </summary>
public class Lod
{
    public int Id { get; set; }

    public required string Nazev { get; set; }

    /// <summary>Číslo plachty. Není povinné a není unikátní — starší lodě ho nemají.</summary>
    public string? CisloPlachty { get; set; }

    /// <summary>Typ lodi, například Fireball nebo Micro. Volný text; číselník zatím nemá co obsluhovat.</summary>
    public string? Typ { get; set; }

    public int MajitelId { get; set; }
    public Osoba? Majitel { get; set; }
}
