using System.Security.Claims;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Tracker;

/// <summary>
/// Nastavení zobrazení trackingu na regatě.
/// <para>
/// <b>Zamyká rozprava.</b> Do ní s tím hýbe pořadatel, po ní smí jen
/// rozhodčí a jen zpřísnit. Každý zásah po zámku se zapíše s důvodem,
/// jinak se po regatě nedá rozhodnout, proč se to vypnulo.
/// </para>
/// </summary>
public static class NastaveniEndpoints
{
    public static void MapNastaveniTrackeru(this IEndpointRouteBuilder app)
    {
        var g = app.MapSpravu("/sprava/serie/{serie}/zastavky/{zavod}/tracker");

        g.MapGet("/nastaveni", NactiAsync)
            .Produces<NastaveniDto>()
            .WithSummary("Nastavení zobrazení trackingu")
            .WithDescription(
                "Pořadatel regaty, nebo rozhodčí ročníku. Výchozí hodnota je bezpečná: "
                + "posádky vidí jen sebe, ven nejde nic.");

        g.MapPut("/nastaveni", UlozAsync)
            .Produces<NastaveniDto>()
            .Produces<ChybaNastaveni>(StatusCodes.Status409Conflict)
            .WithSummary("Změní nastavení zobrazení")
            .WithDescription(
                "Do rozpravy pořadatel regaty nebo rozhodčí, po rozpravě **jen "
                + "rozhodčí a jen zpřísnění** — rozšířit nesmí nikdo. Zásah do "
                + "zamčeného nastavení vyžaduje `duvod`.");

        g.MapGet("/nastaveni/zmeny", ZmenyAsync)
            .Produces<List<ZmenaDto>>()
            .WithSummary("Kdo nastavení kdy měnil a proč")
            .WithDescription(
                "Pořadatel regaty, nebo rozhodčí. Je to doklad ke sporu „vy jste nás "
                + "viděli a my vás ne\".");
    }

    private static async Task<IResult> NactiAsync(
        string serie, string zavod, ClaimsPrincipal kdo, Rozsahy rozsahy, NastaveniSprava sprava,
        CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await SmiCistAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        return Results.Ok(await sprava.NactiAsync(rozsah.ZavodId.Value, ct));
    }

    private static async Task<IResult> ZmenyAsync(
        string serie, string zavod, ClaimsPrincipal kdo, Rozsahy rozsahy, NastaveniSprava sprava,
        CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await SmiCistAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        return Results.Ok(await sprava.ZmenyAsync(rozsah.ZavodId.Value, ct));
    }

    private static async Task<IResult> UlozAsync(
        string serie, string zavod, NastaveniVstup vstup, ClaimsPrincipal kdo, Rozsahy rozsahy,
        NastaveniSprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Forbid();

        var jeRozhodci = await rozsahy.SmiAsync(
            kdo, new Pozadavek(Role.Rozhodci, rozsah.SerieId), ct);
        var jeOrganizator = await rozsahy.SmiAsync(
            kdo, new Pozadavek(Role.Organizator, rozsah.SerieId, rozsah.ZavodId), ct);
        if (!jeRozhodci && !jeOrganizator) return Results.Forbid();

        // Po rozpravě je to věc rozhodčího. Organizátor nastavení vidí dál,
        // ale nehýbe s ním — zámek má bránit změně pravidel za jízdy.
        var stav = await sprava.NactiAsync(rozsah.ZavodId.Value, ct);
        if (stav.Zamceno && !jeRozhodci) return Results.Forbid();

        var (nastaveni, chyba) = await sprava.UlozAsync(
            rozsah.ZavodId.Value, vstup, uzivatel, ct);

        return nastaveni is null
            ? Results.Json(new ChybaNastaveni(chyba!), statusCode: StatusCodes.Status409Conflict)
            : Results.Ok(nastaveni);
    }

    private static async Task<bool> SmiCistAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, Rozsahy.Rozsah rozsah, CancellationToken ct) =>
        await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Organizator, rozsah.SerieId, rozsah.ZavodId), ct)
        || await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, rozsah.SerieId), ct);
}

/// <summary>Proč zásah neprošel. Text je pro člověka na obrazovce.</summary>
public record ChybaNastaveni(string Error);
