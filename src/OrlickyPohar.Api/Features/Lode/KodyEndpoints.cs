using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Lode;

/// <summary>Kód zadaný při připojení k lodi.</summary>
public record PripojeniVstup(string? Kod);

/// <summary>Rozhodnutí kapitána o nároku.</summary>
public record RozhodnutiVstup(bool Prijmout);

/// <summary>
/// Připojení k lodi kódem nebo QR.
/// <para>
/// <b>Kód vystavuje dvojí ruka:</b> pořadatel u registrace a kapitán lodi
/// v appce. Pořadatel proto, že loď kapitána mít ještě nemusí — kód ho
/// neudělá, uděluje ho správce ročníku; kapitán proto, aby si posádku
/// připojil bez pořadatele.
/// </para>
/// <para>
/// <b>Uplatnit kód smí každý přihlášený.</b> Kdo má kód, patří k lodi — to
/// je celý smysl. Proti hádání kódu stojí krátká platnost a limit rychlosti
/// na jednoho klienta (platforma, `ratelimit-standard`).
/// </para>
/// </summary>
public static class KodyEndpoints
{
    public static void MapKody(this IEndpointRouteBuilder app)
    {
        app.MapPost("/ja/lode/{lod:int}/kod", MujKodAsync)
            .RequireAuthorization()
            .Produces<KodDto>()
            .WithTags("Identita")
            .WithSummary("Vystaví připojovací kód k lodi, kde jsem kapitán nebo majitel")
            .WithDescription(
                "Kód platí čtvrt hodiny a smí ho použít víc lidí — posádka se připojuje " +
                "po jednom z jednoho papíru. QR si z kódu poskládá klient.");

        app.MapGet("/ja/lode/{lod:int}/pripojeni", MojePripojeniAsync)
            .RequireAuthorization()
            .Produces<List<PripojenyDto>>()
            .WithTags("Identita")
            .WithSummary("Vypíše, kdo je k mé lodi připojený")
            .WithDescription("Kapitán nebo majitel lodi.");

        app.MapDelete("/ja/lode/{lod:int}/pripojeni/{vazba:int}", OdeberPripojeniAsync)
            .RequireAuthorization()
            .WithTags("Identita")
            .WithSummary("Odebere připojení k mé lodi")
            .WithDescription(
                "Kapitán nebo majitel lodi. Poslední kapitán se odebrat nedá — " +
                "loď by zůstala bez někoho odpovědného.");

        app.MapPost("/ja/pripojeni", PripojAsync)
            .RequireAuthorization()
            .Produces<PripojeniDto>()
            .WithTags("Identita")
            .WithSummary("Připojí přihlášený účet k lodi podle kódu")
            .WithDescription(
                "Připojený je vždycky posádka — kapitánem dělá jen správce ročníku. " +
                "Kdo už u lodi roli má, o ni zadáním kódu nepřijde.");

        app.MapPost("/ja/naroky", PodejNarokAsync)
            .RequireAuthorization()
            .WithTags("Identita")
            .WithSummary("Požádá o připojení k lodi, kterou potvrdí kapitán")
            .WithDescription(
                "Třetí cesta, když e-mail nesedl a kód nikdo nedal. Nárok sám o sobě " +
                "nedává nic — dokud ho kapitán nepotvrdí, je to jen žádost.");

        app.MapGet("/ja/naroky", MojeNarokyAsync)
            .RequireAuthorization()
            .Produces<List<MujNarokDto>>()
            .WithTags("Identita")
            .WithSummary("Vypíše moje žádosti o lodě a jak dopadly");

        app.MapGet("/ja/lode/{lod:int}/naroky", NarokyLodiAsync)
            .RequireAuthorization()
            .Produces<List<NarokDto>>()
            .WithTags("Identita")
            .WithSummary("Vypíše žádosti čekající u mé lodi")
            .WithDescription("Kapitán nebo majitel lodi.");

        app.MapPost("/ja/lode/{lod:int}/naroky/{narok:int}", RozhodniNarokAsync)
            .RequireAuthorization()
            .WithTags("Identita")
            .WithSummary("Přijme nebo zamítne žádost o připojení k mé lodi")
            .WithDescription(
                "Kapitán nebo majitel. Přijetí dělá z žadatele posádku; kapitánem " +
                "se stává ten, kdo loď převzal jako první, ne ten, koho někdo potvrdí.");

        app.MapPost("/sprava/serie/{serie}/lode/{lod:int}/kod", PoradatelKodAsync)
            .Produces<KodDto>()
            .WithTags("Správa")
            .WithSummary("Vystaví připojovací kód k lodi ročníku")
            .WithDescription(
                "Organizátor nebo rozhodčí ročníku — u registrace, kdy loď ještě " +
                "žádného kapitána nemá.");
    }

