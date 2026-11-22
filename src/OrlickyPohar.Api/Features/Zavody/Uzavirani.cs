namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>
/// <b>Kdy regatu zavře server sám.</b>
///
/// <para>
/// <b>Zadání</b> (Filip, 21. 11. 2026, odpověď na otázku „kde a jak se má
/// regata uzavřít"): *„úkon, který na konci dne uděláme; pokud na to
/// zapomeneme, tak ho udělej za dva dny sám."* Úkon sám existuje — je to
/// posun zastávky z <c>Vypsany</c> na <c>Odjety</c> (<see cref="Kalendar"/>).
/// Nová je jen ta druhá půlka: co se nestalo rukou, stane se po dvou dnech.
/// </para>
///
/// <para>
/// <b>Automat zavírá, nepodepisuje.</b> Podmínka, kterou si rozhodčí klade
/// před uznáním výsledků — *„protesty a tresty jsou vyřešené a nikdo nic
/// nepodal"* —, je přesně to, co aplikace ověřit neumí (nález K2). Zavřením
/// regaty se tedy jen přestane čekat na další rozjížďky; zápisy zůstanou
/// tak podepsané nebo nepodepsané, jak jsou.
/// </para>
///
/// <para>
/// <b>Co se samo nezavře: regata, ve které se nic nejelo.</b>
/// <c>Odjety</c> znamená „jelo se", takže by robot tvrdil něco, co se
/// nestalo — a u regaty, která se nekonala a nikdo ji nezrušil, je to
/// tvrzení obzvlášť drahé: dostala by se do poháru jako odjetá bez
/// výsledků. Takovou nechá stát a rozhodne o ní člověk.
/// </para>
/// </summary>
public static class Uzavirani
{
    /// <summary>Jak dlouho se čeká na ruku, než to udělá server.</summary>
    public static readonly TimeSpan Lhuta = TimeSpan.FromDays(2);

    /// <summary>
    /// Od kdy se lhůta měří: od konce posledního závodního dne, a když
    /// žádný neběžel, od konce dne, na který byla regata vypsaná.
    ///
    /// <para>
    /// <b>Datum samo nestačí</b> (a proto se nebere první): dvacetičtyřhodinovka
    /// začíná jeden den a končí druhý, takže by se jí lhůta rozešla o celý
    /// den. Okno závodního dne zná skutečný konec, protože ho buď někdo
    /// zavřel, nebo doběhl jeho tvrdý konec.
    /// </para>
    /// </summary>
    public static DateTimeOffset Zacatek(DateTimeOffset? konecPoslednihoDne, DateOnly datum) =>
        konecPoslednihoDne
        ?? new DateTimeOffset(datum.ToDateTime(TimeOnly.MaxValue), TimeSpan.Zero);

    /// <summary>
    /// Má se tahle regata zavřít sama? <c>true</c> jen pro vypsanou regatu,
    /// ve které se aspoň jedna rozjížďka dojela a od konce uplynula
    /// <see cref="Lhuta"/>.
    /// </summary>
    public static bool MaSeUzavrit(
        StavZavodu stav,
        bool maOdjetouRozjizdku,
        DateTimeOffset? konecPoslednihoDne,
        DateOnly datum,
        DateTimeOffset ted) =>
        stav == StavZavodu.Vypsany
        && maOdjetouRozjizdku
        && ted >= Zacatek(konecPoslednihoDne, datum) + Lhuta;
}
