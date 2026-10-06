using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Features.Boje;

/// <summary>
/// Bóje postavená na trati (Filip, 4. 10. 2026: *„musíme udělat verzi
/// v appce pro pořadatele, který staví bójky, aby pípnul GPS, když postaví
/// bójku, nebo přenastaví"*).
/// <para>
/// <b>Přesnější polohu než ten, kdo bóji staví, nemá nikdo.</b> Trať je
/// zároveň podmínka pro tři věci z plánu: okna pro zhuštění záznamu trasy,
/// pořadí na vodě a čitelnou mapu.
/// </para>
/// <para>
/// <b>Přenastavení je nový záznam, ne přepis</b> — stejné pravidlo jako
/// u plachetní směrnice. Trať se během dne mění a trasa musí jít porovnat
/// se stavem, který zrovna platil. Proto se poloha nikdy nepřepisuje
/// a místo mazání se bóje označí za sebranou.
/// </para>
/// </summary>
public class Boje
{
    public int Id { get; set; }

    public int ZavodId { get; set; }
    public Zavod? Zavod { get; set; }

    /// <summary>
    /// Čím bóje na trati je: „start levý", „bóje 1", „cíl". Volný text —
    /// trati se liší regatu od regaty a číselník by jen překážel.
    /// </summary>
    public required string Nazev { get; set; }

    /// <summary>Pořadí na trati. Podle něj se skládá trať a kola.</summary>
    public int Poradi { get; set; }

    public double Sirka { get; set; }
    public double Delka { get; set; }

    /// <summary>
    /// Přesnost hlášená telefonem v metrech. <b>Ukládá se schválně</b>:
    /// iPhone s vypnutou přesnou polohou hlásí klidně 65 m a bez tohohle
    /// čísla by se taková poloha tvářila stejně jako přesná.
    /// </summary>
    public double? PresnostM { get; set; }

    public DateTimeOffset PostavenaV { get; set; }

    public Guid PostavilId { get; set; }
    public Uzivatel? Postavil { get; set; }

    /// <summary>
    /// Záznam, který tenhle nahradil. Řetěz přenastavení tak jde projít
    /// zpátky — kde bóje stála, když kolem ní loď proplouvala.
    /// </summary>
    public int? NahrazujeId { get; set; }
    public Boje? Nahrazuje { get; set; }

    /// <summary>
    /// Kdy ji někdo sebral z vody. Sebraná bóje zmizí z trati, ale zůstane
    /// v historii — trasa z té doby se bez ní nedá přečíst.
    /// </summary>
    public DateTimeOffset? SebranaV { get; set; }

    /// <summary>
    /// Kdy ji nahradilo novější pípnutí. Nastavuje se na <b>starém</b>
    /// záznamu, takže platná bóje se pozná bez dotazu na ostatní.
    /// </summary>
    public DateTimeOffset? NahrazenaV { get; set; }

    /// <summary>Platná bóje: nenahrazená novějším pípnutím a nesebraná.</summary>
    public bool Platna => NahrazenaV is null && SebranaV is null;
}

/// <summary>Bóje, jak ji vidí klient.</summary>
public record BojeDto(
    int Id,
    string Nazev,
    int Poradi,
    double Sirka,
    double Delka,
    double? PresnostM,
    DateTimeOffset PostavenaV,
    string? Postavil,
    bool Sebrana);

/// <summary>Pípnutí polohy: co posílá web i appka.</summary>
/// <param name="Nazev">Čím bóje je — „bóje 1", „start levý".</param>
/// <param name="Poradi">Pořadí na trati; nula znamená „za poslední".</param>
/// <param name="Sirka">Zeměpisná šířka ve stupních.</param>
/// <param name="Delka">Zeměpisná délka ve stupních.</param>
/// <param name="PresnostM">Přesnost z telefonu v metrech, když ji hlásí.</param>
/// <param name="NahrazujeId">Při přenastavení id bóje, která tam stála dosud.</param>
public record PipnutiVstup(
    string? Nazev,
    int Poradi,
    double Sirka,
    double Delka,
    double? PresnostM,
    int? NahrazujeId);

/// <summary>Pravidla pípnutí. Čisté funkce, bez databáze.</summary>
public static class Pipnuti
{
    public const int NazevNejvic = 60;

    /// <summary>
    /// Nad tuhle přesnost se poloha nebere. Telefon u vody hlásí běžně 3 až
    /// 10 m; sto metrů znamená, že se chytá sítě, ne družic — a taková bóje
    /// by posunula celou trať.
    /// </summary>
    public const double NejhorsiPresnostM = 100;

    /// <summary>
    /// Orlík i s rezervou. Překlep v souřadnicích (prohozená šířka a délka)
    /// by jinak postavil bóji v Africe a nikdo by si toho nevšiml.
    /// </summary>
    public const double SirkaOd = 49.2;
    public const double SirkaDo = 49.8;
    public const double DelkaOd = 14.0;
    public const double DelkaDo = 14.5;

    /// <summary>Proč pípnutí nejde — nebo <c>null</c>, když jde.</summary>
    public static string? ProcNejde(PipnutiVstup vstup)
    {
        if (string.IsNullOrWhiteSpace(vstup.Nazev)) return "Napiš, čím ta bóje je — třeba „bóje 1\".";
        if (vstup.Nazev.Trim().Length > NazevNejvic)
            return $"Jméno bóje má nejvýš {NazevNejvic} znaků.";

        if (vstup.PresnostM is { } presnost && presnost > NejhorsiPresnostM)
            return $"Poloha je přesná jen na {presnost:0} m. Počkej na lepší signál a pípni znovu.";

        if (vstup.Sirka is < SirkaOd or > SirkaDo || vstup.Delka is < DelkaOd or > DelkaDo)
            return "Tahle poloha není na Orlíku. Zkontroluj, že telefon má signál z družic.";

        return null;
    }
}
