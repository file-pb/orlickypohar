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

    /// <summary>Číslo člena Českého svazu jachtingu. Nepovinné, pro Orlický pohár se nevyžaduje.</summary>
    public string? CisloCsj { get; set; }

    public List<KontaktOsoby> Kontakty { get; set; } = [];
}

/// <summary>
/// E-mail a telefon osoby <b>s historií</b>. Kapitáni mění kontakty a nový
/// údaj z přihlášky starý nepřepíše — přibude nový záznam s datem a platí
/// ten nejnovější. Starý tak zůstává u přihlášek, které na něj vznikly.
/// <para>
/// <b>Veřejně se nevydává nikdy.</b> Vidí ho pořadatel zastávky, rozhodčí
/// a správce ročníku. Drží se do konce následující sezóny (Filip,
/// 17. 9. 2026), pak se maže.
/// </para>
/// </summary>
public class KontaktOsoby
{
    public int Id { get; set; }

    public int OsobaId { get; set; }
    public Osoba? Osoba { get; set; }

    public string? Email { get; set; }
    public string? Telefon { get; set; }

    public DateTimeOffset ZadanoV { get; set; }

    /// <summary>Přihláška, ze které kontakt přišel. Prázdné, když ho zapsal pořadatel.</summary>
    public int? UcastId { get; set; }
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
