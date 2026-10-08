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
        var g = app.MapSpravu("/sprava/serie/{serie}/zastavky/{zavod}/lode");

        g.MapGet("/", PrehledAsync)
            .Produces<PrihlaskyZastavkyDto>()
            .WithSummary("Vypíše lodě ročníku i s tím, jak jsou přihlášené na regatu")
            .WithDescription("Pořadatel regaty, nebo rozhodčí ročníku. Měnit smí jen pořadatel.");

        g.MapPost("/", PrihlasAsync)
            .Produces<LodNaZastavceDto>(StatusCodes.Status201Created)
            .Produces<LodNaZastavceDto>()
            .WithSummary("Přihlásí loď na regatu — z ročníku, nebo novou")
            .WithDescription(
                "Pořadatel regaty, od vypsání závodu. Nová loď se stává účastníkem " +
                "ročníku v zadané kategorii. Druhé přihlášení téže lodi vrací 200.");

        g.MapPost("/{prihlaska:int}/startovne", StartovneAsync)
            .Produces<LodNaZastavceDto>()
            .WithSummary("Zapíše startovné lodi na zastávce")
            .WithDescription("Pořadatel regaty. Nic neblokuje — kdo přijede pozdě, zaplatí později.");

        g.MapDelete("/{prihlaska:int}", SmazAsync)
            .WithSummary("Smaže nesmyslnou přihlášku z webu")
            .WithDescription(
                "Jen požadavek, vrácenou nebo odmítnutou přihlášku bez výsledků. Uklidí i loď a osoby, " +
                "které vznikly jen kvůli ní.");

        g.MapPost("/{prihlaska:int}/stav", StavAsync)
            .Produces<LodNaZastavceDto>()
            .WithSummary("Přepne stav přihlášky lodi")
            .WithDescription(
                "Pořadatel zapisuje, potvrzuje, vrací k doplnění, odmítá, odhlašuje a značí nedostavení; " +
                "rozhodčí vylučuje. Vrácení, odmítnutí a vyloučení chtějí důvod. " +
                "Loď s výsledky odhlásit ani odmítnout nejde.");
    }

    private static async Task<IResult> StartovneAsync(
        string serie, string zavod, int prihlaska, StartovneVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, PrihlaskySprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await PoradatelAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        var (lod, chyba) = await sprava.StartovneAsync(rozsah.ZavodId.Value, prihlaska, vstup, ct);
        if (chyba is not null) return Results.BadRequest(new { error = chyba });
        return lod is null ? Results.NotFound() : Results.Ok(lod);
    }

    private static async Task<IResult> SmazAsync(
        string serie, string zavod, int prihlaska, ClaimsPrincipal kdo,
        Rozsahy rozsahy, PrihlaskySprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await PoradatelAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        var (nenalezeno, chyba) = await sprava.SmazAsync(rozsah.ZavodId.Value, prihlaska, ct);
        if (nenalezeno) return Results.NotFound();
        return chyba is null ? Results.NoContent() : Results.BadRequest(new { error = chyba });
    }

    private static async Task<IResult> PrehledAsync(
        string serie, string zavod, ClaimsPrincipal kdo,
        Rozsahy rozsahy, PrihlaskySprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();

        var poradatel = await PoradatelAsync(kdo, rozsahy, rozsah, ct);
        var rozhodci = await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, rozsah.SerieId), ct);

        if (!poradatel && !rozhodci) return Results.Forbid();

        return Results.Ok(await sprava.PrehledAsync(rozsah.ZavodId.Value, poradatel, ct, rozhodci));
    }

    private static async Task<IResult> PrihlasAsync(
        string serie, string zavod, PrihlaseniVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, PrihlaskySprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();

        if (!await PoradatelAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        var (lod, nova, chyba) = await sprava.PrihlasAsync(
            rozsah.ZavodId.Value, vstup, ct, await rozsahy.UzivatelIdAsync(kdo, ct));
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

        // Pořadatel vede přihlášky, rozhodčí vylučuje. Kdo je obojí (správce),
        // přepíná jako pořadatel — a vyloučení jako rozhodčí.
        var poradatel = await PoradatelAsync(kdo, rozsahy, rozsah, ct);
        var rozhodci = await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, rozsah.SerieId), ct);
        if (!poradatel && !rozhodci) return Results.Forbid();

        var role = rozhodci && (!poradatel || vstup.Stav == StavUcasti.Vyloucena || await sprava.JeVyloucenaAsync(
                       rozsah.ZavodId.Value, prihlaska, ct))
            ? Prihlasky.Kdo.Rozhodci
            : Prihlasky.Kdo.Poradatel;

        var (lod, chyba) = await sprava.PrepniAsync(
            rozsah.ZavodId.Value, prihlaska, vstup.Stav, ct, vstup.Duvod, role, await rozsahy.UzivatelIdAsync(kdo, ct));
        if (chyba is not null) return Results.BadRequest(new { error = chyba });

        return lod is null ? Results.NotFound() : Results.Ok(lod);
    }

    /// <summary>Přihlášky spravuje pořadatel zastávky; správce ho pokrývá.</summary>
    private static Task<bool> PoradatelAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, Rozsahy.Rozsah rozsah, CancellationToken ct) =>
        rozsahy.SmiAsync(kdo, new Pozadavek(Role.Organizator, rozsah.SerieId, rozsah.ZavodId), ct);
}
