using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Zpravy;

/// <summary>
/// Vývěska regaty.
/// <para>
/// <b>Vydává pořadatel nebo rozhodčí, čte každý.</b> Je to zpráva na zeď
/// — kdyby ji viděli jen přihlášení, k ničemu by nebyla: na tabuli
/// v hospodě není přihlášený nikdo.
/// </para>
/// </summary>
public static class ZpravyEndpoints
{
    public static void MapZpravy(this IEndpointRouteBuilder app)
    {
        var g = app.MapSpravu("/sprava/serie/{serie}/zastavky/{zavod}/zpravy");

        g.MapGet("/", SeznamAsync)
            .Produces<List<ZpravaDto>>()
            .WithSummary("Vypíše zprávy regaty včetně stažených")
            .WithDescription("Pořadatel regaty, nebo rozhodčí ročníku.");

        g.MapPost("/", VydejAsync)
            .Produces<ZpravaDto>()
            .ProducesValidationProblem()
            .WithSummary("Vydá zprávu na vývěsku regaty")
            .WithDescription(
                "Pořadatel regaty, nebo rozhodčí. Text má nejvýš "
                + ZpravySprava.TextNejvic + " znaků — delší se na tabuli nepřečte. "
                + "`platiHodin` je lhůta, po které zpráva dohoří sama; bez ní visí, "
                + "dokud ji někdo nestáhne.");

        g.MapPost("/{id:int}/stahnout", StahniAsync)
            .Produces<ZpravaDto>()
            .WithSummary("Stáhne zprávu z vývěsky")
            .WithDescription(
                "Pořadatel regaty, nebo rozhodčí. Záznam zůstává a jde dohledat, "
                + "z tabule zpráva zmizí hned. Stáhnout staženou není chyba.");

        app.MapGet("/serie/{serie}/zavody/{zavod}/zpravy", VerejneAsync)
            .Produces<List<ZpravaDto>>()
            .WithSummary("Zprávy vydané k regatě")
            .WithDescription(
                "Bez přihlášení — tohle čte tabule. Vrací jen to, co platí: "
                + "stažené a prošlé zprávy mezi nimi nejsou.");
    }

    private static async Task<IResult> SeznamAsync(
        string serie, string zavod, ClaimsPrincipal kdo, Rozsahy rozsahy, ZpravySprava sprava,
        CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await SmiAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        return Results.Ok(await sprava.SeznamAsync(rozsah.ZavodId.Value, ct));
    }

    private static async Task<IResult> VydejAsync(
        string serie, string zavod, ZpravaVstup vstup, ClaimsPrincipal kdo, Rozsahy rozsahy,
        ZpravySprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await SmiAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Forbid();

        var (zprava, chyba) = await sprava.VydejAsync(rozsah.ZavodId.Value, vstup, uzivatel, ct);
        return chyba is null
            ? Results.Ok(zprava)
            : Results.ValidationProblem(new Dictionary<string, string[]> { [""] = [chyba] });
    }

    private static async Task<IResult> StahniAsync(
        string serie, string zavod, int id, ClaimsPrincipal kdo, Rozsahy rozsahy,
        ZpravySprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await SmiAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        return await sprava.StahniAsync(rozsah.ZavodId.Value, id, ct) is { } zprava
            ? Results.Ok(zprava)
            : Results.NotFound();
    }

    private static async Task<IResult> VerejneAsync(
        string serie, string zavod, AppDbContext db, ZpravySprava sprava, CancellationToken ct)
    {
        // Nepublikovaná regata veřejně neexistuje — tatáž podmínka jako
        // u sousedních veřejných cest.
        var zavodId = await db.Zavody
            .Where(z => z.Slug == zavod && z.Publikovano
                        && z.Serie!.Slug == serie && z.Serie.Publikovano)
            .Select(z => (int?)z.Id)
            .FirstOrDefaultAsync(ct);

        return zavodId is null
            ? Results.NotFound()
            : Results.Ok(await sprava.PlatneAsync(zavodId.Value, ct));
    }

    private static async Task<bool> SmiAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, Rozsahy.Rozsah rozsah, CancellationToken ct) =>
        await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Organizator, rozsah.SerieId, rozsah.ZavodId), ct)
        || await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, rozsah.SerieId), ct);
}
