using OrlickyPohar.Api.Features.Serial;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Features.Identita;

/// <summary>
/// Uživatel aplikace. Jeho <c>Id</c> je <b>vlastní interní identifikátor</b>,
/// nikdy <c>sub</c> z tokenu.
/// <para>
/// Důvod je pravidlo platformy č. 5: OIDC standardizuje přihlášení, ne migraci
/// identity. Garantovaně unikátní je až dvojice <c>(iss, sub)</c> a při výměně
/// poskytovatele se mění obojí. Kdyby byl <c>sub</c> primárním klíčem, byla by
/// výměna poskytovatele datová migrace přes celou databázi místo vložení
/// řádků do jedné tabulky.
/// </para>
/// </summary>
public class Uzivatel
{
    public Guid Id { get; set; }

    /// <summary>
    /// Jméno k zobrazení, jak přišlo z tokenu. Drží se tu <b>jen pro výpis</b>
    /// — autoritativní je u poskytovatele a může se kdykoliv změnit. Nic se
    /// podle něj nepáruje.
    /// </summary>
    public required string Zobrazovane { get; set; }

    public string? Email { get; set; }

    public DateTimeOffset ZalozenV { get; set; }

    public DateTimeOffset? NaposledyPrihlasenV { get; set; }
}

/// <summary>
/// Vazba <c>(issuer, subject) → UserId</c>. Tahle jedna tabulka je rozdíl mezi
/// výměnou poskytovatele identity a datovou migrací.
/// <para>
/// Řádků může být na uživatele víc: po přechodu na jiného poskytovatele se
/// přidá nová vazba k témuž <c>UzivatelId</c> a stará se nechá být. Historie
/// oprávnění, osob i všeho ostatního tím zůstane nedotčená.
/// </para>
/// </summary>
public class UcetVazba
{
    public int Id { get; set; }

    /// <summary>Vydavatel tokenu, tedy adresa poskytovatele identity.</summary>
    public required string Issuer { get; set; }

    /// <summary><c>sub</c> z tokenu. Unikátní je až spolu s vydavatelem.</summary>
    public required string Subject { get; set; }

    public Guid UzivatelId { get; set; }
    public Uzivatel? Uzivatel { get; set; }

    public DateTimeOffset ZalozenV { get; set; }
}

/// <summary>
/// Co kdo smí. <c>Rozhodci</c> není stupeň mezi editorem a správcem, ale
/// <b>funkce v procesu</b> — proto samostatná role, ne úroveň.
/// </summary>
public enum Role
{
    /// <summary>Vidí publikované. Nemusí být přihlášený, proto se neuděluje.</summary>
    Ctenar = 0,

    /// <summary>Zadává přihlášky a výsledky, navrhuje.</summary>
    Editor = 1,

    /// <summary>Ověřuje a schvaluje výsledky.</summary>
    Rozhodci = 2,

    /// <summary>Vše ve svém rozsahu, včetně publikace.</summary>
    Spravce = 3,
}

/// <summary>
/// Role v rozsahu. Rozsah je <b>buď celá série, nebo jedna zastávka</b>:
/// pořadatel Radavské regaty spravuje svůj závod, ne cizí.
/// <para>
/// Tvar je schválně týž jako u <c>Clanek</c> — <c>SerieId</c> vždycky,
/// <c>ZavodId</c> volitelně. Právo psát na stránku zastávky se tak odvozuje
/// z téže dvojice, ze které se odvozuje sama stránka, a nemůžou se rozejít.
/// </para>
/// </summary>
public class Opravneni
{
    public int Id { get; set; }

    public Guid UzivatelId { get; set; }
    public Uzivatel? Uzivatel { get; set; }

    public Role Role { get; set; }

    public int SerieId { get; set; }
    public Serie? Serie { get; set; }

    /// <summary>Prázdné znamená celý ročník, vyplněné jednu zastávku v něm.</summary>
    public int? ZavodId { get; set; }
    public Zavod? Zavod { get; set; }

    public DateTimeOffset UdelenoV { get; set; }
}
