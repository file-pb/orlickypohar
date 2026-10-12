using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Smernice;

/// <summary>
/// Vyvěšování plachetní směrnice u zastávky.
/// <para>
/// <b>Vyvěšuje pořadatel zastávky nebo rozhodčí ročníku.</b> Rozhodčí
/// schválně taky: směrnici vydává pořadatel, ale rozhodčí za ni odpovídá
/// a musí ji umět vyvěsit i za něj.
/// </para>
/// <para>
/// <b>Mazání záznamu tu není a nebude.</b> Appka je oficiální vývěska,
/// takže co bylo vyvěšené, zůstává v historii — jinak by nešlo doložit,
/// podle čeho se jelo. Co jde, je <b>stáhnout verzi z vývěsky</b>: záznam
/// zůstane, soubor zmizí z úložiště a veřejné čtení ho nevydá. Bez toho se
/// omylem nahrané PDF s neveřejnými údaji nedalo odvolat ničím
/// (oponentura, 5. 10. 2026).
/// </para>
/// </summary>
public static class SmerniceEndpoints
{
    public static void MapSmernice(this IEndpointRouteBuilder app)
    {
        var g = app.MapSpravu("/sprava/serie/{serie}/zastavky/{zavod}/smernice");

        g.MapGet("/", SeznamAsync)
            .Produces<List<SmerniceDto>>()
            .WithSummary("Vypíše vyvěšené směrnice zastávky, od nejnovější")
            .WithDescription("Pořadatel regaty, nebo rozhodčí ročníku.");

        g.MapPost("/", VyvesAsync)
            .Produces<SmerniceDto>(StatusCodes.Status201Created)
            .DisableAntiforgery()
            .WithSummary("Vyvěsí novou verzi plachetní směrnice")
            .WithDescription(
                "Pořadatel regaty, nebo rozhodčí ročníku. Jen PDF do 20 MB. " +
                "Vyvěšené verze zůstávají — oprava je nová verze, ne přepis.");

        g.MapPost("/{verze:int}/stazeni", StahniAsync)
            .WithSummary("Stáhne verzi směrnice z vývěsky")
            .WithDescription(
                "Pořadatel regaty, nebo rozhodčí ročníku. Záznam o vyvěšení zůstává, " +
                "ale soubor se smaže z úložiště a veřejné čtení verzi nevydá. " +
                "Důvod je povinný. Kopie, které si už někdo stáhl, vzít zpět nejde.");
    }

    private static async Task<IResult> SeznamAsync(
        string serie, string zavod, ClaimsPrincipal kdo,
        Rozsahy rozsahy, SmerniceSprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await SmiAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        return Results.Ok(await sprava.SeznamAsync(rozsah.ZavodId.Value, ct));
    }

    private static async Task<IResult> VyvesAsync(
        string serie, string zavod, IFormFile? soubor, [FromForm] string? poznamka,
        ClaimsPrincipal kdo, Rozsahy rozsahy, SmerniceSprava sprava, CancellationToken ct)
    {
        var formular = new SmerniceFormular(soubor, poznamka);
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await SmiAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Forbid();

        if (!sprava.Pripraveno)
            return Results.Json(new { error = Vyveseni.Vypnuto },
                statusCode: StatusCodes.Status503ServiceUnavailable);

        var (smernice, chyba) = await sprava.VyvesAsync(rozsah.ZavodId.Value, formular, uzivatel, ct);
        if (chyba is not null) return Results.BadRequest(new { error = chyba });

        return Results.Created((string?)null, smernice);
    }

    private static async Task<IResult> StahniAsync(
        string serie, string zavod, int verze, StazeniVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, SmerniceSprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await SmiAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Forbid();

        var chyba = await sprava.StahniAsync(rozsah.ZavodId.Value, verze, vstup.Duvod, uzivatel, ct);
        return chyba is null ? Results.NoContent() : Results.BadRequest(new { error = chyba });
    }

    private static async Task<bool> SmiAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, Rozsahy.Rozsah rozsah, CancellationToken ct) =>
        await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Organizator, rozsah.SerieId, rozsah.ZavodId), ct)
        || await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, rozsah.SerieId), ct);
}