    private static async Task<IResult> MujKodAsync(
        int lod, ClaimsPrincipal kdo, Rozsahy rozsahy, KodySprava kody, CancellationToken ct)
    {
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Unauthorized();
        if (!await kody.SmiVystavitAsync(lod, uzivatel, ct)) return Results.Forbid();

        return Results.Ok(await kody.VystavAsync(lod, uzivatel, ct));
    }

    private static async Task<IResult> MojePripojeniAsync(
        int lod, ClaimsPrincipal kdo, Rozsahy rozsahy, KodySprava kody, CancellationToken ct)
    {
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Unauthorized();
        if (!await kody.SmiVystavitAsync(lod, uzivatel, ct)) return Results.Forbid();

        return Results.Ok(await kody.PripojeniAsync(lod, ct));
    }

    private static async Task<IResult> OdeberPripojeniAsync(
        int lod, int vazba, ClaimsPrincipal kdo, Rozsahy rozsahy, KodySprava kody,
        CancellationToken ct)
    {
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Unauthorized();
        if (!await kody.SmiVystavitAsync(lod, uzivatel, ct)) return Results.Forbid();

        var chyba = await kody.OdeberAsync(lod, vazba, ct);
        return chyba is null ? Results.NoContent() : Results.BadRequest(new { error = chyba });
    }

    private static async Task<IResult> PripojAsync(
        PripojeniVstup vstup, ClaimsPrincipal kdo, Rozsahy rozsahy, KodySprava kody,
        CancellationToken ct)
    {
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Unauthorized();

        var (pripojeni, chyba) = await kody.PripojAsync(vstup.Kod, uzivatel, ct);
        return chyba is null ? Results.Ok(pripojeni) : Results.BadRequest(new { error = chyba });
    }

    private static async Task<IResult> PodejNarokAsync(
        NarokVstup vstup, ClaimsPrincipal kdo, Rozsahy rozsahy, NarokySprava naroky, CancellationToken ct)
    {
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Unauthorized();

        var chyba = await naroky.PodejAsync(uzivatel, vstup, ct);
        return chyba is null ? Results.NoContent() : Results.BadRequest(new { error = chyba });
    }

    private static async Task<IResult> MojeNarokyAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, NarokySprava naroky, CancellationToken ct)
    {
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Unauthorized();

        return Results.Ok(await naroky.MojeAsync(uzivatel, ct));
    }

    private static async Task<IResult> NarokyLodiAsync(
        int lod, ClaimsPrincipal kdo, Rozsahy rozsahy, KodySprava kody, NarokySprava naroky,
        CancellationToken ct)
    {
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Unauthorized();
        // Totéž právo jako na vystavení kódu: kdo smí někoho přivést, smí
        // i rozhodnout, kdo se hlásí sám.
        if (!await kody.SmiVystavitAsync(lod, uzivatel, ct)) return Results.Forbid();

        return Results.Ok(await naroky.CekajiciAsync(lod, ct));
    }

    private static async Task<IResult> RozhodniNarokAsync(
        int lod, int narok, RozhodnutiVstup vstup, ClaimsPrincipal kdo, Rozsahy rozsahy,
        KodySprava kody, NarokySprava naroky, CancellationToken ct)
    {
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Unauthorized();
        if (!await kody.SmiVystavitAsync(lod, uzivatel, ct)) return Results.Forbid();

        var chyba = await naroky.RozhodniAsync(lod, narok, vstup.Prijmout, uzivatel, ct);
        return chyba is null ? Results.NoContent() : Results.BadRequest(new { error = chyba });
    }

    private static async Task<IResult> PoradatelKodAsync(
        string serie, int lod, ClaimsPrincipal kdo, Rozsahy rozsahy, KodySprava kody,
        AppDbContext db, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, null, ct) is not { } rozsah) return Results.NotFound();
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Unauthorized();

        var smi = await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Organizator, rozsah.SerieId), ct)
                  || await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, rozsah.SerieId), ct);
        if (!smi) return Results.Forbid();

        // Loď musí patřit do ročníku, do kterého se ptáme: pořadatel jednoho
        // ročníku nemá vystavovat kódy k lodím cizí série.
        var vRocniku = await db.Prihlasky
            .AnyAsync(p => p.LodId == lod && p.SerieId == rozsah.SerieId, ct);
        if (!vRocniku) return Results.NotFound();

        return Results.Ok(await kody.VystavAsync(lod, uzivatel, ct));
    }
}
