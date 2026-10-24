using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http.HttpResults;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Klice;

/// <summary>Jméno člena posádky, jak ho zadává kapitán. Víc o něm vědět nepotřebujeme.</summary>
public record PozvaniVstup(string? Jmeno);

/// <summary>Kód z QR, který telefon mění za klíč.</summary>
public record UplatneniVstup(string Kod);

/// <summary>
/// Mobilní klíče k lodi.
/// <para>
/// <b>Kapitán ručí za identitu.</b> Systém neověřuje, kdo člen posádky je —
/// stačí, že mu kapitán dal QR. Od posádky se tím nechce nic: ani mail, ani
/// heslo, nanejvýš jméno, aby se vědělo, kdo je kdo.
/// </para>
/// <para>
/// <b>Uplatnění pozvánky je jediný endpoint bez přihlášení</b>, a musí být:
/// kdyby ho vyžadovalo, posádka by účet potřebovala a celý smysl QR by padl.
/// Chrání ho to, že pozvánka je jednorázová a krátkodobá.
/// </para>
/// </summary>
public static class KliceEndpoints
{
    public static void MapKlice(this IEndpointRouteBuilder app)
    {
        app.MapPost("/klice/uplatnit", UplatniAsync)
            .WithTags("Klíče")
            .Produces<UplatneniDto>()
            .Produces(StatusCodes.Status400BadRequest)
            .WithSummary("Vymění pozvánku z QR za mobilní klíč k lodi")
            .WithDescription(
                "Bez přihlášení — to je celý smysl. Pozvánka je jednorázová a platí " +
                "48 hodin. Vymyšlená, propadlá i už uplatněná dávají tutéž odpověď, " +
                "aby se z ní nedalo nic vyčíst.");

        // <b>Vlastní sledování si telefon řídí sám</b>, a taky bez
        // přihlášení: plán žádá, aby si ten, kdo odjíždí, vypnul záznam sám
        // a nebyl odkázaný na to, že na něj kapitán nezapomene. Držitel
        // klíče účet nemá, takže jinou cestu než klíč nemá k dispozici.
        app.MapGet("/klice/sledovani", StavSledovaniAsync)
            .WithTags("Klíče")
            .Produces<SledovaniDto>()
            .Produces(StatusCodes.Status401Unauthorized)
            .WithSummary("Řekne telefonu, jestli se z něj zaznamenává")
            .WithDescription(
                "Prokazuje se klíčem k lodi. Odpovídá i odepnutému klíči — jinak by " +
                "se telefon nedozvěděl, proč neposílá. Odebraný klíč nepozná od " +
                "neexistujícího.");

        app.MapPost("/klice/sledovani", SledujSeAsync)
            .WithTags("Klíče")
            .Produces<SledovaniDto>()
            .Produces(StatusCodes.Status401Unauthorized)
            .WithSummary("Držitel klíče se odepne ze sledování, nebo se zase připne")
            .WithDescription(
                "Prokazuje se klíčem k lodi, ne účtem. Je to tatáž změna, jakou dělá " +
                "kapitán ve výpisu klíčů — *„tuhle regatu nejedu“* —, jen o ni říká " +
                "telefon sám. **Odebrat se sám nemůže**: to je zásah do posádky a " +
                "zůstává kapitánovi.");

        var g = app.MapGroup("/ja/lode/{lod:int}/klice").WithTags("Klíče").RequireAuthorization();

        g.MapGet("/", SeznamAsync)
            .Produces<List<KlicDto>>()
            .WithSummary("Vypíše klíče k lodi")
            .WithDescription("Majitel nebo kapitán. U každého je vidět, kdy se naposledy ozval.");

        g.MapPost("/", PozviAsync)
            .Produces<PozvankaDto>(StatusCodes.Status201Created)
            .WithSummary("Vytvoří pozvánku pro člena posádky")
            .WithDescription("Vrátí kód pro QR. Čitelný je jen tady a už nikdy — ukládá se otisk.");

        g.MapPost("/{klic:int}/sledovani", SledujAsync)
            .Produces(StatusCodes.Status204NoContent)
            .WithSummary("Odepne nebo zase připne klíč ze sledování")
            .WithDescription(
                "Dočasné: člen posádky zůstává, jen tuhle regatu nejede nebo odjel " +
                "po prvním dni domů. Příští závod se nemusí párovat znovu.");

        g.MapDelete("/{klic:int}", OdeberAsync)
            .Produces(StatusCodes.Status204NoContent)
            .WithSummary("Odebere klíč natrvalo")
            .WithDescription("Klíč zaniká a nedá se oživit. Pro odchod z posádky nadobro.");
    }

