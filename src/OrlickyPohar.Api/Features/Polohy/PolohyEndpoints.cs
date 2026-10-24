using System.Security.Claims;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Polohy;

/// <summary>
/// Kde jsou lodě právě teď.
/// <para>
/// <b>Zatím jen pro pořadatele a rozhodčího.</b> Veřejný výdej se zapíná
/// přepínačem <i>živý přenos ven</i>, a ten podle plánu zamyká rozprava;
/// dokud ho systém nemá, platí bezpečná výchozí hodnota — ven nic.
/// </para>
/// </summary>
public static class PolohyEndpoints
{
    public static void MapPolohy(this IEndpointRouteBuilder app)
    {
        var g = app.MapSpravu("/sprava/serie/{serie}/zastavky/{zavod}/polohy");

        g.MapGet("/", SnimekAsync)
            .Produces<SnimekPoloh>()
            .WithSummary("Poslední známá poloha každé lodi v regatě")
            .WithDescription(
                "Pořadatel regaty, nebo rozhodčí ročníku. Vrací celé pole — i lodě, "
                + "které se ještě neozvaly, protože otázka zní „trackuje nám celé "
                + "pole?\". Stav polohy je trojí: `Cerstva` do minuty, `Starne` do pěti, "
                + "pak `Nedostupna`. Snímek se drží v cache pět sekund, takže počet "
                + "diváků nerozhoduje o počtu dotazů do databáze.");
    }

    private static async Task<IResult> SnimekAsync(
        string serie, string zavod, ClaimsPrincipal kdo, Rozsahy rozsahy, PolohySprava sprava,
        CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await SmiAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        return Results.Ok(await sprava.SnimekAsync(rozsah.ZavodId.Value, ct));
    }

    private static async Task<bool> SmiAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, Rozsahy.Rozsah rozsah, CancellationToken ct) =>
        await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Organizator, rozsah.SerieId, rozsah.ZavodId), ct)
        || await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, rozsah.SerieId), ct);
}
