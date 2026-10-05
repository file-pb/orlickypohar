using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Lode;

/// <summary>
/// Správa vazeb k lodím ročníku: kdo je kapitán a kdo posádka.
/// <para>
/// <b>Smí jen správce ročníku</b>, ne pořadatel jedné regaty. Vazba k lodi
/// platí celý rok a napříč zastávkami, takže pověření k jedné regatě na ni
/// nemá dosáhnout — jinak by se z práva zapsat výsledky stalo právo měnit
/// trvalé vztahy (oponentura, 5. 10. 2026).
/// </para>
/// <para>
/// <b>Loď musí patřit do ročníku, na který se ptáme.</b> Lodě jsou společné
/// všem ročníkům, takže bez téhle kontroly by správce jednoho ročníku sahal
/// na lodě cizího — stejně jako u vystavení kódu.
/// </para>
/// </summary>
public static class KapitanstviEndpoints
{
    public static void MapKapitanstvi(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/sprava/serie/{serie}/lode").WithTags("Správa");

        g.MapGet("/", SeznamAsync)
            .Produces<List<LodSpravaDto>>()
            .WithSummary("Vypíše lodě ročníku i s tím, kdo k nim patří")
            .WithDescription(
                "Správce ročníku. Lodě bez kapitána jsou první, pak ty s kapitánem " +
                "od připojovacího kódu — to je práce, která na správce čeká.");

        g.MapGet("/{lod:int}", DetailAsync)
            .Produces<LodDetailSpravaDto>()
            .WithSummary("Vypíše vazby jedné lodi i historii změn rolí")
            .WithDescription("Správce ročníku.");

        g.MapPut("/{lod:int}/kapitan", UrciKapitanaAsync)
            .WithSummary("Určí kapitána lodi")
            .WithDescription(
                "Správce ročníku. Povýšení nového a snížení dosavadního kapitána " +
                "je jeden úkon v jedné transakci. Majitel zůstává majitelem. " +
                "Opakované určení téhož člověka jen potvrdí roli, kterou už má.");

        g.MapPut("/{lod:int}/vazby/{vazba:int}/role", ZmenRoliAsync)
            .WithSummary("Změní roli jedné vazby k lodi")
            .WithDescription(
                "Správce ročníku. Posledního kapitána snížit nejde — nejdřív urči " +
                "jiného. Majitele tudy nastavit nejde, ten patří k vlastnictví lodi.");

        g.MapDelete("/{lod:int}/vazby/{vazba:int}", OdeberVazbuAsync)
            .WithSummary("Odebere vazbu k lodi")
            .WithDescription(
                "Správce ročníku. Posledního kapitána odebrat nejde. Odebranou vazbu " +
                "párování podle e-mailu nevrací.");
    }

    /// <summary>
    /// Rozsah ročníku, když na něj přihlášený má právo správce — jinak
    /// odpověď, kterou má endpoint vrátit.
    /// </summary>
    private static async Task<(Rozsahy.Rozsah? Rozsah, Guid Kdo, IResult? Odpoved)> SpravceAsync(
        string serie, ClaimsPrincipal kdo, Rozsahy rozsahy, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, null, ct) is not { } rozsah)
            return (null, default, Results.NotFound());

        if (!await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Spravce, rozsah.SerieId), ct))
            return (null, default, Results.Forbid());

        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel)
            return (null, default, Results.Unauthorized());

        return (rozsah, uzivatel, null);
    }

    /// <summary>Patří loď do ročníku? Rozhoduje přihláška, jako u kódů.</summary>
    private static Task<bool> VRocnikuAsync(AppDbContext db, int serieId, int lod, CancellationToken ct) =>
        db.Prihlasky.AnyAsync(p => p.LodId == lod && p.SerieId == serieId, ct);

    private static async Task<IResult> SeznamAsync(
        string serie, ClaimsPrincipal kdo, Rozsahy rozsahy, KapitanstviSprava sprava,
        CancellationToken ct)
    {
        var (rozsah, _, odpoved) = await SpravceAsync(serie, kdo, rozsahy, ct);
        if (odpoved is not null) return odpoved;

        return Results.Ok(await sprava.SeznamAsync(rozsah!.SerieId, ct));
    }

    private static async Task<IResult> DetailAsync(
        string serie, int lod, ClaimsPrincipal kdo, Rozsahy rozsahy, KapitanstviSprava sprava,
        CancellationToken ct)
    {
        var (rozsah, _, odpoved) = await SpravceAsync(serie, kdo, rozsahy, ct);
        if (odpoved is not null) return odpoved;

        var detail = await sprava.DetailAsync(rozsah!.SerieId, lod, ct);
        return detail is null ? Results.NotFound() : Results.Ok(detail);
    }

    private static async Task<IResult> UrciKapitanaAsync(
        string serie, int lod, UrceniKapitanaVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, KapitanstviSprava sprava, AppDbContext db, CancellationToken ct)
    {
        var (rozsah, spravce, odpoved) = await SpravceAsync(serie, kdo, rozsahy, ct);
        if (odpoved is not null) return odpoved;
        if (!await VRocnikuAsync(db, rozsah!.SerieId, lod, ct)) return Results.NotFound();

        var chyba = await sprava.UrciKapitanaAsync(lod, vstup.UzivatelId, spravce, ct);
        return chyba is null ? Results.NoContent() : Results.BadRequest(new { error = chyba });
    }

    private static async Task<IResult> ZmenRoliAsync(
        string serie, int lod, int vazba, ZmenaRoleVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, KapitanstviSprava sprava, AppDbContext db, CancellationToken ct)
    {
        var (rozsah, spravce, odpoved) = await SpravceAsync(serie, kdo, rozsahy, ct);
        if (odpoved is not null) return odpoved;
        if (!await VRocnikuAsync(db, rozsah!.SerieId, lod, ct)) return Results.NotFound();

        var chyba = await sprava.ZmenRoliAsync(lod, vazba, vstup.Role, spravce, ct);
        return chyba is null ? Results.NoContent() : Results.BadRequest(new { error = chyba });
    }

    private static async Task<IResult> OdeberVazbuAsync(
        string serie, int lod, int vazba, ClaimsPrincipal kdo,
        Rozsahy rozsahy, KodySprava kody, AppDbContext db, CancellationToken ct)
    {
        var (rozsah, spravce, odpoved) = await SpravceAsync(serie, kdo, rozsahy, ct);
        if (odpoved is not null) return odpoved;
        if (!await VRocnikuAsync(db, rozsah!.SerieId, lod, ct)) return Results.NotFound();

        // Odebírá se jednou cestou, ať se ptá kapitán nebo správce: pravidlo
        // o posledním kapitánovi i zápis do historie mají být na jednom místě.
        var chyba = await kody.OdeberAsync(lod, vazba, ct, spravce);
        return chyba is null ? Results.NoContent() : Results.BadRequest(new { error = chyba });
    }
}
