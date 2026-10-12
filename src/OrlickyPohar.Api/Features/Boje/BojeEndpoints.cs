using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Fotky;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Boje;

/// <summary>Co přijde ve formuláři s fotkou bóje.</summary>
public record FotkaBojeFormular(IFormFile? Soubor);

/// <summary>
/// Stavění bójí pořadatelem — z webu i z appky, přes stejné endpointy.
/// <para>
/// <b>Pípá ten, kdo bóji staví</b>, a nikdo jiný nemá přesnější polohu.
/// Smí to organizátor té regaty nebo rozhodčí ročníku, stejně jako
/// u plachetní směrnice.
/// </para>
/// <para>
/// <b>Veřejné čtení zatím není.</b> Trať je informace do závodu a kdy se
/// smí ukázat divákům, patří rozhodčímu — stejně jako u živých poloh
/// (plán, *Kdo trasy vidí*).
/// </para>
/// </summary>
/// <summary>Kolik záznamů historie je k zahození, nebo kolik jich zmizelo.</summary>
public record UklidDto(int Pocet);

public static class BojeEndpoints
{
    public static void MapBoje(this IEndpointRouteBuilder app)
    {
        var g = app.MapSpravu("/sprava/serie/{serie}/zastavky/{zavod}/boje");

        g.MapGet("/", SeznamAsync)
            .Produces<List<BojeDto>>()
            .WithSummary("Vypíše bóje regaty")
            .WithDescription(
                "Pořadatel regaty, nebo rozhodčí ročníku. S `historie=true` i přenastavené " +
                "a sebrané — trasa se k trati vztahuje tak, jak stála tehdy.");

        g.MapPost("/", PipniAsync)
            .Produces<BojeDto>(StatusCodes.Status201Created)
            .WithSummary("Zapíše polohu postavené nebo přenastavené bóje")
            .WithDescription(
                "Pořadatel regaty, nebo rozhodčí. Přenastavení je nový záznam — starý " +
                "zůstává. Poloha mimo Orlík nebo přesnost horší než 100 m se odmítne. " +
                "`zdroj` říká, odkud poloha je: `Telefon` ji změřil u bóje a hlásí " +
                "přesnost, `Mapa` a `Qr` ji mají odečtenou a přesnost u nich nesmí " +
                "přijít. Chybějící `zdroj` znamená `Telefon`.");

        g.MapPost("/{boje:int}/sebrana", SeberAsync)
            .WithSummary("Označí bóji za sebranou z vody")
            .WithDescription("Pořadatel regaty, nebo rozhodčí. Ze zápisu bóje nemizí.");

        // Token jde v hlavičce, ne v cookie — proti podvrženému formuláři
        // tu není co chránit, stejně jako u fotky papírového zápisu.
        g.MapPost("/{boje:int}/fotky", FotkaAsync)
            .DisableAntiforgery()
            .WithMetadata(new RequestSizeLimitAttribute(Nahravani.NejvicBajtu + 1024 * 1024))
            .Produces<ObrazekDto>(StatusCodes.Status201Created)
            .WithSummary("Přiloží k bóji fotku z okamžiku postavení")
            .WithDescription(
                "Pořadatel regaty, nebo rozhodčí. Je to doklad k poloze: ze souřadnic se " +
                "nepozná barva bóje ani co je za ní na břehu. **Fotek může být víc** — " +
                "jedna zblízka neukáže zároveň bóji i břeh za ní. JPEG, PNG nebo WebP " +
                "do 15 MB; ukládá se přepočtené na WebP, originál nikam. Veřejně se " +
                "nevydávají, stejně jako celá trať. Bez nastaveného úložiště vrací 503.");

        g.MapGet("/uklid", KUklizeniAsync)
            .Produces<UklidDto>()
            .WithTags("Bóje")
            .WithSummary("Kolik záznamů v historii je k zahození")
            .WithDescription(
                "Pořadatel regaty, nebo rozhodčí. Nic nemaže — obrazovka to musí říct "
                + "dřív, než se na něco klikne.");

        g.MapPost("/uklid", UklidAsync)
            .Produces<UklidDto>()
            .WithTags("Bóje")
            .WithSummary("Zahodí záznamy historie, na kterých nic nevisí")
            .WithDescription(
                "Pořadatel regaty, nebo rozhodčí. Maže doopravdy a nejde to vzít zpátky. "
                + "Drží se záznam, na který ukazuje prvek trati, a ten, který stál ve vodě "
                + "při přijetí nějaké trati — ten už byl veřejný.");

        g.MapDelete("/{boje:int}", ZahodZaznamAsync)
            .WithTags("Bóje")
            .WithSummary("Zahodí jeden záznam z historie bójí")
            .WithDescription(
                "Pořadatel regaty, nebo rozhodčí. Maže doopravdy a nejde to vzít zpátky. "
                + "Platí tentýž rozsudek jako u hromadného úklidu: drží se záznam, na "
                + "který ukazuje prvek trati, a ten, který stál ve vodě při přijetí "
                + "nějaké trati — ten už byl veřejný. **Bóji, která na trati stojí, "
                + "to nesmaže**; na tu je sebrání nebo přenastavení.");

        g.MapDelete("/{boje:int}/fotky/{fotka:guid}", OdeberFotkuAsync)
            .WithSummary("Odebere jednu fotku bóje a smaže její soubory")
            .WithDescription(
                "Pořadatel regaty, nebo rozhodčí. Sebrání bóje fotky nemaže — záznam " +
                "o poloze zůstává a fotka je jeho doklad.");
    }