    private static async Task<Results<Ok<UplatneniDto>, BadRequest<string>>> UplatniAsync(
        UplatneniVstup vstup, KliceSprava klice, CancellationToken ct) =>
        await klice.UplatniAsync(vstup.Kod ?? "", ct) is { } k
            ? TypedResults.Ok(k)
            : TypedResults.BadRequest("Pozvánka neplatí.");

    private static async Task<Results<Ok<SledovaniDto>, UnauthorizedHttpResult>>
        StavSledovaniAsync(HttpContext ctx, KliceSprava klice, CancellationToken ct)
    {
        if (await klice.ProSebeAsync(ctx, ct) is not { } klic) return TypedResults.Unauthorized();
        return TypedResults.Ok(new SledovaniDto(klic.Sleduje));
    }

    /// <summary>
    /// <b>Tělo bere jako <c>JsonElement</c> schválně</b>, ze stejného důvodu
    /// jako dávka bodů v <c>TrasyEndpoints</c>: u typovaného parametru
    /// odmítne špatný tvar model binding, tedy <b>dřív než se ověří klíč</b>,
    /// a endpoint pak i bez klíče odpoví 400 místo 401. Tvar se proto
    /// kontroluje až tady, za autorizací.
    /// </summary>
    private static async Task<Results<Ok<SledovaniDto>, UnauthorizedHttpResult, ValidationProblem>>
        SledujSeAsync(
            JsonElement? telo, HttpContext ctx, KliceSprava klice, CancellationToken ct)
    {
        if (await klice.ProSebeAsync(ctx, ct) is not { } klic) return TypedResults.Unauthorized();

        if (Sleduje(telo) is not { } sleduj)
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                ["sleduje"] = ["Čekalo se `true` nebo `false`."],
            });

        return TypedResults.Ok(new SledovaniDto(await klice.SledujSamAsync(klic, sleduj, ct)));
    }

    /// <summary>Hodnota z těla, nebo `null` u jiného tvaru.</summary>
    private static bool? Sleduje(JsonElement? telo) =>
        telo is { ValueKind: JsonValueKind.Object } o
        && o.TryGetProperty("sleduje", out var v)
        && v.ValueKind is JsonValueKind.True or JsonValueKind.False
            ? v.GetBoolean()
            : null;

    private static async Task<IResult> SeznamAsync(
        int lod, ClaimsPrincipal kdo, Rozsahy rozsahy, KliceSprava klice, CancellationToken ct)
    {
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Unauthorized();
        if (!await klice.SmiVydavatAsync(lod, uzivatel, ct)) return Results.Forbid();

        return Results.Ok(await klice.SeznamAsync(lod, ct));
    }

    private static async Task<IResult> PozviAsync(
        int lod, PozvaniVstup? vstup, ClaimsPrincipal kdo, Rozsahy rozsahy, KliceSprava klice,
        CancellationToken ct)
    {
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Unauthorized();
        if (!await klice.SmiVydavatAsync(lod, uzivatel, ct)) return Results.Forbid();

        var pozvanka = await klice.PozviAsync(lod, uzivatel, vstup?.Jmeno, ct);
        return Results.Created($"/ja/lode/{lod}/klice", pozvanka);
    }

    private static async Task<IResult> SledujAsync(
        int lod, int klic, SledovaniVstup? vstup, ClaimsPrincipal kdo, Rozsahy rozsahy,
        KliceSprava klice, CancellationToken ct)
    {
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Unauthorized();
        if (!await klice.SmiSpravovatAsync(lod, uzivatel, ct)) return Results.Forbid();

        return await klice.SledujAsync(lod, klic, vstup?.Sleduje ?? true, ct)
            ? Results.NoContent()
            : Results.NotFound();
    }

    private static async Task<IResult> OdeberAsync(
        int lod, int klic, ClaimsPrincipal kdo, Rozsahy rozsahy, KliceSprava klice,
        CancellationToken ct)
    {
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Unauthorized();
        if (!await klice.SmiSpravovatAsync(lod, uzivatel, ct)) return Results.Forbid();

        return await klice.OdeberAsync(lod, klic, ct) ? Results.NoContent() : Results.NotFound();
    }
}

/// <summary>Zda klíč sleduje, nebo je dočasně odepnutý.</summary>
public record SledovaniVstup(bool Sleduje);

/// <summary>Stav sledování, jak ho vidí telefon o sobě.</summary>
public record SledovaniDto(bool Sleduje);
