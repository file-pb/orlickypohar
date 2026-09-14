using System.Security.Claims;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>
/// Přihlášky lodí na zastávku: přihlásit, potvrdit, zrušit.
/// <para>
/// <b>Přihlašuje pořadatel zastávky</b>, ne loď sama. Filip, 14. 9. 2026:
/// veřejný formulář by znamenal sbírat kontakty a řešit spam dřív, než je
/// o co stát. Rozhodčí přihlášky vidí, ale nemění — stejně jako zápis
/// výsledků.
/// </para>
/// </summary>
public static class PrihlaskyEndpoints
{
    public static void MapPrihlasky(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/sprava/serie/{serie}/zastavky/{zavod}/lode").WithTags("Správa");

        g.MapGet("/", PrehledAsync)
            .Produces<PrihlaskyZastavkyDto>()
            .WithSummary("Vypíše lodě ročníku i s tím, jak jsou přihlášené na zastávku")
            .WithDescription("Pořadatel zastávky, nebo rozhodčí ročníku. Měnit smí jen pořadatel.");

        g.MapPost("/", PrihlasAsync)
            .Produces<LodNaZastavceDto>(StatusCodes.Status201Created)
            .Produces<LodNaZastavceDto>()
            .WithSummary("Přihlásí loď na zastávku — z ročníku, nebo novou")
            .WithDescription(
                "Pořadatel zastávky, od vypsání závodu. Nová loď se stává účastníkem " +
                "ročníku v zadané kategorii. Druhé přihlášení téže lodi vrací 200.");

        g.MapPost("/{prihlaska:int}/stav", StavAsync)
            .Produces<LodNaZastavceDto>()
            .WithSummary("Potvrdí, zruší, nebo obnoví přihlášku lodi")
            .WithDescription("Loď, která už má na zastávce výsledky, zrušit nejde.");
    }

    private static async Task<IResult> PrehledAsync(
        string serie, string zavod, ClaimsPrincipal kdo,
        Rozsahy rozsahy, PrihlaskySprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();

        var poradatel = await PoradatelAsync(kdo, rozsahy, rozsah, ct);

        if (!poradatel && !await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, rozsah.SerieId), ct))
            return Results.Forbid();

        return Results.Ok(await sprava.PrehledAsync(rozsah.ZavodId.Value, poradatel, ct));
    }

    private static async Task<IResult> PrihlasAsync(
        string serie, string zavod, PrihlaseniVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, PrihlaskySprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();

        if (!await PoradatelAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        var (lod, nova, chyba) = await sprava.PrihlasAsync(rozsah.ZavodId.Value, vstup, ct);
        if (chyba is not null) return Results.BadRequest(new { error = chyba });

        return nova
            ? Results.Created($"/sprava/serie/{serie}/zastavky/{zavod}/lode", lod)
            : Results.Ok(lod);
    }

    private static async Task<IResult> StavAsync(
        string serie, string zavod, int prihlaska, StavUcastiVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, PrihlaskySprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();

        if (!await PoradatelAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        var (lod, chyba) = await sprava.PrepniAsync(rozsah.ZavodId.Value, prihlaska, vstup.Stav, ct);
        if (chyba is not null) return Results.BadRequest(new { error = chyba });

        return lod is null ? Results.NotFound() : Results.Ok(lod);
    }

    /// <summary>Přihlášky spravuje pořadatel zastávky; správce ho pokrývá.</summary>
    private static Task<bool> PoradatelAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, Rozsahy.Rozsah rozsah, CancellationToken ct) =>
        rozsahy.SmiAsync(kdo, new Pozadavek(Role.Organizator, rozsah.SerieId, rozsah.ZavodId), ct);
}
