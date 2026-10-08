using System.Security.Claims;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Naklady;

/// <summary>
/// Co web stojí — jen pro správce celého webu.
/// <para>
/// <b>Proč za přihlášením.</b> Nejsou to výsledky závodů: je v tom cena
/// stroje, předplatné nástrojů a kolik práce projekt spotřeboval. Patří to
/// tomu, kdo za web odpovídá, ne každému návštěvníkovi — a rozsah „celý web"
/// je přesně ta role, která tuhle otázku řeší.
/// </para>
/// </summary>
public static class NakladyEndpoints
{
    private static readonly Pozadavek SpravceWebu = new(Role.Spravce, null);

    public static void MapNaklady(this IEndpointRouteBuilder app)
    {
        app.MapGet("/sprava/naklady", NakladyAsync)
            .RequireAuthorization()
            .WithTags("Správa")
            .Produces<NakladyDto>()
            .WithSummary("Vrátí náklady na provoz a servis poháru, měsíčně i ročně")
            .WithDescription(
                "Vyžaduje roli správce celého webu. Čísla počítá přehled stavu platformy " +
                "a aplikace k nim přidává přirážku (výchozích 5 %), kterou vrací v poli " +
                "prirazkaProcent. Když zdroj chybí nebo není nastavený, vrací 503 s vysvětlením.");
    }

    private static async Task<IResult> NakladyAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, NakladyCteni cteni, CancellationToken ct)
    {
        if (!await rozsahy.SmiAsync(kdo, SpravceWebu, ct))
            return Results.Json(new { error = "Náklady vidí jen správce celého webu." },
                statusCode: StatusCodes.Status403Forbidden);

        var (stav, naklady) = await cteni.NactiAsync(ct);

        // Každý důvod „čísla tu nejsou" má vlastní větu. Jedna společná by
        // znamenala hledat příčinu v logu serveru, a to u téhle obrazovky
        // nikdo neudělá.
        return stav switch
        {
            StavNakladu.Ok => Results.Ok(naklady),
            StavNakladu.Vypnuto => Nedostupne(
                "Náklady nejsou nastavené — chybí proměnná Naklady__Soubor."),
            StavNakladu.Chybi => Nedostupne(
                "Soubor s náklady se nepodařilo přečíst. Zapisuje ho přehled stavu platformy."),
            _ => Nedostupne(
                "Přehled platformy tenhle projekt nezná. Zkontroluj Naklady__Projekt."),
        };
    }

    private static IResult Nedostupne(string duvod) =>
        Results.Json(new { error = duvod }, statusCode: StatusCodes.Status503ServiceUnavailable);
}