    private static async Task<IResult> SeznamAsync(
        string serie, string zavod, ClaimsPrincipal kdo, Rozsahy rozsahy, BojeSprava sprava,
        CancellationToken ct, bool historie = false)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await SmiAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        return Results.Ok(await sprava.SeznamAsync(rozsah.ZavodId.Value, historie, ct));
    }

    private static async Task<IResult> PipniAsync(
        string serie, string zavod, PipnutiVstup vstup, ClaimsPrincipal kdo, Rozsahy rozsahy,
        BojeSprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await SmiAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Forbid();

        var (boje, chyba) = await sprava.PipniAsync(rozsah.ZavodId.Value, vstup, uzivatel, ct);
        if (chyba is not null) return Results.BadRequest(new { error = chyba });

        return Results.Created((string?)null, boje);
    }

    private static async Task<IResult> SeberAsync(
        string serie, string zavod, int boje, ClaimsPrincipal kdo, Rozsahy rozsahy,
        BojeSprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await SmiAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        var chyba = await sprava.SeberAsync(rozsah.ZavodId.Value, boje, ct);
        return chyba is null ? Results.NoContent() : Results.BadRequest(new { error = chyba });
    }

    /// <summary>
    /// Bóje té regaty i s právem na ni — nebo odpověď, kterou má endpoint
    /// vrátit. Pořadí je totéž jako u ostatních cest správy: nejdřív rozsah,
    /// pak právo, teprve pak data.
    /// </summary>
    private static async Task<(Boje? Boje, IResult? Odpoved)> NajdiAsync(
        string serie, string zavod, int boje, ClaimsPrincipal kdo, Rozsahy rozsahy,
        AppDbContext db, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return (null, Results.NotFound());
        if (!await SmiAsync(kdo, rozsahy, rozsah, ct)) return (null, Results.Forbid());

        var nalezena = await db.Boje
            .FirstOrDefaultAsync(b => b.Id == boje && b.ZavodId == rozsah.ZavodId, ct);

        return nalezena is null
            ? (null, Results.BadRequest(new { error = "Taková bóje u téhle regaty není." }))
            : (nalezena, null);
    }

    private static async Task<IResult> FotkaAsync(
        string serie, string zavod, int boje, IFormFile? soubor,
        ClaimsPrincipal kdo, Rozsahy rozsahy, AppDbContext db, FotkySprava fotky,
        CancellationToken ct)
    {
        var formular = new FotkaBojeFormular(soubor);
        var (nalezena, odpoved) = await NajdiAsync(serie, zavod, boje, kdo, rozsahy, db, ct);
        if (odpoved is not null) return odpoved;
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Forbid();

        if (!fotky.Pripraveno)
            return Results.Json(
                new { error = FotkySprava.Vypnuto }, statusCode: StatusCodes.Status503ServiceUnavailable);

        // Souhlas se neptá a autor je ten, kdo fotil: tohle není fotka na web,
        // je to doklad k poloze. Kdo ji nahrál, stojí stejně v `Fotka.Nahral`.
        var jmeno = kdo.FindFirst("name")?.Value ?? kdo.FindFirst("preferred_username")?.Value ?? "pořadatel";
        var vstup = new FotkaFormular(
            formular.Soubor, jmeno, $"Bóje {nalezena!.Nazev}", Souhlas: true);

        var (obrazek, chyba) = await fotky.PridejKBojiAsync(nalezena.Id, vstup, uzivatel, ct);
        return obrazek is null
            ? Results.BadRequest(new { error = chyba })
            : Results.Created((string?)null, obrazek);
    }

    private static async Task<IResult> KUklizeniAsync(
        string serie, string zavod, ClaimsPrincipal kdo, Rozsahy rozsahy, BojeSprava sprava,
        CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await SmiAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        return Results.Ok(new UklidDto(await sprava.KUklizeniAsync(rozsah.ZavodId.Value, ct)));
    }

    private static async Task<IResult> UklidAsync(
        string serie, string zavod, ClaimsPrincipal kdo, Rozsahy rozsahy, BojeSprava sprava,
        CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await SmiAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        return Results.Ok(new UklidDto(await sprava.UklidAsync(rozsah.ZavodId.Value, ct)));
    }

    private static async Task<IResult> ZahodZaznamAsync(
        string serie, string zavod, int boje, ClaimsPrincipal kdo, Rozsahy rozsahy,
        BojeSprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await SmiAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        return await sprava.ZahodZaznamAsync(rozsah.ZavodId.Value, boje, ct) is { } chyba
            ? Results.Json(new { error = chyba }, statusCode: StatusCodes.Status400BadRequest)
            : Results.NoContent();
    }

    private static async Task<IResult> OdeberFotkuAsync(
        string serie, string zavod, int boje, Guid fotka, ClaimsPrincipal kdo, Rozsahy rozsahy,
        AppDbContext db, FotkySprava fotky, CancellationToken ct)
    {
        var (nalezena, odpoved) = await NajdiAsync(serie, zavod, boje, kdo, rozsahy, db, ct);
        if (odpoved is not null) return odpoved;

        return await fotky.OdeberZBojeAsync(nalezena!.Id, fotka, ct) is { } chyba
            ? Results.Json(new { error = chyba }, statusCode: StatusCodes.Status503ServiceUnavailable)
            : Results.NoContent();
    }

    private static async Task<bool> SmiAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, Rozsahy.Rozsah rozsah, CancellationToken ct) =>
        await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Organizator, rozsah.SerieId, rozsah.ZavodId), ct)
        || await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, rozsah.SerieId), ct);
}
