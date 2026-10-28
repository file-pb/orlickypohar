using System.Security.Claims;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>
/// Co komise vyhlašuje za jízdy: změna úseku (ZPJ 33) a chybějící značka
/// (34).
/// <para>
/// <b>Vlastní cesta vedle trati.</b> Trať je předpis, který rozhodčí
/// přijal; tohle je rozhodnutí nad ní, které platí jen pro tu rozjížďku,
/// co se zrovna jede (Filip, 28. 10. 2026). Mísit je do jedné cesty by
/// znamenalo rozhodovat o nich uvnitř jednoho handleru.
/// </para>
/// </summary>
public static class UkonyZaJizdyEndpoints
{
    public static void MapUkonyZaJizdy(this IEndpointRouteBuilder app)
    {
        var g = app.MapSpravu(
            "/sprava/serie/{serie}/zastavky/{zavod}/rozjizdky/{cislo:int}/ukony");

        g.MapGet("/", SeznamAsync)
            .Produces<List<UkonDto>>()
            .WithSummary("Co komise v téhle rozjížďce vyhlásila za jízdy")
            .WithDescription(
                "Organizátor regaty, nebo rozhodčí ročníku. V pořadí vyhlášení.");

        g.MapPost("/", VyhlasAsync)
            .WithSummary("Rozhodčí vyhlásí změnu úseku, nebo chybějící značku")
            .WithDescription(
                "Jen rozhodčí ročníku a **jen u rozjížďky, která se jede** — tatáž "
                + "mez jako u zkrácení dráhy. Před startem se staví rovnou jiná "
                + "trať, po dojetí se zpětně nedoplňuje, kudy se jelo.\n\n"
                + "**Trať to nemění.** Úkon se vede stranou, u rozjížďky: přijatá "
                + "trať zůstává tím, co rozhodčí vyvěsil. Změna úseku (ZPJ 33, "
                + "vlajka `C`) musí říct kurz, délku, nebo obojí — jinak nenese "
                + "žádnou informaci. U chybějící značky (34, vlajka `M`) je poloha "
                + "náhradního objektu nepovinná: že značka chybí, potřebují posádky "
                + "vědět hned, a doplnit se dá později.");

        g.MapDelete("/{ukon:int}", OdvolejAsync)
            .WithSummary("Rozhodčí úkon odvolá")
            .WithDescription(
                "Jen dokud se rozjížďka jede. Co viselo na stěžni, se zpětně "
                + "nemaže — po dojetí je to doklad.");
    }

    private static async Task<IResult> SeznamAsync(
        string serie, string zavod, int cislo, ClaimsPrincipal kdo, Rozsahy rozsahy,
        UkonyZaJizdySprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await SmiCistAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        return Results.Ok(await sprava.SeznamAsync(rozsah.ZavodId.Value, cislo, ct));
    }

    private static async Task<IResult> VyhlasAsync(
        string serie, string zavod, int cislo, UkonVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, UkonyZaJizdySprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await JeRozhodciAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Forbid();

        var chyba = await sprava.VyhlasAsync(rozsah.ZavodId.Value, cislo, vstup, uzivatel, ct);
        return chyba is null ? Results.NoContent() : Results.BadRequest(new { error = chyba });
    }

    private static async Task<IResult> OdvolejAsync(
        string serie, string zavod, int cislo, int ukon, ClaimsPrincipal kdo,
        Rozsahy rozsahy, UkonyZaJizdySprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await JeRozhodciAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        var chyba = await sprava.OdvolejAsync(rozsah.ZavodId.Value, cislo, ukon, ct);
        return chyba is null ? Results.NoContent() : Results.BadRequest(new { error = chyba });
    }

    /// <summary>Číst smí i organizátor — potřebuje vědět, co komise vyhlásila.</summary>
    private static async Task<bool> SmiCistAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, Rozsahy.Rozsah rozsah, CancellationToken ct) =>
        await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Organizator, rozsah.SerieId, rozsah.ZavodId), ct)
        || await JeRozhodciAsync(kdo, rozsahy, rozsah, ct);

    private static Task<bool> JeRozhodciAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, Rozsahy.Rozsah rozsah, CancellationToken ct) =>
        rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, rozsah.SerieId), ct);
}
