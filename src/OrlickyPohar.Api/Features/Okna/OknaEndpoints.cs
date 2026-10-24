using System.Security.Claims;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Klice;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Okna;

/// <summary>
/// Okna závodních dnů.
/// <para>
/// <b>Pořadatel je otevírá rozpravou a zavírá koncem dne</b>; telefon si je
/// čte klíčem k lodi a dál se jimi řídí sám, i bez signálu. Jsou to dvě
/// různé cesty k témuž údaji, protože každá má jiného držitele — správa
/// přihlášení, telefon klíč.
/// </para>
/// </summary>
public static class OknaEndpoints
{
    public static void MapOkna(this IEndpointRouteBuilder app)
    {
        var g = app.MapSpravu("/sprava/serie/{serie}/zastavky/{zavod}/okna");

        g.MapGet("/", SeznamAsync)
            .Produces<List<OknoDto>>()
            .WithSummary("Vypíše okna závodních dnů")
            .WithDescription("Pořadatel regaty, nebo rozhodčí ročníku.");

        g.MapPost("/rozprava", RozpravaAsync)
            .Produces<OknoDto>()
            .WithSummary("Rozpravou otevře okno závodního dne")
            .WithDescription(
                "Pořadatel regaty, nebo rozhodčí. Od téhle chvíle smí trackery "
                + "zaznamenávat. Opakované odkliknutí druhé okno nezaloží — vrátí to "
                + "běžící. `trvaniHodin` je tvrdý konec, který platí, i když den nikdo "
                + "neuzavře; bez něj je to " + OknoRegaty.VychoziHodin + " hodin, nejvíc "
                + OknoRegaty.NejvicHodin + ".");

        g.MapPost("/uzavrit", UzavriAsync)
            .Produces<OknoDto>()
            .WithSummary("Uzavře závodní den")
            .WithDescription(
                "Pořadatel regaty, nebo rozhodčí. Tím se přestává zaznamenávat — mezi "
                + "dny se nesleduje. Uzavřít zavřené není chyba.\n\n"
                + "V odpovědi je `zbylo`: **co po dni zůstalo otevřené** — rozjížďky, "
                + "které pořád „běží\", a trasy, které telefon nedokončil. Nic se tím "
                + "nezavírá; konec rozjížďky je rozhodnutí rozhodčího, ne dopočet.");

        // Telefon se prokazuje klíčem k lodi, ne přihlášením: trasa patří
        // lodi a okno je údaj, kterým se řídí záznam.
        app.MapGet("/okna", ProTelefonAsync)
            .WithTags("Trasy")
            .Produces<List<OknoRegatyDto>>()
            .WithSummary("Vypíše okna regat, ve kterých tahle loď závodí")
            .WithDescription(
                "Prokazuje se klíčem k lodi. Telefon si je stáhne dopředu a řídí se jimi "
                + "i bez signálu; změna od pořadatele se projeví, až signál chytí.");
    }

    private static async Task<IResult> SeznamAsync(
        string serie, string zavod, ClaimsPrincipal kdo, Rozsahy rozsahy, OknaSprava sprava,
        CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await SmiAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        return Results.Ok(await sprava.SeznamAsync(rozsah.ZavodId.Value, ct));
    }

    private static async Task<IResult> RozpravaAsync(
        string serie, string zavod, RozpravaVstup? vstup, ClaimsPrincipal kdo, Rozsahy rozsahy,
        OknaSprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await SmiAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Forbid();

        var (okno, _) = await sprava.OtevriAsync(
            rozsah.ZavodId.Value, uzivatel, vstup?.TrvaniHodin, ct);
        return Results.Ok(okno);
    }

    private static async Task<IResult> UzavriAsync(
        string serie, string zavod, ClaimsPrincipal kdo, Rozsahy rozsahy, OknaSprava sprava,
        CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await SmiAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Forbid();

        return await sprava.UzavriAsync(rozsah.ZavodId.Value, uzivatel, ct) is { } okno
            ? Results.Ok(okno)
            : Results.NotFound();
    }

    private static async Task<IResult> ProTelefonAsync(
        HttpContext ctx, KliceSprava klice, OknaSprava sprava, CancellationToken ct)
    {
        if (await klice.ZHlavickyAsync(ctx, ct) is not { } klic) return Results.Unauthorized();
        return Results.Ok(await sprava.ProTelefonAsync(klic.LodId, ct));
    }

    private static async Task<bool> SmiAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, Rozsahy.Rozsah rozsah, CancellationToken ct) =>
        await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Organizator, rozsah.SerieId, rozsah.ZavodId), ct)
        || await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, rozsah.SerieId), ct);
}
