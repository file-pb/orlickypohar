using System.Security.Claims;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Boje;

/// <summary>
/// Stavění bójí pořadatelem — z webu i z appky, přes stejné endpointy.
/// <para>
/// <b>Pípá ten, kdo bóji staví</b>, a nikdo jiný nemá přesnější polohu.
/// Smí to organizátor té regaty nebo rozhodčí ročníku, stejně jako
/// u plachetní směrnice.
/// </para>
/// <para>
/// <b>Veřejné čtení zatím není.</b> Trať je informace do závodu a kdy se
/// smí ukázat divákům, patří rozhodčímu — stejně jako u živých poloh
/// (plán, *Kdo trasy vidí*).
/// </para>
/// </summary>
public static class BojeEndpoints
{
    public static void MapBoje(this IEndpointRouteBuilder app)
    {
        var g = app.MapSpravu("/sprava/serie/{serie}/zastavky/{zavod}/boje");

        g.MapGet("/", SeznamAsync)
            .Produces<List<BojeDto>>()
            .WithSummary("Vypíše bóje regaty")
            .WithDescription(
                "Pořadatel regaty, nebo rozhodčí ročníku. S `historie=true` i přenastavené " +
                "a sebrané — trasa se k trati vztahuje tak, jak stála tehdy.");

        g.MapPost("/", PipniAsync)
            .Produces<BojeDto>(StatusCodes.Status201Created)
            .WithSummary("Zapíše polohu postavené nebo přenastavené bóje")
            .WithDescription(
                "Pořadatel regaty, nebo rozhodčí. Přenastavení je nový záznam — starý " +
                "zůstává. Poloha mimo Orlík nebo přesnost horší než 100 m se odmítne.");

        g.MapPost("/{boje:int}/sebrana", SeberAsync)
            .WithSummary("Označí bóji za sebranou z vody")
            .WithDescription("Pořadatel regaty, nebo rozhodčí. Ze zápisu bóje nemizí.");
    }

    private static async Task<IResult> SeznamAsync(
        string serie, string zavod, ClaimsPrincipal kdo, Rozsahy rozsahy, BojeSprava sprava,
        CancellationToken ct, bool historie = false)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await SmiAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        return Results.Ok(await sprava.SeznamAsync(rozsah.ZavodId.Value, historie, ct));
    }

    private static async Task<IResult> PipniAsync(
        string serie, string zavod, PipnutiVstup vstup, ClaimsPrincipal kdo, Rozsahy rozsahy,
        BojeSprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await SmiAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Forbid();

        var (boje, chyba) = await sprava.PipniAsync(rozsah.ZavodId.Value, vstup, uzivatel, ct);
        if (chyba is not null) return Results.BadRequest(new { error = chyba });

        return Results.Created((string?)null, boje);
    }

    private static async Task<IResult> SeberAsync(
        string serie, string zavod, int boje, ClaimsPrincipal kdo, Rozsahy rozsahy,
        BojeSprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await SmiAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        var chyba = await sprava.SeberAsync(rozsah.ZavodId.Value, boje, ct);
        return chyba is null ? Results.NoContent() : Results.BadRequest(new { error = chyba });
    }

    private static async Task<bool> SmiAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, Rozsahy.Rozsah rozsah, CancellationToken ct) =>
        await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Organizator, rozsah.SerieId, rozsah.ZavodId), ct)
        || await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, rozsah.SerieId), ct);
}
