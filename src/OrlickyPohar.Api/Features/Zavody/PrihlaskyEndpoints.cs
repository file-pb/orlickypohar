using System.Security.Claims;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>
/// Přihlášky lodí na zastávku: přihlásit, potvrdit, zrušit.
/// <para>
/// <b>Přihlašuje pořadatel zastávky</b>, ne loď sama. Filip, 14. 9. 2026:
/// veřejný formulář by znamenal sbírat kontakty a řešit spam dřív, než je
/// o co stát. Rozhodčí přihlášky vidí, ale do rozpravy je nemění — vyjma
/// vyloučení, které je jeho vždycky.
/// </para>
/// <para>
/// <b>Po rozpravě se listina obrací</b> (nálezy R38 a R39, rozhodnuto
/// 7. 11. 2026): od chvíle, kdy je nastavený čas startu první rozjížďky,
/// mění seznam jen rozhodčí a pořadatel nesmí nic. Pravidlo samo žije ve
/// <see cref="Prihlasky.ProcNejdeDoListiny"/>; tady se jen zjistí, v jaké
/// roli člověk přišel.
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
                "Pořadatel regaty, od vypsání závodu; po rozpravě místo něj rozhodčí. " +
                "Nová loď se stává účastníkem ročníku v zadané kategorii. " +
                "Druhé přihlášení téže lodi vrací 200.");

        g.MapPost("/{prihlaska:int}/startovne", StartovneAsync)
            .Produces<LodNaZastavceDto>()
            .WithSummary("Zapíše startovné lodi na zastávce")
            .WithDescription("Pořadatel regaty. Nic neblokuje — kdo přijede pozdě, zaplatí později.");

        g.MapDelete("/{prihlaska:int}", SmazAsync)
            .WithSummary("Smaže nesmyslnou přihlášku z webu")
            .WithDescription(
                "Jen požadavek, vrácenou nebo odmítnutou přihlášku bez výsledků. Uklidí i loď a osoby, " +
                "které vznikly jen kvůli ní. Pořadatel, po rozpravě rozhodčí.");

        g.MapPost("/{prihlaska:int}/stav", StavAsync)
            .Produces<LodNaZastavceDto>()
            .WithSummary("Přepne stav přihlášky lodi")
            .WithDescription(
                "Pořadatel zapisuje, potvrzuje, vrací k doplnění, odmítá, odhlašuje a značí nedostavení; " +
                "rozhodčí vylučuje, a po rozpravě přebírá i všechno ostatní. " +
                "Vrácení, odmítnutí a vyloučení chtějí důvod. " +
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

        if (await RoleAsync(kdo, rozsahy, sprava, rozsah, ct) is not { } role) return Results.Forbid();

        var (nenalezeno, chyba) = await sprava.SmazAsync(rozsah.ZavodId.Value, prihlaska, ct, role);
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

        if (await RoleAsync(kdo, rozsahy, sprava, rozsah, ct) is not { } role) return Results.Forbid();

        var (lod, nova, chyba, chcePotvrdit) = await sprava.PrihlasAsync(
            rozsah.ZavodId.Value, vstup, ct, await rozsahy.UzivatelIdAsync(kdo, ct), role);

        // Potvrzení není chyba vstupu, a obrazovka to musí poznat bez
        // čtení textu: na 409 se ptá, na 400 jen hlásí.
        if (chyba is not null)
            return chcePotvrdit
                ? Results.Conflict(new { error = chyba, potvrdit = true })
                : Results.BadRequest(new { error = chyba });

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
        // přepíná jako pořadatel — a vyloučení jako rozhodčí. <b>Po rozpravě
        // vystupuje jako rozhodčí ve všem</b>, jinak by si sám sobě zamkl
        // seznam, který od té chvíle vede.
        var poradatel = await PoradatelAsync(kdo, rozsahy, rozsah, ct);
        var rozhodci = await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, rozsah.SerieId), ct);
        if (!poradatel && !rozhodci) return Results.Forbid();

        var role = rozhodci && (!poradatel
                       || await sprava.PoRozpraveAsync(rozsah.ZavodId.Value, ct)
                       || vstup.Stav == StavUcasti.Vyloucena
                       || await sprava.JeVyloucenaAsync(rozsah.ZavodId.Value, prihlaska, ct))
            ? Prihlasky.Kdo.Rozhodci
            : Prihlasky.Kdo.Poradatel;

        var (lod, chyba) = await sprava.PrepniAsync(
            rozsah.ZavodId.Value, prihlaska, vstup.Stav, ct, vstup.Duvod, role, await rozsahy.UzivatelIdAsync(kdo, ct));
        if (chyba is not null) return Results.BadRequest(new { error = chyba });

        return lod is null ? Results.NotFound() : Results.Ok(lod);
    }

    /// <summary>
    /// V jaké roli člověk do listiny sahá, nebo <c>null</c>, když nesmí
    /// vůbec. <b>Rozhoduje rozprava</b>: do ní pořadatel, po ní rozhodčí.
    /// Kdo je obojí, vystupuje jako ten, komu seznam zrovna patří — proto
    /// se to počítá tady a ne u každé trasy zvlášť.
    /// </summary>
    private static async Task<Prihlasky.Kdo?> RoleAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, PrihlaskySprava sprava, Rozsahy.Rozsah rozsah,
        CancellationToken ct)
    {
        var poradatel = await PoradatelAsync(kdo, rozsahy, rozsah, ct);
        var rozhodci = await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, rozsah.SerieId), ct);
        if (!poradatel && !rozhodci) return null;

        return rozhodci && (!poradatel || await sprava.PoRozpraveAsync(rozsah.ZavodId!.Value, ct))
            ? Prihlasky.Kdo.Rozhodci
            : Prihlasky.Kdo.Poradatel;
    }

    /// <summary>Přihlášky spravuje pořadatel zastávky; správce ho pokrývá.</summary>
    private static Task<bool> PoradatelAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, Rozsahy.Rozsah rozsah, CancellationToken ct) =>
        rozsahy.SmiAsync(kdo, new Pozadavek(Role.Organizator, rozsah.SerieId, rozsah.ZavodId), ct);
}
