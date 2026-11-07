using System.Security.Claims;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>
/// Otáčkové tresty, které rozhodčí ukládá za jízdy (ZPJ 44.2).
/// <para>
/// <b>Vlastní cesta vedle úkonů za jízdy.</b> Úkon se týká trati a nese
/// povinný prvek; trest se týká lodi. Dějí se ve stejnou chvíli, ale je
/// to dvojí věc — a kdyby sdílely jednu cestu, rozhodovalo by se o nich
/// uvnitř jednoho handleru podle druhu.
/// </para>
/// </summary>
public static class TrestyZaJizdyEndpoints
{
    public static void MapTrestyZaJizdy(this IEndpointRouteBuilder app)
    {
        var g = app.MapSpravu(
            "/sprava/serie/{serie}/zastavky/{zavod}/rozjizdky/{cislo:int}/tresty");

        g.MapGet("/", SeznamAsync)
            .Produces<List<TrestDto>>()
            .WithSummary("Co rozhodčí v téhle rozjížďce lodím uložil")
            .WithDescription("Organizátor regaty, nebo rozhodčí ročníku. V pořadí uložení.");

        g.MapPost("/", UlozAsync)
            .WithSummary("Rozhodčí uloží lodi otáčkový trest")
            .WithDescription(
                "Jen rozhodčí ročníku a **jen u rozjížďky, která se jede**.\n\n"
                + "**Není to kód výsledku.** Otáčka pořadí nemění: loď ji odkrouží "
                + "a jede dál. Do výsledku se promítne teprve tehdy, když trest "
                + "nevykoná a někdo podá protest — a to aplikace neřeší.\n\n"
                + "Na poháru se vlajky nevyvěšují a trest se sděluje megafonem, "
                + "takže tenhle zápis je jediná stopa, že byl uložen.");

        g.MapPost("/{trest:int}/vykonan", VykonanAsync)
            .WithSummary("Rozhodčí zapíše, že loď trest odkroužila")
            .WithDescription(
                "Zapisuje rozhodčí, ne posádka — *„abychom jim nekomplikovali "
                + "život\"*. Dokud to nikdo nezapíše, zůstává `vykonanoV` prázdné, "
                + "a to **neznamená, že loď trest nevykonala**.");

        g.MapDelete("/{trest:int}", OdvolejAsync)
            .WithSummary("Rozhodčí trest odvolá")
            .WithDescription("Jen dokud se rozjížďka jede. Po dojetí je to doklad.");
    }

    private static async Task<IResult> SeznamAsync(
        string serie, string zavod, int cislo, ClaimsPrincipal kdo, Rozsahy rozsahy,
        TrestyZaJizdySprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await SmiCistAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        return Results.Ok(await sprava.SeznamAsync(rozsah.ZavodId.Value, cislo, ct));
    }

    private static async Task<IResult> UlozAsync(
        string serie, string zavod, int cislo, TrestVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, TrestyZaJizdySprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await JeRozhodciAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Forbid();

        var chyba = await sprava.UlozAsync(rozsah.ZavodId.Value, cislo, vstup, uzivatel, ct);
        return chyba is null ? Results.NoContent() : Results.BadRequest(new { error = chyba });
    }

    private static async Task<IResult> VykonanAsync(
        string serie, string zavod, int cislo, int trest, VykonanVstup? vstup,
        ClaimsPrincipal kdo, Rozsahy rozsahy, TrestyZaJizdySprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await JeRozhodciAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        var chyba = await sprava.VykonanAsync(
            rozsah.ZavodId.Value, cislo, trest, vstup?.VykonanoV, ct);
        return chyba is null ? Results.NoContent() : Results.BadRequest(new { error = chyba });
    }

    private static async Task<IResult> OdvolejAsync(
        string serie, string zavod, int cislo, int trest, ClaimsPrincipal kdo,
        Rozsahy rozsahy, TrestyZaJizdySprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await JeRozhodciAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        var chyba = await sprava.OdvolejAsync(rozsah.ZavodId.Value, cislo, trest, ct);
        return chyba is null ? Results.NoContent() : Results.BadRequest(new { error = chyba });
    }

    /// <summary>Číst smí i organizátor — potřebuje vědět, co rozhodčí uložil.</summary>
    private static async Task<bool> SmiCistAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, Rozsahy.Rozsah rozsah, CancellationToken ct) =>
        await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Organizator, rozsah.SerieId, rozsah.ZavodId), ct)
        || await JeRozhodciAsync(kdo, rozsahy, rozsah, ct);

    private static Task<bool> JeRozhodciAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, Rozsahy.Rozsah rozsah, CancellationToken ct) =>
        rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, rozsah.SerieId), ct);
}

/// <summary>Kdy loď trest odkroužila. Bez těla platí okamžik požadavku.</summary>
public record VykonanVstup(DateTimeOffset? VykonanoV = null);
